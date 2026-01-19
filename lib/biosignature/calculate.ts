import { getBloodWorkHistory, getHealthDataRange } from "../firebase/firestore";
import type { BloodWorkData, HealthData } from "../../types";

export async function calculateBiosignature(userId: string, weekStart: string) {
  // Get 7 days of data starting from weekStart
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const [healthData, bloodWork] = await Promise.all([
    getHealthDataRange(
      userId,
      startDate.toISOString().split("T")[0],
      endDate.toISOString().split("T")[0]
    ),
    getBloodWorkHistory(userId).catch(() => [] as BloodWorkData[]),
  ]);

  if (healthData.length < 3) {
    throw new Error("Insufficient data for biosignature calculation");
  }

  // Calculate metrics
  const energy = calculateEnergyScore(healthData);
  const recovery = calculateRecoveryScore(healthData);
  const sleepQuality = calculateSleepQualityScore(healthData);
  const readiness = calculateReadinessScore(healthData);
  const metabolic = calculateMetabolicScore(bloodWork);

  const overallScore = Math.round(
    (energy + recovery + sleepQuality + readiness + metabolic) / 5
  );

  const insights = generateLegacyInsights(healthData, {
    energy,
    recovery,
    sleepQuality,
    readiness,
    metabolic,
  });

  return {
    score: overallScore,
    metrics: {
      energy,
      recovery,
      sleepQuality,
      readiness,
      metabolic,
    },
    insights,
  };
}

export async function calculateBiosignatureScore(
  userId: string,
  weekStart: string
): Promise<number> {
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const healthData = await getHealthDataRange(
    userId,
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0]
  );

  if (healthData.length === 0) {
    return 0;
  }

  const sleepScore = calculateSleepCompositeScore(healthData);
  const hrvScore = calculateHRVCompositeScore(healthData);
  const recoveryScore = calculateRecoveryCompositeScore(healthData);
  const energyScore = calculateEnergyCompositeScore(healthData);
  const activityScore = calculateActivityConsistencyScore(healthData);

  const weightedScore =
    sleepScore * 0.3 +
    hrvScore * 0.25 +
    recoveryScore * 0.2 +
    energyScore * 0.15 +
    activityScore * 0.1;

  return clampScore(weightedScore);
}

export async function generateInsights(
  userId: string,
  healthData: HealthData[]
): Promise<string[]> {
  const insights: string[] = [];
  if (!healthData.length) {
    return [
      "We need a few more days of data to generate insights.",
      "Log sleep, HRV, and glucose to personalize your biosignature.",
    ];
  }

  const avgSleep = averageForKey(healthData, "sleepHours");
  const avgHRV = averageForKey(healthData, "hrv");
  const avgGlucose =
    averageForKey(healthData, "glucoseFasting") ??
    averageForKey(healthData, "glucoseAvg");
  const avgSteps = averageForKey(healthData, "steps");

  if (avgSleep !== null) {
    insights.push(
      avgSleep >= 8
        ? "Your sleep is trending above 8 hours, which supports stronger recovery."
        : "Your sleep average is below 8 hours. Prioritize consistent bedtimes for recovery."
    );
  }

  if (avgHRV !== null) {
    insights.push(
      avgHRV >= 60
        ? "Your HRV remains strong this week, indicating good readiness."
        : "HRV is trending lower—consider lighter training on low-readiness days."
    );
  }

  const stepCorrelation = compareHighLow(
    healthData,
    "steps",
    "glucoseFasting"
  );
  if (stepCorrelation) {
    insights.push(stepCorrelation);
  } else if (avgGlucose !== null) {
    insights.push(
      avgGlucose <= 100
        ? "Your glucose stability is solid—keep building on this routine."
        : "Glucose stability is mixed; steady meals and movement can improve it."
    );
  }

  return insights.slice(0, 3);
}

function calculateEnergyScore(data: HealthData[]): number {
  const avgSteps = data.reduce((sum, d) => sum + (d.steps || 0), 0) / data.length;
  const avgCalories =
    data.reduce((sum, d) => sum + (d.glucoseAvg || 100), 0) / data.length;

  let score = 0;

  // Steps scoring
  if (avgSteps >= 10000) score += 50;
  else if (avgSteps >= 7000) score += 40;
  else if (avgSteps >= 5000) score += 30;
  else score += 20;

  // Glucose stability scoring
  if (avgCalories >= 80 && avgCalories <= 120) score += 50;
  else if (avgCalories >= 70 && avgCalories <= 140) score += 35;
  else score += 20;

  return Math.min(100, score);
}

