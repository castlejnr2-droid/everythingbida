# EXECUTOR_ROADMAP.md

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
