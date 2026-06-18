import React, { useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ReactLenis, useLenis } from "lenis/react";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupRealtimeSubscriptions } from "./lib/api";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import LoadingScreen from "./components/LoadingScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import Analytics from "./components/Analytics";
import CookieBanner from "./components/CookieBanner";

// Lazy load route components for code splitting
const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Story = lazy(() => import("./pages/Story"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const ConfirmCod = lazy(() => import("./pages/ConfirmCod"));
const Account = lazy(() => import("./pages/Account"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const ExchangePolicy = lazy(() => import("./pages/legal/ExchangePolicy"));
const ShippingPolicy = lazy(() => import("./pages/legal/ShippingPolicy"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const NotFound = lazy(() => import("./pages/NotFound"));
// Scroll restoration is natively handled well by React Router 6.4+, or we can add a lightweight hook if needed, but Lenis handles basic scroll reset when properly configured.
// For smooth scrolling, we now use <ReactLenis root>

function ReducedMotion() {
  const lenis = useLenis();
  useEffect(() => {
    if (!lenis) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => (mq.matches ? lenis.stop() : lenis.start());
    apply();
    
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else if (mq.addListener) {
      mq.addListener(apply);
      return () => mq.removeListener(apply);
    }
  }, [lenis]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Cache forever, invalidate via Realtime events
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize realtime database subscriptions
setupRealtimeSubscriptions(queryClient);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <ReactLenis root options={{ duration: 1.1, smoothWheel: true }}>
            <ReducedMotion />
            <BrowserRouter>
              <CookieBanner />
              <ScrollToTop />
              <Analytics />
              <a href="#main-content" className="skip-link">
                Skip to content
              </a>
              <Navbar />
              <CartDrawer />
              <main id="main-content">
                <ErrorBoundary>
                  <Suspense fallback={<LoadingScreen />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/shop" element={<Shop />} />
                      <Route
                        path="/product/:slug"
                        element={<ProductDetail />}
                      />
                      <Route path="/story" element={<Story />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route
                        path="/checkout/success"
                        element={<CheckoutSuccess />}
                      />
                      <Route path="/confirm-cod" element={<ConfirmCod />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/exchanges" element={<ExchangePolicy />} />
                      <Route
                        path="/shipping-policy"
                        element={<ShippingPolicy />}
                      />
                      <Route path="/track-order" element={<TrackOrder />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </main>
              <Footer />
            </BrowserRouter>
          </ReactLenis>
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}
