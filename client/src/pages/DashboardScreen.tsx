import BioSignature from "@/components/BioSignature";
import BioSignatureDialog from "@/components/BioSignatureDialog";
import MedicationQuickLog from "@/components/MedicationQuickLog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Database, ChevronRight, Pill, Watch, Droplets, Wind } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { HealthEntry, EnvironmentalReading } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getDeviceMetric, saveDeviceMetric } from "@/lib/deviceMetricsStore";
import { useToast } from "@/hooks/use-toast";
import { seedInitialData } from "@/lib/localStore";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const PAID_ACCOUNT_EMAIL = "agnishikha@yahoo.com";
const HOME_REFRESH_DOC = "homeRefresh";
const MAX_DAILY_REFRESHES = 2;

interface DashboardScreenProps {
  onNavigate?: (tab: string) => void;
  onOpenProfile?: () => void;
  onTrackClick?: () => void;
}

export default function DashboardScreen({ onNavigate, onOpenProfile }: DashboardScreenProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showBioSignatureDialog, setShowBioSignatureDialog] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const [strengthDialog, setStrengthDialog] = useState(false);
  const [cardioDialog, setCardioDialog] = useState(false);
  const [strengthMinutes, setStrengthMinutes] = useState("");
  const [cardioMinutes, setCardioMinutes] = useState("");
  const [refreshingMetric, setRefreshingMetric] = useState<string | null>(null);
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
  const [isPaidAccount, setIsPaidAccount] = useState(false);
  const [firestorePaidStatus, setFirestorePaidStatus] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [challengeCompletionRate, setChallengeCompletionRate] = useState(0);
  const env = import.meta.env as Record<string, string | undefined>;
  const stripePortalUrl = env.VITE_STRIPE_PAYMENT_URL;
  const stripeMonthlyUrl = env.VITE_STRIPE_MONTHLY_URL;
  const stripeYearlyUrl = env.VITE_STRIPE_YEARLY_URL;

  const {
    data: latestHealth,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useQuery<HealthEntry | null>({
    queryKey: [`/api/health-entries/latest?userId=${user?.uid}`],
    enabled: false,
  });

  const {
    data: latestEnv,
    isLoading: envLoading,
    refetch: refetchEnv,
  } = useQuery<EnvironmentalReading | null>({
    queryKey: [`/api/environmental-readings/latest?userId=${user?.uid}`],
    enabled: false,
  });
  useEffect(() => {
    if (!user?.uid) return;
    let isActive = true;
    const primeCache = async () => {
      const [cachedHealth, cachedEnv] = await Promise.all([
        getDeviceMetric<HealthEntry | null>(`latest-health-${user.uid}`),
        getDeviceMetric<EnvironmentalReading | null>(`latest-env-${user.uid}`),
      ]);
      if (!isActive) return;
      if (cachedHealth) {
        queryClient.setQueryData(
          [`/api/health-entries/latest?userId=${user.uid}`],
          cachedHealth
        );
      }
      if (cachedEnv) {
        queryClient.setQueryData(
          [`/api/environmental-readings/latest?userId=${user.uid}`],
          cachedEnv
        );
      }
    };
    void primeCache();
    return () => {
      isActive = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !latestHealth) return;
    void saveDeviceMetric(`latest-health-${user.uid}`, latestHealth);
  }, [latestHealth, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !latestEnv) return;
    void saveDeviceMetric(`latest-env-${user.uid}`, latestEnv);
  }, [latestEnv, user?.uid]);

  const { data: recentHealthEntries = [] } = useQuery<HealthEntry[]>({
    queryKey: [`/api/health-entries?userId=${user?.uid}&limit=7`],
    enabled: !!user?.uid,
  });

  const averageMetric = (values: Array<number | undefined>) => {
    const usable = values.filter((value) => typeof value === "number" && Number.isFinite(value)) as number[];
    if (usable.length === 0) return 0;
    return usable.reduce((sum, value) => sum + value, 0) / usable.length;
  };

  const asNumber = (value: unknown) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const { data: featureFlags } = useQuery<{
    paidStatus: boolean;
    cardLast4?: string | null;
    hasCustomer?: boolean;
  }>({
    queryKey: [`/api/user-features?userId=${user?.uid}`],
    enabled: !!user?.uid,
  });

  useEffect(() => {
    if (!user?.uid) {
      setChallengeCompletionRate(0);
      return;
    }
    let isActive = true;
    const loadChallenges = async () => {
      try {
        const ref = collection(db, "users", user.uid, "challenges");
        const challengeQuery = query(ref, orderBy("endedAt", "desc"), limit(20));
        const snapshot = await getDocs(challengeQuery);
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const completed = snapshot.docs.filter((docSnap) => {
          const endedAt = docSnap.data().endedAt as string | undefined;
          const endedMs = endedAt ? new Date(endedAt).getTime() : NaN;
          return Number.isFinite(endedMs) && endedMs >= cutoff;
        });
        const rate = Math.min(1, completed.length / 7);
        if (isActive) setChallengeCompletionRate(rate);
      } catch (error) {
        console.error("Failed to load challenges:", error);
        if (isActive) setChallengeCompletionRate(0);
      }
    };
    void loadChallenges();
    return () => {
      isActive = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || healthLoading || envLoading) return;
    if (!latestHealth && !latestEnv) {
      let isActive = true;
      const seedAndRefresh = async () => {
        try {
          await seedInitialData(user.uid);
        } catch (error) {
          console.error("Failed to seed initial data:", error);
        }
        if (!isActive) return;
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [`/api/health-entries/latest?userId=${user.uid}`],
          }),
          queryClient.invalidateQueries({
            queryKey: [`/api/environmental-readings/latest?userId=${user.uid}`],
          }),
        ]);
      };
      void seedAndRefresh();
      return () => {
        isActive = false;
      };
    }
    return undefined;
  }, [user?.uid, latestHealth, latestEnv, healthLoading, envLoading]);

  const createEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/health-entries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/health-entries/latest?userId=${user?.uid}`] });
      toast({
        title: "Health data saved",
        description: "Your entry has been recorded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save health data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const refreshAqiFromLocation = async () => {
    if (!user?.uid) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    const cacheKey = `xuunu-login-aqi-${user.uid}`;
    if (sessionStorage.getItem(cacheKey)) return;
    sessionStorage.setItem(cacheKey, "requested");
    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (value) => resolve(value),
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 6 * 60 * 60 * 1000,
        }
      );
    });
    if (!position) return;
    try {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const response = await fetch(`/api/environmental?lat=${latitude}&lng=${longitude}`);
      if (!response.ok) {
        throw new Error("Environmental API unavailable");
      }
      const data = await response.json();
      await apiRequest("POST", "/api/environmental-readings", {
        userId: user.uid,
        locationMode: "auto",
        latitude,
        longitude,
        aqi: data.aqi ?? null,
        pm25: data.pm25 ?? null,
        pm10: data.pm10 ?? null,
        so2: data.so2 ?? null,
        no2: data.no2 ?? null,
        nox: data.nox ?? null,
        co: data.co ?? null,
        o3: data.o3 ?? null,
        vocs: data.vocs ?? null,
        radon: data.radon ?? null,
      });
      const updated: EnvironmentalReading = {
        id: "latest",
        userId: user.uid,
        timestamp: new Date().toISOString(),
        locationMode: "auto",
        aqi: data.aqi ?? null,
        temperature: null,
        humidity: null,
      };
      queryClient.setQueryData(
        [`/api/environmental-readings/latest?userId=${user.uid}`],
        updated
      );
      void saveDeviceMetric(`latest-env-${user.uid}`, updated);
    } catch (error) {
      console.error("AQI refresh failed:", error);
    }
  };

  const consumeDailyRefresh = async () => {
    if (!user?.uid) {
      return { allowed: false, count: 0 };
    }
    const today = new Date().toISOString().slice(0, 10);
    let refreshCount = 0;
    let storedDate = today;
    try {
      const refreshRef = doc(db, "users", user.uid, "meta", HOME_REFRESH_DOC);
      const snapshot = await getDoc(refreshRef);
      const data = snapshot.data() as { date?: string; count?: number } | undefined;
      if (data?.date === today && typeof data.count === "number") {
        refreshCount = data.count;
        storedDate = data.date;
      }
    } catch {
      refreshCount = 0;
    }

    if (storedDate !== today) {
      refreshCount = 0;
    }

    if (refreshCount >= MAX_DAILY_REFRESHES) {
      return { allowed: false, count: refreshCount };
    }

    const nextCount = refreshCount + 1;
    try {
      const refreshRef = doc(db, "users", user.uid, "meta", HOME_REFRESH_DOC);
      await setDoc(
        refreshRef,
        { date: today, count: nextCount, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {
      // Ignore storage failures.
    }
    return { allowed: true, count: nextCount };
  };

  const refreshHomeData = async (source: "login" | "manual", metricId?: string) => {
    if (!user || refreshingMetric) return;
    const refreshState = await consumeDailyRefresh();
    if (!refreshState.allowed) {
      if (source === "manual") {
        toast({
          title: "Refresh limited",
          description: "Updates run twice daily on login to reduce API usage.",
        });
      }
      return;
    }
    if (source === "manual" && metricId) {
      setRefreshingMetric(metricId);
    }
    try {
      if (source === "login") {
        void refreshAqiFromLocation();
      }
      await Promise.all([refetchHealth(), refetchEnv()]);
      if (source === "manual") {
        toast({
          title: "Data refreshed",
          description: `Refresh ${refreshState.count}/${MAX_DAILY_REFRESHES} for today.`,
        });
      }
    } finally {
      if (source === "manual" && metricId) {
        setRefreshingMetric(null);
      }
    }
  };

  const handleMetricRefresh = async (metricId: string) => {
    if (!user || refreshingMetric) return;
    toast({
      title: "Refresh scheduled",
      description: "Metrics refresh twice daily on login to reduce API usage.",
    });
  };

  const handleOpenPaymentPortal = async (plan?: "monthly" | "yearly") => {
    const planUrl =
      plan === "monthly" ? stripeMonthlyUrl : plan === "yearly" ? stripeYearlyUrl : undefined;
    const fallbackUrl =
      planUrl || stripePortalUrl || stripeMonthlyUrl || stripeYearlyUrl || "https://stripe.com";
    if (!user?.uid) {
      window.open(fallbackUrl, "_blank");
      return;
    }
    try {
      const response = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        userId: user.uid,
        plan: plan ?? "monthly",
      });
      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (error) {
      console.error("Stripe checkout failed:", error);
    }
    window.open(fallbackUrl, "_blank");
    toast({
      title: "Premium membership",
      description:
        plan === "monthly"
          ? "Stripe monthly • $9.99/month."
          : plan === "yearly"
            ? "Stripe yearly • $99/year."
            : "Powered by Stripe • $9.99/month or $99/year.",
    });
  };

  const handleManageBilling = async () => {
    if (!user?.uid) return;
    try {
      const response = await apiRequest("POST", "/api/stripe/create-portal-session", {
        userId: user.uid,
      });
      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (error) {
      console.error("Stripe portal failed:", error);
    }
    toast({
      title: "Billing unavailable",
      description: "We couldn't open the billing portal right now.",
      variant: "destructive",
    });
  };

  const handleSubscribeIntegrations = () => {
    toast({
      title: "Subscribe",
      description: "Subscribe to use integrations.",
    });
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNotificationsClick = async () => {
    if (!user?.uid) return;
    const nextEnabled = !notificationsEnabled;
    await setDoc(
      doc(db, "users", user.uid),
      { notificationsEnabled: nextEnabled },
      { merge: true }
    );
    setNotificationsEnabled(nextEnabled);
    toast({
      title: nextEnabled ? "In-app notifications enabled" : "Notifications muted",
      description: nextEnabled
        ? "You'll see alerts while the app is open."
        : "You can re-enable notifications anytime.",
    });
  };

  const handleOpenProfile = () => {
    onOpenProfile?.();
    onNavigate?.("data");
  };

  const handleStrengthSubmit = () => {
    if (!strengthMinutes || !user) return;
    createEntryMutation.mutate({
      userId: user.uid,
      strain: parseFloat(strengthMinutes),
    });
    setStrengthMinutes("");
    setStrengthDialog(false);
  };

  const handleCardioSubmit = () => {
    if (!cardioMinutes || !user) return;
    createEntryMutation.mutate({
      userId: user.uid,
      activity: parseFloat(cardioMinutes),
    });
    setCardioMinutes("");
    setCardioDialog(false);
  };

  useEffect(() => {
    if (user?.email) {
      setSupportEmail(user.email);
    }
  }, [user?.email]);

  const handleSupportSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!supportEmail.trim() || !supportMessage.trim()) {
      toast({
        title: "Missing details",
        description: "Please add your email and question before sending.",
        variant: "destructive",
      });
      return;
    }

    const subject = "Xuunu Support Request";
    const body = [
      `From: ${supportEmail}`,
      `User ID: ${user?.uid || "n/a"}`,
      "",
      "Question:",
      supportMessage.trim(),
    ].join("\n");

    window.location.href = `mailto:agni@xuunu.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    toast({
      title: "Opening email client",
      description: "Send the email to reach our support team.",
    });
    setSupportMessage("");
  };

  const hasRecentHealth = recentHealthEntries.length > 0;
  // Biosignature represents past 7 days where available
  const healthData = {
    glucose: hasRecentHealth
      ? averageMetric(recentHealthEntries.map((entry) => asNumber(entry.glucose)))
      : latestHealth?.glucose || 0,
    activity: hasRecentHealth
      ? averageMetric(recentHealthEntries.map((entry) => asNumber(entry.activity)))
      : latestHealth?.activity
        ? Number(latestHealth.activity)
        : 0,
    recovery: hasRecentHealth
      ? averageMetric(recentHealthEntries.map((entry) => asNumber(entry.recovery)))
      : latestHealth?.recovery
        ? Number(latestHealth.recovery)
        : 0,
    strain: hasRecentHealth
      ? averageMetric(recentHealthEntries.map((entry) => asNumber(entry.strain)))
      : latestHealth?.strain
        ? Number(latestHealth.strain)
        : 0,
    aqi: latestEnv?.aqi || 0,
    heartRate: hasRecentHealth
      ? averageMetric(recentHealthEntries.map((entry) => asNumber(entry.heartRate)))
      : latestHealth?.heartRate || 0,
    sleep: hasRecentHealth
      ? averageMetric(recentHealthEntries.map((entry) => asNumber(entry.sleepHours)))
      : latestHealth?.sleepHours
        ? parseFloat(latestHealth.sleepHours.toString())
        : 0,
    challengeCompletion: challengeCompletionRate,
  };

  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setDisplayNameOverride(null);
      setIsPaidAccount(false);
      setFirestorePaidStatus(false);
      setNotificationsEnabled(false);
      return;
    }
    const emailPaid =
      user.email?.toLowerCase() === PAID_ACCOUNT_EMAIL.toLowerCase();
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data() ?? {};
        setDisplayNameOverride(
          typeof data.displayNameOverride === "string" ? data.displayNameOverride : null
        );
        setFirestorePaidStatus(!!data.paidStatus);
        setNotificationsEnabled(!!data.notificationsEnabled);
      },
      () => {
        setDisplayNameOverride(null);
        setFirestorePaidStatus(false);
        setNotificationsEnabled(false);
      }
    );
    return unsubscribe;
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (!user?.uid) return;
    const emailPaid =
      user.email?.toLowerCase() === PAID_ACCOUNT_EMAIL.toLowerCase();
    const serverPaid = !!featureFlags?.paidStatus;
    const paid = emailPaid || serverPaid || firestorePaidStatus;
    setIsPaidAccount(paid);
    if (featureFlags && firestorePaidStatus !== serverPaid) {
      void setDoc(
        doc(db, "users", user.uid),
        { paidStatus: serverPaid },
        { merge: true }
      );
    }
  }, [user?.uid, user?.email, featureFlags, firestorePaidStatus]);

  useEffect(() => {
    if (!user?.uid) return;
    void refreshHomeData("login");
  }, [user?.uid]);

  const displayName =
    displayNameOverride || user?.displayName || user?.email?.split("@")[0] || "Member";
  const integrationsLocked = !isPaidAccount;

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenProfile}
              className="rounded-full"
              data-testid="button-open-profile"
            >
              <div className="flex flex-col items-center gap-1">
                <ProfileAvatar
                  className={`h-20 w-20 ${
                    isPaidAccount ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""
                  }`}
                />
                <span className="text-2xl font-bold">{displayName}</span>
              </div>
            </button>
            <div className="text-xs text-white/60">{formattedDate}</div>
          </div>
          <button
            onClick={() => setShowBioSignatureDialog(true)}
            className="text-xs uppercase tracking-widest text-primary hover-elevate active-elevate-2 px-4 py-2 rounded-full border border-primary/30"
            data-testid="button-open-bio-sygnature"
          >
            Bio SYGnature
          </button>
        </div>

        <div className="flex items-center justify-center pt-4 pb-4">
          <button
            onClick={() => setShowBioSignatureDialog(true)}
            className="hover-elevate active-elevate-2 rounded-lg transition-all"
            data-testid="button-open-bio-signature"
          >
            <BioSignature healthData={healthData} size={280} />
          </button>
        </div>

        {/* Bio Signature Dialog */}
        {user && (
          <BioSignatureDialog
            open={showBioSignatureDialog}
            onOpenChange={setShowBioSignatureDialog}
            healthData={healthData}
            userId={user.uid}
          />
        )}

        {healthLoading || envLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Health Metrics */}
            <div>
              <div className="text-xs uppercase tracking-widest opacity-40 mb-4">HEALTH METRICS</div>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleMetricRefresh("glucose")}
                  data-testid="card-glucose"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>Glucose</span>
                      {refreshingMetric === "glucose" && (
                        <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                      )}
                    </div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.glucose || "--"}
                    </div>
                    {latestHealth?.glucose && <div className="text-xs opacity-60 mt-1">mg/dL</div>}
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleMetricRefresh("hrv")}
                  data-testid="card-hrv"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>HRV</span>
                      {refreshingMetric === "hrv" && (
                        <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                      )}
                    </div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.hrv || "--"}
                    </div>
                    {latestHealth?.hrv && <div className="text-xs opacity-60 mt-1">ms</div>}
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleMetricRefresh("sleep")}
                  data-testid="card-sleep"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>Sleep</span>
                      {refreshingMetric === "sleep" && (
                        <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                      )}
                    </div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.sleepHours ? parseFloat(latestHealth.sleepHours.toString()).toFixed(1) : "--"}
                    </div>
                    {latestHealth?.sleepHours && <div className="text-xs opacity-60 mt-1">hours</div>}
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleMetricRefresh("blood-pressure")}
                  data-testid="card-bp"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>Blood Pressure</span>
                      {refreshingMetric === "blood-pressure" && (
                        <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                      )}
                    </div>
                    <div className="text-2xl font-bold font-mono text-primary">
                      {latestHealth?.bloodPressureSystolic && latestHealth?.bloodPressureDiastolic
                        ? `${latestHealth.bloodPressureSystolic}/${latestHealth.bloodPressureDiastolic}`
                        : "--"}
                    </div>
                    {latestHealth?.bloodPressureSystolic && <div className="text-xs opacity-60 mt-1">mmHg</div>}
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleMetricRefresh("heart-rate")}
                  data-testid="card-heart-rate"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>Heart Rate</span>
                      {refreshingMetric === "heart-rate" && (
                        <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                      )}
                    </div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.heartRate || "--"}
                    </div>
                    {latestHealth?.heartRate && <div className="text-xs opacity-60 mt-1">bpm</div>}
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleMetricRefresh("steps")}
                  data-testid="card-steps"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>Steps</span>
                      {refreshingMetric === "steps" && (
                        <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                      )}
                    </div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.steps ? latestHealth.steps.toLocaleString() : "--"}
                    </div>
                    {latestHealth?.steps && <div className="text-xs opacity-60 mt-1">today</div>}
                  </CardContent>
                </Card>

                <Dialog open={strengthDialog} onOpenChange={setStrengthDialog}>
                  <DialogTrigger asChild>
                    <Card
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => handleMetricRefresh("strength")}
                      data-testid="card-strength"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                          <span>Strength Training</span>
                          {refreshingMetric === "strength" && (
                            <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                          )}
                        </div>
                        <div className="text-3xl font-bold font-mono text-primary">
                          {latestHealth?.strain ? Number(latestHealth.strain).toFixed(0) : "--"}
                        </div>
                        {latestHealth?.strain && <div className="text-xs opacity-60 mt-1">min</div>}
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10">
                    <DialogHeader>
                      <DialogTitle>Log Strength Training</DialogTitle>
                      <DialogDescription>Enter your minutes of strength training</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="strength">Strength Training (min)</Label>
                        <Input
                          id="strength"
                          type="number"
                          value={strengthMinutes}
                          onChange={(e) => setStrengthMinutes(e.target.value)}
                          placeholder="45"
                          className="bg-black border-white/20 mt-2"
                          data-testid="input-strength"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleStrengthSubmit} disabled={createEntryMutation.isPending} data-testid="button-submit-strength">
                        {createEntryMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={cardioDialog} onOpenChange={setCardioDialog}>
                  <DialogTrigger asChild>
                    <Card
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => handleMetricRefresh("cardio")}
                      data-testid="card-cardio"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                          <span>Cardio</span>
                          {refreshingMetric === "cardio" && (
                            <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                          )}
                        </div>
                        <div className="text-3xl font-bold font-mono text-primary">
                          {latestHealth?.activity ? Number(latestHealth.activity).toFixed(0) : "--"}
                        </div>
                        {latestHealth?.activity && <div className="text-xs opacity-60 mt-1">min</div>}
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10">
                    <DialogHeader>
                      <DialogTitle>Log Cardio</DialogTitle>
                      <DialogDescription>Enter your minutes of cardio activity</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="cardio">Cardio (min)</Label>
                        <Input
                          id="cardio"
                          type="number"
                          value={cardioMinutes}
                          onChange={(e) => setCardioMinutes(e.target.value)}
                          placeholder="30"
                          className="bg-black border-white/20 mt-2"
                          data-testid="input-cardio"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCardioSubmit} disabled={createEntryMutation.isPending} data-testid="button-submit-cardio">
                        {createEntryMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Card
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleMetricRefresh("aqi")}
                  data-testid="card-aqi"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>AQI</span>
                      {refreshingMetric === "aqi" && (
                        <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                      )}
                    </div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestEnv?.aqi || "--"}
                    </div>
                    {latestEnv?.aqi && <div className="text-xs opacity-60 mt-1">AQI</div>}
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleMetricRefresh("noise")}
                  data-testid="card-noise"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-60 mb-2">
                      <span>Headphone Noise</span>
                      {refreshingMetric === "noise" && (
                        <Loader2 className="w-3 h-3 animate-spin text-white/60" />
                      )}
                    </div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestEnv?.noiseAverage || latestEnv?.noiseCurrent || "--"}
                    </div>
                    {(latestEnv?.noiseAverage || latestEnv?.noiseCurrent) && (
                      <div className="text-xs opacity-60 mt-1">dB</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

          </>
        )}

        <MedicationQuickLog />

        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs uppercase tracking-widest opacity-40">INTEGRATIONS</div>
              </TooltipTrigger>
              <TooltipContent className="bg-black border-white/10 text-white text-xs">
                Become a premium Member to enable integrations.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Stripe Membership</div>
                <div className="text-xs text-white/50">Choose a plan to unlock integrations.</div>
                  {featureFlags?.cardLast4 && (
                    <div className="text-[11px] text-white/40 mt-1">
                      Card ending in {featureFlags.cardLast4}
                    </div>
                  )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPaymentPortal("monthly")}
                  className="w-full sm:w-auto"
                  data-testid="button-stripe-monthly"
                >
                  $9.99/mo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPaymentPortal("yearly")}
                  className="w-full sm:w-auto"
                  data-testid="button-stripe-yearly"
                >
                  $99/yr
                </Button>
                {featureFlags?.hasCustomer && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageBilling}
                    className="w-full sm:w-auto"
                    data-testid="button-manage-billing"
                  >
                    Manage Billing
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-3">
            {integrationsLocked && (
              <button
                type="button"
                onClick={handleSubscribeIntegrations}
                className="absolute inset-0 z-10 rounded-2xl"
                aria-label="Subscribe to use integrations"
                data-testid="button-subscribe-integrations"
              />
            )}
            <div className={`space-y-3 ${integrationsLocked ? "opacity-50" : ""}`}>
              <button
                className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
                onClick={() => onNavigate?.("medications")}
                data-testid="button-medications"
                disabled={integrationsLocked}
              >
                <div className="flex items-center gap-3">
                  <Pill className="w-5 h-5 text-primary" />
                  <span className="text-sm">Medication Tracker</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
              <button
                className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
                onClick={integrationsLocked ? undefined : handleOpenPaymentPortal}
                disabled={integrationsLocked}
                data-testid="button-device-connections"
              >
                <div className="flex items-center gap-3">
                  <Watch className="w-5 h-5 text-primary" />
                  <span className="text-sm">Device Connections</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
              <div className="space-y-3">
                <button
                  className="w-full min-h-[72px] flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
                  onClick={integrationsLocked ? undefined : handleOpenPaymentPortal}
                  disabled={integrationsLocked}
                  data-testid="button-connect-healthcare-provider"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-primary" />
                    <span className="text-sm">Connect to Health Care Provider</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>
                <button
                  className="w-full min-h-[72px] flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
                  onClick={integrationsLocked ? undefined : handleOpenPaymentPortal}
                  disabled={integrationsLocked}
                  data-testid="button-upload-bloodwork"
                >
                  <div className="flex items-center gap-3">
                    <Droplets className="w-5 h-5 text-primary" />
                    <span className="text-sm">Upload Bloodwork</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>
                <button
                  className="w-full min-h-[72px] flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
                  onClick={integrationsLocked ? undefined : handleOpenPaymentPortal}
                  disabled={integrationsLocked}
                  data-testid="button-connect-indoor-air"
                >
                  <div className="flex items-center gap-3">
                    <Wind className="w-5 h-5 text-primary" />
                    <span className="text-sm">Connect to Indoor Air Quality</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-3 mt-3">
            <button
              className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
              onClick={handleNotificationsClick}
              data-testid="button-notifications"
            >
              <span className="text-sm">Notifications</span>
              <span className="text-xs opacity-60">
                {notificationsEnabled ? "Enabled" : "Disabled"}
              </span>
            </button>
            <button
              className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
              onClick={() =>
                window.open(
                  "https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html",
                  "_blank"
                )
              }
              data-testid="button-privacy"
            >
              <span className="text-sm">Privacy & Data</span>
              <span className="text-xs opacity-60">→</span>
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Support
            </h3>
            <p className="text-xs text-white/50">
              Send a support request to agni@xuunu.com.
            </p>
          </div>
          <form className="space-y-3" onSubmit={handleSupportSubmit}>
            <div className="space-y-2">
              <Label htmlFor="support-email" className="text-xs text-white/60">
                Your Email
              </Label>
              <Input
                id="support-email"
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                placeholder="you@example.com"
                className="bg-black/40 border-white/10"
                data-testid="input-support-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-message" className="text-xs text-white/60">
                Your Question
              </Label>
              <Textarea
                id="support-message"
                value={supportMessage}
                onChange={(event) => setSupportMessage(event.target.value)}
                placeholder="How can we help?"
                className="bg-black/40 border-white/10 text-white"
                rows={4}
                data-testid="input-support-message"
              />
            </div>
            <Button type="submit" className="w-full" data-testid="button-send-support">
              Email Support
            </Button>
          </form>
        </section>

        <div className="pt-4 flex justify-center">
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="h-11 px-6 rounded-full w-auto"
            data-testid="button-logout"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
