import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { uniqueOptionLabels } from "@/lib/sportsStructure";

export default function useInstitutionStructureOptions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    base44.entities.InstitutionOption.list("order", 500)
      .then((result) => { if (mounted) setRows(result || []); })
      .catch(() => { if (mounted) setRows([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return useMemo(() => {
    const group = (name) => uniqueOptionLabels(rows.filter((row) => row.group === name));
    const positionOptions = group("player_position");
    return {
      loading,
      rows,
      seasons: group("season").map((row) => row.label),
      categories: group("player_category").map((row) => row.label),
      positionOptions,
      positions: positionOptions.map((row) => row.label),
    };
  }, [rows, loading]);
}
