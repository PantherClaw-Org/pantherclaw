# PANTHERCLAW — Setup & Deployment Guide

A Vite + React storefront backed by Supabase (Postgres, Auth, Edge Functions)
with Cashfree payments.

---

## 1. Prerequisites

- Node.js 18+ and npm
- A Supabase project (free tier is fine)
- The Supabase CLI — **no global install required**. Every `supabase …` command
  in this guide also works as `npx supabase …`, which downloads and runs the CLI
  on the fly using the Node you already have. (Prefer to install it permanently?
  `npm i -g supabase`.)
- A Cashfree account (start in **sandbox** mode)

---

## 2. Install & run locally

```bash
npm install
cp .env.example .env      # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

The app runs at http://localhost:5173.

---

## 3. Database migration

The hardening migration adds: auto order numbers (`PNT-YYMM-NNNNNN`), the
verified-purchase `submit_review` RPC, review aggregates, the idempotent
`mark_order_paid` / `mark_order_failed` payment RPCs, inventory decrement +
logging, and Row Level Security policies for user-owned tables.

Apply it with either method:

```bash
# Option A — Supabase CLI (linked project)
supabase db push

# Option B — paste supabase/migrations/0001_pantherclaw_hardening.sql
#            into the Supabase SQL editor and run it.
```

The migration is **idempotent and defensive** — safe to re-run.

---

## 4. Edge Functions

Two functions live in `supabase/functions/`:

| Function           | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `cashfree-checkout`| Creates a Cashfree order (server recomputes price/discount/shipping) and powers the `verify-order` success-page poll. |
| `cashfree-webhook` | Verifies Cashfree HMAC signatures, dedupes events, and marks orders paid/failed via RPC. |

### Deploy without installing the CLI (recommended)

From the project root, authenticate and link once, then deploy — `npx` fetches
the CLI automatically and bundles the shared `_shared/` helpers for you (the
pure-dashboard function editor can't, because these functions cross-import that
folder):

```bash
npx supabase login
npx supabase link --project-ref unxnpjzemjnexltzemni
npx supabase functions deploy        # deploys every function at once
```

### Set secrets (never put these in .env)

```bash
npx supabase secrets set \
  CASHFREE_APP_ID=xxxx \
  CASHFREE_SECRET_KEY=xxxx \
  CASHFREE_ENV=sandbox \
  CASHFREE_API_VERSION=2025-01-01 \
  CASHFREE_WEBHOOK_SECRET=xxxx \
  RESEND_API_KEY=re_xxxx \
  ORDER_EMAIL_FROM="PANTHERCLAW <orders@pantherclaw.in>"
```

> **No terminal at all?** You can set every secret in the dashboard instead:
> **Edge Functions → Secrets** ("Manage secrets") and add the same keys. Deploy,
> however, still needs `npx supabase functions deploy` — the dashboard editor
> can't resolve the shared `_shared/` imports.
>
> `CASHFREE_API_VERSION` is optional — the code already defaults to the latest
> **`2025-01-01`** (v5). The fields this integration uses are unchanged from
> older versions, so it's a safe default.

**Order emails:** `RESEND_API_KEY` enables the order-confirmation email sent
from the webhook after a successful payment. Verify your sending domain in the
Resend dashboard and set `ORDER_EMAIL_FROM` to an address on that domain. If the
key is absent, the store still works — emails are simply skipped.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the
Supabase Edge runtime — you do not set them.

### Deploy

```bash
supabase functions deploy cashfree-checkout
supabase functions deploy cashfree-webhook
```

### Configure the webhook in Cashfree

In the Cashfree dashboard → Developers → Webhooks, add:

```
https://<your-project-ref>.supabase.co/functions/v1/cashfree-webhook
```

Subscribe to `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, and `PAYMENT_USER_DROPPED`.

---

## 5. Going to production

