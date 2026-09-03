# EXECUTOR_ROADMAP.md

## Phase 12 — AI-shopping repositioning (2026-09-03, f7afd44)

Platform repositioned around EB AI as primary entry point. Copy and layout only — no new AI capability.

### Copy constraint (permanent)
Marketing copy may describe what EB AI does as a product: find products in the Bida catalog by asking in plain language. It must NOT claim EB AI adds to cart, places orders, negotiates, or recommends beyond the catalog. In-chat stub/live copy variants in `AIChatBubble` must remain independent so go-live requires only `ANTHROPIC_API_KEY` — no copy edits. This constraint applies to all future phases: never let marketing copy outrun actual capability.

### What changed
- **Hero:** "Buy anything in Bida. Just ask." Primary CTA opens EB AI panel; secondary browses catalog; tertiary (underlined text link) reaches Become a Seller.
- **EB AI top entry:** Amber-gradient tappable bar at top of shop view above catalog search. Logo icon + "Ask EB AI for anything in Bida..." prompt. "or search the catalog yourself" divider below it. Product search unchanged and still present.
- **Visual distinction:** Entry = amber gradient bg, #D97706 border, EB logo, prompt text. Search = plain white input, #FDE68A border, 🔍 emoji, keyword placeholder.
- **State lifting:** `open`/`setOpen` moved from `AIChatBubble` local state to `App` level so `ShopView` can trigger the panel. Existing `useEffect([open])` auto-focuses input — no extra wiring needed.
- **Value props:** AI discovery leads; availability honesty framed as differentiator; delivery; vendor discoverability.
- **How-it-works:** "Ask EB AI or browse" as first step.
- **Taglines/meta:** Wordmark tagline, page title, meta description all updated.
- **Seller page:** Copy explains EB AI discoverability for vendors.

### Height at 360px (no discovery rails)
Header ~90px + main-top-pad 30px + AI entry ~60px + search bar ~61px + category pills ~58px = ~299px. Catalog visible ~61px above fold — the new element adds ~60px versus the pre-Phase-12 baseline. With discovery rails present, catalog is below fold in both pre- and post-Phase-12 states (rails ~180px alone account for this).

---

## Regressions and post-ship defects

### Phase 11C badge regression (2026-08-10)

**Defect:** Floating cart button item-count badge did not update when a product was added to the cart via repeat-add or CartView qty controls.

**Root cause:** `App.jsx:493` rendered `{cart.length}` — the number of distinct entries in the `cart` array. `addToCart` correctly increments `qty` on an existing entry rather than pushing a duplicate, so adding the same product a second time (or tapping +1 in CartView) changed `qty` without changing array length. The badge was correct only for first-add-of-a-new-product and for item removal (both of which change array length).

**Paths broken before fix:**
- Catalog card: repeat-add of same product (qty bump, no badge change)
- EB AI product card: repeat-add of same product (same)
- CartView quantity +1 control (`updateQty +1`, no badge change)

**Paths working before fix:**
- First add of a new product (pushes new entry, `cart.length` increases)
- CartView qty -1 to zero (auto-removes entry, `cart.length` decreases)
- Remove item (same)
- clearCart / order completion (array empties)

**Why Phase 11C smoke passed on a broken feature:** The smoke added a single distinct product and confirmed the badge appeared. It did not test repeat-add of the same product or qty increment in CartView — both of which are qty-only mutations. The test was a one-shot appearance check, not a quantity-tracking check.

**Fix (App.jsx:459):** Added `const cartTotal = cart.reduce((sum, i) => sum + i.qty, 0);` as a derived value immediately before the return. Badge and aria-label use `cartTotal` instead of `cart.length`. Single source of truth preserved — no new state.

**Badge behaviour:** Hidden when `cartTotal === 0` (no "0" shown). Displays SUMMED QUANTITIES (matches what CartView qty controls show).

**Test:** 11/11 mutation paths verified with inline Node.js test (catalog first-add, catalog repeat-add, EB AI first-add, EB AI repeat-add, qty+1, qty-1, qty-to-zero auto-remove, explicit remove, empty check, clearCart, 10+ items). All passed.

**Retest instructions for operator (manual device verification):**
1. Open https://everythingbida.com — confirm badge is hidden (cart empty).
2. Tap "Add to Cart" on any product from the catalog grid. Badge should appear showing **1**.
3. Tap "Add to Cart" on the SAME product again (or tap the cart, tap +1, go back). Badge should now show **2**.
4. Open the cart view. Tap the + button on that item. Badge (visible behind cart view or visible after navigating back to shop) should show **3**.
5. Tap the - button once. Badge should show **2**.
6. Tap - until the item removes itself (qty hits zero). Badge should drop by 1 per tap and then hide when cart is empty.
7. Add two different products. Badge should show their combined qty (e.g., 1 + 1 = **2**).
8. From the EB AI panel, ask for a product and tap "Add to Cart" on the chat card. Badge should increment.
9. Place an order to completion. Badge should disappear (cart cleared).
10. Navigate to the tracking view and the EB AI panel while the cart has items — confirm the floating button is visible and tapping it opens the cart from those views.
