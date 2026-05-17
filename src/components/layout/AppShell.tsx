import { Outlet } from "react-router-dom";
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
      <div className="mesh-bg" aria-hidden>
        <div className="mesh-bg-extra" />
      </div>

      <div className="flex h-dvh w-screen overflow-hidden">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-2 md:p-3 md:pl-0">
          <TopBar />
          <div className="glass relative flex-1 overflow-hidden rounded-2xl">
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
