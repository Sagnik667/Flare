# Flare: A Web-Based Women Safety and Emergency Response Platform

Flare is an academic full-stack web application designed to enhance personal safety by facilitating rapid emergency dispatch, real-time geolocation tracking, and community-driven safety resource management. The platform connects individuals in distress with administratively verified volunteer responders and municipal safety infrastructure.

---

## 1. System Architecture and Technology Stack

Flare is built using a decoupled client-server architecture. It utilizes a Single Page Application (SPA) frontend, a RESTful Node.js/Express API backend, a PostgreSQL relational database hosted on Neon, and WebSockets for real-time bi-directional communication.

### 1.1 Frontend Stack
* **Core Framework:** React.js (v18.2) initialized via Vite tooling.
* **State Management:** Redux Toolkit with RTK Query for state normalization, caching, and optimistic UI updates.
* **Geospatial & Mapping:** Leaflet and React-Leaflet for interactive map components, address picking, and marker clustering.
* **Styling & UI:** Tailwind CSS with Lucide React icons, optimized for dark mode aesthetics and high-contrast emergency visibility.
* **Real-Time Layer:** Socket.io-client for WebSocket communication and live coordinate streaming.

### 1.2 Backend Stack
* **Runtime Environment:** Node.js (v18.x+) with Express.js web framework.
* **Database & ORM:** PostgreSQL (v15+) hosted on Neon, accessed via connection pooling (`pg` module) with SQL migrations.
* **Authentication & Security:** JSON Web Tokens (JWT) stored in HttpOnly cookies, password hashing via `bcryptjs` (salt rounds = 12), CORS middleware, and Helmet HTTP security headers.
* **File Processing:** `multer` middleware for handling multipart form uploads (government ID verifications).
* **Real-Time Dispatch:** Socket.io server instance for broadcasting distress signals and location updates to active responders.

---

## 2. Database Schema and Entity Model

The system data model consists of 12 primary relational tables in PostgreSQL:

1. `users`: Stores core credentials, role classifications (`woman`, `volunteer`, `admin`), hashed passwords, and account statuses (`active`, `suspended`).
2. `safety_profiles`: Holds optional medical details, emergency notes, and language preferences associated with a user.
3. `emergency_contacts`: Contains trusted phone numbers and contact names linked to a specific user.
4. `volunteers`: Tracks responder application records, identity document paths, verified status (`pending`, `verified`, `rejected`), operational coverage radius (in km), and home GPS coordinates.
5. `emergency_incidents`: Logs active and historical SOS events, including trigger location, status (`active`, `volunteer_assigned`, `resolved`, `cancelled`), and timestamps.
6. `incident_locations`: Historical append-only log of latitude/longitude coordinates recorded during an active incident.
7. `incident_assignments`: Maps active volunteers to specific emergency incidents, tracking assignment states (`notified`, `accepted`, `en_route`, `arrived`, `completed`).
8. `incident_timeline`: Event audit trail for incident status changes.
9. `safety_resources`: Catalog of physical safety facilities (police precincts, hospitals, safe havens) with geographical coordinates, contact numbers, and weekly operating schedules.
10. `resource_recommendations`: Pending crowdsourced submissions from volunteers for new safety resource locations awaiting administrative review.
11. `closure_recommendations`: Pending reports from volunteers indicating temporary or permanent closures of existing safety resources.
12. `notifications`: In-app notification queue for users, volunteers, and administrators.

---

## 3. API Router Catalog

The backend API routes are organized by domain context:

* **Authentication (`/api/auth`)**
  * `POST /register`: Account creation for standard users.
  * `POST /login`: Credential validation and JWT cookie issuance.
  * `POST /logout`: Session revocation and cookie clearing.
  * `GET /me`: Authenticated user profile retrieval.
  * `POST /refresh`: Silent session renewal via refresh token rotation.

