// User Profile
export interface UserProfile {
  id: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  favoriteActivities: string[];
  stats: {
    totalActivities: number;
    followers: number;
    following: number;
    currentStreak: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Activity Types
export type ActivityType =
  | 'run'
  | 'lift'
  | 'cycle'
  | 'swim'
  | 'yoga'
  | 'hike'
  | 'walk'
  | 'other';

export interface ActivityMetrics {
  // Running/Cycling
  pace?: string;
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevation?: number;

  // Strength
  sets?: number;
  reps?: number;
  weight?: number;

  // General
  [key: string]: any;
}

export interface HealthContext {
  sleepHours?: number;
  hrv?: number;
  glucose?: number;
  recoveryScore?: number;
}

export interface Activity {
  id: string;
  userId: string;
  activityType: ActivityType;
  title: string;
  description: string;
  durationMinutes: number;
  distanceMiles?: number;
  calories?: number;
  gpsData?: {
    route: Array<{ lat: number; lng: number }>;
    bounds?: any;
  };
  photos: string[];
  metrics: ActivityMetrics;
  healthContext: HealthContext;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  visibility: 'public' | 'followers' | 'private';
}

// Health Data
export interface HealthData {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  sleepHours?: number;
  sleepQuality?: number;
  hrv?: number;
  restingHR?: number;
  glucoseFasting?: number;
  glucoseAvg?: number;
  weightLbs?: number;
  recoveryScore?: number;
  steps?: number;
  source: 'manual' | 'terra' | 'import';
  rawData?: any;
  updatedAt: string;
}

// Blood Work
export interface BloodWorkData {
  id: string;
  userId: string;
  testDate: string; // YYYY-MM-DD
  provider: 'quest' | 'labcorp' | 'everlywell' | 'letsgetchecked' | 'manual';
  biomarkers: {
    // Lipid Panel
    ldlCholesterol?: number;
    hdlCholesterol?: number;
    totalCholesterol?: number;
    triglycerides?: number;

    // Glucose/Diabetes
    glucoseFasting?: number;
    hba1c?: number;

    // Liver Function
    alt?: number;
    ast?: number;

    // Kidney Function
    creatinine?: number;
    bun?: number;

    // Vitamins
    vitaminD?: number;
    vitaminB12?: number;
    iron?: number;
    ferritin?: number;

    // Hormones
    testosterone?: number;
    thyroidTSH?: number;
    cortisol?: number;

    // Complete Blood Count
    wbc?: number;
    rbc?: number;
    hemoglobin?: number;
    hematocrit?: number;

    // Inflammation
    crp?: number;

    // Other
    [key: string]: number | undefined;
  };
  rawData?: any;
  createdAt: string;
}

// Biosignature
export interface Biosignature {
  id: string;
  userId: string;
  weekStartDate: string;
  score: number;
  metrics: {
    energy: number;
    recovery: number;
    sleepQuality: number;
    readiness: number;
    metabolic?: number;
  };
  insights: string[];
  calculatedAt: string;
}

// Social
export interface ActivityLike {
  id: string;
  activityId: string;
  userId: string;
  createdAt: string;
}

export interface ActivityComment {
  id: string;
  activityId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

// Terra API Types
export interface TerraWebhookPayload {
  user: {
    user_id: string;
    provider: string;
  };
  type: 'daily' | 'sleep' | 'body' | 'nutrition' | 'activity' | 'labs';
  data: any;
}
