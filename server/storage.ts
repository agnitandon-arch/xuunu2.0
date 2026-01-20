import {
  type User,
  type InsertUser,
  type HealthEntry,
  type InsertHealthEntry,
  type EnvironmentalReading,
  type InsertEnvironmentalReading,
  type UserApiCredentials,
  type InsertUserApiCredentials,
  type ConnectedDevice,
  type InsertConnectedDevice,
  type Note,
  type InsertNote,
  type BioSignatureSnapshot,
  type InsertBioSignatureSnapshot,
  type Medication,
  type InsertMedication,
  type MedicationLog,
  type InsertMedicationLog,
  users,
  healthEntries,
  environmentalReadings,
  userApiCredentials,
  connectedDevices,
  notes,
  bioSignatureSnapshots,
  medications,
  medicationLogs,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPreferences(userId: string, preferences: { preferredUnits: string }): Promise<User>;
  
  createHealthEntry(entry: InsertHealthEntry): Promise<HealthEntry>;
  getUserHealthEntries(userId: string, limit?: number): Promise<HealthEntry[]>;
  getLatestHealthEntry(userId: string): Promise<HealthEntry | undefined>;
  
  createEnvironmentalReading(reading: InsertEnvironmentalReading): Promise<EnvironmentalReading>;
  getUserEnvironmentalReadings(userId: string, limit?: number): Promise<EnvironmentalReading[]>;
  getLatestEnvironmentalReading(userId: string): Promise<EnvironmentalReading | undefined>;
  getRecentEnvironmentalReadings(userId: string, hoursAgo: number): Promise<EnvironmentalReading[]>;
  
  getUserApiCredentials(userId: string): Promise<UserApiCredentials | undefined>;
  upsertUserApiCredentials(credentials: InsertUserApiCredentials): Promise<UserApiCredentials>;
  
  getConnectedDevices(userId: string): Promise<ConnectedDevice[]>;
  createConnectedDevice(device: InsertConnectedDevice): Promise<ConnectedDevice>;
  updateDeviceLastSync(deviceId: string): Promise<void>;

  createNote(note: InsertNote): Promise<Note>;
  getUserNotes(userId: string, limit?: number): Promise<Note[]>;
  updateNote(id: string, updates: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: string): Promise<void>;

  createBioSignatureSnapshot(snapshot: InsertBioSignatureSnapshot): Promise<BioSignatureSnapshot>;
  getUserBioSignatureSnapshots(userId: string, limit?: number): Promise<BioSignatureSnapshot[]>;
  getLatestBioSignatureSnapshot(userId: string): Promise<BioSignatureSnapshot | undefined>;

  createMedication(medication: InsertMedication): Promise<Medication>;
  getMedicationById(id: string): Promise<Medication | undefined>;
  getMedicationsByUserId(userId: string): Promise<Medication[]>;
  updateMedication(id: string, updates: Partial<InsertMedication>): Promise<Medication>;
  deleteMedication(id: string): Promise<void>;

  createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog>;
  getMedicationLogs(userId: string, medicationId?: string, startDate?: string, endDate?: string): Promise<MedicationLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPreferences(userId: string, preferences: { preferredUnits: string }): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ preferredUnits: preferences.preferredUnits })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async createHealthEntry(entry: InsertHealthEntry): Promise<HealthEntry> {
    const normalizedEntry: typeof healthEntries.$inferInsert = {
      ...entry,
      symptoms: Array.isArray(entry.symptoms)
        ? (entry.symptoms as string[])
        : entry.symptoms ?? undefined,
    };
    const [healthEntry] = await db
      .insert(healthEntries)
      .values(normalizedEntry)
      .returning();
    return healthEntry;
  }

  async getUserHealthEntries(userId: string, limit: number = 50): Promise<HealthEntry[]> {
    return await db
      .select()
      .from(healthEntries)
      .where(eq(healthEntries.userId, userId))
      .orderBy(desc(healthEntries.timestamp))
      .limit(limit);
  }

  async getLatestHealthEntry(userId: string): Promise<HealthEntry | undefined> {
    const [entry] = await db
      .select()
      .from(healthEntries)
      .where(eq(healthEntries.userId, userId))
      .orderBy(desc(healthEntries.timestamp))
      .limit(1);
    return entry || undefined;
  }

  async createEnvironmentalReading(reading: InsertEnvironmentalReading): Promise<EnvironmentalReading> {
    const [envReading] = await db
      .insert(environmentalReadings)
      .values(reading)
      .returning();
    return envReading;
  }

  async getUserEnvironmentalReadings(userId: string, limit: number = 50): Promise<EnvironmentalReading[]> {
    return await db
      .select()
      .from(environmentalReadings)
      .where(eq(environmentalReadings.userId, userId))
      .orderBy(desc(environmentalReadings.timestamp))
      .limit(limit);
  }

  async getLatestEnvironmentalReading(userId: string): Promise<EnvironmentalReading | undefined> {
    const [reading] = await db
      .select()
      .from(environmentalReadings)
      .where(eq(environmentalReadings.userId, userId))
      .orderBy(desc(environmentalReadings.timestamp))
      .limit(1);
    return reading || undefined;
  }

  async getRecentEnvironmentalReadings(userId: string, hoursAgo: number): Promise<EnvironmentalReading[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);
    
    return await db
      .select()
      .from(environmentalReadings)
      .where(
        and(
          eq(environmentalReadings.userId, userId),
          gte(environmentalReadings.timestamp, cutoffDate)
        )
      )
      .orderBy(desc(environmentalReadings.timestamp));
  }

  async getUserApiCredentials(userId: string): Promise<UserApiCredentials | undefined> {
    const [credentials] = await db
      .select()
      .from(userApiCredentials)
      .where(eq(userApiCredentials.userId, userId));
    return credentials || undefined;
  }

  async upsertUserApiCredentials(credentials: InsertUserApiCredentials): Promise<UserApiCredentials> {
    const [result] = await db
      .insert(userApiCredentials)
      .values(credentials)
      .onConflictDoUpdate({
        target: userApiCredentials.userId,
        set: {
          // Terra API fields
          terraDevId: credentials.terraDevId,
          terraApiKey: credentials.terraApiKey,
          terraWebhookSecret: credentials.terraWebhookSecret,
          // Indoor Air Quality device fields
          awairApiKey: credentials.awairApiKey,
          awairDeviceId: credentials.awairDeviceId,
          iqairApiKey: credentials.iqairApiKey,
          purpleairApiKey: credentials.purpleairApiKey,
          purpleairSensorId: credentials.purpleairSensorId,
          airthingsClientId: credentials.airthingsClientId,
          airthingsClientSecret: credentials.airthingsClientSecret,
          netatmoClientId: credentials.netatmoClientId,
          netatmoClientSecret: credentials.netatmoClientSecret,
          netatmoRefreshToken: credentials.netatmoRefreshToken,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getConnectedDevices(userId: string): Promise<ConnectedDevice[]> {
    return await db
      .select()
      .from(connectedDevices)
      .where(eq(connectedDevices.userId, userId))
      .orderBy(desc(connectedDevices.connectedAt));
  }

  async createConnectedDevice(device: InsertConnectedDevice): Promise<ConnectedDevice> {
    const [connectedDevice] = await db
      .insert(connectedDevices)
      .values(device)
      .returning();
    return connectedDevice;
  }

  async updateDeviceLastSync(deviceId: string): Promise<void> {
    await db
      .update(connectedDevices)
      .set({ lastSyncAt: new Date() })
      .where(eq(connectedDevices.id, deviceId));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [createdNote] = await db
      .insert(notes)
      .values(note)
      .returning();
    return createdNote;
  }

  async getUserNotes(userId: string, limit: number = 50): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt))
      .limit(limit);
  }

  async updateNote(id: string, updates: Partial<InsertNote>): Promise<Note> {
    const [updatedNote] = await db
      .update(notes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return updatedNote;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async createBioSignatureSnapshot(snapshot: InsertBioSignatureSnapshot): Promise<BioSignatureSnapshot> {
    const [createdSnapshot] = await db
      .insert(bioSignatureSnapshots)
      .values(snapshot)
      .returning();
    return createdSnapshot;
  }

  async getUserBioSignatureSnapshots(userId: string, limit: number = 20): Promise<BioSignatureSnapshot[]> {
    return await db
      .select()
      .from(bioSignatureSnapshots)
      .where(eq(bioSignatureSnapshots.userId, userId))
      .orderBy(desc(bioSignatureSnapshots.createdAt))
      .limit(limit);
  }

  async getLatestBioSignatureSnapshot(userId: string): Promise<BioSignatureSnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(bioSignatureSnapshots)
      .where(eq(bioSignatureSnapshots.userId, userId))
      .orderBy(desc(bioSignatureSnapshots.createdAt))
      .limit(1);
    return snapshot || undefined;
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const normalizedMedication: typeof medications.$inferInsert = {
      ...medication,
      scheduledTimes: Array.isArray(medication.scheduledTimes)
        ? (medication.scheduledTimes as string[])
        : [],
    };
    const [createdMedication] = await db
      .insert(medications)
      .values(normalizedMedication)
      .returning();
    return createdMedication;
  }

  async getMedicationById(id: string): Promise<Medication | undefined> {
    const [medication] = await db
      .select()
      .from(medications)
      .where(eq(medications.id, id));
    return medication || undefined;
  }

  async getMedicationsByUserId(userId: string): Promise<Medication[]> {
    return await db
      .select()
      .from(medications)
      .where(and(eq(medications.userId, userId), eq(medications.isActive, 1)))
      .orderBy(desc(medications.createdAt));
  }

  async updateMedication(id: string, updates: Partial<InsertMedication>): Promise<Medication> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    const [updatedMedication] = await db
      .update(medications)
      .set(updateData)
      .where(eq(medications.id, id))
      .returning();
    return updatedMedication;
  }

  async deleteMedication(id: string): Promise<void> {
    await db
      .update(medications)
      .set({ isActive: 0 })
      .where(eq(medications.id, id));
  }

  async createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog> {
    const [createdLog] = await db
      .insert(medicationLogs)
      .values(log)
      .returning();
    return createdLog;
  }

  async getMedicationLogs(userId: string, medicationId?: string, startDate?: string, endDate?: string): Promise<MedicationLog[]> {
    const conditions = [eq(medicationLogs.userId, userId)];
    
    if (medicationId) {
      conditions.push(eq(medicationLogs.medicationId, medicationId));
    }
    
    if (startDate) {
      conditions.push(gte(medicationLogs.takenAt, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(medicationLogs.takenAt, new Date(endDate)));
    }

    return await db
      .select()
      .from(medicationLogs)
      .where(and(...conditions))
      .orderBy(desc(medicationLogs.takenAt));
  }
}

export const storage = new DatabaseStorage();
