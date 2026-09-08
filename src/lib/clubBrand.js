// @deprecated Usar resolveInstitutionBrand() desde @/lib/clubBrandResolver o
// const { clubBrand } = useWorkspace() desde el contexto de React.
// CLUB_BRAND se conserva únicamente como respaldo temporal para PDFs que aún
// no reciben identidad por parámetro. No usar en componentes nuevos.
// @deprecated Usar resolveInstitutionBrand() desde @/lib/clubBrandResolver o
// const { clubBrand } = useWorkspace() desde el contexto de React.
// CLUB_BRAND es un respaldo NEUTRO deliberado: nunca debe atribuir la
// exportación a un club real. Si un PDF no recibe clubBrand, verá "Club".
export const CLUB_BRAND = {
  name: "Club",
  shortName: "CLUB",
  logoUrl: "",
  colors: {
    green: "#1E293B",
    greenDark: "#0F172A",
    greenDeep: "#0F172A",
    yellow: "#0EA5E9",
    yellowDark: "#0284C7",
    gold: "#0EA5E9",
    black: "#000000",
    white: "#FFFFFF",
    ink: "#111827",
    muted: "#6B7280",
    panel: "#F8FAFC",
    line: "#E2E8F0",
  },
};

// Branding genérico para el modo demo. No depende de ningún club real.
// Performance FC · PFC · colores PerformancePitch (azul + verde).
export const DEMO_CLUB_BRAND = {
  name: "Performance FC",
  shortName: "PFC",
  logoUrl: "",
  season: "2026",
  squadName: "Primera División",
  colors: {
    primary: "#1D4ED8",
    primaryDark: "#1E40AF",
    primaryDeep: "#1E3A8A",
    secondary: "#10B981",
    secondaryDark: "#059669",
    accent: "#3B82F6",
    accentDark: "#2563EB",
    ink: "#0F172A",
    muted: "#64748B",
    panel: "#09090B",
    line: "#27272A",
    white: "#FFFFFF",
    onPrimary: "#FFFFFF",
    onSecondary: "#FFFFFF",
    onAccent: "#FFFFFF",
    // Alias legacy para compatibilidad con PDFs
    green: "#1D4ED8",
    greenDark: "#1E40AF",
    greenDeep: "#1E3A8A",
    yellow: "#3B82F6",
    yellowDark: "#2563EB",
    gold: "#3B82F6",
    black: "#000000",
  },
};