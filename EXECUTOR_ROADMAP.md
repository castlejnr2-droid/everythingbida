# EXECUTOR_ROADMAP.md

## STANDING RULE (survives context resets)
(a) At the START of every session, read both EVERYTHINGBIDA_PLAN.md and EXECUTOR_ROADMAP.md before touching anything.
(b) At the END of every completed task, update EXECUTOR_ROADMAP.md.
(c) Whenever work changes scope, architecture, schema, statuses, or anything EVERYTHINGBIDA_PLAN.md describes, explicitly tell the operator "PLAN SYNC NEEDED:" followed by exactly what the planner should update, so the two files never drift.

---

## Current position
**Phase 0 — Plan commit bootstrap. Plan docs created; awaiting commit + password rotation prompt.**

---

## Phase Checklist

### Phase 0 — Plan commit + immediate mitigation
- [x] Read-only recon completed (2026-07-29)
- [x] EVERYTHINGBIDA_PLAN.md created in repo root
- [x] EXECUTOR_ROADMAP.md created in repo root
- [ ] Commit plan docs to origin main (blocked: dirty tree — see Session Log)
- [ ] Rotate hardcoded admin password in App.jsx (next prompt, after operator confirms dirty-tree handling)

### Phase 1 — Backend foundation (`everythingbida-backend`)
- [ ] Create new repo `everythingbida-backend` (GitHub)
- [ ] Scaffold Express app: `src/index.js`, `src/db.js` (pg pool), `src/middleware/auth.js`
- [ ] Write migration 001: full schema (products, categories, locations, orders, messages, vendors, images, bank_settings)
- [ ] Implement bcrypt admin login endpoint (`POST /admin/login`) → signed session token
- [ ] Session middleware: verify token on all admin/write routes
- [ ] Image upload endpoint (`POST /images`) → stores bytea in Postgres, returns `{id}`
- [ ] Image serve endpoint (`GET /images/:id`) → streams with `Cache-Control: public, max-age=31536000, immutable`
- [ ] CORS configured to `FRONTEND_ORIGIN` env var only
- [ ] `GET /health` returns `{ok: true, db: "connected"}`
- [ ] Deploy to Railway; verify boot log shows no errors; hit `/health`

### Phase 2 — Data migration + frontend cutover
- [ ] Write one-off migration script: read Netlify Blobs (products/orders/messages/bank), decode base64 images → `images` table, insert rows
- [ ] Run migration script against Railway Postgres; verify row counts
- [ ] Frontend: replace `cloudGet`/`cloudSet` with `VITE_API_URL`-based per-action fetch calls
- [ ] Frontend: admin login calls `POST /admin/login`, stores session token in memory
- [ ] All write endpoints include session token in Authorization header
- [ ] No whole-array POSTs remain (D3 fixed)
- [ ] Smoke test: place order, send chat message, upload receipt, admin flows, admin login/logout
- [ ] Retire Netlify function (remove `netlify/functions/api.mjs`, update `netlify.toml`)
- [ ] Push + deploy; verify Netlify build passes

### Phase 3 — Delivery locations
- [ ] Backend: `locations` CRUD endpoints (admin-only for write: POST/PUT/DELETE; public GET)
- [ ] Backend: order placement validates `location_id` (must be active) + `specific_address` non-empty when `method=delivery`
- [ ] Backend: `delivery_fee` + `total` computed server-side from location record (never trust client totals)
- [ ] Frontend checkout (delivery flow): step 1 — searchable tappable list of active locations, each showing delivery price, single-select required
- [ ] Frontend checkout: step 2 — after location selected, required "Specific place in [location]" text field
- [ ] Frontend: order summary shows subtotal + delivery fee + total before Place Order
- [ ] Frontend: receipt / order confirmation shows selected location + specific place
- [ ] Admin: Locations tab — add location (name + delivery price), edit price, deactivate/reactivate
- [ ] Admin order card: shows location + specific address for delivery orders
- [ ] Tracking view: shows location + specific address

### Phase 4 — Catalog upgrades
- [ ] Backend: `categories` CRUD (admin-only write; public GET)
- [ ] Frontend admin: Categories tab — add/edit/delete/reorder categories
- [ ] Frontend shop: category pills replace hardcoded meats/other toggle
- [ ] Backend: `products.in_stock` bool; PATCH endpoint for stock toggle
- [ ] Frontend admin: per-product in-stock toggle switch
- [ ] Frontend shop: out-of-stock products show OUT OF STOCK badge (not hidden)
- [ ] Frontend shop: product search bar (client-side filter on name/description)

