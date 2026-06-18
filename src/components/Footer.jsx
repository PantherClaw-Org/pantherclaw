import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";
import { subscribeNewsletter } from "../lib/api";
import { motion } from "framer-motion";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      const res = await subscribeNewsletter(email);
      setMsg(res.message);
      setEmail("");
    } catch {
      setMsg("Something went wrong. Try again.");
    }
  };

  return (
    <footer className="bg-black text-white overflow-hidden [content-visibility:auto] [contain-intrinsic-size:auto_800px]" data-testid="footer">
      {/* 1. Giant Scrolling Marquee */}
      <div className="w-full overflow-hidden border-b border-white/10 bg-black py-4 md:py-8">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 15 }}
        >
          <div className="flex shrink-0">
            {[...Array(6)].map((_, i) => (
              <span key={`first-${i}`} className="display text-5xl md:text-8xl text-white px-8 italic tracking-tighter">
                PANTHERCLAW
              </span>
            ))}
          </div>
          <div className="flex shrink-0">
            {[...Array(6)].map((_, i) => (
              <span key={`second-${i}`} className="display text-5xl md:text-8xl text-white px-8 italic tracking-tighter">
                PANTHERCLAW
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 2. Oversized Brutalist Newsletter */}
      <div className="w-full px-4 py-24 sm:px-6 md:px-12 bg-black border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <div className="max-w-md">
            <span className="text-white/50 uppercase tracking-widest text-xs font-bold mb-4 block">Inner Circle</span>
            <p className="text-white text-lg md:text-xl">Join the syndicate. Get early access to highly limited drops and prototype pieces.</p>
          </div>
          <form onSubmit={submit} className="w-full md:w-1/2" data-testid="newsletter-form">
            <div className="flex items-center border-b-[3px] border-white/20 focus-within:border-white transition-colors pb-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ENTER EMAIL."
                className="w-full bg-transparent text-4xl md:text-6xl uppercase display text-white placeholder:text-white/20 focus:outline-none"
                data-testid="newsletter-input"
              />
              <button
                aria-label="Subscribe"
                className="text-white hover:translate-x-3 transition-transform"
                data-testid="newsletter-submit"
              >
                <ArrowRight size={40} strokeWidth={1.5} />
              </button>
            </div>
            {msg && (
              <p className="mt-4 text-sm tracking-wider text-white/60 uppercase" data-testid="newsletter-msg">
                {msg}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* 3. Brutalist Link Grid */}
      <div className="mx-auto grid max-w-7xl gap-y-12 gap-x-6 px-4 py-20 sm:px-6 md:grid-cols-4 md:px-12 bg-black">
        <FooterCol
          title="Shop"
          items={[
            { label: "Women", to: "/shop?category=Women" },
            { label: "Men", to: "/shop?category=Men" },
            { label: "New Arrivals", to: "/shop" },
            { label: "Bestsellers", to: "/shop" },
          ]}
        />
        <FooterCol
          title="Help"
          items={[
            { label: "Shipping", to: "/shipping-policy" },
            { label: "Exchanges", to: "/exchanges" },
            { label: "Contact", to: "/contact" },
            { label: "Track Order", to: "/track-order" },
          ]}
        />
        <FooterCol
          title="Legal"
          items={[
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms of Service", to: "/terms" },
          ]}
        />
        <div className="flex flex-col md:items-end justify-between">
          <div className="flex gap-6 mb-8 md:mb-0">
            <a href="https://www.instagram.com/pantherclawclothing/" target="_blank" rel="noreferrer" className="text-white hover:text-white/50 transition-colors">
              <FaInstagram size={24} />
            </a>
          </div>
          <p className="text-xs text-white/30 uppercase tracking-widest font-mono">
            © {new Date().getFullYear()} PantherClaw
          </p>
        </div>
      </div>

      {/* 4. Giant Edge-to-Edge Logo */}
      <div className="w-full flex justify-center items-end overflow-hidden pt-10 pointer-events-none select-none bg-black">
        <span className="display text-[16vw] leading-[0.8] tracking-tighter text-white/5">
          PANTHERCLAW
        </span>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }) {
  return (
    <div>
      <p className="uppercase tracking-widest text-xs font-bold text-white/40 mb-6">{title}</p>
      <ul className="space-y-4">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              to={i.to}
              className="text-lg md:text-xl text-white hover:text-white/50 transition-colors font-medium tracking-wide"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
