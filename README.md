# DeHeus_BPMNToolApp

### Project
- **Project Name:** BPMN Tool Application
- **Company:** De Heus

### Team
- **Team Name:** TechSwift
- **Members:**
  - Christina Yoo
  - SeongJoon Hong
  - Seungmin Lee
  - YoungHo Kim

---

## 1. Main Project Structure
#### `./client/`: Main code directory for frontend
	- `src/`: main source code directory
		- `components/`: project pages and modals
			- `common/`: authentication and modals
			- `Admin.js`: admin page
			- `ErrorPage.js`: error page
			- `Home.js`: homepage
			- `ListSingleProject.js`: process list page
			- `Main.js`: project list page
			- `MyPage.js`: user`s my page
			- `bpmnModeler.js`: bpmn modeler file for diagrams
		- `config/:` for authentication
		- `features/`: features for bpmn modeler
			- `palette/`: custom palette from bpmn.js node module
			- `popup/`: custom popup from bpmn.js node module
			- `replace/`: custom replace from bpmn.js node module
			- `search/`: custom search from bpmn.js node module
			- `sidebar/`: sidebar for process heirarchy
			- `subprocess/`: custom subprocess from bpmn.js node module
			- `toolbar/`: toolbar for modeler
				- `toolbar.js`: handles basic modeler and user functions including checkout, publish, view contributor, and etc.
		- `providers/`: extensions for the BPMN properties panel. Further implementation guides on custom elements and properties can be found at 'https://github.com/bpmn-io/bpmn-js-examples/tree/main'
			- `descriptor/`: moddle descriptors for custom BPMN elements
			- `props/`: property entries for custom BPMN elements
			- `AttachmentPropertiesProvider.js`: provider for displaying custom attachment property
			- `DropdownProvider.js`: provider for displaying custom dropdown property
			- `ParameterProvider.js`: provider for displaying custom parameter(extension) property
			- `index.js`: for initiating providers into modeler
		- `readOnlyProviders/`: extensions for the BPMN properties panel for readOnly user
		- `resources/`: Contains and manages svgs for toolbar
		- `styles/`: Contains CSS for application
		- `utils/`: Contains files for exporting and managing local status 
		- `App.js`: Handles routes for pages
		- `index.css`: CSS for application
	- `.dockerignore`: Specifies files and directories that should be ignored when building a Docker image for the backend. This typically includes files that aren’t needed in the final Docker container, such as `node_modules/`
	- `nginx.conf`: Configuration file for the NGINX web server in deployment, which is often used as a reverse proxy to serve static files, manage load balancing, and handle routing between frontend and backend services
#### `./server/`: Main code directory for the backend. Contains all the core backend logic, configuration, and deployment files.
	- `src/`: Main source code directory
		- `config/`: Configuration files for the backend server, such as database connections and CORS settings
		- `corsOptions.js`: Configuration for Cross-Origin Resource Sharing (CORS)
		- `dbConfig.js`: Database configuration, such as connection details (host, user, password, database name)
	- `controllers/`: Contains the logic for handling different API requests
		- `adminController.js`: Handles API requests related to admin-level operations
		- `attachmentsController.js`: Manages API requests related to file attachments on the modeler
		- `authController.js`: Handles authentication-related tasks, including user authentication, token generation, and validation
		- `diagramController.js`: Manages operations for handling diagrams on the modeler
		- `processesController.js`: Handles operations related to business processes in projects
		- `projectsController.js`: Manages the logic for project-specific details
		- `userController.js`: Handles operations related to users, including retrieving user details, updating profiles, and managing user permissions	
	- `.dockerignore`: Specifies files and directories that should be ignored when building a Docker image for the backend. This typically includes files that aren’t needed in the final Docker container, such as `node_modules/`
	- `backend-deployment.yaml`: Kubernetes configuration file used to define the deployment of the backend service on a Kubernetes cluster
	- `loadbalancer-service.yaml`: Kubernetes configuration file for creating a LoadBalancer service to allows external traffic
	- `cert.pem`: The SSL/TLS certificate used to encrypt communications for HTTPS
	- `key.pem`: The private key used to securely authenticate the SSL/TLS certificate



## 2. Environment Variables
To run this project, you will need to add the following environment variables to your `.env` file:

### 1. Frontend Environment Variables
For local development and Azure deployment, the following variables must be set:
- `/client/.env`: 
	- **REACT_APP_FRONTEND_URL**: The URL of the deployed frontend on Azure App Service (AAS).
	- **REACT_APP_API_URL**: The URL of the deployed backend API hosted on Azure Kubernetes Service (AKS).
	- **REACT_APP_AZURE_CLIENT_ID**: The Azure Active Directory (AAD) client ID used for authentication.
	- **REACT_APP_AZURE_TENANT_ID**: The Azure AAD tenant ID associated with your application.

### 2. Server Environment Variables
- `/server/.env`: 
	- **PORT**: The port on which the server will run. `443` is the standard port for HTTPS traffic in deployment.
	- **PASSPHRASE**: The passphrase for securing private keys, if applicable (leave blank if not used).
	- **DB_USER**: The username for the database connection.
	- **DB_PASSWORD**: The password associated with the `DB_USER` for authentication.
	- **DB_DATABASE**: The name of the database to be used.
	- **DB_SERVER**: The database server address, which in Azure would typically be something like `your-database-server.database.windows.net`.

Ensure these values are set correctly in the Azure environment or on your local machine for development.



## 3. Deployment

### 1. Deployment Platform
This project is deployed on **Azure App Service (AAS)** and **Azure Kubernetes (AKS)** using **Azure Container**.

### 2. Steps to Deploy (Frontend & Backend)

You don't need to run `npm run build` manually since the Dockerfile already handles the build process. Tthe Docker image itself will include the necessary build steps.

1. Log in to Azure Container Registry (ACR) and build the Docker image:
    ```bash
    az acr login --name vnacrsabpmnregp01
    docker build -t vnacrsabpmnregp01.azurecr.io/frontend:latest .
    docker push vnacrsabpmnregp01.azurecr.io/frontend:latest
    ```

2. For the backend, the same process applies:
    ```bash
    docker build -t vnacrsabpmnregp01.azurecr.io/backend:latest .
    docker push vnacrsabpmnregp01.azurecr.io/backend:latest
    ```

3. Deploy the backend to Azure Kubernetes Service (AKS):
    ```bash
    kubectl apply -f backend-deployment.yaml
    kubectl apply -f loadbalancer-service.yaml
    kubectl rollout restart deployment backend-deployment --namespace default
    ```

We already set up a CI/CD pipeline in **Azure App Service (AAS)**, so you only need to push the Docker images to **Azure Container Registry (ACR)**, and the deployment will happen automatically. But you need to reatart the **Azure Kubernetes (AKS)** after you push the new Docker images. And also, ensure that the environment variables (both frontend and backend) are properly configured in Azure.


## 3. Notes
As we mentioned on Teams channel and bi-weekly meeting, there are several things to notice:
### 1. Azure Automation
Azure Automation Account is still needed to complete the checkout function. Without this, the 'automatically checkout in 14 days' feature is not available.
### 2. SSL Certificate
For further HTTPS support, you have three options:
1. **Company-issued SSL Certificate**: Place the SSL certificate files (`cert.pem` and `key.pem`) in the relevant directory for secure communication.
2. **Azure Application Gateway**: If security policies prevent placing certificate files in the server directory, you can set up Azure Application Gateway to manage SSL certificates securely.
3. **Azure Front Door**: Alternatively, use Azure Front Door, which handles SSL termination for you, meaning no need to manage SSL certificate files locally.