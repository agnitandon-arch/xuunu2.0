import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHealthEntrySchema, insertEnvironmentalReadingSchema, insertUserApiCredentialsSchema, insertNoteSchema, insertBioSignatureSnapshotSchema, insertMedicationSchema, insertMedicationLogSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { TerraClient } from "terra-api";
import Anthropic from "@anthropic-ai/sdk";
import Stripe from "stripe";
const TERRA_WEARABLE_PROVIDERS = ["APPLE_HEALTH"];
const TERRA_LAB_PROVIDERS = ["QUEST", "LABCORP", "EVERLYWELL", "LETSGETCHECKED"];

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripeMonthlyPriceId = process.env.STRIPE_PRICE_MONTHLY_ID;
const stripeYearlyPriceId = process.env.STRIPE_PRICE_YEARLY_ID;
const stripeSuccessUrl = process.env.STRIPE_SUCCESS_URL;
const stripeCancelUrl = process.env.STRIPE_CANCEL_URL;
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" })
  : null;
const SUPERUSER_EMAIL = "agnishikha@yahoo.com";

const getStripeString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const resolveStripeUserId = async ({
  userId,
  customerId,
  customerEmail,
}: {
  userId?: string;
  customerId?: string;
  customerEmail?: string;
}) => {
  if (userId) return userId;
  if (customerId) {
    const flags = await storage.getUserFeatureFlagsByCustomerId(customerId);
    if (flags) return flags.userId;
  }
  if (customerEmail) {
    const user = await storage.getUserByEmail(customerEmail);
    if (user) return user.id;
  }
  return null;
};


