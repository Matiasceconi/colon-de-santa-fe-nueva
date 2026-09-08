import { base44 } from "@/api/base44Client";

export async function sendPrivateStaffInvitation({ accessId, email, staffName, sendEmail = true }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!accessId || !normalizedEmail) throw new Error("Faltan datos para enviar la invitación.");

  return base44.functions.invoke("send-staff-invitation", {
    accessId,
    email: normalizedEmail,
    staffName,
    sendEmail,
  });
}
