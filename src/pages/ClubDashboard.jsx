import React from "react";
import { useDemo } from "@/lib/DemoContext";
import DemoClubDashboard from "@/components/demo/DemoClubDashboard";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import DashboardBoard from "@/components/dashboard/DashboardBoard";
import PageTour from "@/components/tour/PageTour";
import { CLUB_DASHBOARD_TOUR } from "@/lib/pageTours";

export default function ClubDashboard() {
  const { demoActive } = useDemo();
  if (demoActive) return <DemoClubDashboard />;
  return (
    <DashboardDataProvider>
      <DashboardBoard
        dashboardType="club"
        title="Tablero del Club"
        subtitle="Posición institucional, próximos compromisos y panorama competitivo de todos los planteles."
        categories={["competition", "custom"]}
      />
      <PageTour pageKey="club-dashboard" steps={CLUB_DASHBOARD_TOUR} autoStart />
    </DashboardDataProvider>
  );
}