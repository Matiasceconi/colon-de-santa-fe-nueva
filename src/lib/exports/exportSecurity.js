export function normalizeExportPermissionPath(pathname = "") {
  const path = String(pathname || "").split(/[?#]/)[0].replace(/\/$/, "");
  if (/^\/matches\/[^/]+/.test(path)) return "/matches";
  if (/^\/tactical\//.test(path)) return "/tactical";
  if (/^\/sessions\//.test(path)) return "/sessions";
  if (path === "/gps") return "/gps";
  return path || null;
}

export function canExportPath(can, pathname) {
  if (typeof can !== "function") return false;
  return !!can("export", normalizeExportPermissionPath(pathname));
}

export function assertExportAllowed(can, pathname) {
  if (!canExportPath(can, pathname)) {
    const error = new Error("No tenés permiso para exportar información de este módulo.");
    error.code = "EXPORT_FORBIDDEN";
    throw error;
  }
  return true;
}
