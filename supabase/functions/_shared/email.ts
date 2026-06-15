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
  shipping_address?: any | null;
};

type ItemLike = {
  product_name?: string | null;
  size?: string | null;
  color?: string | null;
  quantity?: number | null;
  price_at_purchase?: number | null;
  product_image?: string | null;
};

export function orderConfirmationHtml(
  order: OrderLike,
  items: ItemLike[],
): string {
  const rows = (items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #eee;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              ${
                it.product_image
                  ? `<td style="width:60px;padding-right:16px;vertical-align:top;">
                      <img src="${escapeHtml(it.product_image)}" alt="${escapeHtml(it.product_name || "Item")}" style="width:60px;height:80px;object-fit:cover;border-radius:4px;background:#f5f5f5;" />
                    </td>`
                  : ""
              }
              <td style="vertical-align:top;font-size:14px;color:#111;">
                <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(it.product_name || "Item")}</div>
                <div style="color:#888;font-size:12px;">
                  ${escapeHtml(it.size || "")}${it.color ? " · " + escapeHtml(it.color) : ""}
                </div>
                <div style="color:#888;font-size:12px;margin-top:4px;">
                  Qty: ${it.quantity || 1}
                </div>
              </td>
              <td style="vertical-align:top;font-size:14px;color:#111;text-align:right;white-space:nowrap;font-weight:500;">
                ${inr((it.price_at_purchase || 0) * (it.quantity || 1))}
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;">
      <div style="background:#0a0a0a;color:#fafafa;padding:28px 32px;text-align:center;">
        <div style="font-size:22px;letter-spacing:3px;font-weight:700;">PANTHERCLAW</div>
      </div>
      <div style="padding:32px;">
        <h1 style="font-size:20px;color:#111;margin:0 0 8px;">
          ${order.payment_method === 'cod' ? 'Order Confirmed - Cash on Delivery' : 'Order Confirmed'}
        </h1>
        <p style="color:#555;font-size:14px;margin:0 0 24px;line-height:1.5;">
          Engineered for movement. Your order is officially confirmed. Welcome to the Inner Circle.
        </p>
        
        ${order.order_number ? `
        <p style="color:#111;font-size:14px;font-weight:600;margin:0 0 24px;">
          Order Number: <span style="color:#555;">${escapeHtml(order.order_number)}</span>
        </p>
        ` : ""}
        
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

        ${order.shipping_address ? `
        <div style="margin-top:32px;border-top:1px solid #eee;padding-top:24px;">
          <h3 style="font-size:16px;margin:0 0 12px;color:#111;">Shipping To</h3>
          <p style="color:#555;font-size:14px;margin:0;line-height:1.5;">
            ${escapeHtml(order.shipping_address.first_name || "")} ${escapeHtml(order.shipping_address.last_name || "")}<br>
            ${escapeHtml(order.shipping_address.line1 || "")}<br>
            ${order.shipping_address.line2 ? escapeHtml(order.shipping_address.line2) + "<br>" : ""}
            ${escapeHtml(order.shipping_address.city || "")}, ${escapeHtml(order.shipping_address.state || "")} ${escapeHtml(order.shipping_address.postal_code || "")}
          </p>
          <p style="color:#555;font-size:14px;margin:12px 0 0;">
            Phone: ${escapeHtml(order.shipping_address.phone || "")}
          </p>
        </div>
        ` : ""}

        <div style="margin-top:32px;border-top:1px solid #eee;padding-top:24px;">
          <h3 style="font-size:16px;margin:0 0 12px;color:#111;">What's Next?</h3>
          <p style="color:#555;font-size:14px;margin:0 0 24px;line-height:1.5;">
            We process orders within 24-48 hours. You will receive another email with a tracking link as soon as your gear ships.
          </p>
          
          <div style="text-align:center;margin-bottom:32px;">
            <a href="https://pantherclaw.in/track-order" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:14px 28px;font-size:14px;font-weight:bold;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">TRACK ORDER</a>
          </div>

          <p style="color:#555;font-size:14px;margin:0 0 12px;">
            Doesn't fit right? We offer seamless returns. <a href="https://pantherclaw.in/returns" style="color:#111;text-decoration:underline;">View our Returns Policy</a>.
          </p>
          <p style="color:#555;font-size:14px;margin:0;">
            Questions? Just reply to this email or contact us at <a href="mailto:support@pantherclaw.in" style="color:#111;text-decoration:underline;">support@pantherclaw.in</a>.
          </p>
        </div>
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