### Phase 5 — Landing page
- [ ] Frontend: hero section above shop grid (value props: instant availability, 10–60 min delivery, effortless selling, built for speed)
- [ ] CTA buttons: "Shop Now" → scrolls to/shows shop; "Become a Seller" → seller registration form
- [ ] Mobile-first layout; verify on 375px viewport

### Phase 6 — Tracking + polling
- [ ] Backend: `GET /orders/:id` (public) — returns order + status + items + delivery info
- [ ] Frontend: customer tracking view — enter order ID → fetch → display status timeline with ETA copy
- [ ] Backend: admin status update endpoint (`PATCH /orders/:id/status`) with new statuses: `pending → confirmed → preparing → out_for_delivery → delivered`, `ready_for_pickup`
- [ ] Frontend admin: status controls updated to new status set
- [ ] Frontend: 20s polling on admin orders view
- [ ] Frontend: 20s polling on admin chat / per-order messages
- [ ] Frontend: 20s polling on customer tracking view
- [ ] Frontend: 20s polling on customer chat (per order ID)

### Phase 7 — Notifications
- [ ] Backend: install Resend SDK; configure `RESEND_API_KEY` + `ADMIN_EMAIL` env vars on Railway
- [ ] Backend: on `POST /orders`, fire-and-forget send admin notification email (order ID, customer, items, total, tracking link); log error but never fail the order
- [ ] Backend: on `POST /orders`, if `email` provided, send customer confirmation email (order ID, tracking link, items, total); fire-and-forget
- [ ] Frontend checkout: optional email field, clearly labelled optional
- [ ] Frontend admin order card: WhatsApp deep-link button (admin-side only) — opens `wa.me/ADMIN_WHATSAPP_NUMBER?text=...` with order summary
- [ ] Verify: order with no email → only admin email sent; order with email → both sent; email service down → order still succeeds

### Phase 8 — Seller registration
- [ ] Backend: `POST /vendors` (public) — accepts name, phone, product_types, notes, optional image
- [ ] Backend: `GET /vendors` (admin) — list with status filter
- [ ] Backend: `PATCH /vendors/:id/status` (admin) — set pending|contacted|approved|rejected
- [ ] Frontend: public seller registration form (name, phone, product types multi-select, optional photo, notes)
- [ ] Frontend admin: Vendor Applications tab — list by status, status dropdown per application
- [ ] Frontend admin product form: optional vendor attribution dropdown (lists approved vendors)

### Phase 9 — Full operator smoke + polish
- [ ] End-to-end smoke: browse → search → cart → select delivery location (with fee shown) → type specific place → optional email → place order → admin email received → admin sees order → chat + receipt upload → status walk (all statuses) → customer tracking view reflects each status → mark delivered
- [ ] Pickup flow smoke: cart → pickup → no location/address fields → place order → admin marks ready_for_pickup → tracking reflects
- [ ] Mobile viewport pass (375px) — all views legible, tappable, no horizontal overflow
- [ ] Contrast pass — WCAG AA for all text/background combinations
- [ ] Confirm D1–D5 all resolved: no hardcoded password, server auth on all write endpoints, per-row writes, polling refresh, images via endpoint not base64

---

## Session Log

### 2026-07-29 — Phase 0 bootstrap
- Repo found at `/c/Users/danie/.openclaw/workspace-chaincheff/everythingbida`
- Origin: `github.com/castlejnr2-droid/everythingbida` ✓
- Branch: `main`, in sync with `origin/main` (no ahead/behind)
- **DIRTY TREE DETECTED** — 6 modified files not yet committed:
  - `src/App.jsx` (+432 lines net): significant in-progress additions — DEFAULT_CATEGORIES, LOW_STOCK_THRESHOLD, stock badge CSS, out-of-stock overlay CSS, search bar CSS, category filter CSS, tracking timeline CSS, btn:disabled style, status-shipped style. These appear to be partial Phase 4/6 UI groundwork done outside of plan phases.
  - `netlify/functions/api.mjs` (+39 lines net): email notification endpoint (`POST ?action=notify` via EmailJS) added — this is partial Phase 7 work done outside plan.
  - `.netlify/functions/api.zip`, `.netlify/functions/manifest.json`, `.netlify/netlify.toml`, `netlify.toml`: build artifact changes.
- Operator must confirm how to handle dirty files before they can be resolved. Plan docs committed separately (new files only).
- PLAN SYNC NEEDED: Section 1 "Current state" says App.jsx is 737 lines — working tree is now 1007 lines. Operator should update after deciding what to do with dirty changes.
- Commit hash for plan docs: (to be filled after push)
