import React, { useEffect } from "react";
import Img from "./Img";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Minus, Plus } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { formatPrice } from "../lib/api";

export default function CartDrawer() {
  const { open, setOpen, items, removeItem, changeQty, subtotal } =
    useCartStore();
  const navigate = useNavigate();

  // Handle native escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[60] bg-black text-white flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-6 md:px-12 md:py-8 border-b border-white/10 shrink-0">
            <span className="display text-2xl md:text-4xl tracking-tight uppercase">Bag // {items.length}</span>
            <button
              data-testid="cart-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="hover:text-white/50 transition-colors flex items-center gap-2"
            >
              <span className="hidden md:inline uppercase text-xs tracking-widest font-bold">Close</span>
              <X size={28} strokeWidth={1.5} />
            </button>
          </div>

          <div 
            className="flex-1 overflow-y-auto px-6 md:px-12 py-12 flex flex-col justify-center"
            data-lenis-prevent="true"
          >
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full">
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="display text-6xl sm:text-7xl md:text-9xl uppercase tracking-tighter leading-none"
                >
                  NOTHING HERE
                </motion.p>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 text-xl text-white/50 font-serif"
                >
                  Your bag is empty. Time to change that.
                </motion.p>
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => setOpen(false)}
                  className="mt-12 text-sm uppercase tracking-[0.3em] font-bold border-b border-white hover:text-white/50 hover:border-white/50 transition-colors pb-2"
                >
                  Return to Shop
                </motion.button>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto w-full h-full flex flex-col lg:flex-row gap-16 lg:gap-24">
                {/* Items List */}
                <ul className="flex-1 divide-y divide-white/10">
                  {items.map((it, i) => (
                    <motion.li
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={it.key}
                      className="flex flex-col sm:flex-row gap-6 sm:gap-8 py-8"
                      data-testid={`cart-item-${it.key}`}
                    >
                      <div className="h-48 sm:h-56 w-32 sm:w-40 flex-shrink-0 bg-[#111]">
                        <Img
                          src={it.image}
                          alt={it.name}
                          sizes="(max-width: 768px) 128px, 160px"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-serif text-3xl sm:text-4xl">{it.name}</p>
                            <p className="text-sm text-white/50 mt-2 uppercase tracking-widest font-bold">
                              Size {it.size}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(it.key)}
                            className="text-white/40 hover:text-white transition-colors p-2 -mr-2"
                            data-testid={`cart-remove-${it.key}`}
                            aria-label="Remove item"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        
                        <div className="mt-8 flex items-end justify-between">
                          <div className="flex items-center border border-white/20 text-lg">
                            <button
                              onClick={() => changeQty(it.key, -1)}
                              className="px-4 py-3 hover:bg-white/10 transition-colors"
                              data-testid={`cart-dec-${it.key}`}
                            >
                              <Minus size={16} />
                            </button>
                            <span className="px-6 font-serif">{it.qty}</span>
                            <button
                              onClick={() => changeQty(it.key, 1)}
                              className="px-4 py-3 hover:bg-white/10 transition-colors"
                              data-testid={`cart-inc-${it.key}`}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <span className="text-2xl font-serif">
                            {formatPrice(it.price * it.qty)}
                          </span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>

                {/* Desktop Sidebar Summary / Mobile Bottom Summary */}
                <div className="w-full lg:w-[400px] shrink-0 pb-12 lg:pb-0 flex flex-col justify-end lg:justify-start">
                  <div className="bg-[#111] p-8 lg:sticky lg:top-8">
                    <h2 className="display text-3xl mb-8 uppercase tracking-tight">Summary</h2>
                    <div className="flex justify-between mb-4 text-lg">
                      <span className="text-white/60 font-serif">Subtotal</span>
                      <span
                        data-testid="cart-subtotal"
                        className="font-serif"
                      >
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-8 pb-8 border-b border-white/10 text-lg">
                      <span className="text-white/60 font-serif">Shipping</span>
                      <span className="font-serif">Calculated next</span>
                    </div>
                    
                    {items.reduce((s, i) => s + i.qty, 0) >= 2 ? (
                      <p className="text-xs uppercase tracking-widest text-green-400 font-bold mb-6">
                        ✓ Free shipping unlocked
                      </p>
                    ) : (
                      <p className="text-xs uppercase tracking-widest text-white/40 font-bold mb-6">
                        Add 1 more item to unlock free shipping
                      </p>
                    )}
                    
                    <button
                      data-testid="checkout-btn"
                      className="w-full bg-white text-black text-xl py-6 hover:bg-white/80 transition-colors display tracking-tight uppercase"
                      onClick={() => {
                        setOpen(false);
                        navigate("/checkout");
                      }}
                    >
                      Checkout
                    </button>
                    <p className="mt-6 text-center text-[0.6rem] uppercase tracking-[0.25em] text-white/30 font-bold">
                      Secure payments via Cashfree
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