export async function registerRoutes(app: Express): Promise<Server> {
  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // User sync API - create or get user from Firebase auth
  app.post("/api/users/sync", async (req, res) => {
    try {
      const { id, email } = req.body;
      
      if (!id || !email) {
        return res.status(400).json({ error: "id and email are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUser(id);
      if (existingUser) {
        return res.json(existingUser);
      }

      // Create new user
      const username = email.split('@')[0];
      const newUser = await storage.createUser({
        id,
        username,
        email,
        password: null,
      });

      if (email.toLowerCase() === SUPERUSER_EMAIL.toLowerCase()) {
        await storage.upsertUserFeatureFlags({ userId: id, paidStatus: true });
      }
      
      res.json(newUser);
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // User feature flags (paid/unpaid)
  app.get("/api/user-features", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const user = await storage.getUser(userId);
      const isSuperuser =
        user?.email?.toLowerCase() === SUPERUSER_EMAIL.toLowerCase();
      let flags = await storage.getUserFeatureFlags(userId);
      if (!flags) {
        flags = await storage.upsertUserFeatureFlags({
          userId,
          paidStatus: isSuperuser,
        });
      } else if (isSuperuser && !flags.paidStatus) {
        flags = await storage.upsertUserFeatureFlags({
          userId,
          paidStatus: true,
          stripeCustomerId: flags.stripeCustomerId,
          stripeSubscriptionId: flags.stripeSubscriptionId,
          stripeCardLast4: flags.stripeCardLast4,
        });
      }
      res.json({
        paidStatus: isSuperuser ? true : !!flags.paidStatus,
        cardLast4: flags.stripeCardLast4 || null,
        hasCustomer: !!flags.stripeCustomerId,
      });
    } catch (error) {
      console.error("Error fetching user feature flags:", error);
      res.status(500).json({ error: "Failed to fetch user feature flags" });
    }
  });

  app.post("/api/user-features/stripe-complete", async (req, res) => {
    try {
      const { userId, stripeCustomerId, stripeSubscriptionId } = req.body as {
        userId?: string;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
      };
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const flags = await storage.upsertUserFeatureFlags({
        userId,
        paidStatus: true,
        stripeCustomerId,
        stripeSubscriptionId,
      });
      res.json({ paidStatus: !!flags.paidStatus });
    } catch (error) {
      console.error("Error updating user feature flags:", error);
      res.status(500).json({ error: "Failed to update user feature flags" });
    }
  });

  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    if (!stripeClient || !stripeSecretKey) {
      return res.status(500).json({ error: "Stripe not configured" });
    }
    try {
      const { userId, plan } = req.body as { userId?: string; plan?: "monthly" | "yearly" };
      if (!userId || !plan) {
        return res.status(400).json({ error: "userId and plan are required" });
      }
      const priceId = plan === "yearly" ? stripeYearlyPriceId : stripeMonthlyPriceId;
      if (!priceId) {
        return res.status(400).json({ error: "Price not configured" });
      }
      const successUrl =
        stripeSuccessUrl || `${req.protocol}://${req.get("host")}/app?payment=success`;
      const cancelUrl =
        stripeCancelUrl || `${req.protocol}://${req.get("host")}/app?payment=cancel`;
      const session = await stripeClient.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: { userId },
      });
      return res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe checkout session failed:", error);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/create-portal-session", async (req, res) => {
    if (!stripeClient || !stripeSecretKey) {
      return res.status(500).json({ error: "Stripe not configured" });
    }
    try {
      const { userId } = req.body as { userId?: string };
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const flags = await storage.getUserFeatureFlags(userId);
      if (!flags?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing profile found" });
      }
      const returnUrl =
        stripeCancelUrl ||
        stripeSuccessUrl ||
        `${req.protocol}://${req.get("host")}/app?billing=return`;
      const session = await stripeClient.billingPortal.sessions.create({
        customer: flags.stripeCustomerId,
        return_url: returnUrl,
      });
      return res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe portal session failed:", error);
      return res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripeClient || !stripeWebhookSecret) {
      return res.status(500).json({ error: "Stripe webhook not configured" });
    }
    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature)) {
      return res.status(400).json({ error: "Missing Stripe signature" });
    }

    const rawBody =
      req.rawBody instanceof Buffer
        ? req.rawBody
        : Buffer.from(JSON.stringify(req.body ?? {}));

    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error("Stripe webhook signature verification failed:", error);
      return res.status(400).send(`Webhook Error: ${error.message ?? "Invalid signature"}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const customerId = getStripeString(session.customer);
          const subscriptionId = getStripeString(session.subscription);
          const paymentIntentId = getStripeString(session.payment_intent);
          let cardLast4: string | undefined;
          if (paymentIntentId && stripeClient) {
            try {
              const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId, {
                expand: ["payment_method"],
              });
              const card = (paymentIntent.payment_method as Stripe.PaymentMethod | null)?.card;
              cardLast4 = card?.last4;
            } catch (error) {
              console.warn("Unable to fetch card last4:", error);
            }
          }
          const userId = await resolveStripeUserId({
            userId: session.metadata?.userId || session.client_reference_id || undefined,
            customerId,
            customerEmail: session.customer_email || session.customer_details?.email || undefined,
          });
          if (userId) {
            await storage.upsertUserFeatureFlags({
              userId,
              paidStatus: true,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripeCardLast4: cardLast4,
            });
          }
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = getStripeString(subscription.customer);
          const userId = await resolveStripeUserId({
            userId: subscription.metadata?.userId,
            customerId,
          });
          if (userId) {
            const isPaid =
              event.type !== "customer.subscription.deleted" &&
              (subscription.status === "active" || subscription.status === "trialing");
            await storage.upsertUserFeatureFlags({
              userId,
              paidStatus: isPaid,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
            });
          }
          break;
        }
        default:
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook handler failed:", error);
      res.status(500).json({ error: "Stripe webhook failed" });
    }
  });

  // Update user preferences
  app.patch("/api/users/:id/preferences", async (req, res) => {
    try {
      const userId = req.params.id;
      const { preferredUnits } = req.body;

      if (!preferredUnits || !['imperial', 'metric'].includes(preferredUnits)) {
        return res.status(400).json({ error: "preferredUnits must be 'imperial' or 'metric'" });
      }

      const updatedUser = await storage.updateUserPreferences(userId, { preferredUnits });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ error: "Failed to update user preferences" });
    }
  });

  // Health Entries API
  app.post("/api/health-entries", async (req, res) => {
    try {
      const validation = insertHealthEntrySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: fromZodError(validation.error).message 
        });
      }

      const entry = await storage.createHealthEntry(validation.data);

      // Auto-create bio signature snapshot every 7 days
      const userId = validation.data.userId;
      const latestSnapshot = await storage.getLatestBioSignatureSnapshot(userId);
      const shouldCreateSnapshot = !latestSnapshot || 
        (Date.now() - new Date(latestSnapshot.createdAt).getTime()) > (7 * 24 * 60 * 60 * 1000);

      if (shouldCreateSnapshot) {
        try {
          // Only create snapshot if we have real data from integrations
          // Skip if data is missing - no fake defaults
          if (!entry.glucose) {
            console.log("Skipping bio signature snapshot - no real glucose data available");
          } else {
            // Get latest environmental data for AQI
            const latestEnv = await storage.getLatestEnvironmentalReading(userId);
            
            // Parse numeric values - use 0 for missing data from Terra API integration
            const activity = entry.activity ? (typeof entry.activity === 'string' ? parseFloat(entry.activity) : entry.activity) : 0;
            const recovery = entry.recovery ? (typeof entry.recovery === 'string' ? parseFloat(entry.recovery) : entry.recovery) : 0;
            const strain = entry.strain ? (typeof entry.strain === 'string' ? parseFloat(entry.strain) : entry.strain) : 0;
            const sleep = entry.sleepHours ? (typeof entry.sleepHours === 'string' ? parseFloat(entry.sleepHours) : entry.sleepHours) : 0;
            
            // Create snapshot only with real data
            const snapshotData = {
              userId,
              glucose: entry.glucose,
              activity: (isNaN(activity) ? 0 : activity).toString(),
              recovery: (isNaN(recovery) ? 0 : recovery).toString(),
              strain: (isNaN(strain) ? 0 : strain).toString(),
              aqi: latestEnv?.aqi || 0,
              heartRate: entry.heartRate || 0,
              sleep: (isNaN(sleep) ? 0 : sleep).toString(),
              patternHash: `${entry.glucose}-${Date.now()}`,
              healthNotes: entry.notes || null,
            };

            await storage.createBioSignatureSnapshot(snapshotData);
            console.log(`Auto-created bio signature snapshot for user ${userId} with real data`);
          }
        } catch (snapshotError) {
          console.error("Failed to create bio signature snapshot:", snapshotError);
          // Don't fail the health entry if snapshot creation fails
        }
      }

      res.json(entry);
    } catch (error) {
      console.error("Error creating health entry:", error);
      res.status(500).json({ error: "Failed to create health entry" });
    }
  });

  app.get("/api/health-entries", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const entries = await storage.getUserHealthEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching health entries:", error);
      res.status(500).json({ error: "Failed to fetch health entries" });
    }
  });

  app.get("/api/health-entries/latest", async (req, res) => {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const entry = await storage.getLatestHealthEntry(userId);
      res.json(entry || null);
    } catch (error) {
      console.error("Error fetching latest health entry:", error);
      res.status(500).json({ error: "Failed to fetch latest health entry" });
    }
  });

  // Environmental Readings API
  app.post("/api/environmental-readings", async (req, res) => {
    try {
      console.log("Received environmental reading:", JSON.stringify(req.body, null, 2));
      const validation = insertEnvironmentalReadingSchema.safeParse(req.body);
      if (!validation.success) {
        console.error("Validation failed:", JSON.stringify(validation.error, null, 2));
        return res.status(400).json({ 
          error: fromZodError(validation.error).message 
        });
      }

      const reading = await storage.createEnvironmentalReading(validation.data);
      res.json(reading);
    } catch (error) {
      console.error("Error creating environmental reading:", error);
      res.status(500).json({ error: "Failed to create environmental reading" });
    }
  });

  app.get("/api/environmental-readings", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const readings = await storage.getUserEnvironmentalReadings(userId, limit);
      res.json(readings);
    } catch (error) {
      console.error("Error fetching environmental readings:", error);
      res.status(500).json({ error: "Failed to fetch environmental readings" });
    }
  });

  app.get("/api/environmental-readings/latest", async (req, res) => {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const reading = await storage.getLatestEnvironmentalReading(userId);
      res.json(reading || null);
    } catch (error) {
      console.error("Error fetching latest environmental reading:", error);
      res.status(500).json({ error: "Failed to fetch latest environmental reading" });
    }
  });

  app.get("/api/environmental-readings/recent", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const hoursAgo = req.query.hoursAgo ? parseInt(req.query.hoursAgo as string) : 24;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const readings = await storage.getRecentEnvironmentalReadings(userId, hoursAgo);
      res.json(readings);
    } catch (error) {
      console.error("Error fetching recent environmental readings:", error);
      res.status(500).json({ error: "Failed to fetch recent environmental readings" });
    }
  });

  // Environmental data endpoint - EPA AirNow API integration
  app.get("/api/environmental", async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    try {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const apiKey = process.env.AIRNOW_API_KEY;

      if (!apiKey) {
        console.warn("AIRNOW_API_KEY not configured, using mock data");
        throw new Error("API key not configured");
      }

      // Fetch air quality data from EPA AirNow API
      const airnowUrl = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${latitude}&longitude=${longitude}&distance=50&API_KEY=${apiKey}`;
      
      const response = await fetch(airnowUrl);
      
      if (!response.ok) {
        console.error(`AirNow API error: ${response.status} ${response.statusText}`);
        throw new Error("AirNow API request failed");
      }

      const data = await response.json();

      // AirNow returns array of observations (O3, PM2.5, PM10, etc.)
      // Extract relevant pollutants
      let aqi = 0;
      let pm25 = 0;
      let pm10 = 0;
      let o3 = 0;

      if (Array.isArray(data) && data.length > 0) {
        data.forEach((observation: any) => {
          const param = observation.ParameterName;
          const value = observation.AQI || 0;

          if (param === "PM2.5") {
            pm25 = value;
            aqi = Math.max(aqi, value);
          } else if (param === "PM10") {
            pm10 = value;
            aqi = Math.max(aqi, value);
          } else if (param === "O3") {
            o3 = value;
            aqi = Math.max(aqi, value);
          }
        });
      } else {
        console.warn("No AirNow data available for location, using fallback");
        throw new Error("No data available");
      }

      const responseData = {
        aqi,
        pm25,
        pm10,
        so2: 0, // Not provided by AirNow basic endpoint
        no2: 0,
        nox: 0,
        co: 0,
        o3,
        vocs: 0, // Not provided by AirNow
        radon: 0, // Not provided by AirNow
        timestamp: new Date().toISOString(),
        location: {
          latitude,
          longitude,
        },
      };

      res.json(responseData);
    } catch (error) {
      console.error("Error fetching environmental data:", error);
      // Return error - no fake data
      res.status(503).json({ 
        error: "Environmental data unavailable. Please ensure AIRNOW_API_KEY is configured or check your location permissions." 
      });
    }
  });

  // Reverse geocoding endpoint - convert coordinates to city name
  app.get("/api/geocode/reverse", async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    try {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      // Use BigDataCloud free reverse geocoding API (no key required for client-side)
      const geocodeUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      
      const response = await fetch(geocodeUrl);
      
      if (!response.ok) {
        throw new Error("Geocoding API request failed");
      }

      const data = await response.json();

      // Extract city and state information
      const city = data.city || data.locality || "Unknown";
      const state = data.principalSubdivision || "";
      const country = data.countryName || "";

      res.json({
        city,
        state,
        country,
        formatted: state ? `${city}, ${state}` : city,
        latitude,
        longitude,
      });
    } catch (error) {
      console.error("Error fetching geocoding data:", error);
      res.status(500).json({ error: "Failed to fetch location data" });
    }
  });

  // Comprehensive environmental data endpoint (all 7 categories)
  app.get("/api/environmental/comprehensive", async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    // Comprehensive environmental data requires multiple API integrations
    // Currently not available - users should manually enter indoor data or connect devices
    // TODO: Integrate with multiple APIs for comprehensive data:
    // - Air: OpenWeatherMap, IQAir, or indoor air quality devices (Awair, PurpleAir, etc.)
    // - Noise: NoiseCapture API, local sensors
    // - Water: EPA Water Quality Portal, local utilities
    // - Soil: USDA Soil Data, regional databases
    // - Light: Light Pollution Map API
    // - Thermal: OpenWeatherMap, local weather stations
    // - Radioactive: EPA RadNet, local monitoring
    
    res.status(503).json({ 
      error: "Comprehensive environmental data not yet available. Please use manual entry or connect indoor air quality devices in Account settings." 
    });
  });

  // Terra API Integration Routes
  app.post("/api/user-credentials", async (req, res) => {
    try {
      // Use partial schema to accept partial updates (e.g., only Awair without Terra)
      const partialSchema = insertUserApiCredentialsSchema.partial().required({ userId: true });
      const validation = partialSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: fromZodError(validation.error).message 
        });
      }

      // Fetch existing credentials to merge with new data
      const existing = await storage.getUserApiCredentials(validation.data.userId);
      
      // Merge existing credentials with new ones to avoid overwriting unrelated fields
      const mergedData = {
        ...existing,
        ...validation.data,
        userId: validation.data.userId,
      };

      const credentials = await storage.upsertUserApiCredentials(mergedData);
      
      // Don't return sensitive keys in response, but indicate which devices are configured
      res.json({
        id: credentials.id,
        userId: credentials.userId,
        // Terra API
        hasDevId: !!credentials.terraDevId,
        hasApiKey: !!credentials.terraApiKey,
        hasWebhookSecret: !!credentials.terraWebhookSecret,
        // Indoor Air Quality devices
        awairApiKey: !!credentials.awairApiKey,
        iqairApiKey: !!credentials.iqairApiKey,
        purpleairApiKey: !!credentials.purpleairApiKey,
        airthingsClientId: !!credentials.airthingsClientId,
        netatmoClientId: !!credentials.netatmoClientId,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      });
    } catch (error) {
      console.error("Error saving user credentials:", error);
      res.status(500).json({ error: "Failed to save credentials" });
    }
  });

  app.get("/api/user-credentials", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const credentials = await storage.getUserApiCredentials(userId);
      
      if (!credentials) {
        return res.json(null);
      }

      // Don't return sensitive keys in response, but indicate which devices are configured
      res.json({
        id: credentials.id,
        userId: credentials.userId,
        // Terra API
        hasDevId: !!credentials.terraDevId,
        hasApiKey: !!credentials.terraApiKey,
        hasWebhookSecret: !!credentials.terraWebhookSecret,
        // Indoor Air Quality devices
        awairApiKey: !!credentials.awairApiKey,
        iqairApiKey: !!credentials.iqairApiKey,
        purpleairApiKey: !!credentials.purpleairApiKey,
        airthingsClientId: !!credentials.airthingsClientId,
        netatmoClientId: !!credentials.netatmoClientId,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      });
    } catch (error) {
      console.error("Error fetching user credentials:", error);
      res.status(500).json({ error: "Failed to fetch credentials" });
    }
  });

  app.post("/api/terra/auth", async (req, res) => {
    try {
      const { userId, mode, provider } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Get user's Terra credentials
      const credentials = await storage.getUserApiCredentials(userId);

      if (!credentials || !credentials.terraDevId || !credentials.terraApiKey) {
        return res.status(400).json({ 
          error: "Terra API credentials not configured. Please add your credentials first." 
        });
      }

      // Initialize Terra client with user's credentials
      const terra = new TerraClient({
        devId: credentials.terraDevId,
        apiKey: credentials.terraApiKey,
      });

      const widgetMode = mode === "labs" ? "labs" : "wearables";
      let providers =
        widgetMode === "labs" ? TERRA_LAB_PROVIDERS : TERRA_WEARABLE_PROVIDERS;

      if (provider && typeof provider === "string") {
        const normalized = provider.toUpperCase();
        const allowed = widgetMode === "labs" ? TERRA_LAB_PROVIDERS : TERRA_WEARABLE_PROVIDERS;
        if (allowed.includes(normalized)) {
          providers = [normalized];
        }
      }

      // Generate widget session for Terra providers
      const session = await terra.authentication.generatewidgetsession({
        reference_id: userId,
        providers: providers.join(","),
        language: "en",
      });

      res.json({
        url: session.url,
        sessionId: session.session_id,
      });
    } catch (error) {
      console.error("Error generating Terra auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/connected-devices", async (req, res) => {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const devices = await storage.getConnectedDevices(userId);
      res.json(devices);
    } catch (error) {
      console.error("Error fetching connected devices:", error);
      res.status(500).json({ error: "Failed to fetch connected devices" });
    }
  });

  // Notes API Routes
  app.post("/api/notes", async (req, res) => {
    try {
      const validation = insertNoteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const note = await storage.createNote(validation.data);
      res.json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  app.get("/api/notes", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const notes = await storage.getUserNotes(userId, limit);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validate allowed update fields
      const allowedFields = ['content', 'hasNotification', 'notificationContext', 'notificationTrigger', 'isCompleted'];
      const validatedUpdates: any = {};
      
      for (const key of Object.keys(updates)) {
        if (allowedFields.includes(key)) {
          validatedUpdates[key] = updates[key];
        }
      }

      if (Object.keys(validatedUpdates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const note = await storage.updateNote(id, validatedUpdates);
      res.json(note);
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteNote(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting note:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // Bio Signature Snapshot Routes
  app.post("/api/bio-signature/snapshot", async (req, res) => {
    try {
      const validation = insertBioSignatureSnapshotSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }

      const snapshot = await storage.createBioSignatureSnapshot(validation.data);
      res.json(snapshot);
    } catch (error) {
      console.error("Error creating bio signature snapshot:", error);
      res.status(500).json({ error: "Failed to create snapshot" });
    }
  });

  app.get("/api/bio-signature/history", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const snapshots = await storage.getUserBioSignatureSnapshots(userId, limit);
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching bio signature history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // AI Insights Routes using Anthropic Claude
  app.post("/api/synergy-insights", async (req, res) => {
    try {
      const { userId, synergyLevel, healthData, environmentalData } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Initialize Anthropic client with Replit AI Integrations
      const anthropic = new Anthropic({
        apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
      });

      const prompt = `You are a health data analyst for Xuunu, a health tracking app for people with diabetes and chronic illness.

User's Current Data:
- Environmental Synergy Level: ${synergyLevel}%
- Glucose: ${healthData?.glucose || 'N/A'} mg/dL
- Activity: ${healthData?.activity || 'N/A'} hours
- Recovery: ${healthData?.recovery || 'N/A'}%
- Strain: ${healthData?.strain || 'N/A'}
- AQI: ${environmentalData?.aqi || 'N/A'}
- Temperature: ${environmentalData?.temperature || 'N/A'}°F
- Humidity: ${environmentalData?.humidity || 'N/A'}%

The Environmental Synergy Level (${synergyLevel}%) indicates how well the user's health metrics align with their environmental conditions.

Provide concise, actionable insights in 2-3 sentences:
1. What the synergy level means for their health today
2. One specific recommendation to improve their synergy
3. One environmental factor to monitor

Be supportive and clinical. Focus on diabetes management and chronic illness.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      });

      const insights = message.content[0].type === "text" ? message.content[0].text : "";

      res.json({ insights });
    } catch (error: any) {
      console.error("Error generating synergy insights:", error);
      res.status(500).json({ error: error.message || "Failed to generate insights" });
    }
  });

  app.post("/api/bio-signature/insights", async (req, res) => {
    try {
      const { userId, currentData, historicalSnapshots } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
      });

      const latestSnapshot = historicalSnapshots?.[0];
      const optimalSnapshot = historicalSnapshots?.find((s: any) => s.healthNotes?.includes("optimal")) || latestSnapshot;

      const prompt = `You are a health data analyst for Xuunu analyzing bio signature patterns for chronic illness management.

Current Bio Signature:
- Glucose: ${currentData?.glucose || 'N/A'} mg/dL
- Activity: ${currentData?.activity || 'N/A'} hrs
- Recovery: ${currentData?.recovery || 'N/A'}%
- Strain: ${currentData?.strain || 'N/A'}
- AQI: ${currentData?.aqi || 'N/A'}
- Heart Rate: ${currentData?.heartRate || 'N/A'} bpm
- Sleep: ${currentData?.sleep || 'N/A'} hrs

${latestSnapshot ? `Last 7-Day Snapshot (${new Date(latestSnapshot.createdAt).toLocaleDateString()}):
- Glucose: ${latestSnapshot.glucose} mg/dL
- Recovery: ${latestSnapshot.recovery}%
- Sleep: ${latestSnapshot.sleep} hrs` : 'No previous snapshots available.'}

${optimalSnapshot && optimalSnapshot !== latestSnapshot ? `Optimal Health Period:
- This occurred on ${new Date(optimalSnapshot.createdAt).toLocaleDateString()}
- Glucose: ${optimalSnapshot.glucose} mg/dL
- Recovery: ${optimalSnapshot.recovery}%
- Sleep: ${optimalSnapshot.sleep} hrs` : ''}

Provide brief insights in 2-3 sentences:
1. How current bio signature compares to 7-day evolution
2. What deviation from optimal health means
3. One actionable recommendation

Be supportive and focus on diabetes/chronic illness management.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      });

      const insights = message.content[0].type === "text" ? message.content[0].text : "";

      res.json({ insights });
    } catch (error: any) {
      console.error("Error generating bio signature insights:", error);
      res.status(500).json({ error: error.message || "Failed to generate insights" });
    }
  });

  // Medications API
  app.post("/api/medications", async (req, res) => {
    try {
      const validation = insertMedicationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: fromZodError(validation.error).message 
        });
      }

      const medication = await storage.createMedication(validation.data);
      res.json(medication);
    } catch (error) {
      console.error("Error creating medication:", error);
      res.status(500).json({ error: "Failed to create medication" });
    }
  });

  app.get("/api/medications", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: "userId is required" });
      }
      const medications = await storage.getMedicationsByUserId(userId);
      res.json(medications);
    } catch (error) {
      console.error("Error fetching medications:", error);
      res.status(500).json({ error: "Failed to fetch medications" });
    }
  });

  app.patch("/api/medications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Verify ownership before update
      const existing = await storage.getMedicationById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Medication not found" });
      }

      // Validate updates (excluding userId and isActive from client)
      const updateSchema = insertMedicationSchema.partial().omit({ userId: true });
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: fromZodError(validation.error).message 
        });
      }

      const medication = await storage.updateMedication(id, validation.data);
      res.json(medication);
    } catch (error) {
      console.error("Error updating medication:", error);
      res.status(500).json({ error: "Failed to update medication" });
    }
  });

  app.delete("/api/medications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: "userId is required" });
      }

      // Verify ownership before delete
      const existing = await storage.getMedicationById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Medication not found" });
      }

      await storage.deleteMedication(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting medication:", error);
      res.status(500).json({ error: "Failed to delete medication" });
    }
  });

  // Medication Logs API
  app.post("/api/medication-logs", async (req, res) => {
    try {
      const validation = insertMedicationLogSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: fromZodError(validation.error).message 
        });
      }

      // Verify medication ownership before logging
      const medication = await storage.getMedicationById(validation.data.medicationId);
      if (!medication || medication.userId !== validation.data.userId) {
        return res.status(404).json({ error: "Medication not found" });
      }

      const log = await storage.createMedicationLog(validation.data);
      res.json(log);
    } catch (error) {
      console.error("Error creating medication log:", error);
      res.status(500).json({ error: "Failed to log medication" });
    }
  });

  app.get("/api/medication-logs", async (req, res) => {
    try {
      const { userId, medicationId, startDate, endDate } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: "userId is required" });
      }
      
      const logs = await storage.getMedicationLogs(
        userId,
        medicationId as string | undefined,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(logs);
    } catch (error) {
      console.error("Error fetching medication logs:", error);
      res.status(500).json({ error: "Failed to fetch medication logs" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
