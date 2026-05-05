import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ToolHost } from "@/components/layout/ToolHost";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: "tools", element: <Navigate to="/" replace /> },
      { path: "tools/:slug", element: <ToolHost /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
