# EVERYTHINGBIDA_PLAN.md — v2 Upgrade Plan

Status: PLANNING → phase-by-phase execution
Repo (current): `everythingbida` (frontend + Netlify function)
Repo (new): `everythingbida-backend` (Express + PostgreSQL on Railway)
This document is the source of truth. Chat memory is secondary. Every completed prompt appends an entry to the Progress Log at the bottom (one push = one commit = one hash).

---

## 1. Current state (from read-only recon, 2026-07-19)

- Single-file React app (`src/App.jsx`, 1007 lines in working tree — 737 at last origin commit plus ~432 lines of uncommitted in-progress work discovered in recon (DEFAULT_CATEGORIES, stock badge/out-of-stock overlay, search bar, category filter pills, tracking timeline CSS — preserved as WIP commit `3929845`; reusable groundwork for Phases 4 + 6)), Vite build, deployed on Netlify.
- `netlify/functions/api.mjs` carries +39 WIP lines adding an EmailJS notify endpoint, preserved as reference only, superseded by server-side Resend in Phase 7.
- Storage: Netlify Blobs via one function (`netlify/functions/api.mjs`). Resources: `products`, `orders`, `messages`, `bank`.
- Views: shop (meats/other toggle), cart + checkout (pickup/delivery, bank transfer), per-order chat with image (receipt) upload, admin product CRUD, admin orders, admin bank settings.
- Product images stored as base64 strings inside the products blob.

### Critical defects (must fix in v2)
| # | Defect | Impact |
|---|--------|--------|
| D1 | Admin password hardcoded in client bundle | Anyone can read it from source and log in. Rotate immediately; move auth server-side. |
| D2 | API has zero auth — any visitor can POST | Anyone can wipe/replace products, orders, bank details |
| D3 | POST replaces entire resource (last-write-wins on whole array) | Concurrent orders/messages silently lost — money path bug |
| D4 | Data loads once on mount; no refresh | Admin never sees new orders/messages without manual reload |
| D5 | Base64 images inside JSON blob | Every page load downloads the entire catalog's images; grows unbounded |

---

## 2. Target architecture

- **Frontend:** React/Vite, moves from Netlify to Vercel. Netlify site + function fully retired after Phase 2 cutover smoke.
- **Backend:** Node.js + Express + PostgreSQL on Railway (same stack as Lada/Gramketing backends). New repo: `everythingbida-backend`.
- **Images:** stored in Postgres (`bytea`), served via `GET /images/:id` with `Cache-Control: public, max-age=31536000, immutable`. Product/message records reference image IDs, never inline base64.
- **Auth:** admin password stored server-side as bcrypt hash (env). Login returns a signed session token; all admin/write endpoints require it. Public endpoints: read products/categories/locations, place order, order tracking by ID, per-order chat (scoped by order ID), seller application submit.
- **Email:** Resend (or SMTP fallback) from backend. Admin notified instantly on new order; customer optionally receives order details + tracking ID if they provide an email at checkout.
- **Old Netlify function/Blobs:** retired after data migration + cutover smoke.

