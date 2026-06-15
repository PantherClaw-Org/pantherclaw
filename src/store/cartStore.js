import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../lib/supabase";
import { primaryImage } from "../lib/productMedia";

// Helper to calculate totals
const calculateTotals = (items) => {
  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  return { count, subtotal };
};

const generateUid = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      open: false,
      count: 0,
      subtotal: 0,
      session_id: null,
      cart_uid: generateUid(),

      setOpen: (open) => set({ open }),

      // On login: ensure a cart_session exists, then merge the local (guest)
      // cart into the DB so it persists / can be recovered. Local storage stays
      // the source of truth for display (fast, offline-friendly); the DB mirror
      // captures variant + price_at_add for analytics and recovery.
      initializeDbCart: async (userId) => {
        if (!userId) return;
        try {
          // The DB cart requires the auth user to be mirrored into public.users
          // (the FK target for cart_sessions). If that row doesn't exist yet,
          // skip the DB cart silently and keep the local cart as the source of
          // truth, instead of throwing a foreign-key error on every load.
          const { data: profileRow } = await supabase
            .from("users")
            .select("id")
            .eq("id", userId)
            .maybeSingle();
          if (!profileRow) return;

          // 1. Get or create the user's cart session.
          let { data: session } = await supabase
            .from("cart_sessions")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (!session) {
            const { data: newSession, error: insertError } = await supabase
              .from("cart_sessions")
              .insert([{ user_id: userId }])
              .select("id")
              .single();
            if (insertError) throw insertError;
            session = newSession;
          }

          if (!session?.id) return;
          set({ session_id: session.id });

          // 2. Fetch existing DB items to merge
          const { data: dbItems } = await supabase
             .from("cart_items")
             .select(`
                 variant_id, quantity, price_at_add,
                 product_variants (
                   sizes (label),
                   products (
                     slug, name, subtitle, price,
                     product_images (url, is_primary),
                     product_colors (images)
                   )
                 )
             `)
             .eq("session_id", session.id);

          const localItems = get().items.filter((i) => i.variant_id);
          const localVariantIds = new Set(localItems.map(i => i.variant_id));
          
          let mergedItems = [...get().items];
          let updated = false;

          if (dbItems && dbItems.length > 0) {
             for (const dbItem of dbItems) {
                if (!localVariantIds.has(dbItem.variant_id)) {
                   const variant = dbItem.product_variants;
                   const product = variant?.products;
                   const sizeLabel = variant?.sizes?.label || "M";
                   const image = product?.product_images?.find(i => i.is_primary)?.url || 
                                 product?.product_images?.[0]?.url || 
                                 product?.product_colors?.[0]?.images?.[0] || "";
                   mergedItems.push({
                      key: dbItem.variant_id,
                      variant_id: dbItem.variant_id,
                      slug: product?.slug || "unknown",
                      name: product?.name || "Product",
                      subtitle: product?.subtitle || "",
                      price: product?.price || dbItem.price_at_add,
                      image: image,
                      size: sizeLabel,
                      qty: dbItem.quantity
                   });
                   updated = true;
                }
             }
          }

          if (updated) {
             set({ items: mergedItems, ...calculateTotals(mergedItems) });
          }

          // 3. Merge local items (that carry a variant_id) into the DB cart.
          if (localItems.length > 0) {
            const rows = localItems.map((i) => ({
              session_id: session.id,
              variant_id: i.variant_id,
              quantity: i.qty,
              price_at_add: i.price,
            }));
            await supabase
              .from("cart_items")
              .upsert(rows, { onConflict: "session_id,variant_id" });
          }
        } catch (error) {
          console.error("Failed to initialize DB cart:", error);
          // Never crash the app — keep the local cart working.
        }
      },

      addItem: async (product, size, variantId, customImage, customSubtitle) => {
        const { items, session_id } = get();
        const key = variantId || `${product.slug}-${size}`;
        const existing = items.find((i) => i.key === key);

        // Cap the whole bag at 20 items (PANTHERCLAW order limit).
        const currentTotal = items.reduce((s, i) => s + i.qty, 0);
        if (currentTotal >= 20) {
          set({ open: true });
          return;
        }

        let newItems;
        let newQty = 1;

        if (existing) {
          newQty = Math.min(20, existing.qty + 1);
          newItems = items.map((i) =>
            i.key === key ? { ...i, qty: newQty } : i,
          );
        } else {
          newItems = [
            ...items,
            {
              key,
              variant_id: variantId,
              slug: product.slug,
              name: product.name,
              subtitle: customSubtitle || product.subtitle,
              price: product.price,
              image:
                customImage ||
                primaryImage(product)?.url ||
                product.images?.[0] ||
                product.product_colors?.[0]?.images?.[0],
              size,
              qty: 1,
            },
          ];
        }

        set({ items: newItems, open: true, ...calculateTotals(newItems) });

        if (session_id && variantId) {
          await supabase
            .from("cart_items")
            .upsert(
              {
                session_id,
                variant_id: variantId,
                quantity: newQty,
                price_at_add: product.price,
              },
              { onConflict: "session_id,variant_id" },
            )
            .then(
              ({ error }) => error && console.error("cart sync (add):", error),
            );
          // Reset the abandonment timer used by the reminder job.
          await supabase
            .from("cart_sessions")
            .update({
              last_activity_at: new Date().toISOString(),
              reminder_sent_at: null,
            })
            .eq("id", session_id);
        }
      },

      removeItem: async (key) => {
        const { items, session_id } = get();
        const itemToRemove = items.find((i) => i.key === key);
        const newItems = items.filter((i) => i.key !== key);

        set({ items: newItems, ...calculateTotals(newItems) });

        if (session_id && itemToRemove?.variant_id) {
          await supabase
            .from("cart_items")
            .delete()
            .eq("session_id", session_id)
            .eq("variant_id", itemToRemove.variant_id);
          // Keep the cart "active" so the abandoned-cart reminder reflects real
          // inactivity, not edits the shopper is actively making.
          await supabase
            .from("cart_sessions")
            .update({
              last_activity_at: new Date().toISOString(),
              reminder_sent_at: null,
            })
            .eq("id", session_id);
        }
      },

      changeQty: async (key, delta) => {
        const { items, session_id } = get();
        const item = items.find((i) => i.key === key);
        if (!item) return;

        const othersTotal = items.reduce(
          (s, i) => s + (i.key === key ? 0 : i.qty),
          0,
        );
        const maxForThis = Math.max(1, 20 - othersTotal);
        const newQty = Math.max(1, Math.min(maxForThis, item.qty + delta));
        const newItems = items.map((i) =>
          i.key === key ? { ...i, qty: newQty } : i,
        );

        set({ items: newItems, ...calculateTotals(newItems) });

        if (session_id && item.variant_id) {
          await supabase
            .from("cart_items")
            .update({ quantity: newQty })
            .eq("session_id", session_id)
            .eq("variant_id", item.variant_id);
          // Quantity changes count as activity — reset the abandonment timer so
          // the reminder email doesn't fire while the cart is being edited.
          await supabase
            .from("cart_sessions")
            .update({
              last_activity_at: new Date().toISOString(),
              reminder_sent_at: null,
            })
            .eq("id", session_id);
        }
      },

      clear: async () => {
        const { session_id } = get();
        set({ items: [], count: 0, subtotal: 0, open: false, cart_uid: generateUid() });
        if (session_id) {
          await supabase
            .from("cart_items")
            .delete()
            .eq("session_id", session_id);
        }
      },
    }),
    {
      name: "pantherclaw-cart-storage",
      partialize: (state) => ({
        items: state.items,
        count: state.count,
        subtotal: state.subtotal,
        cart_uid: state.cart_uid,
      }),
    },
  ),
);
