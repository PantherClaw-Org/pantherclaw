import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";
import { subscribeNewsletter } from "../lib/api";

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
    <footer className="bg-ink text-smoke" data-testid="footer">
      {/* Newsletter */}
      <div className="border-b border-white/10 px-4 py-20 sm:px-6 md:px-12">
        <div className="mx-auto grid max-w-[1600px] gap-10 md:grid-cols-2 md:items-end">
          <div>
            <p className="label text-white/50">The Inner Circle</p>
            <h2 className="display mt-4 text-5xl md:text-6xl">
              Be first
              <br />
              to the drop.
            </h2>
          </div>
          <form
            onSubmit={submit}
            data-testid="newsletter-form"
            className="w-full"
          >
            <div className="flex items-center border-b border-white/30 pb-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                data-testid="newsletter-input"
                className="w-full bg-transparent text-lg text-smoke placeholder:text-white/40 focus:outline-none"
              />
              <button
                data-testid="newsletter-submit"
                aria-label="Subscribe"
                className="text-smoke"
              >
                <ArrowRight size={24} />
              </button>
            </div>
            {msg && (
              <p
                className="mt-3 text-sm text-white/70"
                data-testid="newsletter-msg"
              >
                {msg}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Links */}
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-4 md:px-12">
        <div className="md:col-span-1">
          <span className="display text-2xl">PANTHERCLAW</span>
          <p className="mt-4 max-w-xs text-sm text-white/50">
            Premium baggy & wide-leg denim. Engineered in India for those who
            move different.
          </p>
        </div>
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
            { label: "Returns", to: "/returns" },
            { label: "Contact", to: "/contact" },
            { label: "Track Order", to: "/track-order" },
          ]}
        />
        <FooterCol
          title="Company"
          items={[
            { label: "Our Story", to: "/story" },
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms of Service", to: "/terms" },
          ]}
        />
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 border-t border-white/10 px-4 py-8 sm:px-6 md:flex-row md:px-12">
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} PantherClaw · pantherclaw.in
        </p>
        <div className="flex items-center gap-5">
          <Link
            to="/privacy"
            className="text-xs text-white/40 hover:text-smoke transition-colors"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="text-xs text-white/40 hover:text-smoke transition-colors"
          >
            Terms
          </Link>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
          >
            <FaInstagram
              size={18}
              className="cursor-pointer text-white/60 transition-colors hover:text-smoke"
            />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter"
          >
            <FaTwitter
              size={18}
              className="cursor-pointer text-white/60 transition-colors hover:text-smoke"
            />
          </a>
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
          >
            <FaYoutube
              size={18}
              className="cursor-pointer text-white/60 transition-colors hover:text-smoke"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }) {
  return (
    <div>
      <p className="label text-white/50">{title}</p>
      <ul className="mt-5 space-y-3">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              to={i.to}
              className="text-sm text-white/80 transition-colors hover:text-smoke"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
