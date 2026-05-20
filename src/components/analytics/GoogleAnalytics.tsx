import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getGaId, initGtag, trackPageView } from "@/lib/gtag";

/** SPA page views on route change (gtag base tag is in index.html when env is set). */
export function GoogleAnalytics() {
  const location = useLocation();
  const gaId = getGaId();

  useEffect(() => {
    if (!gaId) return;
    initGtag(gaId);
  }, [gaId]);

  useEffect(() => {
    if (!gaId) return;
    trackPageView(location.pathname + location.search);
  }, [gaId, location.pathname, location.search]);

  return null;
}
