# EXECUTOR_ROADMAP.md

## STANDING RULE (survives context resets)
(a) At the START of every session, read both EVERYTHINGBIDA_PLAN.md and EXECUTOR_ROADMAP.md before touching anything.
(b) At the END of every completed task, update EXECUTOR_ROADMAP.md.
(c) Whenever work changes scope, architecture, schema, statuses, or anything EVERYTHINGBIDA_PLAN.md describes, explicitly tell the operator "PLAN SYNC NEEDED:" followed by exactly what the planner should update, so the two files never drift.

---

## Current position
**Phase 4 — Catalog upgrades. Phase 3 COMPLETE.**

Production: https://everythingbida.com live on Vercel (external DNS at Namecheap, records unchanged). TLS valid. www→apex 308 redirect active. Netlify code fully retired from repo. bank_settings must be populated by operator via admin panel before going live with payments.

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
- [x] Frontend: replace `cloudGet`/`cloudSet` with `VITE_API_URL`-based per-action fetch calls (Phase 2C)
- [x] Frontend: admin login calls `POST /api/admin/login`, stores JWT in sessionStorage, Bearer on admin calls, clear on 401 (Phase 2C)
- [x] All write endpoints include session token in Authorization header; no whole-array POSTs (D2/D3 fixed, Phase 2C)
- [x] Hardcoded client-side password comparison deleted (D1 closed, Phase 2C)
- [x] Images served from `${VITE_API_URL}/api/images/${id}`; admin upload via POST /api/admin/images (D5 closed, Phase 2C)
- [x] Order placement POSTs items as [{product_id, qty}]; displays server-returned subtotal/delivery_fee/total (Phase 2C)
- [x] Chat messages read/post via order message routes; receipt upload via /api/orders/:id/receipt-image (Phase 2C)
- [x] Deploy frontend to Vercel — https://everythingbida.vercel.app (project: gramketing/everythingbida, Phase 2C)
  - VITE_API_URL=https://everythingbida-backend-production.up.railway.app set as production env var
  - GitHub main branch auto-deploys to Vercel
  - Custom domains attached: everythingbida.com (primary), www.everythingbida.com (308→apex)
  - Bundle verified: no hardcoded password, Railway URL embedded, eb_admin_token/receipt-image present
- [x] CORS updated on Railway: FRONTEND_ORIGIN includes .vercel.app + everythingbida.com + www + localhost:5173
- [x] Smoke (API layer, 2026-07-29): catalog 3 products ✓, images 200/image/jpeg ✓, empty locations handled ✓, pickup order EB70589725 placed ✓, tracking ✓, customer chat + receipt image_id=5 ✓, 401 without token ✓, bundle clean ✓
- [ ] Admin login smoke: requires operator to verify with their admin password (plaintext not stored here)
- [x] netlify/functions/api.mjs + netlify/ dir + netlify.toml DELETED; @netlify/blobs + netlify-cli removed from package.json; npm install + build verified clean
- [x] Phase 2D: DNS cutover confirmed (domain re-added to Vercel in external DNS mode; Namecheap A+CNAME records unchanged). TLS issued. www→apex 308 redirect via vercel.json. Final Netlify snapshot 20260729T114750Z — zero delta. **Phase 2 COMPLETE.**

### Phase 3 — Delivery locations ✅ COMPLETE (2026-07-29)
- [x] Backend: `locations` CRUD endpoints (admin-only for write: POST/PUT/DELETE; public GET) — Phase 2A
- [x] Backend: GET /api/admin/locations — all locations (active+inactive) with order_count — 3131e6d
- [x] Backend: order placement validates `location_id` (must be active) + `specific_address` non-empty when `method=delivery` — Phase 2A
- [x] Backend: `delivery_fee` + `total` computed server-side from location record; POST response enriched with location_name — 3131e6d
- [x] Frontend checkout (delivery flow): step 1 — searchable tappable list of active locations, each showing delivery price, single-select required
- [x] Frontend checkout: step 2 — after location selected, required "Specific place in [location]" text field (appears only after location chosen)
- [x] Frontend: order summary shows subtotal + "Delivery to [location]" + total before Place Order; inline validation errors (no alert())
- [x] Frontend: delivery option card disabled with message when no active locations
- [x] Frontend: receipt/order confirmation shows location_name + specific_address + "Delivery to X" fee label
- [x] Admin: Locations tab — add, edit inline, deactivate/reactivate buttons, order count badge, shows inactive locations
- [x] Admin order card: shows location_name + specific_address (Phase 2A + orders query already had LEFT JOIN)
- [x] Tracking view: shows location + specific address (Phase 2C already wired)
- [x] Admin chat header: shows location name + specific address for delivery orders
- Frontend commit: c9d1df8 | Backend commit: 3131e6d

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

### 2026-07-29 — Phase 2C: frontend rewired + Vercel deploy + domains attached
- Step 0: All 3 migrated orders (backup snapshots T021732Z + T082652Z) — zero payment-proof/proofBase64/receipt image fields. One message had image:null. No data-loss gap.
- src/api.js created: thin wrappers for all backend routes, getToken/setToken/clearToken (sessionStorage), Bearer auto-attach, 401 auto-logout via 'eb:logout' event, imageUrl() helper.
- App.jsx fully rewritten (data layer): cloudGet/cloudSet removed, hardcoded password deleted, JWT login, per-resource writes, delivery location dropdown, server-returned order totals, image upload via API, chat via API with 15s polling, admin orders with 20s polling, in_stock toggle, LocationsView added.
- netlify/functions/api.mjs + @netlify/blobs LEFT IN PLACE (netlify.toml references functions dir).
- Vercel project created: gramketing/everythingbida — https://everythingbida.vercel.app
- VITE_API_URL set as Vercel production env var; GitHub main auto-deploys.
- Custom domains attached via API: everythingbida.com (primary), www.everythingbida.com (308→apex).
- CORS updated on Railway backend; redeployed; /health {ok:true,migrations:1} confirmed.
- Bundle verified: railway.app URL embedded, no hardcoded passwords, receipt-image/eb_admin_token present.
- Smoke API tests all green (see checklist above).
- DNS records for Namecheap (operator to enter):
  - **A record**: Host=`@`, Value=`76.76.21.21`
  - **CNAME record**: Host=`www`, Value=`cname.vercel-dns.com.`
  - www → 308 redirect to apex (Vercel-managed)
  - everythingbida.com is the primary domain (apex)
