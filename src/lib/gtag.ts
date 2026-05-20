declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: Gtag;
  }
}

type Gtag = (...args: unknown[]) => void;

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

let initialized = false;

export function getGaId(): string | undefined {
  return GA_ID?.trim() || undefined;
}

function ensureGtagStub(): void {
  window.dataLayer = window.dataLayer ?? [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }
}

/** Ensures gtag is ready (script may already be in index.html from build). */
export function initGtag(measurementId: string): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  ensureGtagStub();

  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });
}

export function trackPageView(path: string): void {
  const id = getGaId();
  if (!id || typeof window.gtag !== "function") return;
  window.gtag("config", id, {
    page_path: path,
    page_title: document.title,
  });
}
