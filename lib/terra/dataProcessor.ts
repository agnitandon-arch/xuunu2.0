import { saveBloodWork, saveHealthData } from '../firebase/firestore';
import { isTerraLabsEnabled } from '../featureFlags';
import type { BloodWorkData } from '../../types';

export async function processTerraWebhook(
  userId: string,
  type: string,
  data: any
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  if (type === 'labs') {
    if (!isTerraLabsEnabled()) {
      return;
    }

    if (data?.data?.biomarkers) {
      const testDate = data.data.test_date || today;
      await saveBloodWork(userId, testDate, {
        provider: normalizeLabProvider(data.provider),
        biomarkers: data.data.biomarkers,
        rawData: data,
      });
    }
    return;
  }

  let healthUpdate: any = {
    source: 'terra',
  };

  switch (type) {
    case 'daily':
      if (data.data) {
        healthUpdate.steps = data.data.steps || null;
        healthUpdate.restingHR = data.data.heart_rate?.avg_hr_bpm || null;
        healthUpdate.hrv = data.data.heart_rate?.avg_hrv_sdnn || null;
      }
      break;

    case 'sleep':
      if (data.data) {
        const durationSeconds = data.data.duration_asleep_state_seconds || 0;
        healthUpdate.sleepHours = durationSeconds / 3600;
        healthUpdate.sleepQuality = calculateSleepQuality(data.data);
      }
      break;

    case 'body':
      if (data.data) {
        const weightKg = data.data.weight_kg;
        if (weightKg) {
          healthUpdate.weightLbs = weightKg * 2.20462;
        }
      }
      break;

    case 'nutrition':
      if (data.data) {
        healthUpdate.glucoseFasting =
          data.data.glucose?.fasting_blood_glucose_mg_per_dL || null;
        healthUpdate.glucoseAvg =
          data.data.glucose?.avg_blood_glucose_mg_per_dL || null;
      }
      break;
  }

  healthUpdate.rawData = data;

  await saveHealthData(userId, today, healthUpdate);
}

function calculateSleepQuality(sleepData: any): number {
  const duration = (sleepData.duration_asleep_state_seconds || 0) / 3600;
  const efficiency = sleepData.efficiency_percentage || 0;

  let score = 0;

  if (duration >= 7 && duration <= 9) score += 50;
  else if (duration >= 6 && duration < 7) score += 35;
  else score += 20;

  score += Math.min(50, efficiency / 2);

  return Math.round(score);
}

function normalizeLabProvider(provider?: string): BloodWorkData['provider'] {
  const normalized = (provider || '').toLowerCase();
  if (normalized.includes('quest')) return 'quest';
  if (normalized.includes('labcorp')) return 'labcorp';
  if (normalized.includes('everlywell')) return 'everlywell';
  if (normalized.includes('letsgetchecked')) return 'letsgetchecked';
  return 'manual';
}
