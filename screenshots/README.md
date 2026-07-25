# Screenshots

A real end-to-end run was performed on 2026-07-21 (PostgreSQL + backend + Vite frontend booted
and exercised via API and a real browser). Screenshots were captured **live inline** during that
session; the tooling used does not persist PNGs to disk, so this folder is provided for you to
drop your own captures.

Capture these screens (they map to Section 1 of `DEPLOYMENT_AND_TESTING_GUIDE.md`):

1. `01-landing.png` — Landing page (`/`)
2. `02-login.png` — Login page (`/login`)
3. `03-admin-dashboard.png` — Admin "Control Center Overview" with live stats
4. `04-admin-resources.png` — Safety Resources Database list (5 seeded resources)
5. `05-leaflet-map.png` — "Select Location on Map" (Leaflet + OpenStreetMap tiles) — maps evidence
6. `06-woman-dashboard.png` — Woman dashboard with SOS trigger + GPS card
7. `07-volunteer-apply.png` — Volunteer application with map location picker + ID upload
8. `08-incident-tracker.png` — Live incident tracker map (requires HTTPS/GPS permission)
9. `09-volunteer-document.png` — Admin viewing an uploaded ID document (image/PDF)

All flows in 1–6 were verified working during the real run.
