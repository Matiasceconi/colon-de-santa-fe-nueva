// Deprecated compatibility shim.
// Provisioning authority is resolved from the authenticated platform role on the backend/workspace,
// never from a hardcoded email address in the client.
export function isProvisioningOwner() {
  return false;
}
