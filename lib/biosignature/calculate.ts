import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";

type HealthDatum = Record<string, unknown>;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const getFirstNumber = (datum: HealthDatum, keys: string[]) => {
  for (const key of keys) {
    const value = getNumber(datum[key]);
    if (value !== 0) {
      return value;
    }
  }
  return 0;
};

const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const getWeekBounds = (weekStart: string) => {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
};

const normalizeToPercent = (value: number, min: number, max: number) => {
  if (max === min) {
    return 0;
  }
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
};

export async function calculateBiosignatureScore(
  userId: string,
  weekStart: string
): Promise<number> {
  const { start, end } = getWeekBounds(weekStart);
  const weekQuery = query(
    collection(db, "healthData"),
    where("userId", "==", userId),
    where("date", ">=", start),
    where("date", "<", end),
    orderBy("date", "asc")
  );

  const snapshot = await getDocs(weekQuery);
  const healthData = snapshot.docs.map((doc) => doc.data() as HealthDatum);

  if (!healthData.length) {
    return 0;
  }

  const sleepHours = healthData.map((datum) =>
    getFirstNumber(datum, ["sleepHours", "sleep", "sleepDuration"])
  );
  const sleepQuality = healthData.map((datum) =>
    getFirstNumber(datum, ["sleepQuality", "sleepScore", "sleepEfficiency"])
  );
  const hrvValues = healthData.map((datum) =>
    getFirstNumber(datum, ["hrv", "hrvAverage", "hrvScore"])
  );
  const recoveryValues = healthData.map((datum) =>
    getFirstNumber(datum, ["recoveryScore", "recovery", "readiness"])
  );
  const energyValues = healthData.map((datum) =>
    getFirstNumber(datum, ["energyLevel", "energyScore"])
  );
  const glucoseVariance = healthData.map((datum) =>
    getFirstNumber(datum, ["glucoseVariance", "glucoseStdDev", "glucoseStability"])
  );

  const sleepHoursAvg = average(sleepHours);
  const sleepQualityAvg = average(sleepQuality);
  const hrvAvg = average(hrvValues);
  const recoveryAvg = average(recoveryValues);
  const energyAvg = average(energyValues);
  const glucoseVarianceAvg = average(glucoseVariance);

  const sleepScore = clamp(
    normalizeToPercent(sleepHoursAvg, 4, 9) * 0.6 +
      normalizeToPercent(sleepQualityAvg, 50, 100) * 0.4,
    0,
    100
  );
  const hrvScore = normalizeToPercent(hrvAvg, 40, 120);
  const recoveryScore = clamp(recoveryAvg || 0, 0, 100);
  const energyScore = clamp(
    energyAvg || (100 - normalizeToPercent(glucoseVarianceAvg, 5, 35)),
    0,
    100
  );

  const activityDays = healthData.filter((datum) =>
    getFirstNumber(datum, ["activityMinutes", "activityCount", "workouts", "trainingLoad"])
  ).length;
  const activityConsistency = normalizeToPercent(activityDays, 0, 7);

  const score =
    sleepScore * 0.3 +
    hrvScore * 0.25 +
    recoveryScore * 0.2 +
    energyScore * 0.15 +
    activityConsistency * 0.1;

  return Math.round(clamp(score, 0, 100));
}

export async function generateInsights(
  _userId: string,
  healthData: any[]
): Promise<string[]> {
  const insights: string[] = [];

  const sleepEntries = healthData
    .map((datum) => ({
      sleepHours: getFirstNumber(datum, ["sleepHours", "sleep", "sleepDuration"]),
      hrv: getFirstNumber(datum, ["hrv", "hrvAverage", "hrvScore"]),
      energy: getFirstNumber(datum, ["energyLevel", "energyScore"]),
    }))
    .filter((entry) => entry.sleepHours > 0 && entry.hrv > 0);

  if (sleepEntries.length >= 3) {
    const longSleep = sleepEntries.filter((entry) => entry.sleepHours >= 8);
    const shortSleep = sleepEntries.filter((entry) => entry.sleepHours < 8);
    const longHrv = average(longSleep.map((entry) => entry.hrv));
    const shortHrv = average(shortSleep.map((entry) => entry.hrv));
    if (longHrv - shortHrv > 5) {
      insights.push("Your HRV peaks after 8+ hours of sleep.");
    }
  }

  const energyEntries = healthData
    .map((datum) => ({
      energy: getFirstNumber(datum, ["energyLevel", "energyScore"]),
      glucoseVar: getFirstNumber(datum, [
        "glucoseVariance",
        "glucoseStdDev",
        "glucoseStability",
      ]),
    }))
    .filter((entry) => entry.energy > 0 || entry.glucoseVar > 0);

  if (energyEntries.length >= 3) {
    const stableGlucose = energyEntries.filter((entry) => entry.glucoseVar > 0 && entry.glucoseVar < 15);
    if (stableGlucose.length) {
      insights.push("Stable glucose days align with stronger energy scores.");
    }
  }

  const workoutEntries = healthData
    .map((datum) => ({
      startHour: getFirstNumber(datum, ["workoutStartHour", "startHour"]),
      glucoseVar: getFirstNumber(datum, [
        "glucoseVariance",
        "glucoseStdDev",
        "glucoseStability",
      ]),
    }))
    .filter((entry) => entry.startHour > 0);

  if (workoutEntries.length >= 3) {
    const morningWorkouts = workoutEntries.filter((entry) => entry.startHour <= 10);
    if (morningWorkouts.length) {
      insights.push("Morning workouts correlate with steadier glucose trends.");
    }
  }

  if (!insights.length) {
    insights.push("Your biosignature is building momentum with consistent tracking.");
    insights.push("Keep logging sleep and recovery to unlock deeper insights.");
  }

  return insights.slice(0, 3);
}
