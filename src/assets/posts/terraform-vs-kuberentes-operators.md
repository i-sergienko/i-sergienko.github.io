Those of you who used both [Terraform](https://www.terraform.io/) (or other IAC tools) and [Kubernetes Operators](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/) might have wondered:
> Should I use one or the other for managing my cloud infrastructure?  
  
All right, I know they originally targeted different problems - provisioning cloud resources (**Terraform**) and managing a Kubernetes cluster when you _already have_ one (**Kubernetes Operators**).  
However, we are at a point when we have extensions for both of them that do the same things - e.g. managing users/permissions in a third-party authentication/authorization SaaS, provisioning managed databases in the cloud, etc.  
So, provided that the resources in your particular case can be managed both by **Terraform** and a **Kubernetes Operator**, which one should you pick?
  
##### At first glance they seem really similar, but there are a few differences:  

 _ | Terraform | Kubernetes Operator 
 ------------ | ------------ | -------------
Declarative inputs | Yes - [HCL files](https://www.terraform.io/docs/language/syntax/configuration.html) | Yes - [custom resource YAML](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
Supported operations | CRUD | CRUD
State storage | Local (developer machine) or [remote](https://www.terraform.io/docs/language/settings/backends/index.html) | Kubernetes itself ([etcd](https://etcd.io/))
Software components | `terraform` CLI only - install to developer machine and you're good to go | A controller application running inside **k8s** + `kubectl`/`helm` on developer machine
Lifecycle management | Manual - modifications are made only when a developer runs `terraform` commands | Automatic - the controller application can _reconcile_ the desired and actual state, and perform actions without developer intervention
  
___
##### That last row contains the key difference between the two - **Terraform** is, by its very nature, static - it only does something when you ask it to.
___
Resource management with **Terraform** looks like this:  

![Terraform workflow diagram](/assets/posts/images/tf-vs-k8s/terraform_vs_k8s_operators_1.png)
  
Since actions are only triggered by a developer, there is no way for **Terraform** to react to actual state changes.
___
By contrast, **Kubernetes Operators** do not run on developer machine - they run in your Kubernetes cluster, and can thus react to changes by observing the actual state of the world, even when the developer is not there to order it to do so:  
![Terraform workflow diagram](/assets/posts/images/tf-vs-k8s/terraform_vs_k8s_operators_2.png)  
  
Because of that, in an ever-changing environment your desired state can still be enforced - you don't have to constantly re-apply your configuration.
___  
### So which one do I pick?
In my opinion, it all comes down to a couple of questions:
1. Do your resources need to be reconciled or not? Is it possible that the environment changes without you triggering the changes, and you'll have to re-apply the configuration manually? Or are your resources static - once created, you can be sure they aren't going anywhere?
2. Do your applications running inside Kubernetes need to be able to manage the resources in question? Or do you plan on defining all of them manually in advance?

If you're sure the resources are static and don't require constant observation, either option works - **Terraform** will do just as fine as **k8s operators**.  
If you do need "autopilot" capabilities and constant observation - pick a **Kubernetes Operator** if one is available - **Terraform** won't do the trick.
  
If your apps need to be able to manage resources dynamically, then again - **Kubernetes Operators** are a better pick - your custom applications can easily be made Kubernetes-native, and thus will be able to produce resource definitions dynamically - the rest would be taken care of by the operator app.  
  
___
### Example: managing users in a third-party SaaS (e.g. [Auth0](https://auth0.com/))
Imagine that you have a system where the authentication/authorization is managed by a third party. You would like to define your user accounts and their permissions in code, so that you don't have to constantly switch between different web consoles to manage all of your cloud resources, and can instead store everything in one Git repository.  
  
Assuming there are both a **Terraform** provider and a **Kubernetes Operator** that can manage the user/permission management, which one should you pick?  
  
If your users are more or less static - they are defined in config and are not modified externally while you're not looking - you don't really need the reconciliation capabilities of a **Kubernetes Operator**
. So both options work, at first glance.  
  
However, there is one more factor to keep in mind - are you going to define all the users manually in code, or do your apps also need the ability to create/delete/modify users?  
If you define and manage all the users manually, then again - both **Terraform** and **Kubernetes Operators** work.  
If, however, your apps need to have a say in user management - e.g. they need to be able to automatically block fraudulent users - a **Kubernetes Operator** becomes the only viable option (short of integrating directly with the auth provider API).  
___
### Conclusion: there is no winner
I know that nobody likes hearing this, but - it all depends on your use case.  
For simple tasks that can be handled by both contenders, just pick the option you're more comfortable with.  
For "autopilot" pick **k8s operators** - although not all of them are equally powerful.
