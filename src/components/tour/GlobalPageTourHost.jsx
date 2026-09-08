import React from "react";
import { useLocation } from "react-router-dom";
import PageTour from "@/components/tour/PageTour";
import { resolveGlobalTour } from "@/lib/globalPageTours";

export default function GlobalPageTourHost() {
  const location = useLocation();
  const tour = resolveGlobalTour(location.pathname);
  if (!tour?.steps?.length) return null;

  return (
    <PageTour
      key={`${tour.key}:${location.pathname}`}
      pageKey={`global-${tour.key}-v1`}
      steps={tour.steps}
      autoStart={false}
    />
  );
}
