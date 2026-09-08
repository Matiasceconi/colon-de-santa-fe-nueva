import React, { Component, createContext, useContext, useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import SessionTimeoutWatcher from "@/components/workspace/SessionTimeoutWatcher";
import SessionExpiryBanner from "@/components/workspace/SessionExpiryBanner";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useDemo } from "@/lib/DemoContext";
import DemoSidebar from "@/components/demo/DemoSidebar";
import DemoTourBar from "@/components/demo/DemoTourBar";
import DemoHints from "@/components/demo/DemoHints";
import DemoPageTour from "@/components/demo/DemoPageTour";
import DemoTopHeader from "@/components/demo/DemoTopHeader";
import DemoTutorialCenter from "@/components/demo/DemoTutorialCenter";
import { DemoClubWatermark, demoThemeStyle } from "@/components/demo/DemoClubIdentity";
import { ClubTopHeader, ClubWatermark } from "@/components/staff/ClubChrome";

const SIDEBAR_STORAGE_KEY = "performancepitch_sidebar_collapsed_v1";
const SidebarCollapseContext = createContext({ collapsed: false, setCollapsed: () => {} });

export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext);
}

class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Page crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-400 font-semibold">Error al cargar la página</p>
          <p className="text-zinc-500 text-sm text-center max-w-md">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors">
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Layout() {
  const { canSeePath, clubBrand } = useWorkspace();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
    const timeout = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 220);
    return () => clearTimeout(timeout);
  }, [sidebarCollapsed]);

  const demo = useDemo();

  // Seguridad: una página requiere permiso del rol Y módulo institucional habilitado.
  // El Tablero del Club queda protegido/siempre disponible y es el fallback seguro.
  // En modo demo se omite el guard para permitir recorrer todas las etapas.
  if (!demo.demoActive && !canSeePath(location.pathname)) {
    return <Navigate to="/club-dashboard" replace />;
  }

  // ── Modo demo: navegación simplificada + barra de recorrido + indicaciones ──
  if (demo.demoActive) {
    return (
      <SidebarCollapseContext.Provider value={{ collapsed: false, setCollapsed: () => {} }}>
        <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-zinc-950" style={demoThemeStyle}>
          <SessionTimeoutWatcher />
          <SessionExpiryBanner />

          <DemoSidebar />
          <DemoTopHeader />
          <DemoClubWatermark />

          <main className="relative z-10 min-h-screen w-full min-w-0 overflow-x-clip bg-transparent lg:pl-64">
            <div className="w-full min-w-0 max-w-[1920px] mx-auto p-4 pt-20 lg:p-6 lg:pt-20 2xl:p-8 2xl:pt-24">
              <PageErrorBoundary>
                <Outlet />
              </PageErrorBoundary>
            </div>
          </main>

          <DemoTourBar />
          <DemoHints />
          <DemoPageTour />
          <DemoTutorialCenter />
        </div>
      </SidebarCollapseContext.Provider>
    );
  }

  const clubThemeStyle = {
    "--club-primary": clubBrand?.colors?.primary || "#2563EB",
    "--club-primary-dark": clubBrand?.colors?.primaryDark || "#1D4ED8",
    "--club-secondary": clubBrand?.colors?.secondary || "#0EA5E9",
    "--club-accent": clubBrand?.colors?.accent || "#60A5FA",
  };

  return (
    <SidebarCollapseContext.Provider value={{ collapsed: false, setCollapsed: () => {} }}>
      <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-zinc-950" style={clubThemeStyle}>
        <SessionTimeoutWatcher />
        <SessionExpiryBanner />

        <Sidebar />
        <ClubTopHeader />
        <ClubWatermark />

        <main className="relative z-10 min-h-screen w-full min-w-0 overflow-x-clip bg-transparent lg:pl-64">
          <div className="mx-auto w-full min-w-0 max-w-[1920px] p-4 pt-20 lg:p-6 lg:pt-20 2xl:p-8 2xl:pt-24">
            <PageErrorBoundary>
              <Outlet />
            </PageErrorBoundary>
          </div>
        </main>
        </div>
        </SidebarCollapseContext.Provider>
        );
        }