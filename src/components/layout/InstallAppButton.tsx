import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Info, Smartphone, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/cn";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

interface InstallAppContextValue {
  canInstall: boolean;
  canShowIosHint: boolean;
  dismissed: boolean;
  installed: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
  restore: () => void;
}

const InstallAppContext = createContext<InstallAppContextValue | null>(null);

const DISMISSED_KEY = "uni-tools:install-dismissed";
const INSTALLED_KEY = "uni-tools:app-installed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function readStorageFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStorageFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Ignore storage failures; in-memory state still hides the prompt for this session.
  }
}

function removeStorageFlag(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function InstallAppProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone() || readStorageFlag(INSTALLED_KEY));
  const [dismissed, setDismissed] = useState(() => readStorageFlag(DISMISSED_KEY));
  const canShowIosHint = useMemo(() => isIos() && !isStandalone(), []);

  useEffect(() => {
    setInstalled(isStandalone() || readStorageFlag(INSTALLED_KEY));
    setDismissed(readStorageFlag(DISMISSED_KEY));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      writeStorageFlag(INSTALLED_KEY);
      setInstalled(true);
      setPromptEvent(null);
      toast.success(t("install.installed"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [t]);

  const install = async () => {
    if (!promptEvent) {
      toast.info(t("install.iosHint"));
      return;
    }
    toast.message(t("install.installing"));
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      writeStorageFlag(INSTALLED_KEY);
      setInstalled(true);
    }
    setPromptEvent(null);
  };

  const dismiss = () => {
    writeStorageFlag(DISMISSED_KEY);
    setDismissed(true);
  };

  const restore = () => {
    removeStorageFlag(DISMISSED_KEY);
    setDismissed(false);
  };

  return (
    <InstallAppContext.Provider
      value={{
        canInstall: !!promptEvent,
        canShowIosHint,
        dismissed,
        installed,
        install,
        dismiss,
        restore,
      }}
    >
      {children}
    </InstallAppContext.Provider>
  );
}

export function useInstallApp() {
  const ctx = useContext(InstallAppContext);
  if (!ctx) throw new Error("useInstallApp must be used inside InstallAppProvider");
  return ctx;
}

export function InstallAppButton() {
  const { t } = useI18n();
  const installApp = useInstallApp();
  const [delayElapsed, setDelayElapsed] = useState(false);
  const visible = delayElapsed && !installApp.installed && !installApp.dismissed && (installApp.canInstall || installApp.canShowIosHint);

  useEffect(() => {
    const timer = window.setTimeout(() => setDelayElapsed(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(340px,calc(100vw-2rem))] animate-[install-float-in_420ms_ease-out]">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[var(--card)]/85 p-3 shadow-2xl backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-fuchsia-400/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-8 size-28 rounded-full bg-orange-400/25 blur-2xl" />
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            installApp.dismiss();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            installApp.dismiss();
          }}
          className="absolute right-2 top-2 z-20 grid size-7 place-items-center rounded-full text-[var(--muted-foreground)] transition hover:bg-red-500/15 hover:text-red-400 focus-visible:bg-red-500/15 focus-visible:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
          aria-label={t("install.dismiss")}
          title={t("install.dismiss")}
        >
          <X className="size-3.5" />
        </button>

        <div className="relative flex gap-3 pr-7">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-400 via-fuchsia-500 to-indigo-500 text-white shadow-lg animate-[install-pulse_2.8s_ease-in-out_infinite]">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
              {t("install.cardEyebrow")}
            </div>
            <div className="mt-0.5 text-sm font-semibold">{t("install.title")}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{t("install.desc")}</p>
          </div>
        </div>

        <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/info"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-[var(--muted-foreground)] transition hover:bg-white/10 hover:text-[var(--foreground)]"
          >
            <Info className="size-3.5" />
            {t("install.learnMore")}
          </Link>
          <Button onClick={installApp.install} className={cn("h-9 rounded-xl px-3 text-xs", !installApp.canInstall && "bg-[var(--secondary)] text-[var(--secondary-foreground)]")}>
            {installApp.canInstall ? <Download className="size-3.5" /> : <Smartphone className="size-3.5" />}
            {t("install.saveToApp")}
          </Button>
        </div>
      </div>
    </div>
  );
}
