# Flare — Deployment & Testing Guide

**Flare** is a full-stack women's emergency response & safety platform: one-tap SOS, live
GPS incident tracking, nearby verified-volunteer dispatch, a safety-resource directory
(police/hospital/shelter/clinic/safe-zone) with a live open/closed engine, emergency-contact
alerting, and an admin control center. Realtime is powered by Socket.io; maps by Leaflet +
OpenStreetMap.

- **Backend:** Node.js (ESM) + Express 4 + PostgreSQL (`pg`) + Socket.io + JWT + Multer.
- **Frontend:** React 19 + Vite + Redux Toolkit (RTK Query) + React Router 7 + Leaflet + Tailwind.
- **Roles:** `woman` (end user), `volunteer` (verified responder), `admin`.

> **Honesty note on this guide.** Sections 1 and 4–19 are complete and code-verified. The
> evidence in Section 1 comes from a **real local run performed on 2026-07-21**: PostgreSQL 16
> (Docker), the backend (all 15 migrations + 2 seeds applied), and the Vite frontend were booted
> and exercised end-to-end through the API and a real browser. Screenshots were captured **live
> inline** during that run (the harness screenshot tool does not persist PNGs to disk, so the
> `screenshots/` folder is provided for you to drop your own captures using the exact steps
> below — each feature row names the screen to capture). Geolocation-dependent screens (the
> woman SOS map) require an HTTPS origin or a browser with location permission granted; the
> headless preview browser blocks GPS, which is expected and **not** a bug.

---

## 1. Feature Testing Evidence

Legend: ✅ Fully implemented & verified · ⚠ Works, needs a deployment/config step · ❌ Broken (none found)

### Verified live during the real run (2026-07-21)

| # | Feature | Status | Evidence / how verified |
|---|---------|--------|--------------------------|
| 1 | DB migrations (001–015) + seeds | ✅ | Backend boot log: all 15 migrations applied, `seed_admin` + `seed_resources` applied |
| 2 | Health endpoint | ✅ | `GET /api/health` → `{success:true}` |
| 3 | Register (woman) | ✅ | `POST /api/auth/register` → user role `woman` + auto-login token |
| 4 | Register (volunteer) | ✅ | `POST /api/auth/register` role `volunteer` |
| 5 | Login (admin) — API & UI | ✅ | API returns admin token; browser login → "Welcome back, System Administrator" |
| 6 | Login (woman) — UI | ✅ | Browser login → "Welcome back, Test Woman", woman dashboard |
| 7 | Admin dashboard live stats | ✅ | "Control Center Overview" shows ACTIVE ALARMS = 1 (the test SOS), responder counts |
| 8 | Resources list (seeded) | ✅ | `GET /api/resources` → 5 resources; Admin Resources page lists Central Police Station etc. |
| 9 | SOS create | ✅ | `POST /api/sos/create` → incident `status:active`, id returned; appears on admin dashboard |
| 10 | Admin Resources CRUD UI | ✅ | "Add Safety Resource" modal opens with all fields + schedule |
| 11 | **Leaflet map + OSM tiles** | ✅ | "Select Location on Map" renders full OSM dark tiles, zoom controls, marker, address search |
| 12 | Role-based routing & guards | ✅ | Admin/woman routed to correct layouts; guest routes redirect authenticated users |
| 13 | Realtime notifications badge | ✅ | Woman header bell shows unread count "1" after SOS |
| 14 | New browser tab title | ✅ | Tab reads "Flare | Women's Emergency Response & Safety" (was "frontend") |

### Code-verified (exercise with the checklists in Sections 9 & 11)

