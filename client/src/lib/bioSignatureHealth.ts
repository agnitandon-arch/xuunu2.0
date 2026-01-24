export type HealthBand = 'optimal' | 'transitional' | 'poor';

export interface BioSignaturePatternConfig {
  density: number; // 0-1, how many dots are active
  symmetry: number; // 0-1, how organized the pattern is
  animationSpeed: number; // multiplier for animation
  colorIntensity: number; // 0-1, brightness of blue
  jitter: number; // 0-1, randomness in positioning
  band: HealthBand;
  score: number;
}

interface HealthMetrics {
  glucose: number;
  activity: number;
  recovery: number;
  strain: number;
  aqi: number;
  heartRate: number;
  sleep: number;
  challengeCompletion?: number;
}

/**
 * Normalize glucose to 0-100 scale
 * Optimal: 80-120 mg/dL
 * Poor: <70 or >180 mg/dL
 */
function normalizeGlucose(glucose: number): number {
  if (glucose >= 80 && glucose <= 120) return 100;
  if (glucose < 70) return Math.max(0, (glucose / 70) * 50);
  if (glucose > 180) return Math.max(0, 100 - ((glucose - 180) / 100) * 100);
  // Between 70-80 or 120-180
  if (glucose < 80) return 50 + ((glucose - 70) / 10) * 50;
  return 100 - ((glucose - 120) / 60) * 50;
}

/**
 * Normalize activity to 0-100 scale
 * Optimal: 7-12
 * Poor: <3 or >15
 */
function normalizeActivity(activity: number): number {
  if (activity >= 7 && activity <= 12) return 100;
  if (activity < 3) return (activity / 3) * 50;
  if (activity > 15) return Math.max(0, 100 - ((activity - 15) / 10) * 100);
  if (activity < 7) return 50 + ((activity - 3) / 4) * 50;
  return 100 - ((activity - 12) / 3) * 50;
}

/**
 * Normalize recovery to 0-100 scale
 * Optimal: >70%
 * Poor: <50%
 */
function normalizeRecovery(recovery: number): number {
  if (recovery >= 70) return 100;
  if (recovery < 50) return (recovery / 50) * 60;
  return 60 + ((recovery - 50) / 20) * 40;
}

/**
 * Normalize strain to 0-100 scale
 * Optimal: 8-14
 * Poor: <5 or >18
 */
function normalizeStrain(strain: number): number {
  if (strain >= 8 && strain <= 14) return 100;
  if (strain < 5) return (strain / 5) * 50;
  if (strain > 18) return Math.max(0, 100 - ((strain - 18) / 5) * 100);
  if (strain < 8) return 50 + ((strain - 5) / 3) * 50;
  return 100 - ((strain - 14) / 4) * 50;
}

/**
 * Normalize AQI to 0-100 scale
 * Optimal: <50 (Good)
 * Poor: >150 (Unhealthy)
 */
function normalizeAQI(aqi: number): number {
  if (aqi <= 50) return 100;
  if (aqi >= 150) return 0;
  return 100 - ((aqi - 50) / 100) * 100;
}

/**
 * Normalize heart rate to 0-100 scale
 * Optimal: 60-80 bpm (resting)
 * Poor: <50 or >100
 */
function normalizeHeartRate(heartRate: number): number {
  if (heartRate >= 60 && heartRate <= 80) return 100;
  if (heartRate < 50) return (heartRate / 50) * 50;
  if (heartRate > 100) return Math.max(0, 100 - ((heartRate - 100) / 50) * 100);
  if (heartRate < 60) return 50 + ((heartRate - 50) / 10) * 50;
  return 100 - ((heartRate - 80) / 20) * 50;
}

/**
 * Normalize sleep to 0-100 scale
 * Optimal: 7-9 hours
 * Poor: <5 or >10 hours
 */
function normalizeSleep(sleep: number): number {
  if (sleep >= 7 && sleep <= 9) return 100;
  if (sleep < 5) return (sleep / 5) * 50;
  if (sleep > 10) return Math.max(0, 100 - ((sleep - 10) / 4) * 100);
  if (sleep < 7) return 50 + ((sleep - 5) / 2) * 50;
  return 100 - ((sleep - 9) / 1) * 50;
}

/**
 * Normalize challenge completion (0-1 or 0-7 completions in last 7 days)
 */
function normalizeChallengeCompletion(completion?: number): number {
  if (typeof completion !== "number" || Number.isNaN(completion)) return 0;
  const normalized = completion > 1 ? Math.min(1, completion / 7) : Math.min(1, completion);
  return normalized * 100;
}

/**
 * Compute weighted health synergy score (0-100)
 */
