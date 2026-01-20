import {
  createEnvironmentalReading,
  createHealthEntry,
  createMedication,
  createMedicationLog,
  deleteMedication,
  getBioSignatureSnapshots,
  getEnvironmentalReadings,
  getHealthEntries,
  getLatestEnvironmentalReading,
  getLatestHealthEntry,
  getMedicationLogs,
  getMedications,
  updateMedication,
} from "./localStore";

type LocalRequest = {
  method: string;
  url: string;
  data?: unknown;
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status = 400) =>
  jsonResponse({ error: message }, status);

const getUserId = (searchParams: URLSearchParams, body?: any) =>
  searchParams.get("userId") || body?.userId || "";

const buildInsights = (healthData: any, snapshots: any[]) => {
  const insights: string[] = [];
  if (healthData?.sleep) {
    insights.push(
      healthData.sleep >= 7
        ? "Sleep duration is on track this week."
        : "Aim for an extra 30-60 minutes of sleep to boost recovery."
    );
  }
  if (healthData?.glucose) {
    insights.push(
      healthData.glucose <= 120
        ? "Glucose stability is trending well."
        : "Try a short walk after meals to smooth glucose spikes."
    );
  }
  if (snapshots.length > 0) {
    insights.push("Your 7-day pattern is improving compared to last week.");
  } else {
    insights.push("Keep logging to unlock richer biosignature insights.");
  }
  return insights.slice(0, 3).join(" ");
};

export async function handleLocalApi({ method, url, data }: LocalRequest) {
  if (!url.startsWith("/api/")) return null;

  const parsed = new URL(url, "http://localhost");
  const path = parsed.pathname;
  const searchParams = parsed.searchParams;
  const body = (data ?? {}) as Record<string, any>;
  const verb = method.toUpperCase();

  if (path === "/api/users/sync" && verb === "POST") {
    if (!body.id) return errorResponse("id is required");
    return jsonResponse({
      id: body.id,
      email: body.email || "",
      username: body.email ? body.email.split("@")[0] : "user",
    });
  }

  if (path === "/api/health-entries" && verb === "GET") {
    const userId = getUserId(searchParams);
    if (!userId) return errorResponse("userId is required");
    const limit = searchParams.get("limit");
    return jsonResponse(getHealthEntries(userId, limit ? Number(limit) : undefined));
  }

  if (path === "/api/health-entries/latest" && verb === "GET") {
    const userId = getUserId(searchParams);
    if (!userId) return errorResponse("userId is required");
    return jsonResponse(getLatestHealthEntry(userId));
  }

  if (path === "/api/health-entries" && verb === "POST") {
    const userId = getUserId(searchParams, body);
    if (!userId) return errorResponse("userId is required");
    return jsonResponse(createHealthEntry({ ...body, userId }));
  }

  if (path === "/api/environmental-readings/latest" && verb === "GET") {
    const userId = getUserId(searchParams);
    if (!userId) return errorResponse("userId is required");
    return jsonResponse(getLatestEnvironmentalReading(userId));
  }

  if (path === "/api/environmental-readings" && verb === "POST") {
    const userId = getUserId(searchParams, body);
    if (!userId) return errorResponse("userId is required");
    return jsonResponse(createEnvironmentalReading({ ...body, userId }));
  }

  if (path === "/api/medications" && verb === "GET") {
    const userId = getUserId(searchParams);
    if (!userId) return errorResponse("userId is required");
    return jsonResponse(getMedications(userId));
  }

  if (path === "/api/medications" && verb === "POST") {
    const userId = getUserId(searchParams, body);
    if (!userId) return errorResponse("userId is required");
    return jsonResponse(
      createMedication({
        userId,
        name: body.name,
        dosage: body.dosage,
        frequency: body.frequency,
        scheduledTimes: body.scheduledTimes || [],
        notes: body.notes,
        isActive: 1,
      })
    );
  }

  if (path.startsWith("/api/medications/") && verb === "DELETE") {
    const userId = getUserId(searchParams, body);
    const id = path.split("/")[3];
    if (!userId || !id) return errorResponse("userId and id are required");
    deleteMedication(userId, id);
    return jsonResponse({ success: true });
  }

  if (path.startsWith("/api/medications/") && verb === "PATCH") {
    const userId = getUserId(searchParams, body);
    const id = path.split("/")[3];
    if (!userId || !id) return errorResponse("userId and id are required");
    return jsonResponse(updateMedication(userId, id, body));
  }

  if (path === "/api/medication-logs" && verb === "GET") {
    const userId = getUserId(searchParams);
    if (!userId) return errorResponse("userId is required");
    return jsonResponse(
      getMedicationLogs(
        userId,
        searchParams.get("medicationId") || undefined,
        searchParams.get("startDate") || undefined,
        searchParams.get("endDate") || undefined
      )
    );
  }

  if (path === "/api/medication-logs" && verb === "POST") {
    const userId = getUserId(searchParams, body);
    if (!userId) return errorResponse("userId is required");
    return jsonResponse(
      createMedicationLog({
        userId,
        medicationId: body.medicationId,
        takenAt: body.takenAt || new Date().toISOString(),
        scheduledTime: body.scheduledTime,
        notes: body.notes,
      })
    );
  }

  if (path === "/api/bio-signature/history" && verb === "GET") {
    const userId = getUserId(searchParams);
    if (!userId) return errorResponse("userId is required");
    const limit = searchParams.get("limit");
    return jsonResponse(getBioSignatureSnapshots(userId, limit ? Number(limit) : undefined));
  }

  if (path === "/api/bio-signature/insights" && verb === "POST") {
    const userId = getUserId(searchParams, body);
    if (!userId) return errorResponse("userId is required");
    const insights = buildInsights(body.currentData, body.historicalSnapshots || []);
    return jsonResponse({ insights });
  }

  return null;
}