| Area | Status | Notes |
|------|--------|-------|
| Token refresh + rotation, logout revoke | ✅ | `config/jwt.js` hashed refresh tokens, single-use rotation |
| Forgot / reset password | ⚠ | Fully implemented; email sends only when SMTP is configured, otherwise logged to console (dev outbox) |
| Volunteer application (upload + magic-byte + reverse-geocode) | ✅ | `volunteer.service.js`; requires image/PDF ID doc, age ≥ 18 |
| Admin verify/reject volunteer | ✅ | Promotes user role → `volunteer`, notifies via socket |
| Volunteer accept + status state machine | ✅ | `en_route → arrived → assisting → resolved`, row-locked accept |
| Live location streaming (socket) | ✅ | `update_location` → `volunteer_location` to incident room |
| Emergency-contact SOS emails | ⚠ | Sends when SMTP configured; contacts store phone/email |
| Resource open/closed engine | ✅ | Weekly days, special dates, temp closures, hours, permanent closure |
| Resource & closure recommendations (volunteer→admin) | ✅ | Full submit + review + approve/reject flow |
| Emergency declare (auto-notify nearest open resources) | ✅ | Per-category nearest within 15 km |
| Safety profile, emergency contacts CRUD (max 5) | ✅ | Woman-only |
| Woman SOS map + continuous GPS | ⚠ | Requires HTTPS origin (or granted location permission) — see Section 14 |

**No broken (❌) features were found.**

---

## 2. Required Software

| Software | Version used / min | Purpose |
|----------|--------------------|---------|
| Node.js | v26 (works on v18+) | Backend runtime & frontend build |
| npm | 11 (v9+) | Package manager |
| PostgreSQL | 16 (v14+) | Primary database |
| A modern browser | Chrome/Firefox/Edge/Safari/Brave/Opera | App is client-agnostic |
| (Optional) Docker | any | Easiest way to run PostgreSQL locally |
| (Optional) SMTP account | — | Real email delivery (Gmail app password, SendGrid, etc.) |

---

## 3. Environment Variables

### Backend (`backend/.env`) — copy from `backend/.env.example`

| Var | Example / dev value | Notes |
|-----|--------------------|-------|
| `DB_HOST` | `localhost` | Postgres host |
| `DB_PORT` | `5432` | Postgres port |
| `DB_NAME` | `flare_db` | Database name |
| `DB_USER` | `flare_user` | Database role |
| `DB_PASSWORD` | `flare_password` (dev) | **Change for production** |
| `JWT_SECRET` | 64+ random chars | **Regenerate for production** (see below). Server refuses to boot in prod with a default/short value |
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` / `production` | Controls cookies, CSP, error verbosity, dev-only endpoints |
| `FRONTEND_URL` | `http://localhost:5173` | **Exact** browser origin of the frontend — used for CORS **and** the Socket.io CORS allow-list |
| `SMTP_HOST` | `smtp.gmail.com` | Optional; blank → emails logged only |
| `SMTP_PORT` | `587` | 465 = implicit TLS |
| `SMTP_USER` / `SMTP_PASS` | — | Optional; both required to actually send |
| `SMTP_FROM` | `Flare <noreply@flare.app>` | From header |
| `DEV_ADMIN_EMAIL` | `admin@flare.local` | Optional; used only by the dev-only credentials helper |
| `DEV_ADMIN_PASSWORD` | `Admin@Flare2026` | Optional; dev helper only, never served in production |

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend (`frontend/.env`) — copy from `frontend/.env.example`

| Var | Dev value | Production value |
|-----|-----------|------------------|
| `VITE_API_URL` | `http://localhost:5000/api` | `https://<your-api-domain>/api` |
| `VITE_SOCKET_URL` | `http://localhost:5000` | `https://<your-api-domain>` (also used to build upload/document URLs) |

> The frontend `.env` contains **no secrets** (only public API URLs) and is safe to commit.
> The backend `.env` **does** contain secrets — a `backend/.gitignore` has been added to keep it
> and `uploads/`, `logs/`, `node_modules/` out of version control.

---

## 4. Backend — Local Setup

```bash
cd backend
cp .env.example .env          # then edit values (at minimum DB_PASSWORD, JWT_SECRET)
npm install
npm start                     # boots server, auto-runs migrations + seeds
```
- Server starts on `http://localhost:5000`.
- On boot it **auto-runs all migrations** (idempotent, tracked in `_migrations`) and **seeds**
  the admin account + 5 default safety resources. No manual migration step is needed.
