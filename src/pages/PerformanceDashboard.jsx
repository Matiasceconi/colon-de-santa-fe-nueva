import React from "react";
import DemoPerformanceDashboard from "@/components/demo/DemoPerformanceDashboard";
import IntegratedPerformanceDashboard from "@/components/performance/dashboard/IntegratedPerformanceDashboard";
import { useDemo } from "@/lib/DemoContext";

export default function PerformanceDashboard() {
  const { demoActive } = useDemo();
  return demoActive ? <DemoPerformanceDashboard /> : <IntegratedPerformanceDashboard />;
}
