import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

type HealthData = {
  sleepHours?: number;
  hrv?: number;
  recoveryScore?: number;
  glucoseFasting?: number;
  date?: string;
  [key: string]: unknown;
};

type CalculationSuccess = {
  status: "success";
  score: number;
  insights: string[];
  weekStartDate: string;
};

type CalculationInsufficient = {
  status: "insufficient-data";
  weekStartDate: string;
};

export type CalculationResult = CalculationSuccess | CalculationInsufficient;

export const MIN_DAYS_REQUIRED = 3;

export async function calculateBiosignatureForUser(
  userId: string,
): Promise<CalculationResult> {
  const weekStartDate = getWeekStartDate(new Date());

  const healthQuery = query(
    collection(db, "healthData"),
    where("userId", "==", userId),
    where("date", ">=", weekStartDate),
  );
  const healthSnap = await getDocs(healthQuery);
  const healthData = healthSnap.docs.map((document) => document.data() as HealthData);

  if (healthData.length < MIN_DAYS_REQUIRED) {
    return { status: "insufficient-data", weekStartDate };
  }

  const sleepScore = calculateSleepScore(healthData);
  const hrvScore = calculateHRVScore(healthData);
  const recoveryScore = calculateRecoveryScore(healthData);
  const energyScore = calculateEnergyScore(healthData);

  const overallScore = Math.round(
    sleepScore * 0.3 +
      hrvScore * 0.25 +
      recoveryScore * 0.25 +
      energyScore * 0.2,
  );

  const insights = await generateInsights(healthData);

  const biosignatureId = `${userId}_${weekStartDate}`;
  await setDoc(doc(db, "biosignatures", biosignatureId), {
    userId,
    weekStartDate,
    score: overallScore,
    metrics: {
      energy: energyScore,
      recovery: recoveryScore,
      sleepQuality: sleepScore,
      readiness: hrvScore,
    },
    insights,
    calculatedAt: new Date().toISOString(),
  });

  return {
    status: "success",
    score: overallScore,
    insights,
    weekStartDate,
  };
}

function calculateSleepScore(data: HealthData[]): number {
  const avgSleep = averageForKey(data, "sleepHours");
  if (avgSleep === null) {
    return 70;
  }

  if (avgSleep >= 7 && avgSleep <= 9) return 100;
  if (avgSleep >= 6 && avgSleep < 7) return 85;
  if (avgSleep >= 5 && avgSleep < 6) return 70;
  return 50;
}

function calculateHRVScore(data: HealthData[]): number {
  const avgHRV = averageForKey(data, "hrv");
  if (avgHRV === null) {
    return 70;
  }

  return clampScore(avgHRV);
}

function calculateRecoveryScore(data: HealthData[]): number {
  const avgRecovery = averageForKey(data, "recoveryScore");
  if (avgRecovery !== null) {
    return clampScore(avgRecovery);
  }

  return clampScore((calculateHRVScore(data) + calculateSleepScore(data)) / 2);
}

function calculateEnergyScore(data: HealthData[]): number {
  const avgGlucose = averageForKey(data, "glucoseFasting");
  if (avgGlucose === null) return 75;

  if (avgGlucose >= 70 && avgGlucose <= 100) return 100;
  if (avgGlucose > 100 && avgGlucose <= 110) return 85;
  if (avgGlucose > 110 && avgGlucose <= 125) return 70;
  return 50;
}

async function generateInsights(data: HealthData[]): Promise<string[]> {
  const insights: string[] = [];

  const avgSleep = averageForKey(data, "sleepHours");
  if (avgSleep !== null) {
    if (avgSleep >= 8) {
      insights.push(
        `Your sleep quality is excellent at ${avgSleep.toFixed(
          1,
        )}h average. This supports optimal recovery.`,
      );
    } else if (avgSleep < 7) {
      insights.push(
        `Your sleep average of ${avgSleep.toFixed(
          1,
        )}h is below optimal. Aim for 7-9 hours for better recovery.`,
      );
    }
  }

  const avgHRV = averageForKey(data, "hrv");
  if (avgHRV !== null) {
    insights.push(
      `Your HRV is averaging ${Math.round(avgHRV)}. ${
        avgHRV > 60 ? "Great recovery status!" : "Consider rest days to improve."
      }`,
    );
  }

  const avgGlucose = averageForKey(data, "glucoseFasting");
  if (avgGlucose !== null && avgGlucose <= 100) {
    insights.push(
      `Your fasting glucose is optimal at ${Math.round(
        avgGlucose,
      )} mg/dL. Energy levels should be stable.`,
    );
  }

  return insights.slice(0, 3);
}

function getWeekStartDate(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

function averageForKey(data: HealthData[], key: keyof HealthData): number | null {
  const values = data
    .map((entry) => normalizeNumber(entry[key]))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