export function computeHealthScore(metrics: HealthMetrics): number {
  const weights = {
    glucose: 0.16,
    recovery: 0.12,
    sleep: 0.10,
    aqi: 0.08,
    heartRate: 0.06,
    activity: 0.12,
    strain: 0.08,
    challengeCompletion: 0.08,
    stability: 0.10,
    environmentalQuality: 0.05,
    activityRecoveryBalance: 0.05,
  };

  const normalizedScores = {
    glucose: normalizeGlucose(metrics.glucose),
    activity: normalizeActivity(metrics.activity),
    recovery: normalizeRecovery(metrics.recovery),
    strain: normalizeStrain(metrics.strain),
    aqi: normalizeAQI(metrics.aqi),
    heartRate: normalizeHeartRate(metrics.heartRate),
    sleep: normalizeSleep(metrics.sleep),
    challengeCompletion: normalizeChallengeCompletion(metrics.challengeCompletion),
  };

  const healthMetricsStability =
    (normalizedScores.glucose + normalizedScores.heartRate + normalizedScores.sleep) / 3;
  const environmentalQuality = normalizedScores.aqi;
  const activityRecoveryBalance = Math.max(
    0,
    Math.min(
      100,
      (normalizedScores.activity + normalizedScores.recovery) / 2 -
        normalizedScores.strain * 0.35
    )
  );

  const weightedScore =
    normalizedScores.glucose * weights.glucose +
    normalizedScores.recovery * weights.recovery +
    normalizedScores.sleep * weights.sleep +
    normalizedScores.aqi * weights.aqi +
    normalizedScores.heartRate * weights.heartRate +
    normalizedScores.activity * weights.activity +
    normalizedScores.strain * weights.strain +
    normalizedScores.challengeCompletion * weights.challengeCompletion +
    healthMetricsStability * weights.stability +
    environmentalQuality * weights.environmentalQuality +
    activityRecoveryBalance * weights.activityRecoveryBalance;

  return Math.round(weightedScore);
}

/**
 * Determine health band from score
 */
export function getHealthBand(score: number): HealthBand {
  if (score >= 75) return 'optimal';
  if (score >= 40) return 'transitional';
  return 'poor';
}

/**
 * Get pattern configuration based on health score
 */
export function getPatternConfig(metrics: HealthMetrics): BioSignaturePatternConfig {
  const score = computeHealthScore(metrics);
  const band = getHealthBand(score);

  // Optimal: concentric lattice, high density, synchronized, bright
  if (band === 'optimal') {
    return {
      density: 0.85 + (score - 75) / 100, // 0.85-1.0
      symmetry: 0.95,
      animationSpeed: 1.0,
      colorIntensity: 0.9 + (score - 75) / 250, // 0.9-1.0
      jitter: 0.05,
      band,
      score,
    };
  }

  // Transitional: offset lattice, medium density, moderate jitter
  if (band === 'transitional') {
    const normalizedScore = (score - 40) / 35; // 0-1 within transitional range
    return {
      density: 0.5 + normalizedScore * 0.35, // 0.5-0.85
      symmetry: 0.6 + normalizedScore * 0.35, // 0.6-0.95
      animationSpeed: 0.7 + normalizedScore * 0.3, // 0.7-1.0
      colorIntensity: 0.6 + normalizedScore * 0.3, // 0.6-0.9
      jitter: 0.3 - normalizedScore * 0.25, // 0.3-0.05
      band,
      score,
    };
  }

  // Poor: fractured clusters, sparse, slow erratic, desaturated
  return {
    density: 0.2 + (score / 40) * 0.3, // 0.2-0.5
    symmetry: 0.2 + (score / 40) * 0.4, // 0.2-0.6
    animationSpeed: 0.3 + (score / 40) * 0.4, // 0.3-0.7
    colorIntensity: 0.3 + (score / 40) * 0.3, // 0.3-0.6
    jitter: 0.7 - (score / 40) * 0.4, // 0.7-0.3
    band,
    score,
  };
}

/**
 * Get ideal pattern configuration for reference
 */
export function getIdealPatternConfig(): BioSignaturePatternConfig {
  return {
    density: 1.0,
    symmetry: 1.0,
    animationSpeed: 1.0,
    colorIntensity: 1.0,
    jitter: 0.0,
    band: 'optimal',
    score: 100,
  };
}

/**
 * Get guidance text for ideal health pattern
 */
export function getIdealPatternGuidance(): string {
  return `The ideal Bio SYGnature shows a highly organized, concentric lattice pattern with synchronized oscillation. This represents optimal health balance:

• Health Metrics Stability: steady glucose, heart rate, and sleep rhythm
• Environmental Quality: AQI <50 (clean air)
• Activity-Recovery Balance: movement matched with recovery
• Glucose: 80-120 mg/dL (stable blood sugar)
• Recovery: >70% (excellent recuperation)
• Sleep: 7-9 hours (restorative rest)
• Heart Rate: 60-80 bpm (healthy resting rate)
• Activity: 7-12 (balanced movement)
• Strain: 8-14 (moderate exertion)
• Challenges: 3-7 completions/week (consistent follow-through)

When all metrics align within optimal ranges, the Bio SYGnature becomes bright, dense, and symmetrical - reflecting strong environmental and recovery synergy.`;
}