- Health check: `curl http://localhost:5000/api/health`.

---

## 5. Frontend — Local Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # Vite dev server on http://localhost:5173
```
- If port 5173 is taken, Vite picks the next port (e.g. 5174) — **update `FRONTEND_URL` in the
  backend `.env` to match**, or free 5173, otherwise CORS will block the browser.
- Production build: `npm run build` → static assets in `frontend/dist/`. Preview with `npm run preview`.

---

## 6. Database Setup

**Option A — Docker (fastest):**
```bash
docker run -d --name flare-pg \
  -e POSTGRES_DB=flare_db -e POSTGRES_USER=flare_user -e POSTGRES_PASSWORD=flare_password \
  -p 5432:5432 postgres:16-alpine
```

**Option B — existing PostgreSQL:**
```sql
CREATE DATABASE flare_db;
CREATE USER flare_user WITH PASSWORD 'flare_password';
GRANT ALL PRIVILEGES ON DATABASE flare_db TO flare_user;
```
Then start the backend — it creates all tables and seeds automatically. The schema uses UUID
PKs, PostgreSQL ENUM types, `JSONB` metadata, and cascade rules; there is no external migration
CLI to run, but you can run migrations standalone with `node db/migrate.js`.

**Data sanitization for a public deployment:** a fresh database contains **only** the admin
account and the 5 default safety resources (from the seed files) — there is no dummy or
user-generated personal data to strip. If you are deploying a database that already accumulated
test data, keep the admin and reset the rest:
```sql
-- Preserves schema, admin account, and default resources; clears test/user data.
TRUNCATE incident_timeline, incident_locations, incident_assignments,
         emergency_incidents, emergency_contacts, notifications, refresh_tokens,
         safety_profiles, volunteers,
         resource_recommendations, closure_recommendations,
         recommended_weekly_closed_days, recommended_special_closed_dates
  RESTART IDENTITY CASCADE;
