import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { products as fallbackData } from "./data";

export const formatPrice = (n) =>
  "₹" +
  (Number(n) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Utility to mock delay if we fallback to local data
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Stable ordering so React Query refetches (e.g. on window focus) never
// reshuffle the grid or the colour list — which previously changed a
// product's default colour and therefore its cover photo. Prefer the
// admin-defined sort_order, then created_at, then id, so the order is always
// deterministic regardless of which columns a table has.
const orderStable = (rows) => {
  if (!Array.isArray(rows)) return rows;
  return [...rows].sort((a, b) => {
    const sa = a?.sort_order;
    const sb = b?.sort_order;
    if (sa != null && sb != null && sa !== sb) return sa - sb;
    if (sa != null && sb == null) return -1;
    if (sa == null && sb != null) return 1;
    const ta = a?.created_at ? Date.parse(a.created_at) : NaN;
    const tb = b?.created_at ? Date.parse(b.created_at) : NaN;
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });
};

const withOrderedColors = (p) =>
  p && Array.isArray(p.product_colors)
    ? { ...p, product_colors: orderStable(p.product_colors) }
    : p;

export function useProducts(category = null, { enabled = true } = {}) {
  return useQuery({
    enabled,
    queryKey: ["products", category],
    queryFn: async () => {
      let matchingIds = [];
      if (category) {
        const c = category.trim().toLowerCase();
        const { data: cats } = await supabase.from("categories").select("id, name, slug, parent_id");
        const matchSet = new Set();
        (cats || []).filter((node) => (node.slug && node.slug.toLowerCase() === c) || (node.name && node.name.toLowerCase() === c)).forEach(k => matchSet.add(k.id));
        
        let added = true;
        while (added) {
          added = false;
          for (const cat of cats || []) {
            if (cat.parent_id && matchSet.has(cat.parent_id) && !matchSet.has(cat.id)) {
              matchSet.add(cat.id);
              added = true;
            }
          }
        }
        matchingIds = Array.from(matchSet);
        if (matchingIds.length === 0) return [];
      }

      let query = supabase
        .from("products")
        .select(
          `
          *,
          categories${category ? '!inner' : ''}(id, name, slug, parent_id),
          product_colors(*),
          product_images(url, alt_text, position, is_primary, blurhash, width, height, owner_type, owner_id),
          product_review_aggregates(review_count, average_rating)
        `,
        )
        .eq("is_active", true);

      if (category) {
        query = query.in("categories.id", matchingIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching products:", error);
        throw error;
      }

      return orderStable(data || []).map(withOrderedColors);
    },
  });
}

export function useRelatedProducts(categorySlug, excludeId) {
  return useQuery({
    queryKey: ["related", categorySlug, excludeId],
    queryFn: async () => {
      if (!categorySlug) return [];
      const { data, error } = await supabase
        .from("products")
        .select(
          `*, categories!inner(name, slug), product_colors(*), product_images(url, alt_text, position, is_primary, blurhash, owner_type, owner_id), product_review_aggregates(review_count, average_rating)`,
        )
        .eq("is_active", true)
        .eq("categories.slug", categorySlug)
        .neq("id", excludeId)
        .limit(4);
      if (error) {
        console.error("Error fetching related products:", error);
        return [];
      }
      return orderStable(data || []).map(withOrderedColors);
    },
    enabled: !!categorySlug,
  });
}

export function useProduct(slug) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          categories (name, slug),
          product_colors (*),
          product_images (url, alt_text, position, is_primary, blurhash, width, height, owner_type, owner_id),
          product_variants (*, sizes (*)),
          product_review_aggregates (review_count, average_rating),
          reviews (*, users (full_name))
        `,
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) {
        console.error("Error fetching product detail:", error);
        throw error;
      }

      return withOrderedColors(data);
    },
    enabled: !!slug,
  });
}

// Wishlist Hook
export function useWishlist(userId) {
  return useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching wishlist:", error);
        throw error;
      }
      return data.map((item) => item.product_id);
    },
    enabled: !!userId,
  });
}

export async function toggleWishlist(userId, productId, isCurrentlyWishlisted) {
  if (isCurrentlyWishlisted) {
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("wishlists")
      .insert([{ user_id: userId, product_id: productId }]);
    if (error) throw error;
  }
}

export function useUserAddresses(userId) {
  return useQuery({
    queryKey: ["addresses", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useUserOrders(userId) {
  return useQuery({
    queryKey: ["orders", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (*)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useUserWishlistDetails(userId) {
  return useQuery({
    queryKey: ["wishlist_details", userId],
    queryFn: async () => {
      if (!userId) return [];
      // First get wishlist items
      const { data: wishlists, error: wishError } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", userId);

      if (wishError) throw wishError;

      const productIds = wishlists.map((w) => w.product_id);
      if (productIds.length === 0) return [];

      // Then fetch those specific products
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select(
          `
          *,
          categories(name, slug),
          product_colors(*),
          product_review_aggregates(review_count, average_rating)
        `,
        )
        .in("id", productIds)
        .eq("is_active", true);

      if (prodError) throw prodError;
      return products || [];
    },
    enabled: !!userId,
  });
}

export function useShippingConfig() {
  return useQuery({
    queryKey: ["shipping_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error; // maybeSingle() returns null (no error) when empty
      return (
        data || { free_above: 500000, flat_rate: 10000, express_rate: 20000 }
      ); // Fallback defaults in cents (₹5000, ₹100, ₹200)
    },
  });
}

export async function validateDiscountCode(code, subtotal) {
  // SECURITY: discount codes are no longer readable from the client. All
  // validation runs in a SECURITY DEFINER RPC so promo codes cannot be
  // enumerated, and the final amount is still re-verified server-side at
  // checkout. This call only powers the live UI preview.
  const { data, error } = await supabase.rpc("validate_discount_code", {
    p_code: code,
    p_subtotal: subtotal,
  });

  if (error) {
    throw new Error("Could not validate that code. Please try again.");
  }
  if (!data || !data.ok) {
    throw new Error(
      (data && data.message) || "Invalid or expired discount code.",
    );
  }

  return {
    id: data.id,
    code: data.code,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    discountAmount: data.discount_amount,
  };
}

export async function addAddress(addressData) {
  const { data, error } = await supabase
    .from("addresses")
    .insert([addressData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAddress(addressId, addressData) {
  const { data, error } = await supabase
    .from("addresses")
    .update(addressData)
    .eq("id", addressId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAddress(addressId) {
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", addressId);
  if (error) throw error;
}

export async function setDefaultAddress(userId, addressId) {
  // First unset all defaults for this user
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId);

  // Then set the specific one to default
  const { data, error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function subscribeNewsletter(email) {
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert([{ email: email.trim().toLowerCase() }]);

  // 23505 = unique_violation -> already subscribed, treat as a friendly success
  if (error && error.code !== "23505") throw error;

  return {
    message:
      error?.code === "23505"
        ? "You're already on the list!"
        : "Thanks for subscribing \u2014 watch your inbox for the drop.",
  };
}

// Set up Supabase Realtime to invalidate React Query cache on database changes
export function setupRealtimeSubscriptions(queryClient) {
  supabase
    .channel("custom-all-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      (payload) => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["product"] });
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "product_variants" },
      (payload) => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["product"] });
      },
    )
    .subscribe();
}

// ---------------------------------------------------------------------------
// Reviews (verified-purchaser gated via the submit_review RPC)
// ---------------------------------------------------------------------------
// Uploads review photos to the public `review-photos` Storage bucket under the
// user's own folder (enforced by RLS) and returns their public URLs.
export async function uploadReviewPhotos(userId, productId, files) {
  if (!userId || !files?.length) return [];
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${productId}/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from("review-photos")
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) {
      console.error("uploadReviewPhotos error:", error);
      throw new Error("Could not upload your photo. Please try again.");
    }
    const { data } = supabase.storage.from("review-photos").getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }
  return urls;
}

export async function submitReview(productId, rating, comment, images = []) {
  const { data, error } = await supabase.rpc("submit_review", {
    p_product_id: productId,
    p_rating: rating,
    p_comment: comment || null,
    p_images: images || [],
  });
  if (error) throw error;
  if (!data?.ok) {
    const reasons = {
      not_authenticated: "Please log in to write a review.",
      invalid_rating: "Please choose a rating between 1 and 5 stars.",
      not_verified_purchase:
        "Only verified purchasers can review this product.",
    };
    throw new Error(reasons[data?.reason] || "Could not submit your review.");
  }
  return data;
}

// True when the logged-in user has a completed order containing this product.
// Used to decide whether to show the \"Write a review\" form.
export function useCanReview(userId, productId) {
  return useQuery({
    queryKey: ["can_review", userId, productId],
    queryFn: async () => {
      if (!userId || !productId) return false;
      const { data, error } = await supabase
        .from("order_items")
        .select(
          "id, orders!inner(status, user_id), product_variants!inner(product_id)",
        )
        .eq("orders.user_id", userId)
        .eq("product_variants.product_id", productId)
        .in("orders.status", [
          "paid",
          "shipped",
          "delivered",
          "completed",
          "fulfilled",
        ])
        .limit(1);
      if (error) {
        console.error("useCanReview error:", error);
        return false;
      }
      return (data || []).length > 0;
    },
    enabled: !!userId && !!productId,
  });
}
