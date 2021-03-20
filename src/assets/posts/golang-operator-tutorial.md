___
#### Before we begin
I expect the reader to have certain knowledge and skills.  
Specifically, I expect you to know:
* Kubernetes basics - what default resources there are, how to deploy simple applications, how to use `kubectl`.
* On a high level, what a Custom Resource is, what a Custom Controller is and how they interact - you can read about these topics [in my previous post](/articles/kubernetes-operator).
* Go basics - going through [A Tour of Go](https://tour.golang.org/welcome/1) or reading [Go in Action](https://www.manning.com/books/go-in-action) and writing some simple apps should be enough.
  
What I am going to teach you:
* How to use [Operator SDK](https://sdk.operatorframework.io) to  write your own Custom Controller.
* How to write end-to-end tests for your Custom Controller in a realistic environment, using [kind](https://kind.sigs.k8s.io/docs/user/quick-start/).
* How to deploy your Operator (Custom Resource + Controller) to your k8s cluster.
___
#### Writing a Custom Controller with [Operator SDK](https://sdk.operatorframework.io)

The full code for this tutorial can be found [in my GitHub repository](https://github.com/i-sergienko/banana-operator-golang).  
  
Operator SDK is a powerful tool that will generate a lot of the necessary code for us. It generates so much of it, in fact, that it's a bit overwhelming for a beginner to figure out which parts of the code they should actually touch. My goal in this tutorial is flatten the learning curve as much as possible by pointing out exactly which parts are important for you as a developer, and which parts you can ignore.  
  
We are going to continue from where [the previous post](/articles/kubernetes-operator) left off, and implement a Controller app for a fictional `Banana` resource that looks like this:  
```
apiVersion: fruits.com/v1
kind: Banana
metadata:
  name: green-banana
spec:
  color: "green" # the desired color of the Banana
status:
  color: "yellow" # the color the Banana is currently painted
```  
The Controller application will ensure that the observed state of the `Banana` (represented by `status.color`) matches its desired state (represented by `spec.color`). 
  
The framework will do the following for us:  
* Generate the skeleton for model types - `Banana`/`BananaSpec`/`BananaStatus`. They represent, respectively, the Custom Resource itself, its `spec` field and its `status` field.
* Generate the `BananaReconciler` type - this will contain core event handling/reconciliation logic. It will subscribe to events and react to `Banana` resources being created/updated/deleted.  
* Generate all the initialization/wiring logic.
* Generate all the necessary k8s manifests (`CustomResourceDefinition`, controller `Deployment`, etc.).
  
Our job will be to do the following:  
* Implement the model types - `Banana`, `BananaSpec` and `BananaStatus`.  
* Implement the event handling/reconciliation logic in the `BananaReconciler` type.  
* Write integration tests.  
* Write CI/CD pipelines to build/test/deploy our Operator automatically.  
  
---
##### Project setup

Make sure the following software is installed on your machine:
* [Git](https://git-scm.com/downloads)
* [Golang](https://golang.org/doc/install) - v.1.15 is used in this tutorial.  
* [Operator SDK](https://sdk.operatorframework.io/docs/building-operators/golang/installation/) - v.1.3.0 is used in this tutorial.  
  
Create and enter the project directory:  
```
mkdir banana-operator-golang
cd banana-operator-golang
```  
Note that the name of the directory matters - it will be used as the project name as well as a prefix for all the generated Kubernetes manifests, so choose something meaningful (e.g. the name of your operator, like I did here).  
  
Initialize the project with Operator SDK:  
```
operator-sdk init --domain fruits.com --repo banana-operator-golang
```  
The two parameters mean the following:  
* `--domain` - the API group for our Custom Resources. Remember the `apiVersion` field in all the k8s YAML you write? For example, in a `Role` resource it looks like this: `apiVersion: rbac.authorization.k8s.io/v1beta1`. `rbac.authorization.k8s.io` is the domain here, also known as the API group. So in our case, since we specified `--domain fruits.com`, our Custom Resource YAML will contain `apiVersion: fruits.com/v1` (assuming the resource version we create is `v1`).  
* `--repo` - name of the generated Go module. As the name suggests, it can be a GitHub repository reference (e.g. `github.com/i-sergienko/banana-operator-golang`), but it doesn't have to be.  
  
When you run the command above, the framework will generate a lot of boilerplate code for you, virtually none of which you'll likely need to care about.  
The possible exceptions are:  
* `Makefile` - defines commands to build/test/deploy the app. Depending on your use case you might want to modify it (we'll do that for running integration tests later).  
* `main.go` - the entry point of our app. For simple use cases you don't have to modify it - we will not touch it in this tutorial. Just note that all the wiring/initialization is done for you.  
Also note the `config/` directory - all the generated k8s manifests will be located there, but you don't have to modify any of them manually.  
  
At this point we have neither the Custom Resource model types, nor the event-handling Controller type. That is what we are going to generate next.  

___
##### Creating an API - model/controller types
Run the following command:  
```
operator-sdk create api --version v1 --kind Banana --resource --controller
```  
Let's break down the parameters:  
* `--version` - the API version of your resource. This will be part of the `apiVersion` field of our resource - `apiVersion: fruits.com/v1` in this case (note our old friend `--domain fruits.com` from the `init` command).  
* `--kind` - the name of our new Custom Resource. We will write `kind: Banana` in our YAML later, since we've specified `--kind Banana`.  
* `--resource` - flag saying "please generate the model types (i.e. types) for me".  
* `--controller` - flag saying "please generate the controller type for me".  
  
The command will generate two interesting directories:  
* `api/v1/` - contains the generated Custom Resource model (types). Specifically, the types are located in the `api/v1/${KIND_NAME}_types.go` (in our case it's `api/v1/banana_types.go`) - pay no attention any other files in the same directory, you won't have to touch them.  
* `controllers/` - contains the generated Controller type (in our case it's the `BananaReconciler` type in the `controllers/banana_controller.go` file) and a blank test suite (`suite_test.go`).
  
Both the model types and the controller are currently empty - the model types contain no useful fields and the controller doesn't have any event-handling logic.  
Implementing them will constitute the bulk of our job.  

---
##### Implementing the model types
At this point we have the skeleton for our model types generated in the `api/v1/banana_types.go` file.  
They currently look like this (some generated comments omitted for readability):  
```
// BananaSpec defines the desired state of Banana
type BananaSpec struct {
	Foo string `json:"foo,omitempty"`
}

// BananaStatus defines the observed state of Banana
type BananaStatus struct {
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// Banana is the Schema for the bananas API
type Banana struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   BananaSpec   `json:"spec,omitempty"`
	Status BananaStatus `json:"status,omitempty"`
}
```  
Note the comments starting with `// +kubebuilder:...` - these are **necessary**, do not remove them or change their position ([unless you understand exactly what you're doing](https://book.kubebuilder.io/reference/markers.html)).  
  
We don't need to touch the `Banana` struct itself - it's fine as it is - but we do want to modify the `BananaSpec` and `BananaStatus`, since they don't contain the fields we need.  
  
Let's add the `color` field that we need to both `spec` and `status`:  
```
// BananaSpec defines the desired state of Banana
type BananaSpec struct {
	Color string `json:"color,omitempty"`
}

// BananaStatus defines the observed state of Banana
type BananaStatus struct {
	Color string `json:"color,omitempty"`
}
```  
Remember to run `make generate` every time you modify these types - this will re-generate some of the boilerplate that you don't have to edit manually, or even read, but it's necessary for the application to function.  
  
This is all we need to do with the model types.  
Run `make manifests` and observe that a CRD manifest with all the necessary fields was generated in `config/crd/bases/`.  

---
##### Implementing the controller
Now let's implement the resource controller for our `Banana` custom resource.  
This is going to be the heart of our application - all the event-handling and reconciliation logic is going to be located here.  
  
We already have the `BananaReconciler` type generated for us in `controllers/banana_controller.go`.  
We are only interested in changing 1 method here - the `BananaReconciler.Reconcile` method, which is currently empty:  
```
func (r *BananaReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = r.Log.WithValues("banana", req.NamespacedName)

	// your logic here

	return ctrl.Result{}, nil
}
```  
This method is invoked any time a `Banana` resource changes in the cluster - e.g. when you run `kubectl apply -f banana.yaml` or `kubectl delete banana banana-name`.  
Before we implement it, let's take a look at the parameters and the result type.

Let's first break down the method parameters:  
* Parameter: `ctx context.Context` - performs dark voodoo magic allowing us to call the Kubernetes API. You don't need to know exactly what it does at this point - just note that we'll pass it to the Kubernetes client to make API calls.  
* Parameter: `req ctrl.Request` - carries some metadata of the resource being changed - namely, you can get the `Name` and the `Namespace` of the resource (or the `NamespacedName` which combines them). Using that metadata, you can actually retrieve the resource from Kubernetes API.  
  
The result type `(ctrl.Result, error)` allows you control reconciliation scheduling.  
The following values are possible:  
* `ctrl.Result{}, nil` - signals to stop reconciliation. If you return this, the `Reconcile` method will not be invoked again unless another event is generated externally.  
* `ctrl.Result{}, err` - signals that an error occurred during reconciliation. If you return this, the controller will retry (by calling the `Reconcile` method again) until the handling succeeds, or indefinitely.  
* `ctrl.Result{Requeue: true}, nil` - signals to repeat reconciliation. Just like with the previous option, beware of an infinite reconciliation loop if you return this.  
* `ctrl.Result{RequeueAfter: 3 * time.Minute}, nil` - signals to repeat the reconciliation after the specified period (3 minutes in this example). Useful if you need periodic reconciliation aside from just reacting to events.
  
Now that we know what we're getting as input and producing as output, we can start implementing the event handling logic.  
There are 2 types of events we need to be able to handle:  
* "Create"/"update" event - we cannot reliably distinguish between the two, so they are treated as one type.  
  "Create"/"update" event handler assures that the actual state of the resource matches its desired state (as defined in `spec`). For example, if your Custom Resource is `CloudVirtualMachine`, during the "create"/"update" stage you would issue API calls to the cloud provider to check that if a VM instance with the desired specifications is running, and if it isn't, you'd issue an API call to launch it.  
* "Delete" event - handling this event typically involves some cleanup logic. For example, if your Custom Resource is `CloudVirtualMachine` and during your "create"/"update" stage you created a VM instance in the cloud, during the cleanup stage you would invoke the API calls to the cloud provider to shut down/delete the VM.
  
Since the handling logic for the 2 event types is different, let's define dedicated methods for each of them - that way concerns are separated, and the code is more readable.  
We will just define the signatures for now, and implement them later:  
```
func (r *BananaReconciler) handleCreateOrUpdate(ctx *context.Context, banana *fruitscomv1.Banana, log *logr.Logger) error {
  // Creates and updates will be handled here
  return nil
}

func (r *BananaReconciler) handleDelete(ctx *context.Context, banana *fruitscomv1.Banana, log *logr.Logger) error {
  // Deletes will be handled here
  return nil
}
``` 
  
##### IMPORTANT: both of these methods have to be IDEMPOTENT.
That is, when invoked multiple times, they should produce the same result - e.g. if the resource is already handled, there might not be a need to process it again, and your controller should realize that.  
The reason for the idempotency requirement is that the framework can only guarantee *at least once* delivery of events - that means that one event might sometimes be passed to the handler multiple times.
  
___
##### Dispatching from the Reconcile method
We obviously have to call the two methods (`handleCreateOrUpdate`/`handleDelete`) from somewhere - that somewhere being the `Reconcile` method, so let's implement it first:  
```
func (r *BananaReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := r.Log.WithValues("banana", req.NamespacedName)

	// Retrieve the Banana resource being updated from the Kubernetes API
	banana := &fruitscomv1.Banana{}
	err := r.Get(ctx, req.NamespacedName, banana)
	if err != nil {
		if errors.IsNotFound(err) {
		  // If Banana is not found, we don't have to do anything - just ignore the event
			log.Info("Banana not found: ignoring resource.", "namespacedName", req.NamespacedName)
			return ctrl.Result{}, nil
		}

		log.Error(err, "Failed to retrieve Banana", "namespacedName", req.NamespacedName)
		return ctrl.Result{}, err
	}

	if banana.GetDeletionTimestamp() == nil {
		// If deletion timestamp is not present, the resource must have been created or updated
		// Resource processing is performed in `handleCreateOrUpdate`
		return ctrl.Result{}, r.handleCreateOrUpdate(&ctx, banana, &log)
	} else {
		// If deletion timestamp is there, the resource must have been deleted
		// Additional cleanup is performed in `handleDelete`
		return ctrl.Result{}, r.handleDelete(&ctx, banana, &log)
	}
}
```  
  
Quite a lot happening here, so let's break it down.  
  
First of all, when the method is invoked, we need to retrieve the affected `Banana` resource.  
The resource is not passed to us right away, instead we have the `req ctrl.Request` metadata containing the resource's name and namespace.  
We can use this metadata to retrieve the resource from the API:  
```
	// Retrieve the Banana resource being updated from the Kubernetes API
	banana := &fruitscomv1.Banana{}
	err := r.Get(ctx, req.NamespacedName, banana)
	if err != nil {
		if errors.IsNotFound(err) {
		  // If Banana is not found, we don't have to do anything - just ignore the event
			log.Info("Banana not found: ignoring resource.", "namespacedName", req.NamespacedName)
			return ctrl.Result{}, nil
		}

		log.Error(err, "Failed to retrieve Banana", "namespacedName", req.NamespacedName)
		return ctrl.Result{}, err
	}
```
  
If we've successfully retrieved the resource, we can call either the `handleCreateOrUpdate` method or the `handleDelete` method:  
```
	if banana.GetDeletionTimestamp() == nil {
		// If deletion timestamp is not present, the resource must have been created or updated
		// Resource processing is performed in `handleCreateOrUpdate`
		return ctrl.Result{}, r.handleCreateOrUpdate(&ctx, banana, &log)
	} else {
		// If deletion timestamp is there, the resource must have been deleted
		// Additional cleanup is performed in `handleDelete`
		return ctrl.Result{}, r.handleDelete(&ctx, banana, &log)
	}
```
The event type is not passed to us either, so to distinguish between creates/updates and deletes we take a look at the deletion timestamp.  
If the deletion timestamp is present, it means the resource has been deleted, and we need to clean it up. Otherwise we consider it a create/update event.  
  
This is all we have to do in the `Reconcile` method. From here on it's the job of either `handleCreateOrUpdate` or `handleDelete` to process the event. We will take a look at them next.  
  
---
##### Create/Update event handling
Let's implement the `handleCreateOrUpdate` method.  
Inside it, we're going to do the following:  
* Check if our custom [finalizer](https://book.kubebuilder.io/reference/using-finalizers.html) is present on the resource. If it's not there, we'll add the finalizer, update the resource and return - since the update will trigger another reconciliation iteration, we have to end this one.  
* If the finalizer is already there, and the desired state of our resource (represented by `spec.color`) is different from the observed state (represented by `status.color`), we're going to simulate processing ("paint" the `Banana`) and then update the resource status.  
  
If you're confused by what a finalizer is, it's basically a marker that tells Kubernetes not to delete the resource from the database until it has been processed by the controller.  
A controller places a finalizer on the resource the first time it sees it (on create/update), and removes it as part of the deletion event handling.  
As long as there is at least one finalizer present on the resource, it will not be deleted from the database.  
  
The whole create/update handling looks like this:  
```
func (r *BananaReconciler) handleCreateOrUpdate(ctx *context.Context, banana *fruitscomv1.Banana, log *logr.Logger) error {
	if !controllerutil.ContainsFinalizer(banana, BananaFinalizer) {
		// If the finalizer is not yet present, add it
		controllerutil.AddFinalizer(banana, BananaFinalizer)
		err := r.Update(*ctx, banana)

		if err != nil {
			(*log).Error(err, "Failed to add finalizer", "bananaResource", banana)
			return err
		}
	} else if banana.Spec.Color != banana.Status.Color {
		// If spec.color != status.color, we need to "paint" the Banana resource
		// Simulate work. In a real app you'd do your useful work here - e.g. call external API, create k8s objects, etc.
		err := r.processBanana(banana, log)

		if err != nil {
			(*log).Error(err, "Failed to process Banana", "bananaResource", banana)
			return err
		}

		(*log).Info("Updating Banana Status.", "bananaResource", banana)
		err = r.Status().Update(context.Background(), banana)

		if err != nil {
			(*log).Error(err, "Failed to update Banana status", "bananaResource", banana)
			return err
		}
	}

	return nil
}

func (r *BananaReconciler) processBanana(banana *fruitscomv1.Banana, log *logr.Logger) error {
	(*log).Info("Painting Banana", "bananaResource", banana)
	// Pretend that painting the Banana takes 3 seconds - e.g. external API calls take that much
	time.Sleep(3 * time.Second)
	banana.Status.Color = banana.Spec.Color
	(*log).Info("Banana painted successfully", "bananaResource", banana)
	return nil
}
```
  
---
##### Deletion event handling
Now let's implement the `handleDelete` method.  
  
It's going to do the following:
* Run the necessary cleanup logic. We're just going to simulate it in the `cleanUpBanana` method, but in a real use case this is where you'd make sure the associated resources are properly deleted, e.g. issue a `DELETE` API call to your cloud provider.  
* If the cleanup logic was successful, we remove our custom finalizer that we added earlier during create/update processing, thus notifying Kubernetes that the resource can now be deleted from the database.  
  
The logic looks like this:  
```
func (r *BananaReconciler) handleDelete(ctx *context.Context, banana *fruitscomv1.Banana, log *logr.Logger) error {
	(*log).Info("Banana is being deleted", "bananaResource", banana)
	if controllerutil.ContainsFinalizer(banana, BananaFinalizer) {
		// Run cleanup logic (external API calls, etc.)
		if err := r.cleanUpBanana(banana, log); err != nil {
			return err
		}

		// Remove the finalizer if cleanup was successful. Once the finalizer is removed, k8s will delete the resource from etcd.
		controllerutil.RemoveFinalizer(banana, BananaFinalizer)
		err := r.Update(*ctx, banana)

		if err != nil {
			(*log).Error(err, "Failed remove finalizer", "bananaResource", banana)
			return err
		}
	}
	return nil
}

func (r *BananaReconciler) cleanUpBanana(banana *fruitscomv1.Banana, log *logr.Logger) error {
	(*log).Info("Cleaning up Banana", "bananaResource", banana)
	time.Sleep(3 * time.Second) // pretend that some external API calls or other cleanup take 3 seconds
	(*log).Info("Banana cleaned up successfully", "bananaResource", banana)
	return nil
}
```

___
##### Starting the application
At this point we have all the code we need to actually run the application.  
To run it against the Kubernetes cluster you have configured locally (using your `~/.kube/config` file), run the following commands:
* `make install` - this will install the CRD into the cluster. Specifically, it will render the templates inside the `config/crd` directory using `kustomize` and apply them.  
* `make run` - this will start the controller app locally.  
You can run `kubectl apply`/`kubectl delete` commands with `Banana` resources and see that it works.  
  
As fun as it is to run it locally, you'll probably want to deploy your controller to a real cluster sooner or later.  
You'll also want to write integration tests that check the functionality in a realistic environment.  
  
We will cover deployment first, and the integration testing will come last - that way we'll be able to run the tests against the app running in an actual Kubernetes cluster. 
  
___
##### Deploying the Controller
To deploy the app to an actual cluster, we need to do the following:  
* Build a docker image of our application.  
  This can be achieved by first exporting the image name (`export IMG='banana-controller:v1'`), and then building the docker image by running either `docker build -t ${IMG} .` or `make docker-build` (which does the same thing as the previous command).  
  We already have a `Dockerfile` generated by Operator SDK CLI in the project root, so there's no need to write it yourself.
* Push the image to the registry we're using. Run `docker push ${IMG}` (using the image name previously specified), or `make docker-push` (which does the same thing).  
  To push an image, you obviously need an image registry, so if you only plan to use the app locally, skip this step.
* Deploy the application to your Kubernetes cluster by running `make deploy`. This command will also use the previously exported `$IMG` environment variable, so make sure it's exported when you run the command.  
  The command will do the following:  
  1. Render all the k8s manifest templates in the `config/` - that includes a dedicated `Namespace` for the app, the `CustomResourceDefinition`, the app `Deployment` and all the necessary roles/cluster roles and bindings.
  2. Apply the rendered templates to your k8s cluster using your local `~/.kube/config` file. So make sure your `kubectl` is pointing at the correct cluster, if your local config contains credentials for mulltiple clusters.
  
If you need to "undeploy" the Controller app and the CRDs, just run `make undeploy` - this will once again render the `config/` templates and delete the rendered resources from your cluster using `kubectl delete`.  

___
##### Testing the Controller
To be sure that our app functions properly, we need integration tests - that is, we need to deploy the Controller to an actual Kubernetes cluster and check how it handles different scenarios.  
Unit tests are also an important part of testing most applications, but I will not address them here - there is nothing Kubernetes-specific about them.  
  
To test a Kubernetes Controller, we will need to do the following:  
* Launch an actual Kubernetes cluster to test our controller against - we will use [Kubernetes In Docker (KiND)](https://kind.sigs.k8s.io/docs/user/quick-start/) to launch a temporary single-node Kubernetes cluster in a Docker container. That way we can avoid the lengthy setup of a proper cluster or launching it in the cloud, and can just run the cluster right inside our CI pipelines.  
* Build and deploy our app to the cluster. We've already covered how to do this in the previous section, but there will be slight differences to that process when using [KiND](https://kind.sigs.k8s.io/docs/user/quick-start/).  
* Write integration tests that actually launch the app, instead of testing classes in isolation - we will use Spring Boot Test library to do that.
* Run our integration tests on the same machine where we launched [KiND](https://kind.sigs.k8s.io/docs/user/quick-start/).  
  
Instead of launching an actual cluster, you could use [the EnvTest package](https://sdk.operatorframework.io/docs/building-operators/golang/testing/).  
EnvTest only launches the Control Plane, instead of an actual k8s cluster. Operator SDK docs suggest that it's easier to use it in CI. However, I personally found it more difficult to set up than launching KiND, which is why we're not going to use EnvTest in this tutorial.

---
##### Writing integration tests
As an example, we'll write a simple test that programmatically creates a `Banana` resource in the cluster, waits for it to be painted the desired color, and then deletes the `Banana`.  
  
Operator SDK suggests using [the Ginkgo framework](https://onsi.github.io/ginkgo/) for testing controller applications.
You'll see that Operator SDK has already generated some setup logic for us inside the `controllers/suite_test.go` file:  
```
func TestAPIs(t *testing.T) {
	RegisterFailHandler(Fail)

	RunSpecsWithDefaultAndCustomReporters(t,
		"Controller Suite",
		[]Reporter{printer.NewlineReporter{}})
}

var _ = BeforeSuite(func() {
	logf.SetLogger(zap.New(zap.WriteTo(GinkgoWriter), zap.UseDevMode(true)))

	By("bootstrapping test environment")
	testEnv = &envtest.Environment{
		CRDDirectoryPaths: []string{filepath.Join("..", "config", "crd", "bases")},
	}

	cfg, err := testEnv.Start()
	Expect(err).NotTo(HaveOccurred())
	Expect(cfg).NotTo(BeNil())

	err = fruitscomv1.AddToScheme(scheme.Scheme)
	Expect(err).NotTo(HaveOccurred())

	// +kubebuilder:scaffold:scheme

	k8sClient, err = client.New(cfg, client.Options{Scheme: scheme.Scheme})
	Expect(err).NotTo(HaveOccurred())
	Expect(k8sClient).NotTo(BeNil())

}, 60)

var _ = AfterSuite(func() {
	By("tearing down the test environment")
	err := testEnv.Stop()
	Expect(err).NotTo(HaveOccurred())
})
```  
This works perfectly fine - we will not need to touch any of this.  
All we need to do is actually create some test cases.
  
Let's describe our test cases before we code them. Our tests will do the following, in the order specified:  
1. Check that create/update handling works:  
   * Check that no `Banana` resources exist at the start of the test. We haven't created any, so there shouldn't be any.  
   * Create a `Banana` resource with name `yellow-banana` in the default namespace, and check that immediately after creation the `status.color` value doesn't yet match `spec.color` - that is because the Controller app takes 3 seconds to process a new `Banana` resource (see `BananaReconciler.processBanana` method we created earlier).  
   * Wait 5 seconds for the processing to finish, and check the `status.color` field again. This time it should be the same as `spec.color`, since the Controller must have "painted" the `Banana`.  
4. Check that the cleanup logic works:  
   * Make sure the deletion timestamp of our `Banana` is `nil` before we delete it.
   * Delete the `Banana` and check that now the deletion timestamp is present. 
   * Check that immediately after deletion our custom finalizer `"bananas.fruits.com/finalizer"` is still there. It should not be removed until the Controller has processed the delete event, which takes 3 seconds.  
   * Wait 5 seconds for the processing to finish, and check that there is now no `Banana` resource named `yellow-banana` in our cluster.
  
Nothing complex, but this should be enough to show that our Controller app functions in a real Kubernetes environment.  
Let's write our tests in the same `controllers/suite_test.go` file we saw earlier, for simplicity  
Append this to the end of the file:  
```
var _ = Describe("Banana lifecycle", func() {
	It("Before we create a Banana, there aren't any", func() {
		bananas := fruitscomv1.BananaList{}

		err := k8sClient.List(context.Background(), &bananas, client.InNamespace("default"))
		Expect(err).NotTo(HaveOccurred())
		Expect(len(bananas.Items)).To(BeEquivalentTo(0))
	})

	It("A newly created Banana is not painted before processing", func() {
		banana := fruitscomv1.Banana{
			Spec: fruitscomv1.BananaSpec{Color: "yellow"},
		}
		banana.Name = "yellow-banana"
		banana.Namespace = "default"

		err := k8sClient.Create(context.Background(), &banana)
		Expect(err).NotTo(HaveOccurred())

		bananas := fruitscomv1.BananaList{}
		err = k8sClient.List(context.Background(), &bananas, client.InNamespace("default"))
		Expect(err).NotTo(HaveOccurred())
		Expect(len(bananas.Items)).To(BeEquivalentTo(1))
		Expect(bananas.Items[0].Name).To(BeEquivalentTo("yellow-banana"))
		Expect(bananas.Items[0].Spec.Color).To(BeEquivalentTo("yellow"))
		Expect(bananas.Items[0].Status.Color).NotTo(BeEquivalentTo("yellow"))
	})

	It("New Bananas are painted by the controller", func() {
		time.Sleep(5 * time.Second)

		banana := fruitscomv1.Banana{}
		err := k8sClient.Get(context.Background(), types.NamespacedName{
			Namespace: "default",
			Name:      "yellow-banana",
		}, &banana)
		Expect(err).NotTo(HaveOccurred())
		Expect(banana.Name).To(BeEquivalentTo("yellow-banana"))
		Expect(banana.Spec.Color).To(BeEquivalentTo("yellow"))
		Expect(banana.Status.Color).To(BeEquivalentTo("yellow"))
	})

	It("Deleted bananas go through cleanup logic", func() {
		banana := fruitscomv1.Banana{}
		err := k8sClient.Get(context.Background(), types.NamespacedName{
			Namespace: "default",
			Name:      "yellow-banana",
		}, &banana)
		Expect(err).NotTo(HaveOccurred())
		Expect(banana.GetDeletionTimestamp()).To(BeNil())

		err = k8sClient.Delete(context.Background(), &banana)
		Expect(err).NotTo(HaveOccurred())

		err = k8sClient.Get(context.Background(), types.NamespacedName{
			Namespace: "default",
			Name:      "yellow-banana",
		}, &banana)
		Expect(err).NotTo(HaveOccurred())
		Expect(controllerutil.ContainsFinalizer(&banana, BananaFinalizer)).To(BeTrue())
		Expect(banana.GetDeletionTimestamp()).NotTo(BeNil())

		time.Sleep(5 * time.Second)
		err = k8sClient.Get(context.Background(), types.NamespacedName{
			Namespace: "default",
			Name:      "yellow-banana",
		}, &banana)
		Expect(err).To(HaveOccurred())
		Expect(errors.IsNotFound(err)).To(BeTrue())
	})
})
```
  
All we have to do now is launch a testing environment and run the tests.  
  
---
##### Preparing the testing environment and running the tests
You can use any existing Kubernetes cluster to test against - a local `minikube`, a managed cloud one, etc. - but that is not very convenient for test automation. We will use a more light-weight solution that can create a temporary Kubernetes cluster just to run the tests.  
  
Make sure [Docker](https://docs.docker.com/engine/install/), [KiND](https://kind.sigs.k8s.io/docs/user/quick-start/) and [kubectl](https://kubernetes.io/docs/tasks/tools/) are installed on the machine you're going to use to run the tests.  
  
Run `kind create cluster` to start up a local single-node Kubernetes cluster.  
  
Once the cluster is up and running, we need to build and deploy our Controller app:  
* Run `export IMG='banana-controller:v1'` to set a name for a docker image we're about to build. We will not need to push it anywhere at this stage. Make sure not to use the `:latest` tag - [it doesn't work well with KiND](https://kind.sigs.k8s.io/docs/user/quick-start/#loading-an-image-into-your-cluster).  
* Run `make docker-build` to build a local Docker image.  
* Run `kind load docker-image $IMG` to load the image to KiND - without this step it will not be able to use it.  
* Run `make deploy` to render and apply the k8s manifest templates from `config/`.
  
Now that we have the cluster running, and the Controller app is deployed, we can actually execute our tests. You might need to wait 10-20 seconds for the Controller to start up before running tests, depending on the environment (e.g. my workflow in GitHub Actions sleeps for 20 seconds between deploying the app and running tests).  
Run `export USE_EXISTING_CLUSTER=true; make test` to run the integration tests against the cluster pointed at by your local `~/.kube/config` file (which happens to be the KiND cluster we started earlier).  

For an example of a full build/test pipeline you can refer to [the github workflow](https://github.com/i-sergienko/banana-operator-golang/blob/main/.github/workflows/test-operator.yml) defined in the repository. It does exactly what's described above.  
  
___
##### That's it!
You've built your first Kubernetes Operator in Golang, or at least you've read this whole article.️
  
Be sure to also take a look at [the Operator SDK docs](https://sdk.operatorframework.io/docs/building-operators/golang/).  
For a deeper understanding of the framework it also helps to read [the Kubebuilder book](https://book.kubebuilder.io/), and for understanding of the Kubernetes API in general you can refer to [Programming Kubernetes] (https://www.oreilly.com/library/view/programming-kubernetes/9781492047094/).  
