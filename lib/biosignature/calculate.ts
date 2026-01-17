import { getHealthDataRange } from "../firebase/firestore";
import type { HealthData } from "@/types";

export async function calculateBiosignature(userId: string, weekStart: string) {
  // Get 7 days of data starting from weekStart
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const healthData = await getHealthDataRange(
    userId,
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0]
  );

  if (healthData.length < 3) {
    throw new Error("Insufficient data for biosignature calculation");
  }

  // Calculate metrics
  const energy = calculateEnergyScore(healthData);
  const recovery = calculateRecoveryScore(healthData);
  const sleepQuality = calculateSleepQualityScore(healthData);
  const readiness = calculateReadinessScore(healthData);

  const overallScore = Math.round((energy + recovery + sleepQuality + readiness) / 4);

  const insights = generateInsights(healthData, { energy, recovery, sleepQuality, readiness });

  return {
    score: overallScore,
    metrics: {
      energy,
      recovery,
      sleepQuality,
      readiness,
    },
    insights,
  };
}

function calculateEnergyScore(data: HealthData[]): number {
  const avgSteps = data.reduce((sum, d) => sum + (d.steps || 0), 0) / data.length;
  const avgCalories = data.reduce((sum, d) => sum + (d.glucoseAvg || 100), 0) / data.length;

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
  const avgHRV = data.reduce((sum, d) => sum + (d.hrv || 0), 0) / data.filter((d) => d.hrv).length;
  const avgRestingHR =
    data.reduce((sum, d) => sum + (d.restingHR || 0), 0) / data.filter((d) => d.restingHR).length;

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
    data.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / data.filter((d) => d.sleepHours).length;
  const avgQuality =
    data.reduce((sum, d) => sum + (d.sleepQuality || 0), 0) / data.filter((d) => d.sleepQuality).length;

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

function generateInsights(data: HealthData[], metrics: any): string[] {
  const insights: string[] = [];

  const avgSleep =
    data.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / data.filter((d) => d.sleepHours).length;
  const avgHRV = data.reduce((sum, d) => sum + (d.hrv || 0), 0) / data.filter((d) => d.hrv).length;
  const avgSteps = data.reduce((sum, d) => sum + (d.steps || 0), 0) / data.length;

  // Sleep insights
  if (avgSleep < 7) {
    insights.push("Your sleep duration is below optimal. Aim for 7-9 hours per night for better recovery.");
  } else if (avgSleep >= 7 && avgSleep <= 9) {
    insights.push("Great sleep duration! You're hitting the optimal 7-9 hour range.");
  }

  // HRV insights
  if (avgHRV < 30) {
    insights.push("Your HRV is on the lower side. Consider stress management and recovery techniques.");
  } else if (avgHRV >= 60) {
    insights.push("Excellent HRV! Your body is showing strong recovery capacity.");
  }

  // Activity insights
  if (avgSteps < 5000) {
    insights.push("Try to increase daily movement. Even small increases in steps can boost energy.");
  } else if (avgSteps >= 10000) {
    insights.push("Fantastic activity levels! You're consistently hitting 10k+ steps.");
  }

  // Overall readiness
  if (metrics.readiness >= 80) {
    insights.push("Your body is showing high readiness. Great time for intense workouts.");
  } else if (metrics.readiness < 50) {
    insights.push("Consider lighter activity today. Your body may benefit from active recovery.");
  }

  return insights;
}
