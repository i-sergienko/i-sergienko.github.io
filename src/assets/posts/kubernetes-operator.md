___
#### Prerequisites:
I expect the reader to have a basic familiarity with Kubernetes - you should know how to perform basic operations (e.g. create a `Deployment`/`ConfigMap`/etc. using `kubectl`) and be familiar with Kubernetes manifests in YAML format (e.g. how do you define a `Pod` in YAML).  
  
If you're new to Kubernetes, take a look at the [official documentation](https://kubernetes.io/docs/tutorials/kubernetes-basics/). There are also good online courses out there (e.g. [Kodekloud](https://kodekloud.com/p/kubernetes-for-the-absolute-beginners-hands-on)).

___
#### Let's cut to the chase
So you know how to create a YAML manifest, e.g. a `Pod`:  
```
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - image: nginx:latest
    name: nginx
```
And you know that if you apply that manifest to your **k8s** cluster, it will do useful things for you - in this case, spin up an Nginx instance.  
  
Kubernetes can do a lot of useful things out of the box - you can create `Deployment`/`ConfigMap`/`Service`/`Pod` and other resources without ever having to configure anything.  
But once in a while you encounter a use case which can not be solved by the basic functionality.  
You start thinking:
>If only there was a `Banana` resource, that I could apply to Kubernetes so it would produce a Banana  

Instead of a `Banana` you probably have something more useful in mind, like:
* A `Database` or a `Cache` resource that automatically provides (and manages) a database/cache for the other apps in your cluster to use. 
* `User`/`Permission` resources to automatically create users and permissions in your internal authentication app.
* Cloud infrastructure resources, like `EC2Instance` or `RDSDatabase` for AWS cloud (yes, creating *out-of-cluster* resources from *inside* your **k8s**).
  
If you had those resources, you could store them in your Git repository with the rest of the manifests, and have a better overview of your system.  
And you would get all of the benefits of the declarative approach - `kubectl apply` would inform **k8s** of your desired state, and your system would be ready - no clicking web UIs or invoking APIs manually.  
  
