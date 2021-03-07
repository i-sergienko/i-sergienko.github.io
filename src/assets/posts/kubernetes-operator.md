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
And you know, that if you apply that manifest to your **k8s** cluster will do useful things for you - in this case, spin up an Nginx instance.  
  
Kubernetes can do a lot of useful things out of the box - you can create `Deployment`/`ConfigMap`/`Service`/`Pod` and other resources without ever having to configure anything.  
But once in a while you encounter a use case which can not be solved by the base functionality.  
You start thinking:
>If only there was a `Banana` resource, that I could apply to Kubernetes so it would produce a Banana  

Instead of a `Banana` you probably have something more useful in mind, like:
* A `Database` or a `Cache` resource that automatically provides (and manages) a database/cache for the other apps in your cluster to use. 
* `User`/`Permission` resources to automatically create users and permissions in your internal authentication app.
* Cloud infrastructure resources, like `EC2Instance` or `RDSDatabase` for AWS cloud (yes, creating *out-of-cluster* resources from *inside* your **k8s**).
  
If you had those resources, you could store them in your Git repository with the rest of the manifests, and have a better overview of your system.  
And you would get all of the benefits of the declarative approach - `kubectl apply` would inform **k8s** of your desired state, and your system is ready - no clicking web UIs or invoking APIs manually.  
  
Sadly, **k8s** doesn't support any of these out of the box.  
Fortunately, you can add that support yourself - by using [Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) and [Custom Controllers](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/#custom-controllers).
  
___
##### Custom Resources
Kubernetes allows you to define custom resources, so that you can work with them through Kubernetes API (using `kubectl` or otherwise).  
You can define your `Banana` resource format:
```
apiVersion: fruits.com/v1
kind: Banana
metadata:
  name: green-banana
spec:
  color: green
```  

To tell your **k8s** cluster that this is now a valid resource, you have to create a [Custom Resource Definition](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/), which is itself a Kubernetes resource available out-of-the-box.  
The Custom Resource Definition for our `Banana` resource will look like this:
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
  
Cool, so now `Banana` is considered a valid resource and saved by Kubernetes.  
However, did a real banana pop out of the screen the moment I ran `kubectl apply -f banana.yaml`? No, it didn't.
---
##### Custom Controllers
There is one piece of the puzzle missing - Kubernetes doesn't know what to do with the new resource, it just saves it 
