___
#### Before we begin
I expect the reader to have certain knowledge and skills.  
Specifically, I expect you to know:
* Kubernetes basics - what default resources there are, how to deploy simple applications, how to use `kubectl`.
* On a high level, what a Custom Resource is, and what a Kubernetes Operator is - you can read about these topics [in my previous post](/articles/kubernetes-operator).
* How to write applications in Java. It's helpful to know [Spring/Spring Boot](https://spring.io/projects/spring-boot), but not strictly required - you can probably follow the tutorial without knowing it in advance.
  
What I am going to teach you:
* How Kubernetes Controllers actually work under the hood.
* How Custom Resources are used by Custom Controllers, and how it affects their structure.
* How to use [Java Operator SDK](https://github.com/java-operator-sdk/java-operator-sdk) to  write your own Custom Controller.
* How to write end-to-end tests for your Custom Controller in a realistic environment, using [kind](https://kind.sigs.k8s.io/docs/user/quick-start/).
* How to deploy your Operator (Custom Resource + Controller) to your k8s cluster.
___
#### Kubernetes Controllers under the hood
In the [previous article](/articles/kubernetes-operator) you saw that it's possible to create your own resource types, and that Kubernetes stores the custom resources internally, but doesn't otherwise react to their creation.  
To handle the custom resource creation/modification/deletion events, you have to write your own Custom Controller.
  
Let's see how the pieces fit together:  
![Custom Controller diagram](/assets/posts/images/java-operator-tutorial/custom_controller.png)  
  
The typical workflow looks like this:  
* Developer (you) creates a custom resource, by first describing it in a YAML file and then running `kubectl apply -f resource.yaml`.
* `kubectl` sends the resource to Kubernetes Control Plane - specifically, to the API server.
* The API server stores the resource in its internal database (typically [etcd](https://etcd.io/), but this is not important here).
* Custom Controller application (built and deployed by you) running in the cluster subscribes to events happening to specific Custom Resource types.
* Custom Controller handles all the creation/update/delete events happening to the Custom Resource. The Controller might or might not modify the resources it's working on.

##### Controller compares the desired state of a custom resource (represented by the `spec` field) to the actual state of the world, and if they differ, it takes actions to synchronize them.  
  
More specifically, the Controller reacts to resources being created/updated/deleted, by subscribing to events.  
What your controller does as the result of handling an event is limited only by your imagination (and your ability to turn it into reality) - typically it might call some external APIs (e.g. to create resources in the cloud, trigger a webhook, etc.), or it might create more Kubernetes resources (if you're building on existing Kubernetes abstractions).  

Aside from reacting to events many controllers also implement a **Reconciliation Loop** - that is, they repeatedly (by cron) compare the desired state to the actual state, and eliminate the differences. This might be helpful if the state of your resource can change without you explicitly modifying it through `kubectl`.  
  
The diagram below demonstrates the **Reconciliation Loop**:    
![Reconciliation loop](/assets/posts/images/java-operator-tutorial/reconcile.png)  
  
You might ask:  
> Why would we need a reconciliation loop if we already have event handling? How is it possible for resource state to change without our command?

The reason is that it's possible for us not to have complete control over the actual state of certain resources.  
  
Imagine that you have a `CloudVirtualMachine` resource, that spins up a virtual machine instance in your favorite cloud provider.  Your Custom Controller could create the VM by invoking the cloud provider API as a reaction to the resource creation event.  
But what happens if the virtual machine crashes?  It will most certainly not invoke Kubernetes API to report the error, and now you have a discrepancy between the desired state recorded in your k8s cluster (your custom resource, saying there should be a VM running) and the actual state in the cloud (no VM running).  
Without the reconciliation logic the VM just stays crashed, but if the Controller app checks the actual state periodically, it will notice the discrepancy and will be able to restart the crashed VM, or create a new one.  
  
___
#### Anatomy of a Custom Resource  
Just like the "built-in" Kubernetes resources, Custom Resources all have a similar structure.  
They consist of:
* The `metadata` field - a nested object containing (among other things) the name, namespace and labels of the resource. The metadata object structure is the same for all resources, and you cannot change it.  
* The `spec` field - a nested object representing the desired state of your resource. You have full control over its structure (validation rules can be defined through OpenAPI schema in the [CRD](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)).  
  
That's the minimum any Custom Resource contains, but many resources also have:  
* The optional `status` field - a so-called *subresource*, it's modified by the Controller app to record useful information about the observed actual state. It is **NOT** normally modified by the user through `kubectl` or similar tools - it's there to be accessed by the Controller only. Think of it as something like a cache for the actual state - a Controller can read the `status` field without performing an often time-consuming assessment of the actual state of the world. Just like with `spec`, you have full control over the structure of the `status` object.  
  
  
Let's take a look at our fictional `Banana` resource from [the previous article](/articles/kubernetes-operator). To a user (developer) it looks like this (*banana.yaml*):  
```
apiVersion: fruits.com/v1
kind: Banana
metadata:
  name: green-banana
spec:
  color: "green"
```  
  
Naturally, it represents a Banana. The `spec.color` field represents the **desired state** of our banana - the color it should be painted.  
  
The Banana is going to be painted by the `Banana Controller` (which we will write shortly), and the controller needs a bit more information about the Banana to process it. To Banana Controller, our resource is going to look like this:  
```
apiVersion: fruits.com/v1
kind: Banana
metadata:
  name: green-banana
spec:
  color: "green"
status:
  color: null
```
  
Since we'd like to avoid re-painting the Bananas that were already painted, for each Banana we are goint to store its current color in the `status.color` field. If it is `null`, like in the example above, it means the Banana hasn't been painted yet, and the Controller has to do some work. If it is the same as `spec.color`, it means the Banana was already processed, and no action is necessary from the Controller.  
Notice how from the user's perspective there is only the `spec` field - the `status` field is only used by the Controller, and shouldn't be present in the `Banana` YAML manifest that you write manually.  
  
To introduce the `Banana` resource type to our Kubernetes cluster, we need to create a `CustomResourceDefinition`. Let's take a look at it (*banana-crd.yaml*):
```
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: bananas.fruits.com # should be $plural.$group
spec:
  group: fruits.com
  names:
    kind: Banana
    listKind: BananaList
    plural: bananas # plural name of the resource, so we can invoke `kubectl get bananas`
    singular: banana
  scope: Namespaced
  versions:
    - name: v1
      schema:
        openAPIV3Schema:
          description: Banana is the Schema for the bananas API
          properties:
            apiVersion:
              type: string
            kind:
              type: string
            metadata:
              type: object
            spec:
              description: BananaSpec defines the desired state of Banana
              properties:
                color:
                  type: string
              required:
                - color
              type: object
            status:
              description: BananaStatus defines the actual state of a Banana as recorded by the controller
              properties:
                color:
                  type: string
              required:
                - color
              type: object
          type: object
      served: true
      storage: true
      subresources:
        status: {}
```
  
As you can see, the CRD's `...openAPIV3Schema.properties` field contains a `spec` field and a `status` field, both of which in turn contain a `color` field of type `string`.  
  
Additionally, note the `subresources.status` field down below - it contains an empty object, but the fact that the field is present tells Kubernetes that `status` is a valid *subresource* of the `Banana` resource. This is important because without this field we'll not be able to modify the `status` field from our Banana Controller.  
  
Now that we have a CRD, you can apply it to your k8s cluster by running `kubectl apply -f banana-crd.yaml`, and we are ready to finally start writing a Banana Controller to paint our Banana resources.  
___
