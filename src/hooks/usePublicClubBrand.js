import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export const DEFAULT_PUBLIC_BRAND = {
  club_name: "Portal del Club",
  short_name: "Club",
  logo_url: "",
  primary_color: "#2563EB",
  accent_color: "#60A5FA",
  support_email: "",
};

export function usePublicClubBrand() {
  const [brand, setBrand] = useState(DEFAULT_PUBLIC_BRAND);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    base44.entities.PublicClubBrand.filter({ active: true }, "-updated_at", 1)
      .then((rows) => {
        if (mounted && rows?.[0]) setBrand({ ...DEFAULT_PUBLIC_BRAND, ...rows[0] });
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return { brand, loading };
}
