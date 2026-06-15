import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Mail, Instagram, MapPin } from "lucide-react";

const SUPPORT_EMAIL = "support@pantherclaw.in";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    // No backend mailbox is wired yet, so we open the user's mail client with a
    // prefilled message. Swap this for an Edge Function + table when ready.
    const subject = encodeURIComponent(
      `Support request from ${form.name || "a customer"}`,
    );
    const body = encodeURIComponent(
      `${form.message}\n\nFrom: ${form.name} (${form.email})`,
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="pt-32 pb-24 px-4 sm:px-6 md:px-12 max-w-[1100px] mx-auto min-h-screen">
      <Helmet>
        <title>Contact — PANTHERCLAW</title>
        <meta
          name="description"
          content="Get in touch with the PANTHERCLAW team for order help, sizing, and wholesale enquiries."
        />
      </Helmet>
      <h1 className="font-serif text-4xl md:text-5xl text-smoke mb-3">
        Get in touch
      </h1>
      <p className="text-white/60 max-w-xl mb-14">
        Questions about sizing, an order, or a collaboration? We usually reply
        within one business day.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <Mail className="w-5 h-5 text-white/50 mt-1" />
            <div>
              <p className="label text-white/40 mb-1">Email</p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-smoke hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Instagram className="w-5 h-5 text-white/50 mt-1" />
            <div>
              <p className="label text-white/40 mb-1">Social</p>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="text-smoke hover:underline"
              >
                @pantherclaw
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <MapPin className="w-5 h-5 text-white/50 mt-1" />
            <div>
              <p className="label text-white/40 mb-1">Studio</p>
              <p className="text-white/70">
                [Add your registered business address]
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-white/20 bg-transparent p-3 text-sm text-smoke placeholder:text-white/40 focus:outline-none focus:border-smoke"
          />
          <input
            type="email"
            required
            placeholder="Your email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-white/20 bg-transparent p-3 text-sm text-smoke placeholder:text-white/40 focus:outline-none focus:border-smoke"
          />
          <textarea
            required
            rows={5}
            placeholder="How can we help?"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full border border-white/20 bg-transparent p-3 text-sm text-smoke placeholder:text-white/40 focus:outline-none focus:border-smoke"
          />
          <button
            type="submit"
            className="bg-smoke text-ink px-8 py-4 label hover:bg-white transition-colors w-full"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