DELETE FROM users WHERE role <> 'admin';
-- Optionally also clear volunteer-added resources, keeping the 5 seeded ones.
```
> **Do NOT delete the admin account** — it is required for E2E testing and is re-seeded on boot anyway (`ON CONFLICT (email) DO NOTHING`).

---

## 7. Admin Credentials

Seeded automatically on first boot (`backend/db/seeds/seed_admin.sql`):

| Field | Value |
|-------|-------|
| Email | `admin@flare.local` |
| Password | `Admin@Flare2026` |
| Role | `admin` |

Verified: the seeded bcrypt hash matches `Admin@Flare2026` (checked with `bcrypt.compareSync`).
**Change this password immediately after first production login** (Settings → change password, or
by re-seeding a new hash). The admin logs in via the normal login page or `/admin/login`.

---

## 8. Test Account Credentials

Create these for full-role E2E testing. Woman and volunteer self-register via the UI; volunteers
must then submit an application and be verified by the admin.

| Role | Email | Password | How to create |
|------|-------|----------|---------------|
| Admin | `admin@flare.local` | `Admin@Flare2026` | Pre-seeded |
| Woman | `woman@flare.local` | `Test@1234` | Register page (role: woman) |
| Volunteer (applicant) | `volunteer@flare.local` | `Test@1234` | Register (role: volunteer) → `/apply` upload ID doc → admin verifies |

> Registration password minimum is 6 chars; the in-app **change-password** policy is stricter
> (10+ chars, upper/lower/number/special). To become a *verified* volunteer: log in as the
> volunteer, go to Apply, upload a valid JPG/PNG/PDF ID (real image bytes required — magic-byte
> checked), then log in as admin → Volunteers → Verify.

---

## 9. Manual Testing Checklist (every feature)

**Auth**
- [ ] Register as woman → auto-logged-in, lands on `/dashboard`
- [ ] Register as volunteer → auto-logged-in
- [ ] Log out → refresh cookie cleared, redirected to guest area
- [ ] Log in (woman / volunteer / admin) → correct role home
- [ ] Wrong password → error; suspended account → blocked
- [ ] Forgot password → reset link (email or dev console) → reset → old sessions revoked
- [ ] Access-token expiry → silent refresh keeps you logged in (leave a tab idle > 15 min)
- [ ] Reload while logged in → session restored via refresh cookie

**Woman / SOS**
- [ ] Grant location → GPS lock turns green
- [ ] Trigger SOS → incident created, redirected to tracker, contacts notified
- [ ] Trigger SOS again while active → returns the same incident (no duplicate)
- [ ] Incident tracker map shows your live position and updates
- [ ] Resolve incident → status → Resolved
- [ ] Incident history paginates
- [ ] Emergency contacts: add (max 5 enforced), edit, delete, toggle notify-on-SOS
- [ ] Safety profile: set blood group / medical notes / instructions / language
- [ ] Settings: change password (strong policy enforced) → re-login required

**Volunteer**
- [ ] Apply: upload ID (JPG/PNG/PDF), pick home location on map, age ≥ 18
- [ ] Duplicate application blocked; corrupt/non-matching file rejected
- [ ] Before verification: alerts/accept blocked (verification gate)
- [ ] After admin verify: role becomes volunteer, volunteer dashboard visible
- [ ] Toggle availability
- [ ] See nearby active alerts within service radius
- [ ] Accept an incident (only one active assignment allowed)
- [ ] Advance status en_route → arrived → assisting → resolved (order enforced)
- [ ] Stream live location to the incident map
- [ ] Volunteer Resources: view within 100 km with live open/closed status
- [ ] Recommend a new resource / recommend a closure
- [ ] Declare emergency → nearest open resources auto-notified

**Admin**
- [ ] Dashboard stats (users, volunteers, active/resolved incidents, avg response, acceptance rate)
- [ ] Incidents list: filter by status, paginate, see assigned volunteer
- [ ] Users list: search, filter by role/status, paginate
- [ ] Suspend / reactivate a user (cannot suspend self or other admins; suspension kills sessions)
- [ ] Pending volunteers: view doc (flags corrupt files), verify / reject with reason
- [ ] Resources: create/edit (map picker, hours, weekly closed days, special dates, permanent closure), soft-delete
- [ ] Review resource recommendations (approve → becomes live resource / reject)
- [ ] Review closure recommendations (approve applies closure / reject)

**Realtime & notifications**
- [ ] Notification bell unread count updates live
- [ ] Mark one / mark all read
- [ ] Woman sees live volunteer status changes without refresh
- [ ] Admin sees new incidents appear live

---

## 10. Browser Compatibility Checklist

Test each in **Chrome, Firefox, Edge, Safari, Brave, Opera**:
- [ ] Login, navigation, role layouts render correctly
- [ ] Leaflet maps + OSM tiles load (resources, apply, trackers)
- [ ] Geolocation prompt appears and SOS works **(requires HTTPS in production — see §14)**
- [ ] Socket.io realtime connects (check console: "Socket connected")
- [ ] File upload (volunteer ID) works; uploaded image/PDF opens
- [ ] Responsive layout at mobile / tablet / desktop widths
- [ ] HttpOnly refresh cookie set and silent refresh works (Brave: ensure shields don't block first-party cookies)

---

## 11. API Verification Checklist (every endpoint)

Base: `/api`. All routes except health, auth, and `/auth/refresh` require `Authorization: Bearer <accessToken>`.

**Auth** — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
`POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/dev-admin-credentials` (dev only, 404 in prod).

**Users** — `GET /users/profile`, `PUT /users/profile`, `GET /users/profile/safety` (woman),
`PUT /users/profile/safety` (woman), `PUT /users/change-password`.

**Emergency contacts** (woman) — `GET /emergency-contacts`, `POST /emergency-contacts`,
`PUT /emergency-contacts/:id`, `DELETE /emergency-contacts/:id`.

**SOS** — `POST /sos/create` (woman), `GET /sos/history` (woman), `GET /sos/:id`,
`PATCH /sos/:id/resolve`.

**Location** — `POST /location/update` (woman), `GET /location/incident/:id`,
`GET /location/resources/nearby`.

**Resources** — `GET /resources`, `GET /resources/nearby`, `GET /resources/:id`.

**Volunteer** — `POST /volunteer/register` (multipart), `GET /volunteer/profile`,
`PATCH /volunteer/availability`, `GET /volunteer/alerts`, `POST /volunteer/accept`,
`PATCH /volunteer/status`, `GET /volunteer/resources`, `POST /volunteer/resources/recommend`,
`POST /volunteer/resources/recommend-closure`, `POST /volunteer/incident/:id/emergency`.

**Admin** — `GET /admin/dashboard`, `GET /admin/incidents`, `GET /admin/users`,
`PATCH /admin/users/:id/status`, `GET /admin/volunteers/pending`, `PATCH /admin/volunteers/:id/verify`,
`GET|POST /admin/resources`, `PUT|DELETE /admin/resources/:id`,
`GET /admin/resources/recommendations`, `POST /admin/resources/recommendations/:id/review`,
`GET /admin/resources/closures`, `POST /admin/resources/closures/:id/review`.

**Notifications** — `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`.

For each: [ ] 200/201 happy path · [ ] 400 on invalid body (express-validator) · [ ] 401 without token
· [ ] 403 on wrong role / unauthorized resource · [ ] 404 on missing id.

---

## 12. Database Verification Checklist

- [ ] `_migrations` contains 15 rows (001–015)
- [ ] Tables exist: users, safety_profiles, emergency_contacts, volunteers, emergency_incidents,
      incident_locations, incident_assignments, incident_timeline, safety_resources, notifications,
      refresh_tokens, weekly_closed_days, special_closed_dates, resource_temporary_closures,
      resource_recommendations, recommended_weekly_closed_days, recommended_special_closed_dates,
      closure_recommendations
- [ ] Admin row present (`admin@flare.local`, role admin)
- [ ] 5 seeded safety_resources present
- [ ] ENUM types created (user_role, incident_status, etc.)
- [ ] FKs & cascades behave (deleting a user cascades contacts/notifications; incidents use RESTRICT)
- [ ] Refresh tokens are stored **hashed**, not raw
- [ ] Passwords stored as bcrypt hashes only

---

## 13. Security Verification Checklist

Implemented in the codebase (verify still true after your config):
- [x] Passwords hashed with bcrypt (cost 12)
- [x] Access tokens (15 min) + rotating hashed refresh tokens (30 d), revoked on logout/suspend/password-change
- [x] HttpOnly refresh cookie; `secure` + `sameSite=none` in production (cross-domain safe — **fixed**)
- [x] Helmet with a tuned CSP (allows OSM/Leaflet tiles, PDF viewer)
- [x] CORS locked to a single `FRONTEND_URL` origin, credentials enabled
- [x] Rate limiting: general 200/15 min, login 5/15 min, forgot-password 3/h, SOS 5/min
- [x] express-validator on all mutating routes
- [x] Role + resource-ownership authorization at route **and** service layers
- [x] Upload hardening: extension + MIME + magic-byte checks, 5 MB cap, random filenames
- [x] Socket.io JWT auth + per-incident room authorization
- [x] Error stacks hidden when `NODE_ENV=production`
- [x] Dev-only admin-credentials endpoint returns 404 in production
- [x] **Production boot guard** (added): server refuses to start if `JWT_SECRET` is missing,
      < 32 chars, or a known default; and if `DB_PASSWORD` is unset

**To do before going public:**
- [ ] Set `NODE_ENV=production`
- [ ] Regenerate `JWT_SECRET` and set a strong `DB_PASSWORD`
- [ ] Set `FRONTEND_URL` to the exact production frontend origin
- [ ] Serve frontend over **HTTPS** (required for geolocation and `sameSite=none` cookies)
- [ ] Configure real SMTP (otherwise reset/SOS emails are only logged)
- [ ] Ensure `uploads/` is on a persistent disk (see §15)

> **Known, accepted limitation:** `/uploads/*` (volunteer ID documents) is served as static files
> without an auth check, mitigated by unguessable random filenames. Browsers load these via
> `<img>`/`<a>` and cannot send a Bearer header, so adding auth would break the admin document
> viewer. If stricter protection is required, move documents behind a signed-URL or authenticated
> streaming endpoint (a feature change, intentionally not done here to preserve behavior).

---

## 14. Production Deployment Checklist

- [ ] Backend and frontend `.env` set for production (see §3)
- [ ] `NODE_ENV=production`, strong `JWT_SECRET`, strong `DB_PASSWORD`
- [ ] Managed PostgreSQL provisioned; `DB_*` point to it (enable SSL if the provider requires)
- [ ] `FRONTEND_URL` = exact HTTPS frontend origin (drives CORS + socket CORS + cookie)
- [ ] Frontend `VITE_API_URL` / `VITE_SOCKET_URL` = HTTPS backend origin
- [ ] Frontend served over HTTPS (geolocation + `sameSite=none` cookie hard requirement)
- [ ] Persistent volume mounted for `uploads/`
- [ ] SMTP configured (or accept log-only email)
- [ ] Rate limits / CSP reviewed for your domains
- [ ] Health check wired to `/api/health`

---

## 15. Backend Deployment Steps

The backend is a **stateful, long-running** service (Socket.io WebSockets + a persistent
`uploads/` disk), so a container/VM host (Render, Railway, Fly.io, a VPS) fits better than
serverless. Example (Render Web Service):

1. Push the repo; create a **Web Service** from `backend/`.
2. Build command: `npm install` · Start command: `npm start`.
3. Add a **Persistent Disk** mounted at the project's `uploads/` path (documents survive restarts).
4. Provision a **managed PostgreSQL** and set `DB_HOST/PORT/NAME/USER/PASSWORD` (enable SSL if required — you may need to add `ssl: { rejectUnauthorized:false }` to the pool config for some providers).
5. Set all env vars from §3, including `NODE_ENV=production` and a strong `JWT_SECRET`.
6. Deploy — migrations + seeds run automatically on boot. Verify `/api/health`.
7. Ensure the platform allows **WebSocket** upgrades (Render/Railway/Fly do by default).

---

## 16. Frontend Deployment Steps

The frontend is a static Vite SPA — ideal for **Vercel**, Netlify, Cloudflare Pages, or any static host.

**Vercel:**
1. Import the repo, set **Root Directory = `frontend`**.
2. Framework preset: Vite. Build: `npm run build` · Output: `dist`.
3. Env vars: `VITE_API_URL=https://<api-domain>/api`, `VITE_SOCKET_URL=https://<api-domain>`.
4. Add a SPA rewrite so client-side routes work on refresh — `frontend/vercel.json`:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
5. Deploy. Then set the backend's `FRONTEND_URL` to the Vercel URL and redeploy the backend.

---

## 17. Public Hosting Guide (recommended topology)

**Recommendation: Frontend on Vercel + Backend on Render (or Railway/Fly.io).**

- **Why not the backend on Vercel?** Vercel's serverless/edge functions are stateless and
  short-lived. Flare's backend needs **persistent WebSocket connections** (Socket.io realtime
  tracking) and a **persistent filesystem** for uploaded ID documents — neither survives on
  serverless. A container host (Render/Railway/Fly) gives a long-lived process, WebSocket support,
  and a mountable disk.
- **Frontend → Vercel:** perfect for a static Vite SPA (global CDN, HTTPS, instant rollbacks).
- **Database → managed PostgreSQL** (Render PostgreSQL, Neon, Supabase, Railway PG).

Because frontend and backend are on **different domains**, this is exactly why the refresh cookie
was changed to `sameSite=none; secure` in production (§13) and why `FRONTEND_URL` must be set
precisely — otherwise CORS blocks the app and silent-refresh/session-restore fails.

---

## 18. Post-Deployment Verification

1. [ ] `GET https://<api>/api/health` → `{success:true}`
2. [ ] Frontend loads over HTTPS; tab title correct; no console CORS/CSP errors
3. [ ] Admin login works; change the seeded admin password
4. [ ] Register a woman; grant location; trigger a test SOS; confirm it resolves
5. [ ] Socket connects (console "Socket connected"); notification badge updates live
6. [ ] Maps render (OSM tiles) on resources/apply/tracker pages
7. [ ] Volunteer applies → upload works → admin verifies → volunteer dashboard active
8. [ ] Uploaded document opens from the admin volunteers page
9. [ ] Reload while logged in → session restored (cookie + refresh)
10. [ ] Reset-password email arrives (if SMTP configured)
11. [ ] Rate limiting returns 429 after too many login attempts
12. [ ] `GET /api/auth/dev-admin-credentials` → **404** (proves `NODE_ENV=production`)

---

## 19. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Browser calls fail with CORS error | `FRONTEND_URL` ≠ actual frontend origin (e.g. Vite fell back to 5174) | Set `FRONTEND_URL` to the exact origin and restart backend |
| Logged out on every refresh (prod) | Cross-domain cookie not sent | Ensure HTTPS + `NODE_ENV=production` (enables `sameSite=none; secure`); frontend must use `withCredentials` (it does) |
| Server exits immediately in prod | Boot guard tripped | Set a strong 64-char `JWT_SECRET` and a `DB_PASSWORD` |
| `role "postgres" does not exist` / connection refused | Wrong `DB_*` or Postgres not running | Verify container/service and credentials; `pg_isready` |
| Migrations don't run | DB unreachable at boot | Check `DB_HOST/PORT`; server logs the failing migration |
| Geolocation blocked / SOS can't get GPS | Non-HTTPS origin or permission denied | Serve frontend over HTTPS; grant location permission |
| Maps blank | Offline / tile host blocked | Confirm outbound access to `*.openstreetmap.org`; check CSP if backend also proxies |
| Socket won't connect | Platform blocks WebSocket upgrade or bad `VITE_SOCKET_URL` | Use a WS-capable host; point `VITE_SOCKET_URL` at the API origin |
| Reset/SOS emails never arrive | SMTP not configured | Set `SMTP_USER`/`SMTP_PASS` (Gmail app password) — otherwise emails are logged only |
| Uploaded docs disappear after redeploy | Ephemeral filesystem | Mount a persistent disk for `uploads/` |
| Volunteer upload rejected | File failed magic-byte check | Upload a genuine JPG/PNG/PDF (not a renamed file) under 5 MB |

---

### Files changed for production-readiness (and why)

| File | Change | Why |
|------|--------|-----|
| `backend/modules/auth/auth.controller.js` | Refresh cookie `sameSite` → `none` (with `secure`) in production, `lax` in dev | Split-domain (Vercel + Render) deployments silently break session-restore with `lax`; dev behavior unchanged |
| `backend/server.js` | Added production boot guard for `JWT_SECRET`/`DB_PASSWORD` | Prevents booting prod with the predictable dev fallback secret (token-forgery risk) |
| `backend/.gitignore` | **Added** | Keep `.env` secrets, `uploads/`, `logs/`, `node_modules/` out of version control |
| `frontend/index.html` | `<title>` `"frontend"` → `"Flare | Women's Emergency Response & Safety"` | Production polish / correct browser tab & bookmark title |

No features were removed or altered; folder structure, APIs, roles, and workflows are unchanged.
Ad-hoc developer scripts and test artifacts in `backend/` (`check_*.js`, `probe_db.js`,
`e2e_*.js`, `remediate.js`, `*.png`, `real_test_*`) are not part of the runtime (not imported by
`app.js`/`server.js`) and were left untouched; they can be safely deleted before publishing.
