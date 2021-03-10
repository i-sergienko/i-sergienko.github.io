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