- Next: Phase 2D — operator enters DNS at Namecheap, verify site loads on custom domain, retire Netlify.

### 2026-07-29 — Phase 2D: DNS cutover + Netlify retirement (Phase 2 COMPLETE)
- DNS: everythingbida.com re-added to Vercel in external DNS mode (was: nameserver delegation mode causing timeout). Namecheap A @ 216.198.79.1 + CNAME www → 215f4a2270340af2.vercel-dns-017.com. unchanged.
- Vercel verify: `"status":"ok","reason":"configured_correctly","serviceType":"external"` for both apex and www. TLS issued by Let's Encrypt within seconds of re-add.
- Delta migration: fetched all 5 Netlify Blobs endpoints at 20260729T114750Z. Zero new rows vs. 2B snapshot — no migration re-run needed.
- www→apex redirect: vercel.json created with host-conditional 308 redirect.
- Netlify code retired: netlify/ dir, netlify.toml deleted; @netlify/blobs + netlify-cli removed; npm install (1251 packages removed, 66 remain); build ✓ (250.57 kB JS / 74.92 kB gzip, 3.19s).
- src/ grep: zero Netlify references in bundle source.
- NOTE: bank_settings row is empty (bank API returns `{name:"",acc_num:"",acc_name:""}`). Operator must populate via admin panel.
- Phase 3 (delivery locations) is next.

### 2026-07-29 — Phase 0 final: D1 interim password rotation
- Replaced leaked password at App.jsx:191 with a new 16-char random value (letters + digits, no ambiguous chars).
- Comment added above the check: `// INTERIM — client-side auth removed in Phase 2 (server-side login)`
- Phase 0 now fully complete. All commits on origin/main.
- Phase 1 is next: scaffold `everythingbida-backend` (Express + Postgres on Railway).

### 2026-07-29 — Phase 3: Delivery locations end-to-end
- Session recon: Phase 2 all done; locations CRUD already existed from Phase 2A (backend); LocationsView, admin orders query with location_name JOIN already existed from Phase 2C. Phase 3 checkboxes all unchecked.
- Pre-existing inventory: backend CRUD fully wired, CartView had a <select> dropdown (not tappable cards), LocationsView used public endpoint (couldn't see inactive), SuccessModal lacked location display, ChatView header had no location context.
- Backend probe: GET /api/locations → [] (no active locations); POST /api/orders validation confirmed: missing location_id → 400, missing/whitespace specific_address → 400, nonexistent location_id → 400. /health {ok:true,migrations:1}.
- Backend changes (3131e6d): GET /api/admin/locations (requireAdmin, returns all + order_count); POST /api/orders response enriched with location_name.
- Frontend changes (c9d1df8): api.js getAdminLocations(); CartView → tappable location cards + search filter + two-step flow + inline errors + delivery option disabled when no locations; LocationsView → admin endpoint, inactive locations section, deactivate/reactivate buttons, order count badges; SuccessModal → location_name + specific_address block + "Delivery to X" fee line; ChatView header → location context for admin view. Build: 256.40 kB / 76.08 kB gzip.
- **Password rotation (2026-07-29):** Admin password rotated — old password burned in history replaced. New hash (bcrypt cost 10) set on Railway. Proof: new pw → 200+token, old pw (`rK7mX4nJ9wQ2vB8p`) → 401. Value NOT recorded here.
- **Backend bug fixed (orders.js):** `locRows` declared with `const` inside `if (method==='delivery')` block but referenced at function scope — ReferenceError crashed all delivery order POSTs. Fix: outer-scope `let locRow = null`, promoted. Deployed via `railway up`, health confirmed.
- **Tamper test (live):** POST /api/orders with `delivery_fee=1,total=1` → response `delivery_fee=800.00,total=5300.00` (GRA, 1×Fresh Chicken). POST with `delivery_fee=-99999,total=-99999` → same. Client-sent fee/total are ignored; server computes from DB.
- **Phase 3 smoke (all green):** (a) Bida Central ₦500 fee=500 total=5000 location_name present ✓ (b) inactive → 400 ✓ (c) tracking GET shows location_name+specific_address ✓ (d) admin/orders same ✓ (e) EB25793599 NULL location_id — 200 no errors ✓ (f) deactivate/existing-order/reactivate ✓
- **Frontend bundle:** specific_address ×7, delivery_fee ×10, /api/locations, location search filter, specific-address field all confirmed in deployed bundle. No Phase 3 defects.
- **Test locations (permanent):** id=2 "Bida Central" ₦500 (active), id=3 "GRA" ₦800 (active).
- **Test orders (permanent):** EB73459826 (tamper1, GRA), EB59850108 (tamper2, GRA), EB26301317 (smoke-a, Bida Central).
- Backend amended commit: d737512. Frontend amended commit: (this session). **Phase 3 COMPLETE.**
- Phase 4 (catalog upgrades) is next.
