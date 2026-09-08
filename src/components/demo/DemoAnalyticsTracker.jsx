import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useDemo } from "@/lib/DemoContext";
import { trackDemoEvent } from "@/lib/demoAnalytics";

export default function DemoAnalyticsTracker() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { demoActive } = useDemo();
  const lastPath = useRef("");

  useEffect(() => {
    const isDemoPath = location.pathname === "/demo" || location.pathname.startsWith("/demo/");
    if (!isAuthenticated || (!demoActive && !isDemoPath)) return;
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    trackDemoEvent(location.pathname === "/demo" ? "demo_entered" : "demo_page_view", {}, location.pathname);
  }, [demoActive, isAuthenticated, location.pathname]);

  return null;
}