* **Emergency Management (`/api/sos`)**
  * `POST /trigger`: Initiates an active emergency incident with GPS coordinates.
  * `POST /resolve`: Terminates an active incident (callable by victim or assigned volunteer).
  * `POST /update-location`: Appends new GPS coordinates to an ongoing incident.
  * `GET /active`: Retrieves current active distress state for the authenticated session.

* **Volunteer Operations (`/api/volunteer`)**
  * `POST /apply`: Submits volunteer application with government ID upload and home coverage coordinates.
  * `GET /profile`: Retrieves responder profile and verification status.
  * `PUT /status`: Toggles responder availability (`online`/`offline`).
  * `GET /nearby-incidents`: Fetches active incidents within the volunteer's configured radius.
  * `POST /accept-incident`: Accepts dispatch request for a nearby incident.

* **Resource Management (`/api/resources`)**
  * `GET /nearby`: Queries registered safety resources within a geographical bounding area, computing open/closed status based on current schedule.
  * `POST /recommend`: Submits an unregistered location recommendation.
  * `POST /report-closure`: Submits a closure report for an existing resource.

* **Administrative Governance (`/api/admin`)**
  * `GET /volunteers`: Retrieves queue of pending volunteer onboarding applications.
  * `POST /volunteers/:id/review`: Approves or rejects a volunteer application.
  * `POST /resources`: Creates a new registered safety resource with operating hours.
  * `GET /resources/recommendations`: Fetches pending resource recommendations.
  * `POST /resources/recommendations/:id/review`: Approves or rejects a crowdsourced recommendation.
  * `GET /resources/closures`: Fetches pending closure reports.
  * `POST /resources/closures/:id/review`: Approves or rejects a reported closure.

---

## 4. Role-Based Access Control (RBAC)

The application enforces strict role segregation across three levels:

* **Woman (`woman`):** Default registered user role. Authorized to manage personal safety profiles, register emergency contacts, trigger/resolve SOS alerts, and submit a volunteer application.
* **Volunteer (`volunteer`):** Granted only after an administrator approves a user's volunteer application. Authorized to view responder dashboards, toggle availability, receive real-time incident broadcasts within their service radius, view color-coded safety resources, recommend new locations, and report closures.
* **Administrator (`admin`):** System governance role. Authorized to access the administrative control center, inspect uploaded identity verification files, approve/reject volunteers, create official safety resources, audit crowdsourced recommendations/closures, and inspect platform analytics.

---

## 5. End-to-End Functional Walkthrough and Testing Guide

### Phase 1: User Registration and SOS Distress Trigger
1. **Account Registration:** Navigate to the public landing page (`/`) and click **Sign Up** (or go to `/register`). Fill in Name, Email, Phone, Blood Group, and Password. Submit the form to log in automatically.
2. **Profile & Emergency Contacts:** Navigate to the Dashboard. Optionally add trusted emergency contacts.
3. **Triggering SOS:** On the main Dashboard, locate the centerpiece **SOS** button.
   * *Mechanism:* To prevent accidental triggers, the button requires a **3-second continuous hold**.
   * *Action:* Press and hold the SOS button until the visual progress ring completes 100%.
   * *Result:* The application captures high-accuracy browser GPS coordinates, creates an emergency incident in PostgreSQL, and automatically redirects the client to the live tracking view at `/sos/tracker`.
4. **Active SOS Tracker View:** The tracking view displays a Leaflet map showing the user's location pin and active nearby responders.
5. **Resolving Distress:** Click the **Resolve SOS** button on the tracker screen to mark the incident as resolved in the database and return to the normal dashboard state.

---

