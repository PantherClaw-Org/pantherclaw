import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Resets scroll position to the top on every route change (SPAs don't do this
// automatically). Renders nothing.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
