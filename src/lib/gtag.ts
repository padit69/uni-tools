declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: Gtag;
  }
}

type Gtag = (...args: unknown[]) => void;

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

export function getGaId(): string | undefined {
  return GA_ID || undefined;
}

export function initGtag(measurementId: string): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });
}

export function trackPageView(path: string): void {
  const id = getGaId();
  if (!id || !window.gtag) return;
  window.gtag("config", id, {
    page_path: path,
    page_title: document.title,
  });
}
