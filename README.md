# DeHeus_BPMNToolApp
### 데모 영상과 더 자세한 정보를 담긴 문서를 참고해주시길 바랍니다.
https://legend-waste-c00.notion.site/143d39f0dbf380fcb695fea7c6fa10e6

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

## Current Status (restoration notes)

This repo was originally built for **Azure** (Azure SQL Database, Docker, Azure Kubernetes Service, Microsoft SSO via Azure AD). It was later revived/restored for a temporary deployment, and the following were changed to make that possible:

- **Database**: Azure SQL → **PostgreSQL on Supabase**. All controller queries were ported from T-SQL (`mssql`) to Postgres (`pg`). See [Database Setup](#4-database-setup) below.
- **Hosting**: Docker/AKS → **Vercel** (two separate Vercel projects, one for `client/`, one for `server/`). The old `Dockerfile`, `backend-deployment.yaml`, `loadbalancer-service.yaml`, and `nginx.conf` files are still in the repo for reference but are **not used** by the current deployment.
- **HTTPS**: The server no longer terminates TLS itself (it used to read `cert.pem`/`key.pem`). Vercel handles HTTPS for both the frontend and backend automatically.
- **Login**: Real Microsoft SSO (Azure AD / MSAL) requires an Azure AD app registration, which wasn't available during this restoration. A **temporary mock-auth bypass** was added instead — see [Authentication](#3-authentication) below. This must be switched off before handing real user logins to anyone.

If this project moves to a permanent home, the two things most worth revisiting are: (1) whether to keep Supabase/Vercel or move back to Azure, and (2) wiring up a real Azure AD app registration to replace the mock-auth bypass.

---

## 1. Tech Stack
- **Frontend**: React, BPMN.js, JavaScript
- **Backend**: Node.js, Express.js, PostgreSQL (Supabase)
- **Authentication**: Microsoft SSO / Azure Active Directory (MSAL) — currently bypassed with a mock-auth layer for this deployment, see below
- **Deployment**: Vercel (frontend and backend as separate projects)

---

## 2. Main Project Structure
#### `./client/`: Main code directory for frontend
- `src/`: main source code directory
	- `components/`: project pages and modals
		- `common/`: shared nav/modal components (`TopBar.js`, `LeftNavBar.js`, `Loading.js`, etc.)
		- `Admin.js`: admin page
		- `ErrorPage.js`: error page
		- `Home.js`: homepage / login entry point
		- `ListSingleProject.js`: process list page
		- `Main.js`: project list page
		- `MyPage.js`: user's my page
		- `bpmnModeler.js`: bpmn modeler file for diagrams
	- `config/`: authentication config
		- `authConfig.js`: real MSAL/Azure AD config (`msalInstance`, `loginRequest`)
		- `mockAuth.js`: **temporary bypass** — re-exports either the real `@azure/msal-react` hooks or a fake always-authenticated mock user, controlled by `REACT_APP_MOCK_AUTH`. Every component that needs `useIsAuthenticated`/`useMsal`/`useAccount`/`MsalProvider` imports them from here instead of `@azure/msal-react` directly.
	- `features/`: features for bpmn modeler
		- `palette/`: custom palette from bpmn.js node module
		- `popup/`: custom popup from bpmn.js node module
		- `replace/`: custom replace from bpmn.js node module
		- `search/`: custom search from bpmn.js node module
		- `sidebar/`: hierarchy sidebar shown inside the modeler
		- `subprocess/`: drilldown behavior for navigating into sub-diagrams
		- `toolbar/`: toolbar for modeler
			- `toolbar.js`: save, import/export, zoom, undo/redo, align/distribute, checkout, publish, contributors, etc.
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
	- `index.css`: CSS for application (also holds the design tokens / shared component styles: sidebar, process lists, app shell)
- `vercel.json`: tells Vercel this is a Create React App build (SPA rewrites so client-side routes don't 404 on refresh)
- `Dockerfile`, `nginx.conf`: legacy, unused by the current Vercel deployment

#### `./server/`: Main code directory for the backend.
- `src/`
	- `config/`
		- `corsOptions.js`: CORS whitelist — **must include the deployed frontend's URL**
		- `dbConfig.js`: Postgres connection pool (`pg`), reads `DATABASE_URL`
	- `controllers/`: request handlers
		- `adminController.js`: admin-level operations (user management, role assignment)
		- `attachmentsController.js`: file attachments on the modeler (stored as `bytea` in Postgres, not on disk)
		- `authController.js`: decodes the MSAL token and checks the `user` table
		- `diagramController.js`: diagram CRUD, checkout/publish/drilldown logic
		- `processesController.js`: business process listing per project
		- `projectsController.js`: project-level operations
		- `userController.js`: checkout/cancel-checkout, "My Page" data
- `index.js`: Express app. Exports the app for Vercel's serverless runtime; only calls `app.listen()` when run directly (`node index.js`) for local dev.
- `schema.sql`: **run this once in the Supabase SQL editor** before starting the server — see [Database Setup](#4-database-setup)
- `vercel.json`: tells Vercel to build `index.js` with `@vercel/node` and route all requests to it
- `Dockerfile`, `backend-deployment.yaml`, `loadbalancer-service.yaml`: legacy Azure/Kubernetes deployment files, unused by the current Vercel deployment

---

## 3. Authentication

The app is built around Microsoft SSO (MSAL + Azure AD). For this restoration, no Azure AD app registration was available, so a **mock-auth bypass** was added purely for local development / demoing:

- Set `REACT_APP_MOCK_AUTH=true` and `REACT_APP_MOCK_EMAIL=<some email>` in `client/.env` (or in Vercel's env vars).
- `client/src/config/mockAuth.js` then fakes an always-logged-in MSAL session for that email, including a syntactically-valid (but unsigned) JWT — this works because `authController.authenticateUser` only `jwt.decode()`s the token without verifying its signature (a pre-existing, not-fixed-in-this-restoration characteristic of the original code).
- The mock user must already exist as a row in the `"user"` table (matched by email) for `/api/authenticate` to accept it.
- **Emails containing `.pbmn@`** are treated as admin/super-user throughout the backend (hardcoded in `projectsController.js`'s `adminEmails` and various `.includes('.pbmn@')` checks) and were also given full diagram-editing rights directly (bypassing the normal checkout workflow) for this restoration, so a single test account could exercise every feature. Real non-admin users still go through the normal editor/checkout/publish flow.

**To switch to real Microsoft SSO:** register an app in Azure AD (Entra ID), set `REACT_APP_AZURE_CLIENT_ID` / `REACT_APP_AZURE_TENANT_ID` in `client/.env`, and set `REACT_APP_MOCK_AUTH=false` (or remove it). No code changes should be needed — `mockAuth.js` falls back to the real `@azure/msal-react` hooks automatically when the flag is off.

---

## 4. Database Setup

The repo had no schema/migration files — `server/schema.sql` was written from scratch by reverse-engineering the queries in `server/src/controllers/*.js`.

1. Create a [Supabase](https://supabase.com) project.
2. Open the SQL Editor and run the contents of `server/schema.sql` once. (You'll be warned about Row Level Security — safe to skip; the server connects directly via a Postgres connection string, not through Supabase's REST API/anon key, so RLS doesn't apply to this access path.)
3. From the Supabase dashboard, copy the **Connection Pooling ("Transaction" mode)** connection string — not the direct connection — since serverless deployments need pooled connections. Use this as `DATABASE_URL`.

---

## 5. Environment Variables

### Frontend — `client/.env`
- **REACT_APP_API_URL**: URL of the deployed backend (no trailing slash).
- **REACT_APP_FRONTEND_URL**: URL of the deployed frontend itself.
- **REACT_APP_AZURE_CLIENT_ID** / **REACT_APP_AZURE_TENANT_ID**: Azure AD app registration details, only needed once real SSO replaces the mock bypass.
- **REACT_APP_MOCK_AUTH** / **REACT_APP_MOCK_EMAIL**: temporary bypass, see [Authentication](#3-authentication).

### Backend — `server/.env`
- **PORT**: port for local dev (e.g. `3001`). Not used by Vercel's serverless runtime, only by `node index.js` locally.
- **DATABASE_URL**: Supabase Postgres pooler connection string, see [Database Setup](#4-database-setup).

---

## 6. Deployment (Vercel)

The frontend and backend are deployed as **two separate Vercel projects** pointing at the same GitHub repo, with different Root Directories:

1. **Backend project** — Root Directory: `server`. Framework preset: "Other" (it uses `server/vercel.json`'s `builds`/`routes` directly). Add `DATABASE_URL` as an environment variable, then deploy.
2. **Frontend project** — Root Directory: `client`. Framework preset: Create React App. Add the frontend env vars listed above (`REACT_APP_API_URL` pointing at the backend project's URL from step 1). Also add `CI=false` — Vercel sets `CI=true` by default, and Create React App treats ESLint warnings as build-breaking errors under `CI=true`; this repo has a number of pre-existing lint warnings that are otherwise harmless.
3. After both are deployed, add the frontend's real URL to the `whitelist` array in `server/src/config/corsOptions.js` and redeploy the backend, and double-check `REACT_APP_API_URL`/`REACT_APP_FRONTEND_URL` on the frontend match the real deployed URLs (redeploy again if you changed them).

Pushing to `main` triggers Vercel to redeploy both projects automatically.

---

## 7. Notes

- **Checkout expiry**: `diagram_checkout` rows get a 14-day `expiry_time`. Expiry is only checked *passively* when reading (e.g. "is this draft still valid for this user") — nothing actively cancels/cleans up expired checkouts in the background. The original Azure-based plan was to run this cleanup via an Azure Automation Account; there is no equivalent scheduled job set up in the current Vercel deployment.
- **Known pre-existing rough edges** (not blocking, not fixed in this restoration): a handful of dead dependencies (`mysql2`, `canvg`, `pdfmake`, `express-session`, `passport`, `passport-azure-ad` in `server/package.json`; `BsThreeDots`, `NoAuth` unused imports in a couple of client files), and some raw string-built SQL in older corners of the codebase that weren't touched during the DB migration.
