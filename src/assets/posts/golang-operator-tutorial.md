___
#### Before we begin
I expect the reader to have certain knowledge and skills.  
Specifically, I expect you to know:
* Kubernetes basics - what default resources there are, how to deploy simple applications, how to use `kubectl`.
* On a high level, what a Custom Resource is, what a Custom Controller is and how they interact - you can read about these topics [in my previous post](/articles/kubernetes-operator).
* Basic knowledge of Go - going through [A Tour of Go](https://tour.golang.org/welcome/1) or reading [Go in Action](https://www.manning.com/books/go-in-action) and writing some simple apps should be enough.
  
What I am going to teach you:
* How to use [Operator SDK](https://sdk.operatorframework.io) to  write your own Custom Controller.
* How to write end-to-end tests for your Custom Controller in a realistic environment, using [kind](https://kind.sigs.k8s.io/docs/user/quick-start/).
* How to deploy your Operator (Custom Resource + Controller) to your k8s cluster.
___
#### Writing a Custom Controller with [Java Operator SDK](https://github.com/java-operator-sdk/java-operator-sdk)

The full code for this tutorial can be found [in my GitHub repository](https://github.com/i-sergienko/banana-operator).  
I am going to use Spring Boot in this tutorial, since many backend Java developers are familiar with it, but it's easy to adapt the app to other frameworks or use with "pure" Java.  
  
Our application will consist of the following parts:  
* Model classes - `Banana`, `BananaSpec` and `BananaStatus`. They represent, respectively, the Custom Resource itself, its `spec` field and its `status` field.
* Core event handling logic - `BananaController` class. This will subscribe to events and react to `Banana` resources being created/updated/deleted.
* Some logic to wire it all up.
  
---
##### Project setup
Use [Spring Initializr](https://start.spring.io/) to initialize a new Java 11 Maven project.  
Include Java Operator SDK,  to your *pom.xml*:  
```
<dependency>
    <groupId>io.javaoperatorsdk</groupId>
    <artifactId>operator-framework</artifactId>
    <version>1.7.3</version>
</dependency>
```  
  
Include Spring Web and Spring Actuator - we will use them for healthcheck (leveraging the built-in `/actuator/health`), to check that the Controller app is up and running, but we will not build any HTTP endpoints ourselves:  
```
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
	<groupId>org.springframework.boot</groupId>
	<artifactId>spring-boot-starter-web</artifactId>
</dependency>
```
  
---
##### Model classes
As I already mentioned, we will need the `Banana`, `BananaSpec` and `BananaStatus` classes. Since `Banana` will reference the other two, let's define them first:  
  
In the *com.fruits.bananacontroller.resource* package create the *BananaSpec.java* class:
```
public class BananaSpec {
    private String color;
    
    // getter and setter omitted
}
```  
This is a simple container class.
  
In the same package, create the *BananaStatus.java* class:  
```
public class BananaStatus {
    private String color;
    
    // getter and setter omitted
}
```  
This is also a simple container class.
  
Finally, in the same package, create the *Banana.java* class:
```
import io.fabric8.kubernetes.api.model.Namespaced;
import io.fabric8.kubernetes.client.CustomResource;
import io.fabric8.kubernetes.model.annotation.Group;
import io.fabric8.kubernetes.model.annotation.Kind;
import io.fabric8.kubernetes.model.annotation.Version;

@Group("fruits.com")
@Version("v1")
@Kind("Banana")
public class Banana extends CustomResource<BananaSpec, BananaStatus> implements Namespaced {
}
```
  
This one is more interesting - let's take a look at what it `extends` and `implements`:
* `extends CustomResource<...>` - extending the base class from the framework, our `Banana` inherits the `metadata` field and some initialization logic.  
The generic type parameters are filled with our `BananaSpec` and `BananaStatus` types: `CustomResource<BananaSpec, BananaStatus>`. Quite intuitively, this means that our `Banana` now has a `spec` field of type `BananaSpec`, and a `status` field of type `BananaStatus`.  
* `implements Namespaced` - this means that our `Banana` resources will exist inside namespaces, like most of the Kubernetes resources you know (`Pod`/`Deployment`/`Service`/etc.), as opposed to being cluster-scoped (like `ClusterRoleBinding`).
  
Also note the annotations:
* `@Group("fruits.com")` - matches `spec.group` from *banana-crd.yaml*.
* `@Version("v1")` - matches the version name from *banana-crd.yaml*.
* `@Kind("Banana")` - matches `spec.names.kind` from *banana-crd.yaml*.  

These annotations will be used by the Java Operator SDK framework to subscribe to events related to `Banana` resources.
  
This is all the setup we need for the model classes - when we connect to the cluster, the application will be able to deserialize `Banana` resources using these 3 classes.

---
##### Controller class
Now let's implement the resource controller for our `Banana` custom resource.  
This is going to be the heart of our application - all the event-handling logic is going to be located here.  
  
In the *com.fruits.bananacontroller.controller* package create the `BananaController.java`:  
```
import com.fruits.bananacontroller.resource.Banana;
import com.fruits.bananacontroller.resource.BananaStatus;
import io.javaoperatorsdk.operator.api.*;
import org.springframework.stereotype.Component;

@Component
@Controller
public class BananaController implements ResourceController<Banana> {
    @Override
    public UpdateControl<Banana> createOrUpdateResource(Banana resource, Context<Banana> context) {
        if (resource.getStatus() == null || !resource.getSpec().getColor().equals(resource.getStatus().getColor())) {
            BananaStatus status = new BananaStatus();
            status.setColor(resource.getSpec().getColor());
            resource.setStatus(status);

            paintBanana(resource);

            return UpdateControl.updateStatusSubResource(resource);
        } else {
            return UpdateControl.noUpdate();
        }
    }

    @Override
    public DeleteControl deleteResource(Banana resource, Context<Banana> context) {
        return DeleteControl.DEFAULT_DELETE;
    }

    private void paintBanana(Banana banana) {
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
```
  
This is quite a lot to take in, so let's break down the important parts one by one.  
  
First, note the annotations:  
* `@Component` - this is a Spring annotation that tells the framework to automatically create 1 instance of this class for dependency injection. It has nothing to do with event-handling logic, or Kubernetes.  
* `@Controller` - this is a Java Operator SDK annotation that tells the Operator framework to use this class to subscribe to events. Note that this is `io.javaoperatorsdk.operator.api.Controller`, and **NOT** the Spring `@Controller` annotation used to define HTTP endpoints - it's easy to get confused, so import the correct one from Java Operator SDK.
  
  
Next, note that the class `implements ResourceController<Banana>`.  
The `ResourceController` contains 2 methods - `createOrUpdateResource(...)` and `deleteResource(...)` - which are going to be invoked when a `Banana` resource is either created/updated or deleted in the cluster, respectively.  
Thanks to this interface, you don't ever have to invoke the Kubernetes API by yourself if all you care about is handling events - the framework will do all the wiring (subscribing to events, parsing JSON, etc.) for you. All you have to do is implement these 2 methods and handle the events.  
  
##### IMPORTANT: both of these methods have to be IDEMPOTENT.
That is, when invoked multiple times, they should produce the same result - e.g. if the resource is already handled, there might not be a need to process it again, and your controller should realize that.  
The reason for the idempotency requirement is that the framework can only guarantee *at least once* delivery of events - that means that one event might sometimes be passed to the handler multiple times.  
  
With that out of the way, let's take a look at how the 2 methods work.  
  
---
##### Create/Update event handling
The `UpdateControl<Banana> createOrUpdateResource(Banana resource, Context<Banana> context)` method is invoked whenever a `Banana` resource is created or updated.  
Two arguments are passed into it during invocation:  
* `Banana resource` - the custom resource itself, in its most up-to-date state. Since it contains the `spec` field, this is where you get the desired state from.  
* `Context<Banana> context` - contains metadata about the events. If you are only interested in the current desired state (i.e. resource `spec`), which is the case most of the time, you won't ever need to use this argument.
  
The result type `UpdateControl<Banana>` allows you to indicate to the framework that you'd like to update either `spec`, `status`, or both, or neither of these fields after the method returns. This is convenient if you need to update the resource, but don't want to call Kubernetes API explicitly in your code.  
Specifically:  
* Returning `UpdateControl.noUpdate()` means "don't update anything". No API calls are issued after the method returns.  
* Returning `UpdateControl.updateCustomResource(resource)` allows to update the `spec` field after the method returns. This is the equivalent of calling `kubectl apply -f banana.yaml`, so **this will generate another update event**.
Make sure that at some point you return some other option, otherwise the controller is going to be stuck in an infinite loop of update events which it itself generates.
* Returning `UpdateControl.updateStatusSubResource(resource)` allows to update the `status` field. This will not generate any new update events, so it's a valid "exit" point.  
* Returning `UpdateControl.updateCustomResourceAndStatus(resource)` allows to update both `spec` and `status`. This will generate update events, hence the infinite loop risk - take the same care as with the `UpdateControl.updateCustomResource` option.
  
So what does our example controller do on creation/update event? Let's take a look:  
```
    public UpdateControl<Banana> createOrUpdateResource(Banana resource, Context<Banana> context) {
        if (resource.getStatus() == null || !resource.getSpec().getColor().equals(resource.getStatus().getColor())) {
            BananaStatus status = new BananaStatus();
            status.setColor(resource.getSpec().getColor());
            resource.setStatus(status);

            paintBanana(resource);

            return UpdateControl.updateStatusSubResource(resource);
        } else {
            return UpdateControl.noUpdate();
        }
    }
```
If the resource `status` is empty, it means the Banana hasn't been processed (painted the right color) yet.  
If the `status.color` is not empty, but is different from `spec.color`, that means we have to re-paint the Banana.  
In both of these cases we set `status.color` to the correct value, and simulate some work by invoking the `paintBanana` method. `paintBanana` will just sleep for 3 seconds, but in a real use case this is where you'd do your useful work - e.g. invoke external APIs, create new k8s objects, etc.  
After we've processed our resource (painted the banana), we return `UpdateControl.updateStatusSubResource(resource)` so that the `status` field for the resource is updated in the cluster and next time we get an event for it, we remember we've already processed it.
  
If the `status` is present and `status.color == spec.color`, we don't need to do any work or update anything - hence, we just return `UpdateControl.noUpdate()`.  
  
---
##### Deletion event handling
The second method's signature looks like this: `DeleteControl deleteResource(Banana resource, Context<Banana> context)`  
The method handles deletion events (mind-blowing, I know).  
The parameters are the same as in `createOrUpdateResource`, but the result type is different.  
`DeleteControl` is an `enum` with 2 values:  
* `DEFAULT_DELETE` - this means that the controller has processed the deletion event successfully, and Kubernetes can safely remove the resource from its internal DB.  
* `NO_FINALIZER_REMOVAL` - this means that the controller objects to the resource being deleted. The resource **WILL NOT** be deleted from the cluster if this value is returned.  
  
Read about [finalizers](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#finalizers) if you're curious how it's possible for a Custom Controller to prevent resource deletion.  
  
In our simple implementation we're just going to always return `DEFAULT_DELETE`, allowing to delete the `Banana` resource.  
   
___
##### Reconciliation
As you might have noticed, our `BananaController` class only reacts to incoming events - it doesn't do any reconciliation.  
For our simple example use case we don't really need reconciliation, since `Banana` resources don't change their actual state unexpectedly.  
  
Reconciliation is out of scope of this tutorial, but if you need it, take a look at the `io.javaoperatorsdk.operator.processing.event.internal.TimerEventSource` class and its `schedule` method.  
The way to achieve reconciliation would be to create this event source at app startup, register it in the event source manager by overriding the `BananaController.init(EventSourceManager eventSourceManager)` method, list all the existing `Banana` resources programmatically and call `TimerEventSource.schedule` for each of them. Don't forget to also schedule an event for every newly created `Banana` resource.  
  
___
##### Wiring it all up and starting the application
At this point we have everything we need to handle the events happening to Custom Resources - just a little bit of initialization remains to be done.  
  
In your `com.fruits.bananacontroller.BananaControllerApplication` class (or whatever it is you have annotated with `@SpringBootApplication`) define the following `@Bean`s:  
```
    @Bean
    public KubernetesClient kubernetesClient() {
        return new DefaultKubernetesClient();
    }

    @Bean
    public Operator operator(
            KubernetesClient client,
            List<ResourceController<?>> controllers
    ) {
        Operator operator = new Operator(client, DefaultConfigurationService.instance());
        controllers.forEach(operator::register);
        return operator;
    }
```
  
The `kubernetesClient` method initializes the `KubernetesClient` instance that will be used by Java Operator SDK to call Kubernetes API and subscribe to events.  
`new DefaultKubernetesClient()` initializes a default client that will either read your `$HOME/.kube/config` file if you're running the app locally, or read the pod's `ServiceAccount` credentials if you're running it inside the cluster.  
There is normally no need to manually pass any credentials there.  
  
The `operator` method "registers" all of the `ResourceController` implementations you've defined (in our case it's only the `BananaController` class), using the `KubernetesClient` we initialized earlier to subscribe to Custom Resource events.  
  
This is it - the Java coding part is done, you can now build and deploy the app to the cluster.  
Of course, we also have to write integration tests for our controller, to make sure it actually works. That will be covered in the next part of the tutorial.  

We will cover the building/deployment process last.  
  
___
##### Testing the Controller application
As fun as it is to write the application itself, if you want to use your Controller in production, you have to be sure that it works *before* you deploy it.  
  
To that end, we need integration tests - that is, we need to deploy the Controller to an actual Kubernetes cluster and check how it handles different scenarios.  
Unit tests are also an important part of testing most applications, but I will not address them here - there is nothing Kubernetes-specific about them and they can be addressed by well-known tools like JUnit alone.  
  
To test a Kubernetes Controller, we will need to do the following:  
* Write integration tests that actually launch the app, instead of testing classes in isolation - we will use Spring Boot Test library to do that.
* Launch an actual Kubernetes cluster to test our controller against - we will use [Kubernetes In Docker (kind)](https://kind.sigs.k8s.io/docs/user/quick-start/) to launch a temporary single-node Kubernetes cluster in a Docker container. That way we can avoid the lengthy setup of a proper cluster or launching it in the cloud, and can just run the cluster right inside our CI pipelines.
* Run our integration tests on the same machine where we launched [kind](https://kind.sigs.k8s.io/docs/user/quick-start/).  

---
##### Writing integration tests
As an example, we'll write a simple test that programmatically creates a `Banana` resource in the cluster, waits for it to be painted the desired color, and then deletes the `Banana`.  
  
Inside *src/test/java* directory create a *com.fruits.bananacontroller.BananaControllerApplicationTests* class with the following content:  
```
@SpringBootTest
class BananaControllerApplicationTests {

    @Test
    public void bananaIsPainted() {
        // Create a banana in the 'default' namespace with spec.color = 'white' and metadata.name = 'white-banana'
        BananaSpec spec = new BananaSpec();
        spec.setColor("white");
        Banana banana = new Banana();
        banana.getMetadata().setName("white-banana");
        banana.getMetadata().setNamespace("default");
        banana.setSpec(spec);

        // There are no bananas before we create one
        assertEquals(0, listBananas("default").size());

        // Create a banana
        applyBanana(banana);
        // Now there is one banana - the one we created
        List<Banana> bananas = listBananas("default");
        assertEquals(1, bananas.size());
        assertEquals(banana.getMetadata().getName(), bananas.get(0).getMetadata().getName());
        assertEquals(banana.getSpec().getColor(), bananas.get(0).getSpec().getColor());
        // Color in the 'status' subresource is null - the operator hasn't run yet
        assertNull(bananas.get(0).getStatus().getColor());

        // Wait for the banana to be painted
        safeWait(4000);

        bananas = listBananas("default");
        assertEquals(1, bananas.size());
        assertNotNull(bananas.get(0).getStatus().getColor());
        assertEquals(banana.getSpec().getColor(), bananas.get(0).getStatus().getColor());

        // Delete the banana
        deleteBanana(banana);
        safeWait(3000);

        // The banana list should again be empty
        assertEquals(0, listBananas("default").size());
    }
    
    // Utility methods omitted - see the repository for details

    private void safeWait(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            throw new IllegalStateException(e);
        }
    }
}
```
  
I omitted the `applyBanana`/`deleteBanana` and `listBananas` utility methods - they are programmatic equivalents of `kubectl apply`/`kubectl delete` and `kubectl get` commands, respectively, but programmatic access to Kubernetes API is out of scope of this tutorial.  
For the details see [the project repository](https://github.com/i-sergienko/banana-operator/blob/main/src/test/java/com/fruits/bananacontroller/BananaControllerApplicationTests.java), but note that I did not implement them in the most elegant way - just enough to make the tests work.  
  
The interesting part is the `bananaIsPainted` method. It does the following in the specified order:  
* Checks that no `Banana` resources exist at the start of the test.  
* Creates a `Banana` resource in the `default` namespace with `metadata.name = white-banana` and `spec.color = white`.
* Lists the `Banana` resources again, and checks that there is now 1 `Banana` - the one that we created.  
* Checks that the created `Banana` doesn't have a `status.color` field fillied yet - that is because we retrieve the resources immediately after creating one. The processing of a `Banana` by our Controller application takes 3 seconds, so immediately after creation it shouldn't be "painted" yet.  
* Wait 4 seconds for the `Banana` to be processed by our Controller.  
* List the `Banana` resources again, and check that this time our only `Banana` has `spec.color == status.color`, i.e. that it has been successfully "painted" and the `status` field has been updated by the Controller.  
* Deletes the `Banana`, and waits for 3 seconds for the cluster to clean up the resource.
* Checks that no `Banana` resources exist after we've deleted our only one.  
  
Nothing complex, but this should be enough to show that our Controller app functions in a real Kubernetes environment.  
Now to the interesting part - how do we create that environment?  
  
---
##### Preparing the testing environment and running the tests
You can use any existing Kubernetes cluster to test against - a local `minikube`, a managed cloud one, etc. - but that is not very convenient for test automation. We will use a more light-weight solution that can create a temporary Kubernetes cluster just to run the tests.  
  
Make sure [Docker](https://docs.docker.com/engine/install/), [KiND](https://kind.sigs.k8s.io/docs/user/quick-start/) and [kubectl](https://kubernetes.io/docs/tasks/tools/) are installed on the machine you're going to use to run the tests.  
  
Run `kind create cluster` to start up a local single-node Kubernetes cluster.  
  
Once the cluster is up and running, we need to apply the CRD to register our new custom resource.  
Run `kubectl apply banana-crd.yaml`. Use the [*ops/banana-crd.yaml*](https://github.com/i-sergienko/banana-operator/blob/main/ops/banana-crd.yaml) file from the project repository.  
  
Now that we have the cluster running and the CRD registered, we can actually execute our tests.  
Run `./mvnw package` to run the integration tests and build the app. If the tests are successful, you'll now also have the app packed into a `.jar` file, ready for being built into a Docker container.  
  
---
##### Building the application image
After the tests have successfully executed in the previous step, you have a *target/banana-controller-$VERSION.jar* file that you can bake into a Docker container.  
There is [a reference Dockerfile](https://github.com/i-sergienko/banana-operator/blob/main/Dockerfile) in the project repository - check it out.  
  
Run `docker build -t banana-operator:latest .` to build the Docker container.  
  
Tag your image and push it to your registry (DockerHub/AWS ECR/something else you use).  
  
Now that you've built the container image and pushed it to your registry, all you have to do is deploy it to your k8s cluster.  
  
___
##### Deploying the Operator to your Kubernetes cluster
To deploy the Operator we'll need to apply the following resources to the target k8s cluster:  
* `banana-operator` Namespace
* The CustomResourceDefinition we defined previously in *banana-crd.yaml*
* `banana-operator` ClusterRole, ServiceAccount and ClusterRoleBinding, to allow the controller to access `Banana` resources
* `banana-controller` Deployment, located in the new `banana-oparator` namespace and using the `banana-operator` ServiceAccount  

We've already seen [the CustomResourceDefinition](https://github.com/i-sergienko/banana-operator/blob/main/ops/banana-crd.yaml) multiple times, so no need to explain it.  
  
[The Namespace configuration](https://github.com/i-sergienko/banana-operator/blob/main/ops/namespace.yaml) is trivial, since we only have to specify the name:  
```
apiVersion: v1
kind: Namespace
metadata:
  name: banana-operator
```
  
[The RBAC configuration](https://github.com/i-sergienko/banana-operator/blob/main/ops/rbac.yaml) is a bit more involved:  
```
# The role to be assumed by the operator.
# Since in a typical case the operator manages custom resources across the whole cluster,
# this is a ClusterRole (not restricted to 1 namespace)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: banana-operator
rules:
  # Allows all actions on Banana resources
  - apiGroups:
      - fruits.com
    resources:
      - bananas
      # The "status" subresource requires an explicit permission
      - bananas/status
    verbs:
      - "*"
  # Allows to read CRDs - necessary for Operator SDK to work
  - apiGroups:
      - apiextensions.k8s.io
    resources:
      - customresourcedefinitions
    verbs:
      - "get"
      - "list"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: banana-operator
  namespace: banana-operator
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: banana-operator
subjects:
  - kind: ServiceAccount
    name: banana-operator
    namespace: banana-operator
roleRef:
  kind: ClusterRole
  name: banana-operator
  apiGroup: ""
```  
We define a ClusterRole with permissions to do anything to `Banana` resources, a ServiceAccount in the `banana-operator` namespace, and a ClusterRoleBinding to attach the new ClusterRole to the new ServiceAccount.  
  
Finally, we define [the Deployment](https://github.com/i-sergienko/banana-operator/blob/main/ops/deployment.yaml):  
```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: banana-controller
  namespace: banana-operator
  labels:
    app: banana-controller
spec:
  replicas: 1
  selector:
    matchLabels:
      app: banana-controller
  strategy:
    type: Recreate # Assure that no more than 1 controller is active at all times
  template:
    metadata:
      labels:
        app: banana-controller
    spec:
      # Use the ServiceAccount from rbac.yaml
      serviceAccountName: banana-operator
      containers:
        - image: localhost:5000/banana-operator:latest
          name: banana-controller
          env:
            - name: JAVA_OPTS
              value: "-Xmx75m"
            - name: PORT
              value: "8080"
          resources:
            requests:
              memory: 50Mi
            limits:
              memory: 80Mi
          startupProbe:
            httpGet:
              port: 8080
              path: /actuator/health
          livenessProbe:
            httpGet:
              port: 8080
              path: /actuator/health
```  
We define the basic healthchecks, resource requirements and specify the ServiceAccount to use.  
  
Finally, we can apply all of the resources above, and the Operator deployment is complete:  
```
kubectl apply -f ops/namespace.yaml
kubectl apply -f ops/banana-crd.yaml
kubectl apply -f ops/rbac.yaml
kubectl apply -f ops/deployment.yaml
```
  
You can also just run [the *ops/scripts/deploy-operator.sh* script](https://github.com/i-sergienko/banana-operator/blob/main/ops/scripts/deploy-operator.sh), which executes the 4 `kubectl apply` commands from above, and works from any location.  
  
For an example of a full build/test/deploy pipeline you can refer to [the github workflow](https://github.com/i-sergienko/banana-operator/blob/main/.github/workflows/build-and-test-operator.yaml) defined in the repository. It does exactly what's described above.  
  
___
##### You did it!
You've built your first Kubernetes Operator in Java, or at least you've read this whole article. Thank you for reading it 🙇‍♂️  
I hope this article helped you understand the whole Operator development process end-to-end - I wrote it because at the time when I was learning to do this, I could not find tutorials with detailed enough explanations - this is my attempt to remedy that lack of information.  
  
Be sure to also take a look at [the Java Operator SDK repository](https://github.com/java-operator-sdk/java-operator-sdk) - there are [different examples using Spring, Quarkus and just pure Java](https://github.com/java-operator-sdk/java-operator-sdk/tree/master/samples).
