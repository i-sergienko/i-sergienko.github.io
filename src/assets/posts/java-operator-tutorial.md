___
#### Before we begin
I expect the reader to have certain knowledge and skills.  
Specifically, I expect you to know:
* Kubernetes basics - what default resources there are, how to deploy simple applications, how to use `kubectl`.
* On a high level, what a Custom Resource is, and what a Kubernetes Operator is - you can read about these topics [in my previous post](/articles/kubernetes-operator).
* How to write applications in Java. It's helpful to know [Spring/Spring Boot](https://spring.io/projects/spring-boot), but not strictly required - you can probably follow the tutorial without knowing it in advance.
  
What I am going to teach you:
* How Kubernetes Controllers actually work under the hood.
* The structure of a Custom Resource (in more detail than in [the introductory article](/articles/kubernetes-operator))
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