### Env vars (Railway backend)
`DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `ADMIN_WHATSAPP_NUMBER`, `FRONTEND_ORIGIN` (CORS allowlist).
Frontend env: `VITE_API_URL`.
Secrets staging per standing rule: values live in local gitignored `.env`; executor syncs to Railway/Vercel without printing/echoing/committing values.

### Database schema (v2)
- `products` (id, name, category_id, price, description, image_id, in_stock bool, vendor_id nullable, created_at)
- `categories` (id, name, emoji, sort_order)
- `locations` (id, name, delivery_fee, active bool) — admin-defined major Bida locations with per-location delivery price
- `orders` (id text "EB########", customer_name, phone, email nullable, method pickup|delivery, location_id nullable — required when method=delivery, specific_address text — the customer-typed specific place within the chosen location, required when method=delivery, items jsonb, subtotal, delivery_fee, total, status, paid bool, created_at)
- `messages` (id, order_id, sender system|customer|admin, text, image_id nullable, created_at)
- `vendors` (id, name, phone, product_types, notes, image_id nullable, status pending|contacted|approved|rejected, created_at)
- `images` (id, mime, data bytea, created_at)
- `bank_settings` (single row: name, acc_num, acc_name)

Order statuses: `pending → confirmed → preparing → out_for_delivery → delivered` (plus `ready_for_pickup` for pickup orders).

---

## 3. Feature scope (agreed 2026-07-19)

1. **Delivery locations (headline feature):** admin CRUD of major Bida locations, each with its own delivery price. At checkout, when Home Delivery is selected, the customer is shown the admin-added locations as tappable, searchable options and must select exactly one; the selected location's delivery price is applied to the order total. After selecting a location, a required free-text field appears where the customer types the specific place within that location (street, house, landmark, directions). Both the selected location and the typed specific place are stored on the order and shown on the receipt, admin order card, and tracking view.
2. **Landing/hero section:** value props — instant availability (only in-stock today), 10–60 min delivery, effortless selling, built for speed — above the shop grid.
3. **Seller registration:** public form (name, phone, product types, optional photo/notes) → admin "Vendor Applications" queue with status management. Approved vendors can be attributed on products (groundwork for multi-vendor later).
4. **Real categories:** admin-defined categories replace hardcoded meats/other; category pills on shop.
5. **Stock toggle:** in-stock switch per product; out-of-stock products show badge instead of disappearing (or hidden — admin choice via toggle).
6. **Product search bar** on shop.
7. **Customer order tracking:** enter order ID → live status timeline with ETA messaging (10–60 min promise), items, delivery fee, chat entry point. Everything customer-facing stays on-platform.
8. **Polling refresh:** admin orders + chat poll every ~20s; customer tracking/chat polls too. (No websockets in v1 of v2 — polling is sufficient.)
9. **Notifications:**
   - Admin: instant email on new order (Resend); WhatsApp deep-link button in admin order card (admin-side convenience only, never shown to customers).
   - Customer: OPTIONAL email field at checkout → order confirmation with tracking ID + link. Clearly marked optional.
10. **In-chat receipt upload:** preserved, migrated to backend image storage.
11. **Security cutover:** D1–D5 all fixed (server auth, per-row writes, image endpoint).

Out of scope for v2 (parked): vendor self-service accounts/logins, online card payments, rider/dispatch app, push notifications.

---

## 4. Phases

**Phase 0 — Plan commit + immediate mitigation.** Commit this doc. Rotate the hardcoded admin password in App.jsx to a new interim value pending Phase 2 removal.

**Phase 1 — Backend foundation (new repo `everythingbida-backend`).** Express scaffold, Postgres pool, migration 001 (full schema above), bcrypt admin login + session middleware, image upload/serve endpoints, CORS allowlist, `/health`. Deploy to Railway; verify boot log + /health per env-race rule.

**Phase 2 — Data migration + frontend cutover.** One-off script reads existing Netlify Blobs JSON (products/orders/messages/bank), decodes base64 images into `images` table, inserts rows. Frontend switched to `VITE_API_URL` client with per-action endpoints (no whole-array POSTs). Admin login via backend. Smoke: place order, chat, receipt upload, admin flows. Frontend deployed to Vercel; smoke runs on the Vercel URL; then retire the Netlify site and function entirely.

**Phase 3 — Delivery locations.** Backend: locations CRUD (admin-only writes) with per-location delivery price; order placement validates that delivery orders carry a valid active location_id AND a non-empty specific_address, and computes delivery_fee + total server-side from the location record (never trust client totals). Frontend checkout (Home Delivery selected): step 1 — searchable list of admin-added locations rendered as tappable options, single-select, each showing its delivery price; step 2 — after selection, a required "Specific place in [location]" text field (street, house, landmark, directions). Order summary shows subtotal + delivery fee to the chosen location + total before Place Order. Admin gets a Locations tab (add/edit price/deactivate).

**Phase 4 — Catalog upgrades.** Categories CRUD + pills, stock toggle + badge, product search.

**Phase 5A — Seller registration (originally Phase 8, moved earlier so landing page ships with a live CTA).** Public form (name, phone, product types, optional photo/notes), admin "Sellers" tab with vendor queue + status management, vendor attribution dropdown on product form (approved vendors only, admin/storage only — not public).

**Phase 5B — Landing page.** Hero + value props + CTA (Shop Now / Become a Seller links to Phase 5A form), mobile-first.

**Phase 6 — Tracking + polling.** Customer tracking view (order ID lookup), status timeline with ETA copy, admin status controls incl. new statuses, 20s polling on admin orders/chat and customer tracking/chat.

**Phase 7 — Notifications.** Resend integration; admin email on order create; optional customer email at checkout → confirmation email with tracking ID; admin WhatsApp deep link on order cards. Email failures must never fail the order (fire-and-forget with logged errors).

**Phase 9 — Full operator smoke + polish.** End-to-end: browse → search → cart → delivery location w/ fee + specific place → optional email → order → admin email received → chat + receipt → status walk → tracking view reflects → delivered. Mobile pass, contrast pass (WCAG AA).

---

## 5. Build rules (standing, restated)
- One prompt at a time, strictly sequential; every prompt in a single code block; every prompt names its target repo.
- Read-only recon before every new session and before any fix on live paths.
- One push = one commit = hash amended into Progress Log below.
- After any Railway env change, trust only new container boot log + /health.
- Secrets never printed, echoed, logged, or committed.

---

## 6. Progress Log
| Date | Phase | Commit | Notes |
|------|-------|--------|-------|
| 2026-07-19 | Plan | — | Plan authored from repo recon; scope agreed |
| 2026-07-29 | Phase 0 | b58bedd | Plan + roadmap committed; D1–D5 confirmed; push initially blocked by expired PAT, resolved by operator. |
| 2026-07-29 | Phase 0 | 3929845 | Pre-plan WIP preserved; .netlify/ build artifacts untracked; hosting decision: frontend → Vercel. |
| 2026-07-29 | Phase 0 | 63fc4b9 | Plan + roadmap synced: Vercel decision recorded, WIP groundwork annotated. |
| 2026-07-29 | Phase 0 | 2185642 | Interim admin password rotated; Phase 0 complete. |
| 2026-07-29 | Phase 2 | ae19e33 | **Phase 2 COMPLETE.** Production domain everythingbida.com live on Vercel (external DNS at Namecheap, A @ 216.198.79.1 + CNAME www → 215f4a2270340af2.vercel-dns-017.com., records unchanged). Delta migration: zero new rows in Netlify Blobs since Phase 2B snapshot; final snapshot 20260729T114750Z saved to backup/. Netlify code retired: netlify/functions/api.mjs, netlify/ dir, netlify.toml deleted; @netlify/blobs + netlify-cli removed from package.json. www→apex 308 redirect via vercel.json. TLS issued (Let's Encrypt). NOTE: bank_settings must be populated by operator via admin panel. Phase 3 (delivery locations) is next. |
| 2026-07-29 | Phase 3 | c9d1df8 | **Phase 3 COMPLETE.** Backend: GET /api/admin/locations (all locations + order_count, admin-only), POST /api/orders response enriched with location_name (backend commit 3131e6d). Frontend: CartView → tappable location cards with search/filter, two-step flow (location first, then specific-place textarea), inline validation errors, delivery option disabled when no active locations; LocationsView → loads from admin endpoint (sees active + inactive), deactivate/reactivate buttons, order count badge; SuccessModal shows location_name + specific_address + "Delivery to X" fee line; admin order chat header shows location context; TrackOrderView already showed location (Phase 2). Backend validation confirmed: missing location_id → 400, missing specific_address → 400, inactive/nonexistent location_id → 400. Phase 4 (catalog upgrades) is next. |
| 2026-07-29 | Phase 4 | 52c7b64 | **Phase 4 COMPLETE.** Category deletion: BLOCK strategy — 409 + readable count if products exist (backend commit 47a3e8a). Uncategorized (id=4) had 0 products at phase start (all 3 products in Meats). Backend: GET /api/categories + GET /api/admin/categories both return product_count; DELETE blocks with 409 when products exist. Frontend: ShopView category pills sourced from API (no DEFAULT_CATEGORIES); pills hide when 0 products in catalog; search clear button; combined search+category filter + empty state. CategoriesView: loads admin endpoint (product_count badge, sort ↑/↓ arrows swapping sort_order, 409 surfaced as readable alert). AdminView: inline "+ New" button on category dropdown creates category and auto-selects it. CartView: OOS order failure surfaces as inline error banner (backend returns "Product out of stock: [name]"). Smoke: 31/31 passed. Test data created and cleaned up (Smoke Broccoli product + Smoke Test Veg category, both deleted). Phase 5 (landing page) is next. |
| 2026-07-29 | Phase 5A | b92a3c7 | **Phase 5A COMPLETE.** PHASE ORDER SWAP: seller registration (originally Phase 8) moved before landing page so the "Become a Seller" CTA can be live when the landing ships. Backend (72a730b): POST /api/vendor-images (public photo upload for seller form); GET /api/admin/vendors?status= filter; GET /api/admin/products (admin-only, returns vendor_id); POST + PUT /api/admin/products accept and persist vendor_id. Frontend: BecomeSellerView (public — name/phone Nigerian-format validation/product types/optional photo/confirmation screen); SellersView (admin — applications newest first, status filter tabs, pending-count badge on Sellers nav tab, WhatsApp deep link per application); AdminView product form vendor dropdown (approved vendors only). Public /api/products and public shop render have zero vendor exposure. Smoke: all 7 checks green. Test vendors (id 1+2) set to rejected; vendor_id cleared from Fresh Chicken. Phase 5B (landing page) is next. |
| 2026-07-29 | Phase 5B | 96b684f | **Phase 5B COMPLETE.** Backend (c5d01cd): POST /api/vendor-images rate-limited 5/IP/hr; POST /api/vendors rate-limited 3/IP/hr; both use X-Forwarded-For for real client IP behind Railway proxy; trust proxy enabled; login rate limiter patched with same fix. Public-upload rate-limit gap CLOSED. Frontend: landing section integrated into ShopView above catalog — hero + tagline + Shop Now (scroll) + Become a Seller (route); 4 value props; How It Works strip. No fabricated stats/testimonials. Mobile-first at 360–380px, stacked CTAs below 380px. Navigation: embedded in ShopView, no forced redirect, all nav items always accessible. Bundle delta: +5.38 kB raw / +1.16 kB gzip (276.27 kB total). Smoke: 429 on 6th image upload ✓, 429 on 4th vendor application ✓. Phase 6 (tracking + polling) is next. |
| 2026-07-29 | Phase 6 | 5c1651a | **Phase 6 COMPLETE.** XFF spoofing CLOSED: all 3 rate limiters (login, vendor-images, vendors) switched from manual XFF[0] parsing to req.ip; trust proxy 1 was already set. Probe: 201×3 then 429 on request 4+ from same IP; randomized X-Forwarded-For headers on every request still hit 429 (Railway overwrites client XFF). Backend (6d99166). Frontend: TrackOrderView rebuilt — deep link (?order=EB########), 20s smart polling (visibility-aware + 60s backoff), full status timeline per method (delivery: out_for_delivery; pickup: ready_for_pickup), subtotal/delivery-fee/total breakdown, paid/awaiting-payment badge, ETA messaging per status (10-60 min range, honest copy), "Chat with Us" button, clear "not found" message, migrated orders (NULL location_name) render cleanly. Admin OrdersView: smart next-status button per order method (enforced at UI level only), secondary dropdown for corrections, Mark Paid / Mark Unpaid toggle, smart polling. Chat: smart polling. useSmartPoll hook: chat 15s, admin orders 20s, tracking 20s; pauses on document.hidden, immediate fetch on visibilitychange resume, 60s backoff after 3+ failures, no overlapping requests, cleans up on unmount. Smoke: all checks green. Test orders created: EB21440698 (delivery, Bida Central), EB46922684 (pickup). Phase 7 (notifications) is next. |
| 2026-07-30 | Phase 7 | fed93dd / 7046362 | **Phase 7 COMPLETE.** Backend (7046362): resend ^6.18.1 installed; src/email.js — fireAdminOrderAlert (to ADMIN_EMAIL on every order, subject = "New order EB######## — ₦X — Delivery to Y / Pickup") + fireCustomerConfirmation (to order.email when present, includes bank_settings with graceful degradation if empty); both fire-and-forget via .catch(); errors logged with order ID + err.message only (no key, no PII); no retry loop. routes/orders.js: both helpers called post-INSERT, never awaited. RESEND_API_KEY + ADMIN_EMAIL + ADMIN_WHATSAPP_NUMBER synced to Railway. Frontend (fed93dd): CartView — optional email field after phone, labelled "(optional) — get your order details and tracking link", format-validated only when non-empty, inline error for malformed address; placeOrder passes email when present. OrdersView — WhatsApp deep link per order card targeting customer phone (normalizePhoneForWhatsApp reused: 0→234, strip +/spaces/dashes), message prefilled with order ID + greeting; admin-only (isAdmin-gated view). Smoke: (a) order EB69298737 no email → 201, admin alert fires, no customer email ✓; (b) order EB89736955 with email → 201, both emails fire, tracking link resolves order ✓; (c) tracking link ✓; (d) BREAK-GLASS: invalid key → EB82010078 + EB05706696 both 201, failure caught async, key restored, /health 200 ✓; (e) malformed email → frontend inline error + backend 400 ✓; (f) WhatsApp normalisation correct, link admin-only ✓; (g) regression all green ✓. Phase 9 (operator smoke + polish) is next. |
| 2026-08-01 | Phase 8 | bd3d28f / 98bcee5 | **Phase 8 COMPLETE.** DB purge: 16 test orders + 23 messages + 45 orphaned images + 9 rejected vendor apps deleted via railway run scripts. Preserved: EB04850822/EB17418604/EB18711266 (3 real migrated orders, all intact). DB final: Orders=3, Messages=10, Images=3, Vendors=0. Shop layout rework: hero+value-props+how-it-works moved below catalog grid. Discovery rails added at top: "Just Added" (in-stock products newest-first, up to 8, horizontal scroll+snap) + "Most Ordered" (GET /api/products/most-ordered; 60 s in-process cache; stale-on-error; hide if []). Post-purge "Most Ordered" returns 3 products from real orders: Premium Turkey 4, Fresh Chicken 3, Quality Beef 2 — rail shows. Threshold: show if ≥1 product. Em dashes removed: 5 in App.jsx + 3 in email.js (admin subject ×2, customer body ×1); bundle grep = 0 occurrences. Bank labels: CartView + SuccessModal now show "Bank Name / Account Number / Account Name" labelled grid; email already correct. "Become a Seller" always reachable from sticky nav. Phase 9 (full operator smoke + mobile/contrast polish) is next. |
| 2026-08-01 | Phase 9 | bcc39fc / 2305298 | **Phase 9 COMPLETE. v2 UPGRADE COMPLETE.** See full notes below. DB final: Orders=3, Messages=10, Images=3 (3 preserved orders intact, 3 Phase 9 smoke orders purged). |

---

## 7. Operator Runbook

### Adding products, categories, and locations
Log in as admin (Admin button in nav). Use the Products tab to add/edit/delete products; set the category in the dropdown and toggle in_stock. Use the Categories tab to add/rename/reorder categories. Use the Locations tab to add delivery areas with per-area fees; deactivate any area without deleting it to keep historical orders intact.

### Managing orders and statuses
Orders appear on the Orders tab, newest first, polling every 20 s. Click the status button (→ Confirmed, → Preparing, etc.) to advance an order. The dropdown overrides to any status if a correction is needed. Click "Mark Paid" when the bank transfer is confirmed. Use the Chat button to open the order's message thread; customers can also message from the tracking page. Use "WhatsApp Customer" to contact the customer directly.

### Where emails come from
Order emails come from orders@everythingbida.com via Resend. The admin receives an alert email on every new order. The customer receives a confirmation email only if they provided an email at checkout. If emails stop: check RESEND_API_KEY in Railway → Variables; check Resend dashboard logs. Email failures are fire-and-forget and never block order placement.

### If the backend is down
The frontend shows empty catalog/cart (API unreachable shows empty states, not errors). Orders cannot be placed. Check Railway dashboard for the backend service health. If the Postgres service is unhealthy, the backend will fail /health. Restart the backend service from Railway; it runs migrations on boot (idempotent). The frontend stays up (Vercel) and shows empty states until the backend recovers.

### Parked debt
1. **In-memory rate limiting (per-container):** The login, vendor-image, and vendor-application rate limiters use in-process Maps. If Railway scales to multiple containers, each has its own counter. At current scale (single container) this is acceptable. First step to close: add a Redis service to Railway and switch `express-rate-limit` to use a Redis store.
2. **Postgres public TCP proxy:** The Railway Postgres service exposes a public rlwy.net TCP endpoint used for the Phase 2 migration scripts. If no external tool needs direct DB access, this can be disabled in the Railway Postgres service settings to reduce attack surface. First step: verify no scripts or external tools connect to the rlwy.net URL, then toggle "Public Networking" off in Railway.
