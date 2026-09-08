import React from "react";
import ExternalGpsDashboard from "@/components/performance/dashboard/ExternalGpsDashboard";
import DemoExternalGps from "@/components/demo/DemoExternalGps";
import { useDemo } from "@/lib/DemoContext";

export default function PerformanceExternalLoad() {
  const { demoActive } = useDemo();
  return demoActive ? <DemoExternalGps /> : <ExternalGpsDashboard />;
}