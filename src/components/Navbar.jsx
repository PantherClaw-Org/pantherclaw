import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Search, Menu, X, User } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";
import SearchOverlay from "./SearchOverlay";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { label: "Home", to: "/" },
  { label: "Shop All", to: "/shop" },
  { label: "Women", to: "/shop?category=Women" },
  { label: "Men", to: "/shop?category=Men" },
  { label: "Track Order", to: "/track-order" },
];

export default function Navbar() {
  const { count, setOpen } = useCartStore();
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenu(false), [location]);

  useEffect(() => {
    if (menu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  return (
    <>
      <header
        data-testid="main-navigation"
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          scrolled || menu
            ? "bg-black/90 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 md:px-12">
          {/* Left: Menu Toggle (Visible everywhere) */}
          <button
            onClick={() => setMenu((m) => !m)}
            className="flex-1 flex items-center gap-3 text-white hover:text-white/60 transition-colors"
            aria-label="Menu"
            aria-expanded={menu}
            data-testid="mobile-menu-toggle"
          >
            {menu ? <X size={26} strokeWidth={1.5} /> : <Menu size={26} strokeWidth={1.5} />}
            <span className="hidden md:inline text-xs tracking-widest uppercase font-bold mt-0.5">Menu</span>
          </button>

          {/* Center: Logo */}
          <Link to="/" data-testid="brand-logo" className="flex-1 text-center" onClick={() => setMenu(false)}>
            <span className="display text-2xl tracking-tight md:text-[1.7rem] text-white">
              PANTHERCLAW
            </span>
          </Link>

          {/* Right: Cart Only */}
          <div className="flex flex-1 items-center justify-end gap-5">
            <button
              data-testid="cart-toggle"
              onClick={() => {
                setMenu(false);
                setOpen(true);
              }}
              className="relative text-white hover:text-white/60 transition-colors flex items-center gap-3"
              aria-label="Cart"
            >
              <span className="hidden md:inline text-xs tracking-widest uppercase font-bold mt-0.5">Cart</span>
              <div className="relative">
                <ShoppingBag size={22} strokeWidth={1.5} />
                {count > 0 && (
                  <span
                    data-testid="cart-count"
                    className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[0.55rem] font-bold text-black"
                  >
                    {count}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Massive Full-Screen Overlay Menu */}
      <AnimatePresence>
        {menu && (
          <motion.div
            data-lenis-prevent="true"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-black pt-32 px-4 sm:px-6 md:px-12 pb-12 flex flex-col justify-between overflow-y-auto"
          >
            <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row justify-between gap-16">
              <nav className="flex flex-col gap-2 md:gap-4">
                {links.map((l, i) => {
                  if (l.label === "Home" && location.pathname === "/") return null;
                  return (
                    <motion.div
                      key={l.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.1 }}
                    >
                      <Link
                        to={l.to}
                        onClick={() => setMenu(false)}
                        className="display text-5xl sm:text-7xl md:text-8xl lg:text-[9rem] text-white hover:text-white/50 transition-colors uppercase tracking-tighter leading-none"
                      >
                        {l.label}
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>

              <div className="flex flex-col gap-8 md:pt-4">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-white/40 uppercase tracking-widest text-xs font-bold mb-6">Actions</p>
                  <div className="flex flex-col gap-6">
                    <button
                      onClick={() => {
                        setMenu(false);
                        setSearchOpen(true);
                      }}
                      className="text-2xl md:text-3xl text-white hover:text-white/50 transition-colors text-left flex items-center gap-4 font-serif"
                    >
                      <Search size={24} /> Search
                    </button>
                    {user ? (
                      <Link
                        to="/account"
                        onClick={() => setMenu(false)}
                        className="text-2xl md:text-3xl text-white hover:text-white/50 transition-colors flex items-center gap-4 font-serif"
                      >
                        <User size={24} /> My Account
                      </Link>
                    ) : (
                      <button
                        onClick={() => {
                          setMenu(false);
                          setAuthModalOpen(true);
                        }}
                        className="text-2xl md:text-3xl text-white hover:text-white/50 transition-colors text-left flex items-center gap-4 font-serif"
                      >
                        <User size={24} /> Sign In
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.5 }}
              className="max-w-[1600px] mx-auto w-full mt-16 md:mt-0"
            >
              <p className="text-white/20 uppercase tracking-widest text-xs font-bold text-center md:text-left">
                Pantherclaw Syndicate // {new Date().getFullYear()}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
