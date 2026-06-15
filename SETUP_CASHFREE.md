# Cashfree payments — setup guide (no Supabase CLI install required)

Your payment flow runs on **Supabase Edge Functions** (Deno). Nothing works until
these are deployed AND their secrets are set. Follow the steps in order.

Project ref: `unxnpjzemjnexltzemni`

---

## What you're deploying

| Function | Purpose | Required? |
|---|---|---|
| `cashfree-checkout` | Creates the order + Cashfree payment session, handles COD | YES |
| `cashfree-webhook`  | Receives payment result, marks order paid/failed, sends email | YES |
| `lookup-order`      | Track-order lookup | recommended |
| `order-status-email`| Order status emails | optional |
| `abandoned-cart-email`| Abandoned-cart reminders | optional |

> Delete the empty `supabase/functions/create-cashfree-order/` folder — it's a
> leftover; the real logic lives in `cashfree-checkout`.

---

## Step 1 — Get your keys ready

**Cashfree dashboard** (https://merchant.cashfree.com) → Developers → API Keys:
- App ID  (`x-client-id`)
- Secret Key (`x-client-secret`)
- Use **Test/Sandbox** keys first, switch to **Production** keys when going live.

**Webhook secret**: Cashfree → Developers → Webhooks (you'll create the endpoint
in Step 5). Cashfree signs webhooks with your Secret Key, so the webhook secret
= your Secret Key unless you set a dedicated one.

**Resend** (https://resend.com) → API Keys → create one (for order emails).

---

## Step 2 — Deploy the functions WITHOUT installing the CLI

You don't need to install anything globally. From the project root (where the
`supabase/` folder is), run these with `npx` (uses your existing Node):

```bash
# 1. Log in (opens a browser, paste the access token it gives you)
npx supabase login

# 2. Link this folder to your project
npx supabase link --project-ref unxnpjzemjnexltzemni

# 3. Deploy every function in one go
npx supabase functions deploy
```

That's it — `npx` downloads the CLI on the fly, runs it, and bundles the shared
`_shared/` helpers automatically. (The pure-dashboard editor can't deploy these
functions because they import shared files across folders, so `npx` is the
simplest path.)

If you'd rather deploy them one at a time:
```bash
npx supabase functions deploy cashfree-checkout
npx supabase functions deploy cashfree-webhook
npx supabase functions deploy lookup-order
npx supabase functions deploy order-status-email
npx supabase functions deploy abandoned-cart-email
```

---

## Step 3 — Set the secrets (Supabase Dashboard — no terminal)

Dashboard → your project → **Edge Functions → Secrets** (a.k.a. "Manage secrets").
Add each of these:

```
CASHFREE_APP_ID          = <Cashfree App ID>
CASHFREE_SECRET_KEY      = <Cashfree Secret Key>
CASHFREE_ENV             = sandbox          # change to "production" to go live
CASHFREE_WEBHOOK_SECRET  = <same as Secret Key, unless you set a custom one>
CASHFREE_API_VERSION     = 2023-08-01       # optional; this is the default
RESEND_API_KEY           = <Resend API key>
ORDER_EMAIL_FROM         = orders@pantherclaw.in
ORDER_EMAIL_SECRET       = <any long random string you make up>
```

> You do NOT set `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` — Supabase injects
> those into Edge Functions automatically.

---

## Step 4 — Frontend env var

In your local `.env` (and in your hosting provider's env settings):
```
VITE_CASHFREE_MODE = sandbox     # change to "production" to go live
```
Keep this in sync with `CASHFREE_ENV`.

---

## Step 5 — Register the webhook in Cashfree

Cashfree dashboard → Developers → **Webhooks** → Add endpoint:
```
https://unxnpjzemjnexltzemni.supabase.co/functions/v1/cashfree-webhook
```
Subscribe to at least: `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`,
`PAYMENT_USER_DROPPED_WEBHOOK`. Use the same secret you put in
`CASHFREE_WEBHOOK_SECRET`.

---

## Step 6 — Run the SQL migration

Supabase → SQL Editor → run `supabase/migrations/0008_orders_idempotency_unique.sql`
(plus `0007_mirror_auth_users.sql` if you haven't yet).

---

## Step 7 — Test in sandbox

1. Place a test order. On the Cashfree sandbox checkout, use their test UPI
   `testsuccess@gocash` (or a test card from Cashfree docs) to simulate success,
   and a failure option to simulate failure.
2. Confirm: order flips to `paid`/`confirmed`, the success page shows it, you get
   the confirmation email, and `webhook_events` has a row with `processed_at`.
3. Test COD separately — it confirms instantly without the gateway.

---

## Step 8 — Go live

1. Swap Cashfree keys to Production in Step 3.
2. `CASHFREE_ENV = production` (Supabase secret).
3. `VITE_CASHFREE_MODE = production` (frontend env) and redeploy the site.
4. Re-point/verify the webhook endpoint for your production Cashfree account.

---

## Audit notes (what's already solid)

- **Amounts are recomputed server-side** from DB prices — client totals are never
  trusted. Discount codes, per-user caps, shipping, and COD fee are all
  re-validated on the server.
- **Identity comes from the verified JWT**, never a client-supplied user id.
- **Inventory is reserved atomically** at checkout and released on failure.
- **Webhook is hardened**: HMAC signature verified on the raw body
  (constant-time compare), replay-protected via `webhook_events`, and the "paid"
  signal is re-verified against Cashfree's order-status API before money moves.
  It always returns 200 once recorded so Cashfree stops retrying.
- **Idempotency (added now)**: the client sends a deterministic key derived from
  the cart; identical retries resume the same order, and a DB unique index makes
  it race-proof. No more duplicate orders from double-clicks/refreshes.

### Still worth doing later (not blocking)
- Handle `REFUND` / dispute webhook types (currently stored but not actioned).
- Reconciliation cron for orders stuck `pending` (user closed the gateway tab and
  no webhook arrived) — re-query Cashfree and finalize.