1. Switch `CASHFREE_ENV=production` (Edge secret) **and** `VITE_CASHFREE_MODE=production` (frontend env), and use live Cashfree credentials.
2. Re-deploy both Edge Functions.
3. Point the production webhook URL at your live project.
4. Build the frontend: `npm run build` and deploy `dist/` to your host
   (Vercel, Netlify, Cloudflare Pages, etc.).

---

## 6. Smoke-test checklist

- [ ] Sign up / log in; profile loads on the Account page.
- [ ] Edit name + phone under Account → Profile and confirm it persists.
- [ ] Add to cart as a guest, then log in — cart merges into the DB session.
- [ ] Complete a sandbox checkout; success page polls and shows the order number.
- [ ] Confirm inventory decremented and an `order_status_history` row was written.
- [ ] Re-send the same webhook — the order is not double-processed (idempotent).
- [ ] As a buyer of a product, submit a review; a non-buyer is blocked.
- [ ] Order confirmation email arrives after a successful payment.
- [ ] Legal pages (`/privacy`, `/terms`, `/returns`, `/shipping-policy`) load and are linked in the footer.
- [ ] Visiting a random bad URL shows the styled 404 page.

---

## 7. SEO

- `public/robots.txt` and `public/sitemap.xml` ship with the build. Update the
  domain in both if you launch elsewhere.
- The static sitemap covers core pages. To include every product, generate
  `/product/<slug>` entries at build time from your `products` table and append
  them to `sitemap.xml`.
- Each page sets its own `<title>`/meta via `react-helmet-async`.

---

## Production phase 2 — Inventory, status emails & images

These ship with migration `0002_inventory_and_notifications.sql` and the new
`order-status-email` edge function.

### 1. Apply the migration
```bash
supabase db push        # or run 0002_inventory_and_notifications.sql in the SQL editor
```
This adds atomic inventory **reservation** (no more overselling the last unit),
the `tracking_number` / `tracking_url` / `carrier` columns on `orders`, and a
status-change trigger.

### 2. Deploy the status-email function
```bash
supabase functions deploy order-status-email
supabase secrets set ORDER_EMAIL_SECRET="$(openssl rand -hex 24)"
```
`RESEND_API_KEY` and `ORDER_EMAIL_FROM` are already used by the other functions
and are reused here.

