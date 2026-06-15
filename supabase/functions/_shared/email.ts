// Shared transactional email helper (Resend).
// Set RESEND_API_KEY and (optionally) ORDER_EMAIL_FROM as Edge Function secrets.
// If RESEND_API_KEY is missing, email sending is skipped gracefully so the
// webhook / checkout flow is never blocked by email problems.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ORDER_EMAIL_FROM =
  Deno.env.get("ORDER_EMAIL_FROM") || "PANTHERCLAW <orders@pantherclaw.in>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email to", to);
    return;
  }
  if (!to) {
    console.warn("sendEmail called with no recipient — skipping");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: ORDER_EMAIL_FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
    }
  } catch (e) {
    console.error("Email send failed:", (e as Error).message);
  }
}

function inr(paise: number): string {
  const rupees = (Number(paise) || 0) / 100;
  return (
    "₹" +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

type OrderLike = {
  order_number?: string | null;
  total_amount?: number | null;
  shipping_fee?: number | null;
  customer_email?: string | null;
  payment_method?: string | null;
  subtotal?: number | null;
  discount_amount?: number | null;
};

type ItemLike = {
  product_name?: string | null;
  size?: string | null;
  color?: string | null;
  quantity?: number | null;
  price_at_purchase?: number | null;
};

export function orderConfirmationHtml(
  order: OrderLike,
  items: ItemLike[],
): string {
  const rows = (items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;color:#111;">
          ${escapeHtml(it.product_name || "Item")}
          <div style="color:#888;font-size:12px;">
            ${escapeHtml(it.size || "")}${it.color ? " · " + escapeHtml(it.color) : ""} · Qty ${it.quantity || 1}
          </div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;color:#111;text-align:right;white-space:nowrap;">
          ${inr((it.price_at_purchase || 0) * (it.quantity || 1))}
        </td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;">
      <div style="background:#0a0a0a;color:#fafafa;padding:28px 32px;">
        <div style="font-size:22px;letter-spacing:3px;font-weight:700;">PANTHERCLAW</div>
      </div>
      <div style="padding:32px;">
        <h1 style="font-size:20px;color:#111;margin:0 0 8px;">
          ${order.payment_method === 'cod' ? 'Order Confirmed - Cash on Delivery' : 'Thank you for your order'}
        </h1>
        <p style="color:#555;font-size:14px;margin:0 0 24px;">
          ${order.payment_method === 'cod' ? 'Your order has been received. Please pay the total amount upon delivery.' : 'Your payment was received and your order is confirmed.'}
          ${order.order_number ? `Your order number is <strong>${escapeHtml(order.order_number)}</strong>.` : ""}
        </p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #eee;padding-top:8px;">
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#555;">Subtotal</td>
            <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">${inr(order.subtotal || 0)}</td>
          </tr>
          ${order.discount_amount ? `
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#555;">Discount</td>
            <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">-${inr(order.discount_amount)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#555;">${order.payment_method === 'cod' ? 'Shipping & COD Fee' : 'Shipping'}</td>
            <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">${order.shipping_fee ? inr(order.shipping_fee) : 'Free'}</td>
          </tr>
          <tr>
            <td style="padding:16px 0 8px 0;border-top:1px solid #eee;font-size:16px;font-weight:700;color:#111;">Total ${order.payment_method === 'cod' ? 'Due' : 'Paid'}</td>
            <td style="padding:16px 0 8px 0;border-top:1px solid #eee;font-size:16px;font-weight:700;color:#111;text-align:right;">${inr(order.total_amount || 0)}</td>
          </tr>
        </table>
        <p style="color:#888;font-size:12px;margin-top:28px;">
          You can track your order status anytime at <a href="https://pantherclaw.in/track-order" style="color:#111;text-decoration:underline;">pantherclaw.in/track-order</a>.<br><br>
          We'll email you again when your order ships. Questions? Just reply to this email or contact us at <a href="mailto:orders@pantherclaw.in" style="color:#111;text-decoration:underline;">orders@pantherclaw.in</a>.
        </p>
      </div>
      <div style="background:#0a0a0a;color:#888;padding:24px 32px;font-size:12px;text-align:center;">
        <p style="margin:0 0 12px 0;">
          <a href="https://instagram.com/pantherclawclothing" style="color:#fafafa;text-decoration:none;margin:0 8px;">Instagram</a>
        </p>
        © ${new Date().getFullYear()} PANTHERCLAW · pantherclaw.in
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------
// Shipping / delivery transactional emails (added in production phase)
// ---------------------------------------------------------------------

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(heading: string, inner: string): string {
  return `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#0a0a0a;">
    <h1 style="font-size:16px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 24px;">PANTHERCLAW</h1>
    <h2 style="font-size:20px;margin:0 0 16px;">${esc(heading)}</h2>
    ${inner}
    <hr style="border:none;border-top:1px solid #e5e3df;margin:28px 0;" />
    <p style="font-size:12px;color:#6f6f6f;">Need help? Contact <a href="mailto:support@pantherclaw.in" style="color:#0a0a0a;text-decoration:underline;">support@pantherclaw.in</a></p>
    <p style="font-size:12px;color:#6f6f6f;">PANTHERCLAW · pantherclaw.in</p>
  </div>`;
}

type ShipOrderLike = OrderLike & {
  order_number?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  carrier?: string | null;
};

function itemList(items: ItemLike[]): string {
  const rows = (items || [])
    .map(
      (it) =>
        `<li style="padding:6px 0;border-bottom:1px solid #f2efe9;font-size:14px;">${esc(it.product_name)} — ${esc(it.size)}${it.color ? " / " + esc(it.color) : ""} <span style="color:#6f6f6f;">×${it.quantity ?? 1}</span></li>`,
    )
    .join("");
  return `<ul style="list-style:none;padding:0;margin:0 0 8px;">${rows}</ul>`;
}

export function orderShippedHtml(
  order: ShipOrderLike,
  items: ItemLike[],
): string {
  const trackBtn = order.tracking_url
    ? `<p><a href="${esc(order.tracking_url)}" style="display:inline-block;margin-top:12px;background:#0a0a0a;color:#fafafa;padding:12px 26px;text-decoration:none;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Track your order</a></p>`
    : "";
  const meta =
    order.carrier || order.tracking_number
      ? `<p style="font-size:14px;">${order.carrier ? "<strong>" + esc(order.carrier) + "</strong> · " : ""}${order.tracking_number ? "Tracking #: " + esc(order.tracking_number) : ""}</p>`
      : "";
  return emailShell(
    "Your order is on its way",
    `<p style="font-size:14px;">Order <strong>${esc(order.order_number)}</strong> has shipped.</p>${meta}${itemList(items)}${trackBtn}`,
  );
}

export function orderDeliveredHtml(
  order: ShipOrderLike,
  items: ItemLike[],
): string {
  return emailShell(
    "Delivered",
    `<p style="font-size:14px;">Order <strong>${esc(order.order_number)}</strong> has been delivered. We hope you love it.</p>${itemList(items)}<p style="font-size:14px;margin-top:16px;">Love your pieces? Leave a review from your account — it helps other customers.</p>`,
  );
}

export function abandonedCartHtml(items: ItemLike[], shopUrl: string): string {
  return emailShell(
    "You left something behind",
    `<p style="font-size:14px;">Your selections are still waiting in your bag. Complete your order before they sell out.</p>${itemList(items)}<p><a href="${esc(shopUrl)}" style="display:inline-block;margin-top:12px;background:#0a0a0a;color:#fafafa;padding:12px 26px;text-decoration:none;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Return to your bag</a></p>`,
  );
}
