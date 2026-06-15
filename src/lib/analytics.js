// Lightweight GA4 + Meta Pixel helpers.
// Everything is a no-op until the corresponding env ID is set, so this is safe
// to ship before you have analytics configured.

const GA_ID = import.meta.env.VITE_GA4_ID;
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

export const analyticsEnabled = Boolean(GA_ID || PIXEL_ID);

export function initAnalytics() {
  if (typeof window === "undefined") return;

  // Google Analytics 4
  if (GA_ID && !window.__gaLoaded) {
    window.__gaLoaded = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    // We send page_view manually on route change for SPA accuracy.
    window.gtag("config", GA_ID, { send_page_view: false });
  }

  // Meta (Facebook) Pixel
  if (PIXEL_ID && !window.__fbqLoaded) {
    window.__fbqLoaded = true;
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod
          ? n.callMethod.apply(n, arguments)
          : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      "script",
      "https://connect.facebook.net/en_US/fbevents.js",
    );
    /* eslint-enable */
    window.fbq("init", PIXEL_ID);
  }
}

export function trackPageView(path) {
  if (GA_ID && window.gtag)
    window.gtag("event", "page_view", { page_path: path });
  if (PIXEL_ID && window.fbq) window.fbq("track", "PageView");
}

export function trackViewItem({ id, name, price, currency = "INR" }) {
  if (GA_ID && window.gtag)
    window.gtag("event", "view_item", {
      currency,
      value: price,
      items: [{ item_id: id, item_name: name, price }],
    });
  if (PIXEL_ID && window.fbq)
    window.fbq("track", "ViewContent", {
      content_ids: [id],
      content_name: name,
      content_type: "product",
      value: price,
      currency,
    });
}

export function trackAddToCart({
  id,
  name,
  price,
  quantity = 1,
  currency = "INR",
}) {
  const value = price * quantity;
  if (GA_ID && window.gtag)
    window.gtag("event", "add_to_cart", {
      currency,
      value,
      items: [{ item_id: id, item_name: name, price, quantity }],
    });
  if (PIXEL_ID && window.fbq)
    window.fbq("track", "AddToCart", {
      content_ids: [id],
      content_name: name,
      content_type: "product",
      value,
      currency,
    });
}

export function trackBeginCheckout({ value, currency = "INR", items = [] }) {
  if (GA_ID && window.gtag)
    window.gtag("event", "begin_checkout", { currency, value, items });
  if (PIXEL_ID && window.fbq)
    window.fbq("track", "InitiateCheckout", {
      value,
      currency,
      num_items: items.length,
    });
}

export function trackPurchase({
  transactionId,
  value,
  currency = "INR",
  items = [],
}) {
  if (GA_ID && window.gtag)
    window.gtag("event", "purchase", {
      transaction_id: transactionId,
      currency,
      value,
      items,
    });
  if (PIXEL_ID && window.fbq)
    window.fbq("track", "Purchase", {
      value,
      currency,
      content_ids: items.map((i) => i.item_id),
      content_type: "product",
    });
}