### 3. Point the DB trigger at the function
The trigger reads its target + secret from the `pc_settings` table. Insert them
once (use the SAME secret you set above, and your project's functions URL):
```sql
insert into pc_settings (key, value) values
  ('edge_base_url', 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1'),
  ('order_email_secret', '<the ORDER_EMAIL_SECRET value>')
on conflict (key) do update set value = excluded.value, updated_at = now();
```
Now whenever your admin panel sets an order's `status` to `shipped` or
`delivered`, the customer automatically gets the matching email (the shipped
email includes the tracking link if `tracking_url` is set).

### 4. (Recommended) Auto-release abandoned reservations
Schedule the cleanup so abandoned checkouts free their reserved stock:
```sql
select cron.schedule('release-stale-reservations', '*/10 * * * *',
  $$ select public.release_stale_reservations(30); $$);
```
(Enable the `pg_cron` extension first under Database → Extensions.)

### 5. Responsive images / CDN
`src/components/Img.jsx` renders lazy, async-decoded images everywhere and
works today as-is. To upgrade every image to resized, auto-format (WebP/AVIF)
responsive `srcset` variants:
1. In Cloudflare for the `cdn.pantherclaw.in` zone, enable **Speed → Optimization → Image Resizing**.
2. Set `VITE_CF_IMAGE_RESIZE=true` (and confirm `VITE_CDN_BASE=https://cdn.pantherclaw.in`).
3. Rebuild & redeploy — no code changes needed.
Until then, leave `VITE_CF_IMAGE_RESIZE=false` and images serve normally.

---

## Production phase 3 — Search, discovery & order tracking

New this phase (mostly frontend, plus one edge function):
- **Instant search** — the navbar magnifier now opens a full-screen search (desktop + mobile menu).
- **You May Also Like** + **Recently Viewed** rails on product pages.
- **Guest order tracking** at `/track-order` (linked from the footer).

### Deploy the order-lookup function
```bash
supabase functions deploy lookup-order
```
It reuses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (already set). No new
secrets. It only returns an order when BOTH the order number and the email
match, and strips the email from the response.

---

## Production phase 4 — COD, shipping rules & abandoned-cart reminders

### Apply the migration
```bash
supabase db push   # applies 0003_cod_shipping_abandoned.sql
```
Adds `orders.payment_method` + `orders.cod_fee`, the `place_cod_order()` RPC,
and cart-session columns (`last_activity_at`, `reminder_sent_at`, `contact_email`).

### Shipping & COD rules (implemented)
- **Standard shipping** is **free on orders of 2+ items**; a single item pays the
  flat rate from `shipping_config.flat_rate`. Express always charges the express rate.
- **Cash on Delivery** adds a flat **₹50** fee (`COD_FEE`, in paise). COD orders are
  confirmed immediately and inventory is finalized; payment is collected on delivery.
- **Max order size: 20 items**, enforced in the cart, at checkout, and server-side.
- Courier: **Shiprocket** (you generate the AWB / tracking number in Shiprocket, then
  set `orders.tracking_number` / `tracking_url` / `carrier` and flip status to
  `shipped` — the shipped/delivered emails fire automatically from phase 2).

> COD note: orders that are returned/RTO should be cancelled in the admin so stock
> can be restored — a cancel/restock flow is a good follow-up.

### Abandoned-cart reminder (single email, 30 min)
```bash
supabase functions deploy abandoned-cart-email
```
Reuses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ORDER_EMAIL_SECRET`.
Schedule it every ~10 min via pg_cron (it only emails carts idle 30+ min, once each):
```sql
select cron.schedule(
  'abandoned-cart-30m', '*/10 * * * *',
  $$ select net.http_post(
       url := (select value from pc_settings where key = 'edge_base_url') || '/abandoned-cart-email',
       headers := jsonb_build_object('Content-Type','application/json',
                                     'x-pc-secret', (select value from pc_settings where key = 'order_email_secret')),
       body := '{}'::jsonb
     ); $$
);
```
Optional: insert a `site_url` row in `pc_settings` for the email's button link
(defaults to `https://pantherclaw.in`). Reminders currently target logged-in
shoppers (who have a saved cart + email); guest-cart capture can be added later.

### GST / tax
Tax is intentionally **₹0** and there is **no GST line** on orders. You are not
GST-registered, and you cannot legally collect GST without a GSTIN. The "0 tax
under ₹100 cr" idea you mentioned does not apply to GST collection. **Please
confirm your position with a CA** — if/when you register for GST, tax calculation
can be switched on (the `orders.tax_amount` column already exists).

---

## Production phase 5 — review photos, accessibility & error monitoring

### Review photos
```bash
supabase db push   # applies 0004_review_photos.sql
```
This adds `reviews.images text[]`, upgrades `submit_review()` to accept up to 5
photo URLs, and creates a **public `review-photos` Storage bucket** with RLS so
shoppers can only upload inside their own `{user_id}/...` folder. Verified
purchasers can now attach photos when writing a review; photos render as
thumbnails (click to open full size) on the product page.

> Note: user-uploaded review photos live in **Supabase Storage**, separate from
> your **R2** bucket (which stays for admin-managed product imagery).

### Sentry error monitoring
1. `npm install` (picks up the new `@sentry/react` dependency).
2. Create a project at sentry.io and add its DSN to your frontend env:
   ```
   VITE_SENTRY_DSN=https://....ingest.sentry.io/....
   ```
3. With no DSN set (local/dev), Sentry stays a no-op — nothing to configure.
Captures unhandled render errors (via the ErrorBoundary), performance traces
(10% sample), and session replay (10% of sessions, 100% of error sessions).

### Accessibility pass
- Added a **“Skip to content”** link and a `#main-content` landmark.
- Visible keyboard **focus rings** (`:focus-visible`) site-wide.
- ARIA labels / roles on the search overlay (dialog), cart, nav icon buttons,
  wishlist toggle, and review controls; `alt` text on review photos.
- `Home.jsx` was left untouched per your instruction.

---

## Production phase 6 — security hardening & full DB-field usage

This phase closes every storefront-reachable vulnerability found in the audit
and wires up the DB fields that were previously unused. Apply it after phase 5.

### 1. Apply the security migration
```bash
supabase db push   # applies 0005_security_lockdown.sql
```
What it does:
- **Row-Level Security on every storefront table.** Catalog/config tables
  (`products`, `product_colors`, `product_variants`, `product_sizes`, `sizes`,
  `categories`, `product_review_aggregates`, `shipping_config`,
  `product_images`) become **read-only** to the public API roles — anyone can
  read them, nobody can write them. Your admin panel uses the service role and
  is unaffected.
- **`cart_sessions` / `cart_items`** become **owner-scoped** (a logged-in user
  can only touch their own cart). Guest carts are created by the checkout
  function with the service role.
- **`discount_codes` is fully locked.** The client can no longer read the table
  (which previously leaked every promo code). Validation now runs through a
  `validate_discount_code(code, subtotal)` RPC that only returns a yes/no +
  computed amount.
- Adds **`orders.total_weight_grams`** (and ensures `order_items.unit_mrp` /
  `line_discount` exist) so shipping/Shiprocket and savings reporting work.

> If you see any `... skipped` NOTICE during the push, that object already had
> RLS configured — just confirm its policies in the dashboard.

### 2. Edge function config (already in `config.toml`)
The webhook, both email senders, and the guest order-lookup endpoint now
explicitly set `verify_jwt = false`. They authenticate themselves (HMAC
signature, the `x-pc-secret` shared secret, or order# + email), and are called
by parties that don't carry a Supabase user JWT (Cashfree's servers, pg_cron,
guests). **Without this they would have returned 401 in production.** Just
redeploy the functions:
```bash
supabase functions deploy cashfree-checkout cashfree-webhook \
  order-status-email abandoned-cart-email lookup-order reconcile-orders
```

### 3. What got hardened in the checkout function
- **Identity is now derived only from the verified JWT.** The client-supplied
  `customerId` is ignored — order spoofing / IDOR is no longer possible.
- **Address ownership is enforced:** a logged-in user can only ship to an
  address that belongs to them.
- **Strict pricing:** if any line references a variant we can't resolve to an
  active DB price, the whole order is rejected (no trusting client prices).
- **Per-user discount limits** are enforced server-side via `discount_usages`.
- Orders now persist `unit_mrp`, `line_discount`, and `total_weight_grams`.

### 4. Email link safety
Transactional emails now pass `tracking_url` and the shop URL through an
`http(s)`-only sanitizer, so a poisoned carrier URL can never become a
`javascript:`/`data:` link. (All dynamic text was already HTML-escaped.)

### 5. Now-used DB fields (storefront)
- **`products.mrp`** → strikethrough price + “Save ₹X (Y%)” on cards & PDP.
- **`badge_v2`** (typed enum) → preferred over the legacy free-text `badge`.
- **`product_images`** → real gallery with `alt_text` (a11y/SEO), `position`,
  `is_primary`; PDP shows a thumbnail strip. Falls back to the legacy `images`
  arrays for older rows.
- **`blurhash` / `blurhashes`** → blur-up + fade-in placeholders in `<Img>`.
- **`fit`** (typed enum) → human-readable fit label on cards & PDP.
- **`product_variants.weight_grams`** → summed into `orders.total_weight_grams`.
- **`order_items.unit_mrp` / `line_discount`** → captured at checkout for
  accurate savings/accounting.

### 6. Fields intentionally NOT surfaced on the storefront
These are real, in-use fields — just not customer-facing:
- `inventory_locations`, `inventory_levels` → multi-warehouse stock (admin/ops).
- `audit_logs`, `outbox_events`, `webhook_events` → infra / event plumbing.
- `newsletter_subscribers.confirmation_token` / `unsubscribe_token` /
  `confirmed_at` → reserved for optional double-opt-in & one-click unsubscribe
  (a worthwhile future enhancement; see the audit page).

### 7. Residual notes (honest disclosure)
No software is ever “zero vulnerabilities,” but the storefront attack surface is
now tightly closed. Remaining items are operational, not code bugs:
- Keep all secrets (`CASHFREE_*`, `SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
  `ORDER_EMAIL_SECRET`) only in Edge Function secrets — never in the frontend.
- Rotate the `ORDER_EMAIL_SECRET` / webhook secret periodically.
- Enable Supabase **leaked-password protection** and rate limiting in the Auth
  dashboard.
- Consider a WAF / rate limit in front of `lookup-order` (public endpoint).

---

## Phase 7 — Refunds, disputes & payment reconciliation

This phase closes the two post-checkout gaps so the project is fully complete:
reacting to money that moves *after* a sale (refunds & chargebacks), and a
safety net for orders whose payment webhook never arrived.

### 1. Apply the migration
Run `supabase/migrations/0009_refunds_disputes_reconciliation.sql` in the SQL
editor (or `npx supabase db push`). It is idempotent and safe to re-run. It adds:
- `orders` columns: `amount_refunded`, `refunded_at`, `inventory_restocked`,
  `disputed`, `disputed_at`, `dispute_status`.
- `restock_order_inventory()` — adds **paid** stock back (refunds/returns add to
  `inventory_count`, unlike `release_order_inventory()` which only frees a hold).
  Guarded by `inventory_restocked` so it can never double-restock.
- `mark_order_refunded()` — idempotent full/partial refund handler. On a full
  refund it flips status to refunded/cancelled (whichever your enum supports),
  restocks, and updates the `payments` row.
- `mark_order_disputed()` — flags chargebacks/disputes (`orders.disputed`) and
  logs them to `order_status_history` for manual review.

### 2. Refund & dispute webhooks (no extra code needed)
The `cashfree-webhook` function now actions these automatically:
- **`REFUND_STATUS_WEBHOOK`** → on `refund_status = SUCCESS`, calls
  `mark_order_refunded` (full refunds restock + set status; partials just record
  the refunded amount).
- **`DISPUTE_*`** (created / under-review / won / lost / closed) → calls
  `mark_order_disputed` to flag the order.

Register these event types for the same webhook URL in the Cashfree dashboard
(Developers → Webhooks): the existing
`https://<project-ref>.supabase.co/functions/v1/cashfree-webhook`. Signature
verification, replay protection, and the always-200 ack already cover them.

> To actually *issue* a refund you call Cashfree's refund API (or click Refund
> in their dashboard); Cashfree then sends the `REFUND_STATUS_WEBHOOK` that this
> code consumes. An admin "Refund" button is an optional future add-on.

### 3. Reconciliation cron (missed-webhook safety net)
Deploy the new function:
```bash
npx supabase functions deploy reconcile-orders
```
It reuses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ORDER_EMAIL_SECRET`, and
the `CASHFREE_*` secrets. For each prepaid order stuck `pending` for 15 min – 3
days, it re-asks Cashfree for the authoritative status and finalizes it: `PAID`
→ `mark_order_paid` + confirmation email; `EXPIRED`/`TERMINATED`/`FAILED` →
`mark_order_failed` (which frees the reservation). It's fully idempotent, so it
can never double-charge, double-email, or double-restock.

Schedule it every ~5 min via pg_cron:
```sql
select cron.schedule(
  'reconcile-pending-orders', '*/5 * * * *',
  $$ select net.http_post(
       url := (select value from pc_settings where key = 'edge_base_url') || '/reconcile-orders',
       headers := jsonb_build_object('Content-Type','application/json',
                                     'x-pc-secret', (select value from pc_settings where key = 'order_email_secret')),
       body := '{}'::jsonb
     ); $$
);
```
This reuses the same `pc_settings` rows (`edge_base_url`, `order_email_secret`)
as the abandoned-cart and order-status crons — no new secrets required.
