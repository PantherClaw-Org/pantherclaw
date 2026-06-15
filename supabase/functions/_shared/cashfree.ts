// Shared Cashfree configuration + helpers.
// Set CASHFREE_ENV="production" in your Supabase secrets to go live.
export const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID") || "";
export const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY") || "";
export const CASHFREE_ENV = (
  Deno.env.get("CASHFREE_ENV") || "sandbox"
).toLowerCase();
export const CASHFREE_API_VERSION =
  Deno.env.get("CASHFREE_API_VERSION") || "2025-01-01";

export const CASHFREE_BASE_URL =
  CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

export function cashfreeHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-client-id": CASHFREE_APP_ID,
    "x-client-secret": CASHFREE_SECRET_KEY,
    "x-api-version": CASHFREE_API_VERSION,
  };
}

// Server-to-server re-verification: fetch the authoritative order status.
export async function fetchCashfreeOrder(orderId: string): Promise<any> {
  const res = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
    method: "GET",
    headers: cashfreeHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Cashfree order lookup failed: ${JSON.stringify(data)}`);
  }
  return data;
}
