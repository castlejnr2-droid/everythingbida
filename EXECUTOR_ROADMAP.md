# EXECUTOR_ROADMAP.md

## STANDING RULE (survives context resets)
(a) At the START of every session, read both EVERYTHINGBIDA_PLAN.md and EXECUTOR_ROADMAP.md before touching anything.
(b) At the END of every completed task, update EXECUTOR_ROADMAP.md.
(c) Whenever work changes scope, architecture, schema, statuses, or anything EVERYTHINGBIDA_PLAN.md describes, explicitly tell the operator "PLAN SYNC NEEDED:" followed by exactly what the planner should update, so the two files never drift.

---

## Current position
**Phase 2C — Frontend cutover + Vercel deploy + Netlify retirement. Phase 2B complete: migration executed (commit d20e575), all data live in Railway Postgres, no drift, all image hashes verified. Backend: https://everythingbida-backend-production.up.railway.app**

---

## Phase Checklist

### Phase 0 — Plan commit + immediate mitigation
- [x] Read-only recon completed (2026-07-29)
- [x] EVERYTHINGBIDA_PLAN.md created in repo root
- [x] EXECUTOR_ROADMAP.md created in repo root
- [x] Commit plan docs to origin main — b58bedd (2026-07-29)
- [x] WIP dirty tree preserved as commit 3929845; .netlify/ build artifacts untracked + gitignored
- [x] Hosting decision recorded: frontend → Vercel (not Netlify); plan doc synced
- [x] Rotate hardcoded admin password in App.jsx — D1 interim mitigation (2026-07-29)

