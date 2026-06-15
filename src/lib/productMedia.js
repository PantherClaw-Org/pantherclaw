// Centralised resolvers for product media and pricing so the storefront uses
// every relevant DB field consistently:
//   - product_images (normalised gallery w/ alt_text, position, blurhash)
//   - products.mrp           -> strikethrough + savings %
//   - products.badge_v2      -> typed badge, preferred over legacy `badge` text
//   - products.blurhashes /
//     product_colors.blurhashes / product_images.blurhash -> blur-up
//   - products.fit           -> fit label
//
// Everything degrades gracefully to the legacy `images` text[] arrays so older
// rows that predate product_images keep rendering.

// Human labels for the badge_v2 enum (product_badge).
const BADGE_LABELS = {
  new: "New",
  bestseller: "Bestseller",
  limited: "Limited",
  sale: "Sale",
  sold_out: "Sold Out",
  back_in_stock: "Back in Stock",
};

// Human labels for the fit_type enum.
const FIT_LABELS = {
  slim: "Slim Fit",
  regular: "Regular Fit",
  relaxed: "Relaxed Fit",
  oversized: "Oversized",
  tapered: "Tapered",
  straight: "Straight",
  skinny: "Skinny",
};

export function badgeLabel(product) {
  if (!product) return null;
  // Prefer the typed enum; fall back to the free-text legacy column.
  const v2 = product.badge_v2;
  if (v2) return BADGE_LABELS[v2] || String(v2).replace(/_/g, " ");
  return product.badge || null;
}

export function fitLabel(product) {
  if (!product?.fit) return null;
  return FIT_LABELS[product.fit] || String(product.fit).replace(/_/g, " ");
}

// Returns { mrp, price, hasDiscount, savings, percentOff }.
// All money is in paise (integers).
export function pricing(product) {
  const price = Number(product?.price) || 0;
  const mrp = Number(product?.mrp) || 0;
  const hasDiscount = mrp > price && price > 0;
  const savings = hasDiscount ? mrp - price : 0;
  const percentOff = hasDiscount ? Math.round((savings / mrp) * 100) : 0;
  return { mrp, price, hasDiscount, savings, percentOff };
}

// Normalise a product_images row into { url, alt, blurhash, position }.
function normRow(row) {
  return {
    url: row.url,
    alt: row.alt_text || "",
    blurhash: row.blurhash || null,
    position: row.position ?? 0,
    isPrimary: !!row.is_primary,
  };
}

// Extract the upload timestamp encoded as the leading number in CDN
// filenames, e.g. "https://cdn.pantherclaw.in/1780682689003-rky4f.jpeg".
// The admin uploader names each file with Date.now() when its upload starts,
// so this reflects the order the files were selected. The stored images[]
// array, by contrast, can get shuffled when concurrent uploads finish in a
// different order — which is what made the wrong photo show as the cover.
function uploadTime(url) {
  const m = String(url || "").match(/\/(\d{10,})-/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

// Build an ordered gallery for a product (optionally scoped to a colour).
// Prefers the product_images table; falls back to the legacy images arrays.
export function gallery(product, color = null) {
  if (!product) return [];
  const rows = Array.isArray(product.product_images)
    ? product.product_images
    : [];

  let scoped = rows;
  if (color?.id) {
    const colorRows = rows.filter(
      (r) => r.owner_type === "product_color" && r.owner_id === color.id,
    );
    if (colorRows.length) scoped = colorRows;
  }
  if (scoped === rows) {
    // Default to product-level images when not scoped to a colour.
    const productRows = rows.filter(
      (r) => !r.owner_type || r.owner_type === "product",
    );
    if (productRows.length) scoped = productRows;
  }

  if (scoped.length) {
    // Determine the intended order. We prefer the explicit `position` column,
    // but in practice many product_images rows have no position set (all 0 /
    // null), which makes the gallery look random. When position can't decide,
    // fall back to the order of the legacy `images` text[] array (arrays keep
    // their order), then is_primary, then a stable key so the order is
    // deterministic and never reshuffles between renders.
    const orderRef =
      (color?.images?.length ? color.images : product.images) || [];
    const refIndex = (url) => {
      const i = orderRef.indexOf(url);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return scoped
      .map(normRow)
      .sort(
        (a, b) =>
          a.position - b.position ||
          refIndex(a.url) - refIndex(b.url) ||
          Number(b.isPrimary) - Number(a.isPrimary) ||
          String(a.url).localeCompare(String(b.url)),
      );
  }

  // Legacy fallback: plain string arrays + matching blurhash arrays.
  // Pair each url with its blurhash, then order by the upload timestamp baked
  // into the filename so the gallery follows the order the images were added
  // (index 0 = the cover), regardless of how the stored array got shuffled.
  const legacy = color?.images?.length ? color.images : product.images || [];
  const hashes = color?.blurhashes?.length
    ? color.blurhashes
    : product.blurhashes || [];
  const paired = (legacy || []).map((url, i) => ({
    url,
    blurhash: hashes?.[i] || null,
  }));
  paired.sort((a, b) => uploadTime(a.url) - uploadTime(b.url));
  return paired.map((item, i) => ({
    url: item.url,
    alt: product.name || "",
    blurhash: item.blurhash,
    position: i,
    isPrimary: i === 0,
  }));
}

export function primaryImage(product, color = null) {
  return gallery(product, color)[0] || null;
}
