import { base44 } from "@/api/base44Client";

function unwrap(response) { return response?.data ?? response; }

export async function scoutingGateway(action, payload = {}) {
  try {
    const response = await base44.functions.invoke("scoutingGateway", { action, ...payload });
    const data = unwrap(response);
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (error) {
    throw new Error(error?.response?.data?.error || error?.data?.error || error?.message || "Error en Scouting");
  }
}

export const scoutingOverview = () => scoutingGateway("overview");
export const scoutingExecutive = () => scoutingGateway("executive_dashboard");
export const scoutingCalendar = () => scoutingGateway("calendar");
export const scoutingMatching = (needId) => scoutingGateway("matching", { need_id: needId });
export const scoutingComparison = (prospectIds, currentPlayerIds = []) => scoutingGateway("comparison", { prospect_ids: prospectIds, current_player_ids: currentPlayerIds });
export const scoutingProspectDetail = (prospectId) => scoutingGateway("prospect_detail", { prospect_id: prospectId });
