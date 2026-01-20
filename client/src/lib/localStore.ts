type StoredItem<T> = T & { id: string };

type HealthEntry = {
  id: string;
  userId: string;
  timestamp: string;
  glucose?: number;
  activity?: number;
  recovery?: number;
  strain?: number;
  aqi?: number;
  heartRate?: number;
  hrv?: number;
  sleepHours?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  steps?: number;
  symptomSeverity?: number;
  symptoms?: string[];
  notes?: string;
};

type EnvironmentalReading = {
  id: string;
  userId: string;
  timestamp: string;
  aqi?: number;
  temperature?: number;
  humidity?: number;
  locationMode?: string;
};

type Medication = {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  scheduledTimes: string[];
  notes?: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

type MedicationLog = {
  id: string;
  userId: string;
  medicationId: string;
  takenAt: string;
  scheduledTime?: string;
  notes?: string;
  createdAt: string;
};

type BioSignatureSnapshot = {
  id: string;
  userId: string;
  glucose: number;
  activity: number;
  recovery: number;
  strain: number;
  aqi: number;
  heartRate: number;
  sleep: number;
  patternHash: string;
  healthNotes?: string;
  createdAt: string;
};

const HEALTH_ENTRIES_KEY = "xuunu-health-entries";
const ENV_READINGS_KEY = "xuunu-env-readings";
const MEDICATIONS_KEY = "xuunu-medications";
const MEDICATION_LOGS_KEY = "xuunu-medication-logs";
const BIOSIGNATURE_KEY = "xuunu-biosignature-snapshots";

const SNAPSHOT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const getStore = <T>(key: string): T[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
};

const setStore = <T>(key: string, value: T[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const sortByTimestampDesc = <T extends { timestamp: string }>(items: T[]) =>
  [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const getHealthEntries = (userId: string, limit?: number) => {
  const all = getStore<HealthEntry>(HEALTH_ENTRIES_KEY).filter((entry) => entry.userId === userId);
  const sorted = sortByTimestampDesc(all);
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
};

export const getLatestHealthEntry = (userId: string) => {
  const entries = getHealthEntries(userId, 1);
  return entries[0] ?? null;
};

export const createHealthEntry = (data: Partial<HealthEntry> & { userId: string }) => {
  const entry: HealthEntry = {
    id: createId(),
    userId: data.userId,
    timestamp: data.timestamp || new Date().toISOString(),
    glucose: toNumber(data.glucose),
    activity: toNumber(data.activity),
    recovery: toNumber(data.recovery),
    strain: toNumber(data.strain),
    aqi: toNumber(data.aqi),
    heartRate: toNumber(data.heartRate),
    hrv: toNumber(data.hrv),
    sleepHours: toNumber(data.sleepHours),
    bloodPressureSystolic: toNumber(data.bloodPressureSystolic),
    bloodPressureDiastolic: toNumber(data.bloodPressureDiastolic),
    steps: toNumber(data.steps),
    symptomSeverity: toNumber(data.symptomSeverity),
    symptoms: data.symptoms || [],
    notes: data.notes,
  };
  const entries = getStore<HealthEntry>(HEALTH_ENTRIES_KEY);
  const updated = [entry, ...entries];
  setStore(HEALTH_ENTRIES_KEY, updated);
  maybeCreateBioSignatureSnapshot(entry);
  return entry;
};

export const getEnvironmentalReadings = (userId: string) => {
  const all = getStore<EnvironmentalReading>(ENV_READINGS_KEY).filter(
    (reading) => reading.userId === userId
  );
  return sortByTimestampDesc(all);
};

export const getLatestEnvironmentalReading = (userId: string) => {
  const readings = getEnvironmentalReadings(userId);
  return readings[0] ?? null;
};

export const createEnvironmentalReading = (
  data: Partial<EnvironmentalReading> & { userId: string }
) => {
  const reading: EnvironmentalReading = {
    id: createId(),
    userId: data.userId,
    timestamp: data.timestamp || new Date().toISOString(),
    aqi: toNumber(data.aqi),
    temperature: toNumber(data.temperature),
    humidity: toNumber(data.humidity),
    locationMode: data.locationMode || "manual",
  };
  const readings = getStore<EnvironmentalReading>(ENV_READINGS_KEY);
  const updated = [reading, ...readings];
  setStore(ENV_READINGS_KEY, updated);
  return reading;
};

export const getMedications = (userId: string) => {
  const all = getStore<Medication>(MEDICATIONS_KEY).filter((med) => med.userId === userId);
  return all.filter((med) => med.isActive === 1);
};

export const createMedication = (data: Omit<Medication, "id" | "createdAt" | "updatedAt">) => {
  const now = new Date().toISOString();
  const medication: Medication = {
    ...data,
    id: createId(),
    createdAt: now,
    updatedAt: now,
  };
  const medications = getStore<Medication>(MEDICATIONS_KEY);
  setStore(MEDICATIONS_KEY, [medication, ...medications]);
  return medication;
};

export const deleteMedication = (userId: string, id: string) => {
  const medications = getStore<Medication>(MEDICATIONS_KEY);
  const updated = medications.map((med) =>
    med.id === id && med.userId === userId ? { ...med, isActive: 0 } : med
  );
  setStore(MEDICATIONS_KEY, updated);
};

export const updateMedication = (userId: string, id: string, updates: Partial<Medication>) => {
  const medications = getStore<Medication>(MEDICATIONS_KEY);
  const updated = medications.map((med) =>
    med.id === id && med.userId === userId
      ? { ...med, ...updates, updatedAt: new Date().toISOString() }
      : med
  );
  setStore(MEDICATIONS_KEY, updated);
  return updated.find((med) => med.id === id) ?? null;
};

export const getMedicationLogs = (
  userId: string,
  medicationId?: string,
  startDate?: string,
  endDate?: string
) => {
  let logs = getStore<MedicationLog>(MEDICATION_LOGS_KEY).filter(
    (log) => log.userId === userId
  );
  if (medicationId) {
    logs = logs.filter((log) => log.medicationId === medicationId);
  }
  if (startDate) {
    logs = logs.filter((log) => new Date(log.takenAt) >= new Date(startDate));
  }
  if (endDate) {
    logs = logs.filter((log) => new Date(log.takenAt) <= new Date(endDate));
  }
  return logs.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
};

export const createMedicationLog = (data: Omit<MedicationLog, "id" | "createdAt">) => {
  const log: MedicationLog = {
    ...data,
    id: createId(),
    createdAt: new Date().toISOString(),
  };
  const logs = getStore<MedicationLog>(MEDICATION_LOGS_KEY);
  setStore(MEDICATION_LOGS_KEY, [log, ...logs]);
  return log;
};

export const getBioSignatureSnapshots = (userId: string, limit?: number) => {
  const snapshots = getStore<BioSignatureSnapshot>(BIOSIGNATURE_KEY).filter(
    (snapshot) => snapshot.userId === userId
  );
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
};

const maybeCreateBioSignatureSnapshot = (entry: HealthEntry) => {
  const snapshots = getBioSignatureSnapshots(entry.userId);
  const last = snapshots[0];
  const now = new Date(entry.timestamp).getTime();
  if (last && now - new Date(last.createdAt).getTime() < SNAPSHOT_INTERVAL_MS) {
    return;
  }

  const snapshot: BioSignatureSnapshot = {
    id: createId(),
    userId: entry.userId,
    glucose: entry.glucose ?? 0,
    activity: entry.activity ?? 0,
    recovery: entry.recovery ?? 0,
    strain: entry.strain ?? 0,
    aqi: entry.aqi ?? 0,
    heartRate: entry.heartRate ?? 0,
    sleep: entry.sleepHours ?? 0,
    patternHash: `${entry.userId}-${entry.timestamp}`,
    healthNotes: entry.notes,
    createdAt: entry.timestamp,
  };

  const updated = [snapshot, ...snapshots];
  setStore(BIOSIGNATURE_KEY, updated);
};

export const seedInitialData = (userId: string) => {
  const existing = getHealthEntries(userId, 1);
  if (existing.length > 0) return;

  const today = new Date();
  const baseGlucose = 132;
  const baseSleep = 6.8;
  const baseHeartRate = 74;
  const baseSteps = 6200;

  for (let i = 0; i < 6; i += 1) {
    const entryDate = new Date(today);
    entryDate.setDate(today.getDate() - i * 3);
    createHealthEntry({
      userId,
      timestamp: entryDate.toISOString(),
      glucose: baseGlucose - i * 2,
      sleepHours: baseSleep + i * 0.2,
      heartRate: baseHeartRate - i,
      steps: baseSteps + i * 400,
      hrv: 52 + i * 2,
    });
  }

  createEnvironmentalReading({
    userId,
    timestamp: today.toISOString(),
    aqi: 58,
    temperature: 72,
    humidity: 46,
    locationMode: "auto",
  });
};
