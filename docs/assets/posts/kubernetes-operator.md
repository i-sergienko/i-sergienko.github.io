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
  
I'm planning on writing tutorials for Custom Controller creation using the aforementioned frameworks, so stay tuned 😊

___
### Conclusion:
`Custom Resource + Custom Controller = Kubernetes Operator`