### Phase 2: Volunteer Application Submission
1. **Initiating Application:** From the user layout header navigation, click **Become Responder** (or navigate directly to `/apply`).
2. **Form Parameters:**
   * Enter Age and select Government ID Type (e.g., Driver's License, Passport, Aadhar/National ID).
   * Enter Government ID Number.
   * **Location Selection:** Click the **Select Location on Map** button to launch the Leaflet map picker modal. Search for an address or click directly on the map to set physical home coordinates. Confirm the location.
   * **Service Radius:** Enter operational coverage radius in kilometers (e.g., `10` km).
   * **Document Upload:** Upload a valid verification document image or PDF (JPEG/PNG/PDF, max 5MB).
3. **Submission & Pending State:** Click **Submit Volunteer Application**. The application uploads the file via `multer`, creates a `volunteers` record with status `pending`, and updates the user screen to display a pending review status banner.
4. *Privilege Note:* At this stage, the user cannot access volunteer responder tools. The user role remains `woman` until approved by an administrator.

---

### Phase 3: Administrative Governance and Review Operations
1. **Accessing Admin Portal:**
   * *Important Design Constraint:* There is **no visible GUI button or link** on the public landing page or navigation header for the Admin Login portal.
   * *Access Procedure:* Open the browser address bar and manually type the URL path: `/admin/login`.
2. **Admin Authentication:**
   * Enter administrator credentials (e.g., `admin@flare.local` / `Admin@Flare2026`).
   * Click **Sign In** to navigate to the administrative control center at `/admin`.
3. **Reviewing Volunteer Onboarding Queue:**
   * Navigate to the **Volunteer Queue** tab (`/admin/volunteers`).
   * Locate the pending volunteer application submitted in Phase 2.
   * Click **Inspect Document File** to view the uploaded identity document in a new tab.
   * Click **Approve Application**. The system executes a database transaction updating the volunteer record to `verified` and updating the user role column in `users` to `volunteer`.
4. **Registering Official Safety Resources:**
   * Navigate to the **Safety Resources** tab (`/admin/resources`).
   * Click **Add Resource**.
   * Enter Resource Name, Category (Police Station, Hospital, Fire Station, Safe Haven), Phone Number, and Physical Address (or use the Map Picker).
   * Configure Operating Schedule: Set weekly opening time (e.g., `08:00`) and closing time (e.g., `20:00`).
   * Submit to add the resource directly to the database.

---

### Phase 4: Volunteer Responder Operations and Resource Auditing
1. **Responder Login:** Log out of the admin session and log in using the newly approved volunteer account.
2. **Responder Layout:** The system detects the `volunteer` role and redirects the user to the verified volunteer dashboard at `/volunteer`.
3. **Status Toggle:** Toggle the status switch in the navigation header between **Online** and **Offline**. When online, the volunteer is available to receive emergency dispatch notifications.
4. **Safety Resources Map Inspection:**
   * Navigate to **Safety Resources** (`/resources/volunteer`).
   * The Leaflet map displays resources within a 100 km radius of the volunteer's home location, categorized dynamically by markers:
     * **Green Markers:** Registered safety resources that are currently open and within configured operating hours.
     * **Orange Markers:** Registered safety resources that are currently closed (outside operating hours, on configured closed days, or flagged as temporarily/permanently out of service).
     * **Red Markers:** External, unregistered safety facilities discovered dynamically in the map area via OpenStreetMap (Overpass API).
5. **Submitting Crowd-Sourced Recommendations:**
   * **Recommending Unregistered Locations:** Click a **red marker** on the map. Review its details and click **Recommend as Verified Resource**. This sends a recommendation payload to the admin review queue.
   * **Reporting Closures:** Click an open **green marker**. Click **Report Facility Closure**, select closure type (Temporary or Permanent), enter reason, and submit. The resource state changes to orange for verification.
6. **Incident Verification and Assistance:**
   * When an SOS alarm is triggered by a nearby user within the volunteer's service radius, a real-time broadcast notification appears on the volunteer dashboard via WebSockets.
   * The volunteer can review the incident details, manually verify the threat location on the map, and click **Accept Incident** to confirm dispatch before arriving at the location.

---

## 6. Live Production Deployments

The platform is deployed and configured for production use across the following endpoints:

* **Frontend Client (Vercel):** [https://flare-eta-roan.vercel.app](https://flare-eta-roan.vercel.app)
* **Backend API Server (Render):** [https://flare-580v.onrender.com](https://flare-580v.onrender.com)
* **Database (Neon PostgreSQL):** Serverless PostgreSQL cluster running version 15+.
