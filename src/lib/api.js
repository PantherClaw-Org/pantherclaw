import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { products as fallbackData } from "./data";

export const formatPrice = (n) =>
  "₹" + (Number(n) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Utility to mock delay if we fallback to local data
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export function useProducts(category = null) {
  return useQuery({
    queryKey: ["products", category],
    queryFn: async () => {
      // If filtering by category, we must use an inner join to filter parent rows.
      // Otherwise, use a standard left join so products without categories don't disappear.
      const categoryJoin = category ? 'categories!inner(name, slug)' : 'categories(name, slug)';

      let query = supabase
        .from("products")
        .select(`
          *,
          ${categoryJoin},
          product_colors(*),
          product_review_aggregates(review_count, average_rating)
        `)
        .eq("is_active", true);
      
      if (category) {
        query = query.eq("categories.slug", category.toLowerCase());
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching products:", error);
        throw error;
      }

      return data || [];
    },
  });
}

export function useProduct(slug) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories (name, slug),
          product_colors (*),
          product_variants (*, sizes (*)),
          product_review_aggregates (review_count, average_rating),
          reviews (*, users (full_name))
        `)
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
        
      if (error) {
        console.error("Error fetching product detail:", error);
        throw error;
      }
      
      return data;
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
      return data.map(item => item.product_id);
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
        .select(`
          *,
          order_items (*)
        `)
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
      
      const productIds = wishlists.map(w => w.product_id);
      if (productIds.length === 0) return [];
      
      // Then fetch those specific products
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select(`
          *,
          categories(name, slug),
          product_colors(*),
          product_review_aggregates(review_count, average_rating)
        `)
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
        .single();
        
      if (error && error.code !== "PGRST116") throw error; // PGRST116 is no rows returned
      return data || { free_above: 500000, flat_rate: 10000, express_rate: 20000 }; // Fallback defaults in cents (₹5000, ₹100, ₹200)
    },
  });
}

export async function validateDiscountCode(code, subtotal) {
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error("Invalid or expired discount code.");
  }

  // Validations
  const now = new Date();
  if (data.starts_at && new Date(data.starts_at) > now) {
    throw new Error("This code is not active yet.");
  }
  if (data.expires_at && new Date(data.expires_at) < now) {
    throw new Error("This code has expired.");
  }
  if (data.max_uses && data.used_count >= data.max_uses) {
    throw new Error("This code has reached its usage limit.");
  }
  if (data.min_order_value && subtotal < data.min_order_value) {
    throw new Error(`Minimum order value of ${formatPrice(data.min_order_value)} required.`);
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (data.discount_type === "fixed") {
    discountAmount = data.discount_value;
  } else if (data.discount_type === "percentage") {
    discountAmount = Math.floor(subtotal * (data.discount_value / 100));
  }

  // Cap discount at subtotal
  discountAmount = Math.min(discountAmount, subtotal);

  return {
    ...data,
    discountAmount
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
  const { data, error } = await supabase.from("newsletter_subscribers").insert([{ email }]);
  if (error) throw error;
  return data;
}

// Set up Supabase Realtime to invalidate React Query cache on database changes
export function setupRealtimeSubscriptions(queryClient) {
  supabase
    .channel("custom-all-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      (payload) => {
        console.log("Change received on products!", payload);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["product"] });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "product_variants" },
      (payload) => {
        console.log("Change received on variants!", payload);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["product"] });
      }
    )
    .subscribe();
}
