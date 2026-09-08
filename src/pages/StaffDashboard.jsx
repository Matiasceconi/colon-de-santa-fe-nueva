import React from "react";
import { useDemo } from "@/lib/DemoContext";
import DemoStaffDashboard from "@/components/demo/DemoStaffDashboard";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import DashboardBoard from "@/components/dashboard/DashboardBoard";
import { DEFAULT_STAFF_LAYOUT } from "@/lib/dashboardWidgets";

export default function StaffDashboard() {
  const { demoActive } = useDemo();
  if (demoActive) return <DemoStaffDashboard />;
  return (
    <DashboardDataProvider>
      <DashboardBoard
        dashboardType="staff"
        title="Tablero del Cuerpo Técnico"
        subtitle="Lo que el plantel activo necesita resolver hoy y su próximo compromiso."
        defaultLayout={DEFAULT_STAFF_LAYOUT}
        categories={["competition", "staff", "custom"]}
      />
    </DashboardDataProvider>
  );
}