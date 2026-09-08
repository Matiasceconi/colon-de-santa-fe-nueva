import { base44 } from "@/api/base44Client";

function unwrap(response) {
  const data = response?.data ?? response;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function prepareSessionReport({ sessionId, sections, orientation, playerIds, chartMetrics }) {
  return unwrap(await base44.functions.invoke("manageReports", {
    operation: "prepare_session",
    session_id: sessionId,
    sections,
    orientation,
    player_ids: playerIds,
    chart_metrics: chartMetrics,
  }));
}

export async function listSessionReports(sessionId) {
  const data = unwrap(await base44.functions.invoke("manageReports", { operation: "list_session", session_id: sessionId }));
  return data?.reports || [];
}

export async function getReportRun(reportRunId) {
  return unwrap(await base44.functions.invoke("manageReports", { operation: "get", report_run_id: reportRunId }));
}

export async function finalizeReportArtifact(reportRunId, artifact) {
  return unwrap(await base44.functions.invoke("manageReports", { operation: "finalize", report_run_id: reportRunId, artifact }));
}

export async function saveReportAiSummary(reportRunId, summary, status = "edited") {
  return unwrap(await base44.functions.invoke("manageReports", { operation: "set_ai_summary", report_run_id: reportRunId, summary, status }));
}

export async function archiveReportRun(reportRunId) {
  return unwrap(await base44.functions.invoke("manageReports", { operation: "archive", report_run_id: reportRunId }));
}