### Phase 1 — Backend foundation (`everythingbida-backend`)
- [x] Create new repo `everythingbida-backend` (GitHub) — https://github.com/castlejnr2-droid/everythingbida-backend
- [x] Scaffold Express app: `src/index.js`, `src/db.js` (pg pool), `src/auth.js` (auth + requireAdmin middleware)
- [x] Write migration 001: full schema (products, categories, locations, orders, messages, vendors, images, bank_settings)
- [x] Implement bcrypt admin login endpoint (`POST /api/admin/login`) → signed session token (12h)
- [x] Session middleware: requireAdmin on all /api/admin/* routes; per-IP rate limit on login
- [x] Image upload endpoint (`POST /api/admin/images`) → stores bytea in Postgres, returns `{id}`
- [x] Image serve endpoint (`GET /api/images/:id`) → streams with `Cache-Control: public, max-age=31536000, immutable`
- [x] Customer receipt upload: `POST /api/orders/:orderId/receipt-image`
- [x] CORS configured to `FRONTEND_ORIGIN` env var (comma-separated exact origins, no wildcard)
- [x] `GET /health` returns `{ok: true, migrations: <count>}`; migrations run on boot
- [x] node --check passes all src files — commit 7f55047 pushed to origin/master
- [x] Deploy to Railway; verify boot log shows no errors; hit `/health` — all gates green (2026-07-29)
  - Railway project: everythingbida-backend | Postgres svc: 838c87cc | Backend svc: d928aaca
  - Public URL: https://everythingbida-backend-production.up.railway.app
  - /health: {ok:true,migrations:1} | login 200+token | 401 no-token | /images/99999999 → 404
  - DB: all 8 tables verified (categories, locations, images, vendors, products, orders, messages, bank_settings)
  - NOTE: SSL required for Railway public proxy (rlwy.net); no SSL for internal private network (.railway.internal)

### Phase 2 — Data migration + frontend cutover
- [x] **Phase 2A — Full v2 API surface built and live (2026-07-29, commit d9a1479)**
  - Public: GET /api/products|categories|locations|bank, POST /api/orders (server-side pricing), GET /api/orders/:id, GET+POST /api/orders/:id/messages, POST /api/vendors
  - Admin: CRUD /api/admin/products|categories|locations|bank, GET /api/admin/orders, PUT …/status (allowlist) + …/paid, GET+PUT /api/admin/vendors(/:id/status)
  - Location DELETE: deactivates if order-referenced, hard deletes otherwise
  - Message sender: auto-detected from admin JWT (no separate route)
  - Permanent test order in DB: EB25793599 (delivered, Test Island, 2×Test Chicken)
- [x] **Phase 2B — Data migration script executed (2026-07-29, commit d20e575)**
  - Snapshot: 20260729T021732Z — categories=2 strings, products=3, orders=3 ("delivered"), messages=10, bank=null
  - Status mapping: "delivered"→"delivered" direct match; no ambiguous statuses
  - All 3 product images (data URI → bytea): decoded non-empty, MIME=image/jpeg; SHA-256 byte-compare against /api/images/:id → all MATCH
  - DB after: categories=3 (Meats/Other/Uncategorized), products=3, orders=4 (+test EB25793599), messages=13 (+3 test), images=4
  - Skipped items: 0
  - Drift check at 20260729T082652Z: 0 new rows on all resources
- [ ] Frontend: replace `cloudGet`/`cloudSet` with `VITE_API_URL`-based per-action fetch calls
- [ ] Frontend: admin login calls `POST /api/admin/login`, stores session token in memory
- [ ] All write endpoints include session token in Authorization header
- [ ] No whole-array POSTs remain (D3 fixed)
- [ ] Smoke test: place order, send chat message, upload receipt, admin flows, admin login/logout
- [ ] Deploy frontend to Vercel; smoke runs on Vercel URL
- [ ] Retire Netlify site and function entirely (remove `netlify/functions/api.mjs`, `netlify.toml`; delete Netlify site)
- [ ] Push + verify Vercel build passes

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
- [ ] Frontend shop: category pills replace hardcoded meats/other toggle — **NOTE: category filter pill CSS + DEFAULT_CATEGORIES already in WIP commit 3929845; review/reuse before rebuilding**
- [ ] Backend: `products.in_stock` bool; PATCH endpoint for stock toggle
- [ ] Frontend admin: per-product in-stock toggle switch
- [ ] Frontend shop: out-of-stock products show OUT OF STOCK badge (not hidden) — **NOTE: stock badge CSS + out-of-stock overlay CSS already in WIP commit 3929845; review/reuse**
- [ ] Frontend shop: product search bar (client-side filter on name/description) — **NOTE: search bar CSS already in WIP commit 3929845; review/reuse**

### Phase 5 — Landing page
- [ ] Frontend: hero section above shop grid (value props: instant availability, 10–60 min delivery, effortless selling, built for speed)
- [ ] CTA buttons: "Shop Now" → scrolls to/shows shop; "Become a Seller" → seller registration form
- [ ] Mobile-first layout; verify on 375px viewport

### Phase 6 — Tracking + polling
- [ ] Backend: `GET /orders/:id` (public) — returns order + status + items + delivery info
- [ ] Frontend: customer tracking view — enter order ID → fetch → display status timeline with ETA copy — **NOTE: tracking timeline CSS already in WIP commit 3929845; review/reuse before rebuilding**
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

### 2026-07-29 — Phase 0 bootstrap + WIP preservation + Vercel decision
- Repo found at `/c/Users/danie/.openclaw/workspace-chaincheff/everythingbida`
- Origin: `github.com/castlejnr2-droid/everythingbida` ✓
- Dirty tree discovered: 6 modified files. Operator decision: preserve as WIP commit.
- Push of b58bedd initially blocked by expired PAT in remote URL. Resolved by operator switching to gh CLI + clean tokenless remote URL.
- **b58bedd** — plan docs committed to origin/main.
- **3929845** — WIP commit: src/App.jsx (+432 lines: categories, stock badges, search, tracking timeline CSS), netlify/functions/api.mjs (+39 lines: EmailJS notify, reference-only), netlify.toml (updated). .netlify/ build artifacts untracked + .gitignore updated.
- **Hosting decision:** frontend moves from Netlify to Vercel. EVERYTHINGBIDA_PLAN.md synced: Section 2 Frontend line, secrets line, Phase 2 description all updated.
- EmailJS work in api.mjs confirmed superseded by server-side Resend (Phase 7). Client-side email keys = same class of mistake as D1 (hardcoded secret in bundle).
- Next: rotate hardcoded admin password `castle@7035` in App.jsx:191 (D1 interim fix).

### 2026-07-29 — Phase 1A: backend scaffold complete
- Repo created: `castlejnr2-droid/everythingbida-backend` (private) at `/c/Users/danie/.openclaw/workspace-chaincheff/everythingbida-backend`
- Files: package.json (ESM, node>=20), .gitignore, .env.example, migrations/001_init.sql (full v2 schema with FKs + sensible defaults), src/db.js (pg Pool, ssl conditional on non-local URL), src/migrate.js (idempotent, schema_migrations table, transactional), src/auth.js (POST /api/admin/login bcrypt+JWT 12h + requireAdmin middleware + per-IP rate limit), src/images.js (admin upload, public serve, customer receipt upload), src/index.js (express.json 8mb, CORS allowlist, /health), README.md, PROGRESS.md
- `node --check` passed all src files
- **7f55047** — pre-amend hash recorded in PROGRESS.md; pushed as bb948c3
- Next: Phase 1B — Railway provisioning + deploy (operator must stage .env values first)

### 2026-07-29 — Phase 1B: Railway provisioning + deploy complete
- Branch renamed master→main; GitHub default branch updated.
- Railway project `everythingbida-backend` (8b884794): Postgres service (838c87cc) + backend service (d928aaca) — both in same project/environment.
- Key lesson: Railway Postgres public proxy (*.rlwy.net) requires SSL (`rejectUnauthorized:false`); private network (.railway.internal) needs no SSL. Initial deploy was corrupted by `railway up` deploying Node.js onto Postgres service slot — fixed by deleting and recreating Postgres service.
- Env set: DATABASE_URL (Railway ref to Postgres.DATABASE_PUBLIC_URL), ADMIN_PASSWORD_HASH (bcrypt cost 10), SESSION_SECRET (32 random bytes hex), FRONTEND_ORIGIN. Values also mirrored to local .env (gitignored).
- Gates: /health {ok:true,migrations:1} | POST /api/admin/login 200+token | requireAdmin route 401 no-token / 201 with-token | GET /api/images/99999999 → 404
- All 8 tables confirmed in DB (categories, locations, images, vendors, products, orders, messages, bank_settings + schema_migrations)
- **19337f6** — Phase 1B docs pre-amend hash; pushed as 79a80ae
- Phase 1 fully complete. Next: Phase 2 — data migration + frontend cutover to Vercel.

### 2026-07-29 — Phase 0 final: D1 interim password rotation
- Replaced leaked password at App.jsx:191 with a new 16-char random value (letters + digits, no ambiguous chars).
- Comment added above the check: `// INTERIM — client-side auth removed in Phase 2 (server-side login)`
- Phase 0 now fully complete. All commits on origin/main.
- Phase 1 is next: scaffold `everythingbida-backend` (Express + Postgres on Railway).
