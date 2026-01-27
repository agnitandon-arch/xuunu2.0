import { Capacitor, registerPlugin } from "@capacitor/core";

type HealthkitPlugin = {
  isAvailable: () => Promise<{ value?: boolean; available?: boolean }>;
  requestAuthorization: (options: { all?: string[]; read?: string[]; write?: string[] }) => Promise<void>;
  queryHKitSampleType: (options: {
    sampleName: string;
    startDate: Date;
    endDate: Date;
    limit: number;
  }) => Promise<{ countReturn: number; resultData: Array<Record<string, unknown>> }>;
};

const CapacitorHealthkit = registerPlugin<HealthkitPlugin>("CapacitorHealthkit");

export const isNativeIos = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export const connectAppleHealth = async () => {
  if (!isNativeIos()) {
    return { ok: false, reason: "not_ios" } as const;
  }
  try {
    const availability = await CapacitorHealthkit.isAvailable();
    const available =
      typeof availability?.value === "boolean"
        ? availability.value
        : availability?.available !== false;
    if (!available) {
      return { ok: false, reason: "unavailable" } as const;
    }
    await CapacitorHealthkit.requestAuthorization({
      read: ["steps", "distance", "duration", "calories", "activity"],
      write: [],
    });
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, reason: "failed", error } as const;
  }
};

const querySample = async (sampleName: string, startDate: Date, endDate: Date) => {
  const response = await CapacitorHealthkit.queryHKitSampleType({
    sampleName,
    startDate,
    endDate,
    limit: 0,
  });
  return Array.isArray(response?.resultData) ? response.resultData : [];
};

const sumNumeric = (items: Array<Record<string, unknown>>, key: string) =>
  items.reduce((total, item) => {
    const value = typeof item[key] === "number" ? item[key] : 0;
    return total + value;
  }, 0);

const averageNumeric = (items: Array<Record<string, unknown>>, key: string) => {
  const values = items
    .map((item) => (typeof item[key] === "number" ? item[key] : null))
    .filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const fetchAppleHealthSummary = async () => {
  if (!isNativeIos()) {
    return { ok: false, reason: "not_ios" } as const;
  }
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    const stepsSamples = await querySample("stepCount", startDate, endDate);
    const sleepSamples = await querySample("sleepAnalysis", startDate, endDate);
    let heartRateSamples: Array<Record<string, unknown>> = [];
    try {
      heartRateSamples = await querySample("heartRate", startDate, endDate);
    } catch {
      heartRateSamples = [];
    }

    const steps = Math.round(sumNumeric(stepsSamples, "value"));
    const sleepHours = sumNumeric(
      sleepSamples.filter((item) => item.sleepState === "Asleep"),
      "duration"
    );
    const heartRate = averageNumeric(heartRateSamples, "value");

    return {
      ok: true,
      data: {
        steps,
        sleepHours,
        heartRate: heartRate ?? undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    } as const;
  } catch (error) {
    return { ok: false, reason: "failed", error } as const;
  }
};
