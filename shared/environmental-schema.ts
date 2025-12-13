import { z } from "zod";

// Environmental data point schema
export const environmentalDataSchema = z.object({
  id: z.number().optional(),
  userId: z.string().optional(),
  timestamp: z.string(),
  
  // Location data
  latitude: z.number(),
  longitude: z.number(),
  
  // 1. AIR QUALITY METRICS
  aqi: z.number().optional(), // Air Quality Index (0-500)
  pm25: z.number().optional(), // PM2.5 (µg/m³)
  pm10: z.number().optional(), // PM10 (µg/m³)
  so2: z.number().optional(), // Sulfur Dioxide (ppm)
  no2: z.number().optional(), // Nitrogen Dioxide (ppm)
  nox: z.number().optional(), // Nitrogen Oxides (ppm)
  co: z.number().optional(), // Carbon Monoxide (ppm)
  o3: z.number().optional(), // Ozone (ppb)
  vocs: z.number().optional(), // Volatile Organic Compounds (µg/m³)
  
  // 2. NOISE POLLUTION
  noiseLevel: z.number().optional(), // Decibels (dB)
  noisePeak: z.number().optional(), // Peak noise in last hour (dB)
  noiseAverage: z.number().optional(), // Average noise level (dB)
  
  // 3. WATER QUALITY
  waterQualityIndex: z.number().optional(), // Water Quality Index (0-100)
  pH: z.number().optional(), // pH level (0-14)
  turbidity: z.number().optional(), // Water turbidity (NTU)
  chlorine: z.number().optional(), // Chlorine level (ppm)
  lead: z.number().optional(), // Lead content (ppb)
  bacteria: z.number().optional(), // Bacterial count (CFU/100ml)
  
  // 4. SOIL QUALITY
  soilMoisture: z.number().optional(), // Soil moisture (%)
  soilPH: z.number().optional(), // Soil pH (0-14)
  soilContaminants: z.number().optional(), // Contamination index (0-100)
  heavyMetals: z.number().optional(), // Heavy metals index (ppm)
  
  // 5. LIGHT POLLUTION
  lightPollution: z.number().optional(), // Light pollution index (0-100)
  uvIndex: z.number().optional(), // UV Index (0-11+)
  lux: z.number().optional(), // Illuminance (lux)
  blueLight: z.number().optional(), // Blue light exposure (%)
  
  // 6. THERMAL CONDITIONS
  temperature: z.number().optional(), // Temperature (Celsius)
  feelsLike: z.number().optional(), // Feels like temperature (Celsius)
  humidity: z.number().optional(), // Humidity (%)
  heatIndex: z.number().optional(), // Heat index
  pressure: z.number().optional(), // Atmospheric pressure (hPa)
  
  // 7. RADIOACTIVE EXPOSURE
  radon: z.number().optional(), // Radon (Bq/m³)
  gamma: z.number().optional(), // Gamma radiation (µSv/h)
  cosmicRays: z.number().optional(), // Cosmic ray exposure (µSv/h)
  
  // Data source
  source: z.string().optional(), // API source name
});

export type EnvironmentalData = z.infer<typeof environmentalDataSchema>;

// Hourly tracking entry
export const hourlyTrackingSchema = z.object({
  id: z.number().optional(),
  userId: z.string().optional(),
  timestamp: z.string(),
  
  // Health metrics at this time
  glucose: z.number().optional(),
  heartRate: z.number().optional(),
  symptoms: z.array(z.string()).optional(),
  severityLevel: z.number().optional(), // 1-10
  
  // Environmental data at this time
  environmentalDataId: z.number().optional(),
  
  // Computed correlation
  impactScore: z.number().optional(), // How much environment affected health (0-100)
});

export type HourlyTracking = z.infer<typeof hourlyTrackingSchema>;