Sadly, **k8s** doesn't support any of these resources out of the box.  
Fortunately, you can add that support yourself - by using [Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) and [Custom Controllers](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/#custom-controllers).
  
___
##### Custom Resources
Kubernetes allows you to define custom resources, so that you can work with them through Kubernetes API (using `kubectl` or otherwise).  
You can define your `Banana` resource in *banana.yaml* file:
```
apiVersion: fruits.com/v1
kind: Banana
metadata:
  name: green-banana
spec:
  color: green
```  

To tell your **k8s** cluster that this is now a valid resource, you have to create a [Custom Resource Definition](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/), which is itself a Kubernetes resource available out-of-the-box.  
The Custom Resource Definition for our `Banana` resource will look like this (*banana-crd.yaml*):
```
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: bananas.fruits.com
spec:
  group: fruits.com
  names:
    kind: Banana
    listKind: BananaList
    plural: bananas
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
        type: object
    served: true
    storage: true
```  
A bit long and gnarly, granted, but once we run `kubectl apply -f banana-crd.yaml`, we'll be able to create our `Banana` resources.  
Let's test it - observe that **k8s** rejects the unknown resource before we create the CRD:
> `> kubectl apply -f banana.yaml`  
> `error: unable to recognize "banana.yaml": no matches for kind "Banana" in version "banana.fruits.com/v1"`  
  
But once we define the CRD and tell **k8s** that `Banana` is a valid resource, it works:
> `> kubectl apply -f banana-crd.yaml`  
> `customresourcedefinition.apiextensions.k8s.io/bananas.fruits.com created`  
> `> kubectl apply -f banana.yaml`  
> `banana.fruits.com/green-banana created`
  
We can check that the `Banana` resource was indeed created and saved by Kubernetes by listing bananas:
> `> kubectl get bananas`  
> `NAME           AGE`  
> `green-banana   2m44s`
  
Cool, so now `Banana` is considered a valid resource and is saved by Kubernetes.  
However, did a real banana pop out of the screen the moment I ran `kubectl apply -f banana.yaml`? No, it didn't. Something is still missing.

---
##### Custom Controllers
There is one piece of the puzzle missing - Kubernetes doesn't know what to do with the new resource, it just saves it with the rest of the manifests in its internal database.  
This is not very useful by itself - we normally use manifests to inform **k8s** of the desired state of the world, so it can do something about it.
  
The missing piece is called a **Custom Controller**, and it's an application that you'll have to write yourself.  

Every Kubernetes resource, including the "default" ones, is handled by a Controller application.  
A Controller is responsible for reacting to changes to a particular resource type:
* When you create a `Deployment` resource, [Deployment controller](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/deployment/deployment_controller.go) will create all the necessary child resources, like `ReplicaSet`s.
* When you create a `CronJob` resource, [CronJob controller](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/cronjob/cronjob_controller.go) is responsible for launching the jobs at the right time.
* When you create an `Ingress` resource, your [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/) (assuming you use it) will react to it by defining Nginx route configurations.  
  
With the exception of Nginx Ingress Controller, you didn't deploy any of these controller apps yourself. They are, in fact, included into the Kubernetes Control Plane codebase, which is why these resources are supported by default.  
  
___

To write your own Controller to react to your Custom Resources, you will need to integrate with the Kubernetes API.  
You could write your Controller in any programming language - there are no restrictions, since it's just another application that you will deploy to your cluster.  
  
The Controller application typically doesn't need its own database - all the information it needs to handle the resources will be stored in Kubernetes Control Plane, so your Controller app is stateless. 
  
Here are some of the more popular languages/frameworks being used for that purpose:
* Golang / [Operator SDK](https://sdk.operatorframework.io/docs/building-operators/golang/) - as of this writing, the most popular choice. Kubernetes ecosystem (unsurprisingly) is heavily biased towards Go, and Operator SDK is the most mature framework up to date. I found it well-structured and easy to use, but some limitations of the language made it seem impractical for certain use cases.
* Java / [Java Operator SDK](https://github.com/java-operator-sdk/java-operator-sdk) - as you might have guessed from the name, it's basically an adaptation of [Operator SDK](https://sdk.operatorframework.io/docs/building-operators/golang/) for the Java world. It's less mature, but also well-structured and easy to get started with. Additionally, because of Java's better support for generics and metaprogramming, it allows to tackle some use cases in which Golang seems inconvenient.
* Python / [Kopf](https://kopf.readthedocs.io/en/stable/) - an option for Python users. I have not used it personally, but from the docs it seems lightweight and comprehensible.  
  
This list is not exhaustive, and there might be other popular solutions by the time you're reading this.  
  
You also don't have to use a framework to write a controller - there are [Kubernetes client libraries](https://kubernetes.io/docs/reference/using-api/client-libraries/) for other languages, which you could use directly, and in the worst case you could always write your own integration. Frameworks do make the task significantly easier, though.
  
At the end of the article you'll find links to the tutorials I created about writing Custom Controllers in Java and Golang.  
But before you go there, let's take a closer look at what a Custom Controller consists of (regardless of the language/framework used) and how it interacts with the Custom Resource.  
  
___
#### Kubernetes Controllers under the hood
Earlier you saw that it's possible to create your own resource types, and that Kubernetes stores the custom resources internally, but doesn't otherwise react to their creation.  
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

Since we'd like to avoid re-painting the Bananas that were already painted, for each Banana we are going to store its current color in the `status.color` field. If it is `null`, like in the example above, it means the Banana hasn't been painted yet, and the Controller has to do some work. If it is the same as `spec.color`, it means the Banana was already processed, and no action is necessary from the Controller.  
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
  
You can use the tutorials below to learn how to implement the Controller in your language/framework of choice:  
* [Java + Java Operator SDK](/articles/java-operator-tutorial)
* [Go + Operator SDK](/articles/golang-operator-tutorial)
