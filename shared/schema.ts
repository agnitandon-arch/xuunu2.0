import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email"),
  preferredUnits: text("preferred_units").notNull().default("imperial"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userFeatureFlags = pgTable("user_feature_flags", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  paidStatus: boolean("paid_status").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCardLast4: text("stripe_card_last4"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const healthEntries = pgTable("health_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  glucose: integer("glucose"),
  activity: decimal("activity", { precision: 5, scale: 2 }),
  recovery: decimal("recovery", { precision: 5, scale: 2 }),
  strain: decimal("strain", { precision: 5, scale: 2 }),
  heartRate: integer("heart_rate"),
  hrv: integer("hrv"),
  sleepHours: decimal("sleep_hours", { precision: 4, scale: 2 }),
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  steps: integer("steps"),
  symptomSeverity: integer("symptom_severity"),
  symptoms: json("symptoms").$type<string[]>(),
  notes: text("notes"),
});

export const environmentalReadings = pgTable("environmental_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  locationMode: text("location_mode").notNull().default("manual"),
  aqi: integer("aqi"),
  pm25: decimal("pm25", { precision: 6, scale: 2 }),
  pm10: decimal("pm10", { precision: 6, scale: 2 }),
  vocs: integer("vocs"),
  so2: decimal("so2", { precision: 6, scale: 2 }),
  no2: decimal("no2", { precision: 6, scale: 2 }),
  nox: decimal("nox", { precision: 6, scale: 2 }),
  co: decimal("co", { precision: 6, scale: 2 }),
  o3: decimal("o3", { precision: 6, scale: 2 }),
  noiseCurrent: integer("noise_current"),
  noisePeak: integer("noise_peak"),
  noiseAverage: integer("noise_average"),
  waterQuality: integer("water_quality"),
  waterPh: decimal("water_ph", { precision: 4, scale: 2 }),
  waterTurbidity: decimal("water_turbidity", { precision: 6, scale: 2 }),
  waterChlorine: decimal("water_chlorine", { precision: 5, scale: 2 }),
  waterLead: decimal("water_lead", { precision: 6, scale: 3 }),
  waterBacteria: integer("water_bacteria"),
  soilMoisture: decimal("soil_moisture", { precision: 5, scale: 2 }),
  soilPh: decimal("soil_ph", { precision: 4, scale: 2 }),
  soilContaminants: integer("soil_contaminants"),
  soilHeavyMetals: decimal("soil_heavy_metals", { precision: 6, scale: 2 }),
  lightPollution: integer("light_pollution"),
  uvIndex: integer("uv_index"),
  illuminance: integer("illuminance"),
  blueLight: integer("blue_light"),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  feelsLike: decimal("feels_like", { precision: 5, scale: 2 }),
  humidity: integer("humidity"),
  heatIndex: decimal("heat_index", { precision: 5, scale: 2 }),
  pressure: integer("pressure"),
  radon: integer("radon"),
  gammaRadiation: decimal("gamma_radiation", { precision: 6, scale: 3 }),
  cosmicRays: decimal("cosmic_rays", { precision: 6, scale: 3 }),
});

export const userApiCredentials = pgTable("user_api_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  // Terra API for Apple Watch / wearables
  terraDevId: text("terra_dev_id"),
  terraApiKey: text("terra_api_key"),
  terraWebhookSecret: text("terra_webhook_secret"),
  // Fitbit API OAuth credentials
  fitbitClientId: text("fitbit_client_id"),
  fitbitClientSecret: text("fitbit_client_secret"),
  fitbitAccessToken: text("fitbit_access_token"),
  fitbitRefreshToken: text("fitbit_refresh_token"),
  fitbitUserId: text("fitbit_user_id"),
  fitbitTokenExpiresAt: timestamp("fitbit_token_expires_at"),
  // Indoor Air Quality Monitoring Devices
  awairApiKey: text("awair_api_key"),
  awairDeviceId: text("awair_device_id"),
  iqairApiKey: text("iqair_api_key"),
  purpleairApiKey: text("purpleair_api_key"),
  purpleairSensorId: text("purpleair_sensor_id"),
  airthingsClientId: text("airthings_client_id"),
  airthingsClientSecret: text("airthings_client_secret"),
  netatmoClientId: text("netatmo_client_id"),
  netatmoClientSecret: text("netatmo_client_secret"),
  netatmoRefreshToken: text("netatmo_refresh_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const connectedDevices = pgTable("connected_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  terraUserId: text("terra_user_id"),
  status: text("status").notNull().default("connected"),
  lastSyncAt: timestamp("last_sync_at"),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  healthEntries: many(healthEntries),
  environmentalReadings: many(environmentalReadings),
  apiCredentials: one(userApiCredentials),
  connectedDevices: many(connectedDevices),
  featureFlags: one(userFeatureFlags),
}));

