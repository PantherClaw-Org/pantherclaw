import React, { useState, useEffect } from "react";
import Img from "../components/Img";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Plus, Tag } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useAuth } from "../context/AuthContext";
import {
  formatPrice,
  useUserAddresses,
  useShippingConfig,
  validateDiscountCode,
} from "../lib/api";
import { supabase } from "../lib/supabase";
import { load } from "@cashfreepayments/cashfree-js";

export default function Checkout() {
  const { items, subtotal, count, clear, cart_uid } = useCartStore();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cashfree, setCashfree] = useState(null);
  const [formError, setFormError] = useState("");

  // Data fetching
  const { data: addresses, isLoading: loadingAddresses } = useUserAddresses(
    user?.id,
  );
  const { data: shippingConfig } = useShippingConfig();

  // Local State
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("prepaid");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // Guest State
  const isGuest = !user;
  const [loggedInPhone, setLoggedInPhone] = useState("");
  
  useEffect(() => {
     if (!isGuest) {
        setLoggedInPhone(profile?.phone_number || user?.phone_number || "");
     }
  }, [profile, user, isGuest]);

  const [guestContact, setGuestContact] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [guestAddress, setGuestAddress] = useState({
    line1: "",
    city: "",
    state: "",
    postalCode: "",
  });

  // Set default address initially (only if logged in and has addresses)
  useEffect(() => {
    if (!isGuest && addresses && addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.is_default) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId, isGuest]);

  useEffect(() => {
    load({ mode: import.meta.env.VITE_CASHFREE_MODE || "sandbox" }).then(
      (cf) => {
        setCashfree(cf);
      },
    );
  }, []);

  if (items.length === 0) {
    return (
      <div className="pt-32 text-center min-h-[60vh]">
        <h2 className="text-2xl font-serif">Your cart is empty</h2>
        <button
          onClick={() => navigate("/shop")}
          className="mt-4 underline text-ash"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  // Calculations
  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId);
  // Standard shipping is FREE on orders of 2+ items; single items pay the flat
  // rate. Express always costs the express rate.
  const isFreeShippingEligible = count >= 2;
  const COD_FEE = 5000; // ₹50 in paise

  let shippingFee = 0;
  if (shippingMethod === "standard") {
    shippingFee = isFreeShippingEligible ? 0 : shippingConfig?.flat_rate || 0;
  } else if (shippingMethod === "express") {
    shippingFee = shippingConfig?.express_rate || 0;
  }

  const codFee = paymentMethod === "cod" ? COD_FEE : 0;
  const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0;
  const totalAmount = Math.max(
    0,
    subtotal - discountAmount + shippingFee + codFee,
  );
  const overQtyLimit = count > 20;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const promo = await validateDiscountCode(promoCode.trim().toUpperCase(), subtotal);
      setAppliedPromo(promo);
      setPromoCode("");
    } catch (err) {
      setPromoError(err.message);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError("");
  };

  const handlePayment = async () => {
    // Validation
    setFormError("");
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRe = /^[6-9]\d{9}$/;
    const pinRe = /^\d{6}$/;
    if (isGuest) {
      if (
        !guestContact.fullName.trim() ||
        !guestContact.email.trim() ||
        !guestContact.phone.trim()
      ) {
        setFormError("Please fill in all your contact information.");
        return;
      }
      if (!emailRe.test(guestContact.email.trim())) {
        setFormError("Please enter a valid email address.");
        return;
      }
      if (!phoneRe.test(guestContact.phone.replace(/\D/g, "").slice(-10))) {
        setFormError("Please enter a valid 10-digit Indian mobile number.");
        return;
      }
      if (
        !guestAddress.line1.trim() ||
        !guestAddress.city.trim() ||
        !guestAddress.state.trim() ||
        !guestAddress.postalCode.trim()
      ) {
        setFormError("Please complete your shipping address.");
        return;
      }
      if (!pinRe.test(guestAddress.postalCode.trim())) {
        setFormError("Please enter a valid 6-digit PIN code.");
        return;
      }
    } else {
      if (!selectedAddressId) {
        setFormError("Please select a shipping address.");
        return;
      }
      if (!phoneRe.test(loggedInPhone.replace(/\D/g, "").slice(-10))) {
        setFormError("Please enter a valid 10-digit Indian mobile number for delivery updates.");
        return;
      }
    }

    setLoading(true);
    try {
      // Deterministic idempotency key derived from the exact cart + options.
      // Identical retries (double-click, refresh, flaky network) reuse the same
      // key so the server resumes the same order instead of creating a new one.
      // Any real change to the cart/address/promo produces a different key.
      const idemSig = JSON.stringify({
        items: items.map((i) => [i.variant_id, i.qty]),
        pm: paymentMethod,
        addr: isGuest ? guestAddress : selectedAddressId,
        promo: appliedPromo?.id || null,
        ship: shippingMethod,
        uid: cart_uid,
      });
      let idempotencyKey;
      try {
        const msgBuffer = new TextEncoder().encode(idemSig);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        idempotencyKey = "idem_" + hashHex.slice(0, 43);
      } catch {
        idempotencyKey = "idem_" + Date.now();
      }

      // Create the Cashfree Session via Edge Function
      const { data: edgeData, error: edgeError } =
        await supabase.functions.invoke("cashfree-checkout", {
          body: {
            action: "create-order",
            paymentMethod,
            amount: totalAmount,
            subtotal: subtotal,
            customerId: isGuest ? `guest_${Date.now()}` : user.id,
            customerPhone: isGuest ? guestContact.phone : loggedInPhone,
            customerEmail: isGuest ? guestContact.email : user.email,
            cartItems: items,
            orderMeta: {
              address_id: isGuest ? null : selectedAddressId,
              guest_address: isGuest ? guestAddress : null,
              discount_id: appliedPromo?.id || null,
              shipping_method: shippingMethod,
              shipping_fee: shippingFee,
              discount_amount: discountAmount,
              idempotency_key: idempotencyKey,
            },
          },
        });

      if (edgeError) {
        let msg = edgeError.message || "Checkout failed";
        try {
          const ctx = await edgeError.context?.json?.();
          if (ctx?.error?.message) msg = ctx.error.message;
        } catch (_) {
          /* ignore */
        }
        throw new Error(msg);
      }
      // COD: the order is already confirmed server-side — skip the gateway.
      if (edgeData?.cod) {
        clear();
        navigate(`/checkout/success?order_id=${edgeData.order_id}`);
        return;
      }

      if (!edgeData?.payment_session_id)
        throw new Error("Failed to generate payment session");

      let checkoutOptions = {
        paymentSessionId: edgeData.payment_session_id,
        returnUrl: `${window.location.origin}/checkout/success?order_id=${edgeData.order_id}`,
      };

      await cashfree.checkout(checkoutOptions);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Checkout failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="pt-32 px-4 sm:px-6 md:px-12 max-w-[1200px] mx-auto min-h-screen pb-20">
      <h1 className="text-3xl font-serif mb-8">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left Col - Address & Shipping */}
        <div className="flex-1 space-y-10">
          {isGuest ? (
            <>
              {/* Guest Contact Form */}
              <section className="bg-[#111] p-6 border border-white/10">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                  <h2 className="text-xl font-medium">Contact Information</h2>
                  <Link
                    to="/"
                    className="text-xs text-ash hover:text-smoke underline"
                  >
                    Have an account? Log in
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="border border-white/10 p-3 text-sm bg-transparent"
                    value={guestContact.fullName}
                    onChange={(e) =>
                      setGuestContact({
                        ...guestContact,
                        fullName: e.target.value,
                      })
                    }
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    className="border border-white/10 p-3 text-sm bg-transparent"
                    value={guestContact.email}
                    onChange={(e) =>
                      setGuestContact({
                        ...guestContact,
                        email: e.target.value,
                      })
                    }
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="border border-white/10 p-3 text-sm bg-transparent md:col-span-2"
                    value={guestContact.phone}
                    onChange={(e) =>
                      setGuestContact({
                        ...guestContact,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </section>

              {/* Guest Address Form */}
              <section className="bg-[#111] p-6 border border-white/10">
                <h2 className="text-xl font-medium mb-6 border-b border-white/10 pb-2">
                  Shipping Address
                </h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Street Address"
                    className="w-full border border-white/10 p-3 text-sm bg-transparent"
                    value={guestAddress.line1}
                    onChange={(e) =>
                      setGuestAddress({
                        ...guestAddress,
                        line1: e.target.value,
                      })
                    }
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      className="border border-white/10 p-3 text-sm bg-transparent"
                      value={guestAddress.city}
                      onChange={(e) =>
                        setGuestAddress({
                          ...guestAddress,
                          city: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="State"
                      className="border border-white/10 p-3 text-sm bg-transparent"
                      value={guestAddress.state}
                      onChange={(e) =>
                        setGuestAddress({
                          ...guestAddress,
                          state: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="PIN Code (6 digits)"
                      inputMode="numeric"
                      maxLength={6}
                      className="border border-white/10 p-3 text-sm bg-transparent"
                      value={guestAddress.postalCode}
                      onChange={(e) =>
                        setGuestAddress({
                          ...guestAddress,
                          postalCode: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Logged in Contact Info */}
              <section className="bg-[#111] p-6 border border-white/10 mb-10">
                <h2 className="text-xl font-medium mb-4 border-b border-white/10 pb-2">Contact Information</h2>
                <p className="text-sm text-ash mb-4">Your phone number is required by our courier partners for delivery updates.</p>
                <input
                  type="tel"
                  placeholder="Phone Number (10 digits)"
                  className="w-full border border-white/10 p-3 text-sm bg-transparent"
                  value={loggedInPhone}
                  onChange={(e) => setLoggedInPhone(e.target.value)}
                />
              </section>

              {/* Logged in Shipping Address Selection */}
              <section className="bg-[#111] p-6 border border-white/10">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-2">
                  <h2 className="text-xl font-medium">Shipping Address</h2>
                  <Link
                    to="/account"
                    className="text-xs flex items-center gap-1 hover:text-ash transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add New
                  </Link>
                </div>

                {loadingAddresses ? (
                  <div className="animate-pulse bg-white/10 h-24 w-full" />
                ) : addresses?.length === 0 ? (
                  <div className="text-sm text-ash py-4">
                    You have no saved addresses.{" "}
                    <Link to="/account" className="underline hover:text-smoke">
                      Add one in your account
                    </Link>
                    .
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`border p-4 cursor-pointer transition-colors ${
                          selectedAddressId === addr.id
                            ? "border-smoke bg-transparent shadow-sm"
                            : "border-white/10 hover:border-gray-400 bg-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {addr.label}
                          </span>
                          <input
                            type="radio"
                            name="address"
                            className="accent-ink"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                          />
                        </div>
                        <p className="text-xs text-ash leading-relaxed">
                          {user.user_metadata?.full_name || "User"}
                          <br />
                          {addr.address_line_1}
                          <br />
                          {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Shipping Method */}
          <section className="bg-[#111] p-6 border border-white/10">
            <h2 className="text-xl mb-4 border-b border-white/10 pb-2 font-medium">
              Shipping Method
            </h2>
            <div className="space-y-3">
              <label
                className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${shippingMethod === "standard" ? "border-smoke bg-transparent" : "border-white/10 hover:border-gray-400"}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === "standard"}
                    onChange={() => setShippingMethod("standard")}
                    className="accent-ink"
                  />
                  <div>
                    <span className="block font-medium text-sm">
                      Standard Shipping
                    </span>
                    <span className="block text-xs text-ash">
                      3-5 business days · Free on 2+ items
                    </span>
                  </div>
                </div>
                <span className="font-medium text-sm">
                  {isFreeShippingEligible
                    ? "Free"
                    : formatPrice(shippingConfig?.flat_rate || 0)}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${shippingMethod === "express" ? "border-smoke bg-transparent" : "border-white/10 hover:border-gray-400"}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === "express"}
                    onChange={() => setShippingMethod("express")}
                    className="accent-ink"
                  />
                  <div>
                    <span className="block font-medium text-sm">
                      Express Shipping
                    </span>
                    <span className="block text-xs text-ash">
                      1-2 business days
                    </span>
                  </div>
                </div>
                <span className="font-medium text-sm">
                  {formatPrice(shippingConfig?.express_rate || 0)}
                </span>
              </label>
            </div>
          </section>

          {/* Payment Method */}
          <section className="bg-[#111] p-6 border border-white/10">
            <h2 className="text-xl mb-4 border-b border-white/10 pb-2 font-medium">
              Payment Method
            </h2>
            <div className="space-y-3">
              <label
                className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${paymentMethod === "prepaid" ? "border-smoke bg-transparent" : "border-white/10 hover:border-gray-400"}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "prepaid"}
                    onChange={() => setPaymentMethod("prepaid")}
                    className="accent-ink"
                  />
                  <div>
                    <span className="block font-medium text-sm">
                      Pay Online
                    </span>
                    <span className="block text-xs text-ash">
                      UPI, cards & netbanking via Cashfree
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${paymentMethod === "cod" ? "border-smoke bg-transparent" : "border-white/10 hover:border-gray-400"}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="accent-ink"
                  />
                  <div>
                    <span className="block font-medium text-sm">
                      Cash on Delivery
                    </span>
                    <span className="block text-xs text-ash">
                      Pay when your order arrives
                    </span>
                  </div>
                </div>
                <span className="font-medium text-sm">
                  +{formatPrice(COD_FEE)}
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* Right Col - Order Summary */}
        <div className="w-full lg:w-[400px] flex-shrink-0">
          <div className="bg-[#111] p-6 border border-white/10 sticky top-32">
            <h2 className="text-xl mb-4 border-b border-white/10 pb-2 font-medium">
              Order Summary
            </h2>
            <ul className="space-y-4 mb-6">
              {items.map((item) => (
                <li key={item.key} className="flex justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <Img
                      src={item.image}
                      alt={item.name}
                      sizes="48px"
                      className="w-12 h-16 object-cover bg-[#111]"
                    />
                    <div>
                      <p className="font-medium text-smoke">{item.name}</p>
                      <p className="text-ash text-xs">
                        Qty: {item.qty} | Size: {item.size}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">
                    {formatPrice(item.price * item.qty)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Promo Code Input */}
            <div className="border-t border-white/10 pt-6 mb-6">
              {!appliedPromo ? (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 border border-white/10 p-3 text-sm bg-transparent"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="bg-smoke text-black px-6 text-sm font-medium hover:bg-white disabled:opacity-50"
                    >
                      {promoLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-red-500 text-xs mt-2">{promoError}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 p-3 rounded-sm">
                  <div className="flex items-center gap-2 text-green-300 text-sm font-medium">
                    <Tag className="w-4 h-4" />
                    {appliedPromo.code} applied
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    className="text-xs text-ash hover:text-smoke underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-3 text-sm">
              <div className="flex justify-between text-ash">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-green-300 font-medium">
                  <span>Discount ({appliedPromo.code})</span>
                  <span>-{formatPrice(appliedPromo.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-ash">
                <span>Shipping</span>
                <span>
                  {shippingFee === 0 ? "Free" : formatPrice(shippingFee)}
                </span>
              </div>
              {codFee > 0 && (
                <div className="flex justify-between text-ash">
                  <span>COD fee</span>
                  <span>{formatPrice(codFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg text-smoke pt-2 border-t border-white/10">
                <span>Total</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>

            {overQtyLimit && (
              <p className="text-red-500 text-sm mt-4 text-center">
                Orders are limited to 20 items. Please reduce your bag.
              </p>
            )}
            {formError && (
              <p className="text-red-500 text-sm mt-4 text-center">
                {formError}
              </p>
            )}
            <button
              onClick={handlePayment}
              disabled={
                loading ||
                overQtyLimit ||
                (paymentMethod === "prepaid" && !cashfree) ||
                (!isGuest && !selectedAddressId)
              }
              className="w-full mt-8 bg-smoke text-black py-4 font-medium transition-colors hover:bg-transparent disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : paymentMethod === "cod" ? (
                `Place Order · ${formatPrice(totalAmount)}`
              ) : (
                `Pay ${formatPrice(totalAmount)}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