function calculateRecoveryScore(data: HealthData[]): number {
  const avgHRV =
    data.reduce((sum, d) => sum + (d.hrv || 0), 0) /
    data.filter((d) => d.hrv).length;
  const avgRestingHR =
    data.reduce((sum, d) => sum + (d.restingHR || 0), 0) /
    data.filter((d) => d.restingHR).length;

  let score = 0;

  // HRV scoring (higher is better)
  if (avgHRV >= 60) score += 50;
  else if (avgHRV >= 40) score += 40;
  else if (avgHRV >= 20) score += 30;
  else score += 20;

  // Resting HR scoring (lower is better)
  if (avgRestingHR <= 60) score += 50;
  else if (avgRestingHR <= 70) score += 40;
  else if (avgRestingHR <= 80) score += 30;
  else score += 20;

  return Math.min(100, score);
}

function calculateSleepQualityScore(data: HealthData[]): number {
  const avgSleep =
    data.reduce((sum, d) => sum + (d.sleepHours || 0), 0) /
    data.filter((d) => d.sleepHours).length;
  const avgQuality =
    data.reduce((sum, d) => sum + (d.sleepQuality || 0), 0) /
    data.filter((d) => d.sleepQuality).length;

  let score = 0;

  // Duration scoring
  if (avgSleep >= 7 && avgSleep <= 9) score += 50;
  else if (avgSleep >= 6 && avgSleep < 7) score += 35;
  else score += 20;

  // Quality scoring
  if (avgQuality >= 80) score += 50;
  else if (avgQuality >= 60) score += 35;
  else score += 20;

  return Math.min(100, score);
}

function calculateReadinessScore(data: HealthData[]): number {
  const avgRecovery =
    data.reduce((sum, d) => sum + (d.recoveryScore || 0), 0) /
    data.filter((d) => d.recoveryScore).length;

  if (avgRecovery >= 80) return 90;
  if (avgRecovery >= 60) return 70;
  if (avgRecovery >= 40) return 50;
  return 30;
}

export function calculateMetabolicScore(bloodWork: BloodWorkData[]): number {
  if (bloodWork.length === 0) return 50;

  const latest = bloodWork[0];
  const biomarkers = latest.biomarkers || {};
  let score = 0;
  let possible = 0;

  if (typeof biomarkers.hba1c === "number") {
    possible += 25;
    if (biomarkers.hba1c < 5.7) score += 25;
    else if (biomarkers.hba1c < 6.5) score += 15;
    else score += 5;
  }

  if (typeof biomarkers.ldlCholesterol === "number") {
    possible += 25;
    if (biomarkers.ldlCholesterol < 100) score += 25;
    else if (biomarkers.ldlCholesterol < 130) score += 15;
    else score += 5;
  }

  if (typeof biomarkers.hdlCholesterol === "number") {
    possible += 15;
    if (biomarkers.hdlCholesterol >= 60) score += 15;
    else if (biomarkers.hdlCholesterol >= 40) score += 10;
    else score += 5;
  }

  if (typeof biomarkers.triglycerides === "number") {
    possible += 15;
    if (biomarkers.triglycerides < 150) score += 15;
    else if (biomarkers.triglycerides < 200) score += 10;
    else score += 5;
  }

  if (typeof biomarkers.crp === "number") {
    possible += 10;
    if (biomarkers.crp < 1) score += 10;
    else if (biomarkers.crp < 3) score += 6;
    else score += 3;
  }

  if (possible === 0) return 50;

  return Math.min(100, Math.round((score / possible) * 100));
}

function generateLegacyInsights(data: HealthData[], metrics: any): string[] {
  const insights: string[] = [];

  const avgSleep =
    data.reduce((sum, d) => sum + (d.sleepHours || 0), 0) /
    data.filter((d) => d.sleepHours).length;
  const avgHRV =
    data.reduce((sum, d) => sum + (d.hrv || 0), 0) /
    data.filter((d) => d.hrv).length;
  const avgSteps = data.reduce((sum, d) => sum + (d.steps || 0), 0) / data.length;

  // Sleep insights
  if (avgSleep < 7) {
    insights.push(
      "Your sleep duration is below optimal. Aim for 7-9 hours per night for better recovery."
    );
  } else if (avgSleep >= 7 && avgSleep <= 9) {
    insights.push(
      "Great sleep duration! You're hitting the optimal 7-9 hour range."
    );
  }

  // HRV insights
  if (avgHRV < 30) {
    insights.push(
      "Your HRV is on the lower side. Consider stress management and recovery techniques."
    );
  } else if (avgHRV >= 60) {
    insights.push(
      "Excellent HRV! Your body is showing strong recovery capacity."
    );
  }

  // Activity insights
  if (avgSteps < 5000) {
    insights.push(
      "Try to increase daily movement. Even small increases in steps can boost energy."
    );
  } else if (avgSteps >= 10000) {
    insights.push(
      "Fantastic activity levels! You're consistently hitting 10k+ steps."
    );
  }

  // Overall readiness
  if (metrics.readiness >= 80) {
    insights.push("Your body is showing high readiness. Great time for intense workouts.");
  } else if (metrics.readiness < 50) {
    insights.push("Consider lighter activity today. Your body may benefit from active recovery.");
  }

  return insights;
}