export function codActionRequiredHtml(
  order: OrderLike,
  items: ItemLike[],
  orderId: string
): string {
  const rows = (items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #eee;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              ${
                it.product_image
                  ? `<td style="width:60px;padding-right:16px;vertical-align:top;">
                      <img src="${escapeHtml(it.product_image)}" alt="${escapeHtml(it.product_name || "Item")}" style="width:60px;height:80px;object-fit:cover;border-radius:4px;background:#f5f5f5;" />
                    </td>`
                  : ""
              }
              <td style="vertical-align:top;font-size:14px;color:#111;">
                <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(it.product_name || "Item")}</div>
                <div style="color:#888;font-size:12px;">
                  ${escapeHtml(it.size || "")}${it.color ? " · " + escapeHtml(it.color) : ""}
                </div>
                <div style="color:#888;font-size:12px;margin-top:4px;">
                  Qty: ${it.quantity || 1}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  const confirmUrl = `https://pantherclaw.in/confirm-cod?id=${orderId}`;

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;">
      <div style="background:#fcefb4;color:#111;padding:28px 32px;text-align:center;">
        <div style="font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Action Required</div>
      </div>
      <div style="padding:32px;">
        <h1 style="font-size:20px;color:#111;margin:0 0 12px;">
          Confirm Your COD Order
        </h1>
        <p style="color:#555;font-size:14px;margin:0 0 24px;line-height:1.5;">
          You chose Cash on Delivery. To finalize your order and reserve your items, please confirm your request by clicking the button below.
        </p>

        <div style="text-align:center;margin-bottom:32px;">
          <a href="${confirmUrl}" style="display:inline-block;background:#eab308;color:#000000;padding:14px 28px;font-size:14px;font-weight:bold;text-decoration:none;letter-spacing:1px;text-transform:uppercase;border-radius:4px;">CONFIRM ORDER</a>
        </div>
        
        <h3 style="font-size:16px;margin:0 0 12px;color:#111;">Order Details</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${rows}</table>

        ${order.shipping_address ? `
        <div style="margin-top:32px;border-top:1px solid #eee;padding-top:24px;">
          <h3 style="font-size:16px;margin:0 0 12px;color:#111;">Shipping To</h3>
          <p style="color:#555;font-size:14px;margin:0;line-height:1.5;">
            ${escapeHtml(order.shipping_address.first_name || "")} ${escapeHtml(order.shipping_address.last_name || "")}<br>
            ${escapeHtml(order.shipping_address.line1 || "")}<br>
            ${order.shipping_address.line2 ? escapeHtml(order.shipping_address.line2) + "<br>" : ""}
            ${escapeHtml(order.shipping_address.city || "")}, ${escapeHtml(order.shipping_address.state || "")} ${escapeHtml(order.shipping_address.postal_code || "")}
          </p>
          <p style="color:#555;font-size:14px;margin:12px 0 0;">
            Phone: ${escapeHtml(order.shipping_address.phone || "")}
          </p>
        </div>
        ` : ""}

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
      (it) => {
        const img = it.product_image
          ? `<td style="width:60px;padding-right:16px;vertical-align:top;"><img src="${esc(it.product_image)}" alt="${esc(it.product_name)}" style="width:60px;height:80px;object-fit:cover;border-radius:4px;background:#f5f5f5;" /></td>`
          : "";
        return `<tr><td style="padding:16px 0;border-bottom:1px solid #f2efe9;"><table style="width:100%;border-collapse:collapse;"><tr>${img}<td style="vertical-align:top;font-size:14px;"><div style="font-weight:600;margin-bottom:4px;">${esc(it.product_name)}</div><div style="color:#6f6f6f;font-size:12px;">${esc(it.size)}${it.color ? " / " + esc(it.color) : ""}</div><div style="color:#6f6f6f;font-size:12px;margin-top:4px;">Qty: ${it.quantity ?? 1}</div></td></tr></table></td></tr>`;
      }
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;">${rows}</table>`;
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
