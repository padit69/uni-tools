import { Outlet } from "react-router-dom";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { I18nProvider } from "@/i18n";
import { InstallAppButton, InstallAppProvider } from "./InstallAppButton";

export function AppShell() {
  return (
    <I18nProvider>
    <InstallAppProvider>
    <TooltipProvider delayDuration={250}>
      <GoogleAnalytics />
      <div className="mesh-bg" aria-hidden>
        <div className="mesh-bg-extra" />
      </div>

      <div className="flex h-dvh w-screen overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-2 pt-2 pb-0 md:px-3 md:pt-3 md:pl-0 md:pb-0">
          <TopBar />
          <div className="glass glass-panel relative flex-1 overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette />
      <InstallAppButton />
    </TooltipProvider>
    </InstallAppProvider>
    </I18nProvider>
  );
}