function averageForKey(
  data: HealthData[],
  key: keyof HealthData
): number | null {
  const values = data
    .map((entry) => normalizeNumber(entry[key]))
    .filter((value): value is number => value !== null);

  if (!values.length) {
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

function calculateSleepCompositeScore(data: HealthData[]): number {
  const avgSleep = averageForKey(data, "sleepHours");
  const avgQuality = averageForKey(data, "sleepQuality");

  if (avgSleep === null && avgQuality === null) return 50;

  const durationScore =
    avgSleep === null
      ? 50
      : avgSleep >= 8
      ? 100
      : avgSleep >= 7
      ? 85
      : avgSleep >= 6
      ? 70
      : 50;

  const qualityScore =
    avgQuality === null
      ? 50
      : avgQuality >= 85
      ? 100
      : avgQuality >= 70
      ? 85
      : avgQuality >= 55
      ? 70
      : 50;

  return clampScore(durationScore * 0.6 + qualityScore * 0.4);
}

function calculateHRVCompositeScore(data: HealthData[]): number {
  const avgHRV = averageForKey(data, "hrv");
  if (avgHRV === null) return 50;
  return clampScore(avgHRV);
}

function calculateRecoveryCompositeScore(data: HealthData[]): number {
  const avgRecovery = averageForKey(data, "recoveryScore");
  if (avgRecovery !== null) return clampScore(avgRecovery);
  return clampScore(
    (calculateHRVCompositeScore(data) + calculateSleepCompositeScore(data)) / 2
  );
}

function calculateEnergyCompositeScore(data: HealthData[]): number {
  const avgGlucose =
    averageForKey(data, "glucoseFasting") ?? averageForKey(data, "glucoseAvg");
  if (avgGlucose === null) return 60;

  if (avgGlucose >= 70 && avgGlucose <= 100) return 100;
  if (avgGlucose > 100 && avgGlucose <= 115) return 85;
  if (avgGlucose > 115 && avgGlucose <= 130) return 70;
  return 50;
}

function calculateActivityConsistencyScore(data: HealthData[]): number {
  const avgSteps = averageForKey(data, "steps");
  if (avgSteps === null) return 50;

  if (avgSteps >= 12000) return 100;
  if (avgSteps >= 9000) return 85;
  if (avgSteps >= 6000) return 70;
  return 50;
}

function compareHighLow(
  data: HealthData[],
  driverKey: keyof HealthData,
  outcomeKey: keyof HealthData
): string | null {
  const entries = data
    .map((entry) => ({
      driver: normalizeNumber(entry[driverKey]),
      outcome: normalizeNumber(entry[outcomeKey]),
    }))
    .filter((entry) => entry.driver !== null && entry.outcome !== null);

  if (entries.length < 4) return null;

  const medianDriver =
    entries.map((entry) => entry.driver as number).sort((a, b) => a - b)[
      Math.floor(entries.length / 2)
    ];

  const high = entries.filter((entry) => (entry.driver as number) >= medianDriver);
  const low = entries.filter((entry) => (entry.driver as number) < medianDriver);

  const avgHigh =
    high.reduce((sum, entry) => sum + (entry.outcome as number), 0) / high.length;
  const avgLow =
    low.reduce((sum, entry) => sum + (entry.outcome as number), 0) / low.length;

  if (!Number.isFinite(avgHigh) || !Number.isFinite(avgLow)) return null;

  if (avgHigh < avgLow - 5) {
    return "Higher activity days align with better glucose stability.";
  }

  if (avgHigh > avgLow + 5) {
    return "Lower activity days align with steadier glucose readings.";
  }

  return null;
}
