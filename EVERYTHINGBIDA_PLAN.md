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

**Phase 5 — Landing page.** Hero + value props + CTA (Shop Now / Become a Seller), mobile-first.

**Phase 6 — Tracking + polling.** Customer tracking view (order ID lookup), status timeline with ETA copy, admin status controls incl. new statuses, 20s polling on admin orders/chat and customer tracking/chat.

**Phase 7 — Notifications.** Resend integration; admin email on order create; optional customer email at checkout → confirmation email with tracking ID; admin WhatsApp deep link on order cards. Email failures must never fail the order (fire-and-forget with logged errors).

**Phase 8 — Seller registration.** Public form, vendor applications admin queue, vendor attribution dropdown on product form.

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
