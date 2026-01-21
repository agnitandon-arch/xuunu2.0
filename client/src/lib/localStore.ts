import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

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

const SNAPSHOT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const userCollection = (userId: string, name: string) =>
  collection(db, "users", userId, name);

export const getHealthEntries = async (userId: string, max?: number) => {
  const ref = userCollection(userId, "healthEntries");
  const q = max
    ? query(ref, orderBy("timestamp", "desc"), limit(max))
    : query(ref, orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<HealthEntry, "id">) }) as HealthEntry
  );
};

export const getLatestHealthEntry = async (userId: string) => {
  const entries = await getHealthEntries(userId, 1);
  return entries[0] ?? null;
};

export const createHealthEntry = async (data: Partial<HealthEntry> & { userId: string }) => {
  const previous = await getLatestHealthEntry(data.userId);
  const entry: HealthEntry = {
    id: doc(userCollection(data.userId, "healthEntries")).id,
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
  const mergedEntry: HealthEntry = previous
    ? {
        ...entry,
        glucose: entry.glucose ?? previous.glucose,
        activity: entry.activity ?? previous.activity,
        recovery: entry.recovery ?? previous.recovery,
        strain: entry.strain ?? previous.strain,
        aqi: entry.aqi ?? previous.aqi,
        heartRate: entry.heartRate ?? previous.heartRate,
        hrv: entry.hrv ?? previous.hrv,
        sleepHours: entry.sleepHours ?? previous.sleepHours,
        bloodPressureSystolic: entry.bloodPressureSystolic ?? previous.bloodPressureSystolic,
        bloodPressureDiastolic: entry.bloodPressureDiastolic ?? previous.bloodPressureDiastolic,
        steps: entry.steps ?? previous.steps,
        symptomSeverity: entry.symptomSeverity ?? previous.symptomSeverity,
      }
    : entry;
  await setDoc(doc(db, "users", data.userId, "healthEntries", mergedEntry.id), mergedEntry);
  await maybeCreateBioSignatureSnapshot(mergedEntry);
  return mergedEntry;
};

export const getEnvironmentalReadings = async (userId: string) => {
  const ref = userCollection(userId, "environmentalReadings");
  const q = query(ref, orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<EnvironmentalReading, "id">) }) as EnvironmentalReading
  );
};

export const getLatestEnvironmentalReading = async (userId: string) => {
  const ref = userCollection(userId, "environmentalReadings");
  const q = query(ref, orderBy("timestamp", "desc"), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...(docSnap.data() as Omit<EnvironmentalReading, "id">) } as EnvironmentalReading;
};

export const createEnvironmentalReading = async (
  data: Partial<EnvironmentalReading> & { userId: string }
) => {
  const reading: EnvironmentalReading = {
    id: doc(userCollection(data.userId, "environmentalReadings")).id,
    userId: data.userId,
    timestamp: data.timestamp || new Date().toISOString(),
    aqi: toNumber(data.aqi),
    temperature: toNumber(data.temperature),
    humidity: toNumber(data.humidity),
    locationMode: data.locationMode || "manual",
  };
  await setDoc(doc(db, "users", data.userId, "environmentalReadings", reading.id), reading);
  return reading;
};

export const getMedications = async (userId: string) => {
  const ref = userCollection(userId, "medications");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Medication, "id">) }) as Medication
  );
};

export const createMedication = async (data: Omit<Medication, "id" | "createdAt" | "updatedAt">) => {
  const now = new Date().toISOString();
  const medication: Medication = {
    id: doc(userCollection(data.userId, "medications")).id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, "users", data.userId, "medications", medication.id), medication);
  return medication;
};

export const updateMedication = async (userId: string, id: string, updates: Partial<Medication>) => {
  const ref = doc(db, "users", userId, "medications", id);
  await updateDoc(ref, { ...updates, updatedAt: new Date().toISOString() });
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Medication, "id">) } as Medication) : null;
};

export const deleteMedication = async (userId: string, id: string) => {
  await deleteDoc(doc(db, "users", userId, "medications", id));
};

export const getMedicationLogs = async (
  userId: string,
  medicationId?: string,
  startDate?: string,
  endDate?: string
) => {
  const ref = userCollection(userId, "medicationLogs");
  let q = query(ref);
  if (medicationId) {
    q = query(ref, where("medicationId", "==", medicationId));
  }
  const snapshot = await getDocs(q);
  let logs = snapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<MedicationLog, "id">) }) as MedicationLog
  );
  if (startDate) {
    logs = logs.filter((log) => new Date(log.takenAt) >= new Date(startDate));
  }
  if (endDate) {
    logs = logs.filter((log) => new Date(log.takenAt) <= new Date(endDate));
  }
  return logs.sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
};

export const createMedicationLog = async (data: Omit<MedicationLog, "id" | "createdAt">) => {
  const log: MedicationLog = {
    id: doc(userCollection(data.userId, "medicationLogs")).id,
    ...data,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "users", data.userId, "medicationLogs", log.id), log);
  return log;
};

export const getBioSignatureSnapshots = async (userId: string, max?: number) => {
  const ref = userCollection(userId, "bioSignatureSnapshots");
  const q = max
    ? query(ref, orderBy("createdAt", "desc"), limit(max))
    : query(ref, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<BioSignatureSnapshot, "id">) }) as BioSignatureSnapshot
  );
};

const maybeCreateBioSignatureSnapshot = async (entry: HealthEntry) => {
  const snapshots = await getBioSignatureSnapshots(entry.userId, 1);
  const lastSnapshot = snapshots[0];
  if (lastSnapshot) {
    const lastTimestamp = new Date(lastSnapshot.createdAt).getTime();
    if (Date.now() - lastTimestamp < SNAPSHOT_INTERVAL_MS) return;
  }
  const snapshot: BioSignatureSnapshot = {
    id: doc(userCollection(entry.userId, "bioSignatureSnapshots")).id,
    userId: entry.userId,
    glucose: entry.glucose ?? 0,
    activity: entry.activity ?? 0,
    recovery: entry.recovery ?? 0,
    strain: entry.strain ?? 0,
    aqi: entry.aqi ?? 0,
    heartRate: entry.heartRate ?? 0,
    sleep: entry.sleepHours ?? 0,
    patternHash: `${entry.glucose ?? 0}-${entry.activity ?? 0}-${entry.recovery ?? 0}-${entry.strain ?? 0}-${entry.aqi ?? 0}`,
    healthNotes: entry.notes,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "users", entry.userId, "bioSignatureSnapshots", snapshot.id), snapshot);
};

export const seedInitialData = async (userId: string) => {
  const existing = await getHealthEntries(userId, 1);
  if (existing.length > 0) return;
  const now = new Date();
  const sampleEntries = [
    {
      glucose: 110,
      activity: 68,
      recovery: 72,
      strain: 40,
      aqi: 55,
      heartRate: 70,
      hrv: 65,
      sleepHours: 7.2,
      steps: 5400,
      symptomSeverity: 2,
      notes: "Seeded sample day",
    },
    {
      glucose: 98,
      activity: 75,
      recovery: 80,
      strain: 45,
      aqi: 42,
      heartRate: 68,
      hrv: 70,
      sleepHours: 7.8,
      steps: 6200,
      symptomSeverity: 1,
      notes: "Seeded sample day",
    },
  ];
  await Promise.all(
    sampleEntries.map((entry, index) => {
      const timestamp = new Date(now.getTime() - index * 24 * 60 * 60 * 1000).toISOString();
      return createHealthEntry({ ...entry, userId, timestamp });
    })
  );
};