export const userApiCredentialsRelations = relations(userApiCredentials, ({ one }) => ({
  user: one(users, {
    fields: [userApiCredentials.userId],
    references: [users.id],
  }),
}));

export const connectedDevicesRelations = relations(connectedDevices, ({ one }) => ({
  user: one(users, {
    fields: [connectedDevices.userId],
    references: [users.id],
  }),
}));

export const healthEntriesRelations = relations(healthEntries, ({ one }) => ({
  user: one(users, {
    fields: [healthEntries.userId],
    references: [users.id],
  }),
}));

export const environmentalReadingsRelations = relations(environmentalReadings, ({ one }) => ({
  user: one(users, {
    fields: [environmentalReadings.userId],
    references: [users.id],
  }),
}));

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isVoiceNote: integer("is_voice_note").notNull().default(0),
  audioData: text("audio_data"),
  audioDuration: integer("audio_duration"),
  hasNotification: integer("has_notification").notNull().default(0),
  notificationContext: text("notification_context"),
  notificationTrigger: text("notification_trigger"),
  isCompleted: integer("is_completed").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  isVoiceNote: z.number().min(0).max(1),
  audioData: z.string().nullable().optional(),
  audioDuration: z.number().nullable().optional(),
  hasNotification: z.number().min(0).max(1),
  isCompleted: z.number().min(0).max(1),
});

export const bioSignatureSnapshots = pgTable("bio_signature_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  glucose: integer("glucose").notNull(),
  activity: decimal("activity", { precision: 5, scale: 2 }).notNull(),
  recovery: decimal("recovery", { precision: 5, scale: 2 }).notNull(),
  strain: decimal("strain", { precision: 5, scale: 2 }).notNull(),
  aqi: integer("aqi").notNull(),
  heartRate: integer("heart_rate").notNull(),
  sleep: decimal("sleep", { precision: 4, scale: 2 }).notNull(),
  patternHash: text("pattern_hash").notNull(),
  healthNotes: text("health_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const medications = pgTable("medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  scheduledTimes: json("scheduled_times").$type<string[]>().notNull(),
  notes: text("notes"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const medicationLogs = pgTable("medication_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  medicationId: varchar("medication_id").notNull().references(() => medications.id, { onDelete: "cascade" }),
  takenAt: timestamp("taken_at").notNull(),
  scheduledTime: text("scheduled_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}));

export const bioSignatureSnapshotsRelations = relations(bioSignatureSnapshots, ({ one }) => ({
  user: one(users, {
    fields: [bioSignatureSnapshots.userId],
    references: [users.id],
  }),
}));

export const medicationsRelations = relations(medications, ({ one, many }) => ({
  user: one(users, {
    fields: [medications.userId],
    references: [users.id],
  }),
  logs: many(medicationLogs),
}));

export const medicationLogsRelations = relations(medicationLogs, ({ one }) => ({
  user: one(users, {
    fields: [medicationLogs.userId],
    references: [users.id],
  }),
  medication: one(medications, {
    fields: [medicationLogs.medicationId],
    references: [medications.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
});

export const insertUserFeatureFlagsSchema = createInsertSchema(userFeatureFlags).omit({
  updatedAt: true,
});

export const insertHealthEntrySchema = createInsertSchema(healthEntries).omit({
  id: true,
  timestamp: true,
});

export const insertEnvironmentalReadingSchema = createInsertSchema(environmentalReadings).omit({
  id: true,
  timestamp: true,
});

export const insertUserApiCredentialsSchema = createInsertSchema(userApiCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConnectedDeviceSchema = createInsertSchema(connectedDevices).omit({
  id: true,
  connectedAt: true,
});

export const insertBioSignatureSnapshotSchema = createInsertSchema(bioSignatureSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicationLogSchema = createInsertSchema(medicationLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserFeatureFlags = typeof userFeatureFlags.$inferSelect;
export type InsertUserFeatureFlags = z.infer<typeof insertUserFeatureFlagsSchema>;
export type HealthEntry = typeof healthEntries.$inferSelect;
export type InsertHealthEntry = z.infer<typeof insertHealthEntrySchema>;
export type EnvironmentalReading = typeof environmentalReadings.$inferSelect;
export type InsertEnvironmentalReading = z.infer<typeof insertEnvironmentalReadingSchema>;
export type UserApiCredentials = typeof userApiCredentials.$inferSelect;
export type InsertUserApiCredentials = z.infer<typeof insertUserApiCredentialsSchema>;
export type ConnectedDevice = typeof connectedDevices.$inferSelect;
export type InsertConnectedDevice = z.infer<typeof insertConnectedDeviceSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type BioSignatureSnapshot = typeof bioSignatureSnapshots.$inferSelect;
export type InsertBioSignatureSnapshot = z.infer<typeof insertBioSignatureSnapshotSchema>;
export type Medication = typeof medications.$inferSelect;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = z.infer<typeof insertMedicationLogSchema>;
