// Lightweight "recently viewed" tracker backed by localStorage.
// Stores only the minimal fields needed to render a product tile.
import { primaryImage } from "./productMedia";

const KEY = "pantherclaw-recently-viewed";
const MAX = 8;

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(product) {
  if (!product?.slug) return;
  try {
    const entry = {
      slug: product.slug,
      name: product.name,
      price: product.price,
      subtitle: product.subtitle || "",
      image:
        primaryImage(product)?.url ||
        product.images?.[0] ||
        product.product_colors?.[0]?.images?.[0] ||
        "",
    };
    const list = getRecentlyViewed().filter((p) => p.slug !== entry.slug);
    list.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // Ignore storage errors (private mode / quota).
  }
}
