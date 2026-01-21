import EnvironmentalSynergyRing from "@/components/EnvironmentalSynergyRing";
import BioSignature from "@/components/BioSignature";
import SynergyInsightsDialog from "@/components/SynergyInsightsDialog";
import BioSignatureDialog from "@/components/BioSignatureDialog";
import MedicationQuickLog from "@/components/MedicationQuickLog";
import EnvironmentalMap from "@/components/EnvironmentalMap";
import HourlyImpactTracker from "@/components/HourlyImpactTracker";
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
import { MapPin, Loader2, Plus, Database, ChevronRight, Pill, Watch, Droplets, Wind } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { HealthEntry, EnvironmentalReading } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { seedInitialData } from "@/lib/localStore";

const PAID_ACCOUNT_EMAIL = "agnishikha@yahoo.com";
const PAID_STATUS_STORAGE_KEY = "xuunu-paid-account";

const DISPLAY_NAME_STORAGE_KEY = "xuunu-display-name";

interface DashboardScreenProps {
  onNavigate?: (tab: string) => void;
  onOpenProfile?: () => void;
  onTrackClick?: () => void;
}

export default function DashboardScreen({ onNavigate, onOpenProfile }: DashboardScreenProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showBioSignature, setShowBioSignature] = useState(true);
  const [showSynergyDialog, setShowSynergyDialog] = useState(false);
  const [showBioSignatureDialog, setShowBioSignatureDialog] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const [strengthDialog, setStrengthDialog] = useState(false);
  const [cardioDialog, setCardioDialog] = useState(false);
  const [strengthMinutes, setStrengthMinutes] = useState("");
  const [cardioMinutes, setCardioMinutes] = useState("");
  const [refreshingMetric, setRefreshingMetric] = useState<string | null>(null);
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);
  const [isPaidAccount, setIsPaidAccount] = useState(false);
  const env = import.meta.env as Record<string, string | undefined>;
  const stripePortalUrl = env.VITE_STRIPE_PAYMENT_URL;
  const stripeMonthlyUrl = env.VITE_STRIPE_MONTHLY_URL;
  const stripeYearlyUrl = env.VITE_STRIPE_YEARLY_URL;
  const dashboards = useMemo(
    () => [
      {
        id: "performance",
        title: "Performance Dashboard",
        description: "Training load, HRV, recovery, and readiness trends.",
        url:
          env.VITE_LOOKER_PERFORMANCE_DASHBOARD_URL ||
          env.NEXT_PUBLIC_LOOKER_PERFORMANCE_DASHBOARD_URL ||
          "",
      },
      {
        id: "health",
        title: "Health Dashboard",
        description: "Vitals, glucose stability, and metabolic patterns.",
        url:
          env.VITE_LOOKER_HEALTH_DASHBOARD_URL ||
          env.NEXT_PUBLIC_LOOKER_HEALTH_DASHBOARD_URL ||
          "",
      },
      {
        id: "recovery",
        title: "Recovery Dashboard",
        description: "Sleep quality, strain balance, and recovery insights.",
        url:
          env.VITE_LOOKER_RECOVERY_DASHBOARD_URL ||
          env.NEXT_PUBLIC_LOOKER_RECOVERY_DASHBOARD_URL ||
          "",
      },
      {
        id: "energy",
        title: "Energy Dashboard",
        description: "Nutrition, activity, and energy utilization trends.",
        url:
          env.VITE_LOOKER_ENERGY_DASHBOARD_URL ||
          env.NEXT_PUBLIC_LOOKER_ENERGY_DASHBOARD_URL ||
          "",
      },
    ],
    [env]
  );

  const { data: latestHealth, isLoading: healthLoading, refetch: refetchHealth } =
    useQuery<HealthEntry | null>({
    queryKey: [`/api/health-entries/latest?userId=${user?.uid}`],
    enabled: !!user,
  });

  const { data: latestEnv, isLoading: envLoading, refetch: refetchEnv } =
    useQuery<EnvironmentalReading | null>({
    queryKey: [`/api/environmental-readings/latest?userId=${user?.uid}`],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user?.uid || healthLoading || envLoading) return;
    if (!latestHealth && !latestEnv) {
      seedInitialData(user.uid);
      queryClient.invalidateQueries({
        queryKey: [`/api/health-entries/latest?userId=${user.uid}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/environmental-readings/latest?userId=${user.uid}`],
      });
    }
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

  const handleMetricRefresh = async (metricId: string) => {
    if (!user || refreshingMetric) return;
    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `xuunu-terra-refresh-${user.uid}`;
    let refreshCount = 0;

    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as { date?: string; count?: number };
          if (parsed.date === today && typeof parsed.count === "number") {
            refreshCount = parsed.count;
          }
        }
      } catch (error) {
        refreshCount = 0;
      }
    }

    if (refreshCount >= 4) {
      toast({
        title: "Daily refresh limit reached",
        description: "Maximum 4 Terra refreshes per day. Using cached data.",
      });
      return;
    }

    const nextCount = refreshCount + 1;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ date: today, count: nextCount })
      );
    }

    setRefreshingMetric(metricId);
    try {
      await Promise.all([refetchHealth(), refetchEnv()]);
      toast({
        title: "Data refreshed",
        description: `Terra refresh ${nextCount}/4 for today.`,
      });
    } finally {
      setRefreshingMetric(null);
    }
  };

  const handleOpenPaymentPortal = (plan?: "monthly" | "yearly") => {
    const planUrl =
      plan === "monthly" ? stripeMonthlyUrl : plan === "yearly" ? stripeYearlyUrl : undefined;
    const portalUrl =
      planUrl || stripePortalUrl || stripeMonthlyUrl || stripeYearlyUrl || "https://stripe.com";
    window.open(portalUrl, "_blank");
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
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast({
        title: "Notifications",
        description: "Enable notifications in your phone settings.",
      });
      return;
    }

    if (Notification.permission === "granted") {
      window.localStorage.setItem("xuunu-notifications-enabled", "true");
      toast({
        title: "Notifications enabled",
        description: "Notifications are already enabled.",
      });
      return;
    }

    if (Notification.permission === "denied") {
      window.localStorage.setItem("xuunu-notifications-enabled", "false");
      toast({
        title: "Notifications blocked",
        description: "Enable notifications in your phone settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        window.localStorage.setItem("xuunu-notifications-enabled", "true");
        toast({
          title: "Notifications enabled",
          description: "You're all set to receive alerts.",
        });
      } else {
        window.localStorage.setItem("xuunu-notifications-enabled", "false");
        toast({
          title: "Notifications disabled",
          description: "Enable notifications in your phone settings.",
        });
      }
    } catch (error) {
      toast({
        title: "Notifications",
        description: "Enable notifications in your phone settings.",
      });
    }
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

  const handleLocationUpdate = (lat: number, lng: number) => {
    setLocation({ lat, lng });
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

  // Only use real data from database/integrations - no fake values
  const healthData = {
    glucose: latestHealth?.glucose || 0,
    activity: latestHealth?.activity ? Number(latestHealth.activity) : 0,
    recovery: latestHealth?.recovery ? Number(latestHealth.recovery) : 0,
    strain: latestHealth?.strain ? Number(latestHealth.strain) : 0,
    aqi: latestEnv?.aqi || 0,
    heartRate: latestHealth?.heartRate || 0,
    sleep: latestHealth?.sleepHours ? parseFloat(latestHealth.sleepHours.toString()) : 0,
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
    if (typeof window === "undefined" || !user?.uid) {
      setDisplayNameOverride(null);
      return;
    }
    try {
      const stored = window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as Record<string, string>) : {};
      setDisplayNameOverride(parsed[user.uid] ?? null);
    } catch {
      setDisplayNameOverride(null);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setIsPaidAccount(false);
      return;
    }
    const emailPaid =
      user.email?.toLowerCase() === PAID_ACCOUNT_EMAIL.toLowerCase();
    let localPaid = false;
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(PAID_STATUS_STORAGE_KEY);
        const parsed = stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
        localPaid = !!parsed[user.uid];
      } catch {
        localPaid = false;
      }
    }
    setIsPaidAccount(emailPaid || localPaid);
  }, [user?.uid, user?.email]);

  const displayName =
    displayNameOverride || user?.displayName || user?.email?.split("@")[0] || "Member";
  const integrationsLocked = !isPaidAccount;

  // Calculate synergy level from real data only
  const synergyLevel = latestHealth && latestEnv && latestHealth.glucose && latestEnv.aqi ? 
    Math.min(100, Math.round(((latestHealth.glucose > 0 ? 30 : 0) + (latestEnv.aqi > 0 ? 30 : 0)) / 0.6)) : 
    0;

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
            onClick={() => setShowBioSignature(!showBioSignature)}
            className="text-xs uppercase tracking-widest text-primary hover-elevate active-elevate-2 px-4 py-2 rounded-full border border-primary/30"
            data-testid="button-toggle-signature"
          >
            {showBioSignature ? "Show Synergy" : "Bio Signature"}
          </button>
        </div>

        <div className="flex items-center justify-center pt-4 pb-4">
          {showBioSignature ? (
            <button
              onClick={() => setShowBioSignatureDialog(true)}
              className="hover-elevate active-elevate-2 rounded-lg transition-all"
              data-testid="button-open-bio-signature"
            >
              <BioSignature healthData={healthData} size={280} />
            </button>
          ) : (
            <button
              onClick={() => setShowSynergyDialog(true)}
              className="hover-elevate active-elevate-2 rounded-lg transition-all"
              data-testid="button-open-synergy"
            >
              <EnvironmentalSynergyRing synergyLevel={synergyLevel} />
            </button>
          )}
        </div>

        {/* Synergy Insights Dialog */}
        {user && (
          <SynergyInsightsDialog
            open={showSynergyDialog}
            onOpenChange={setShowSynergyDialog}
            synergyLevel={synergyLevel}
            healthData={healthData}
            environmentalData={latestEnv || {}}
            userId={user.uid}
          />
        )}

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

            {/* Environment Summary */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="text-xs uppercase tracking-widest opacity-40 mb-3">ENVIRONMENT</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold font-mono mb-1">{latestEnv?.aqi || "—"}</div>
                  <div className="text-xs opacity-60">Current AQI • {latestEnv?.aqi ? (latestEnv.aqi < 50 ? "Good" : latestEnv.aqi < 100 ? "Moderate" : "Unhealthy") : "No data"}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono">{latestEnv?.temperature ? `${latestEnv.temperature}°F` : "—"}</div>
                  <div className="text-xs opacity-60">{latestEnv?.humidity ? `${latestEnv.humidity}% humidity` : "—"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs opacity-40">
                <MapPin className="w-3 h-3" />
                <span>{latestEnv?.locationMode === "manual" ? "Indoor" : "Outdoor"}</span>
              </div>
              <div className="mt-6">
                <Tabs defaultValue="location" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5">
                    <TabsTrigger value="location" data-testid="tab-location">
                      Location
                    </TabsTrigger>
                    <TabsTrigger value="impact" data-testid="tab-impact">
                      Impact
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="location" className="mt-6">
                    <EnvironmentalMap onLocationUpdate={handleLocationUpdate} />
                  </TabsContent>

                  <TabsContent value="impact" className="mt-6">
                    <HourlyImpactTracker />
                  </TabsContent>
                </Tabs>

                <div className="pt-4 space-y-3 text-xs opacity-60">
                  <p>
                    <strong>7 Environmental Categories:</strong> Air, Noise, Water, Soil,
                    Light, Thermal, and Radioactive exposure tracking.
                  </p>
                  <p>
                    <strong>Data Sources:</strong> Multiple APIs including OpenWeatherMap,
                    IQAir, EPA databases, and local monitoring stations.
                  </p>
                  <p>
                    <strong>Privacy:</strong> Location data is only used to fetch environmental
                    conditions and is not stored on external servers.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <MedicationQuickLog />

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Dashboards</h2>
            <p className="text-xs text-white/50">
              Your health dashboards appear here.
            </p>
          </div>
          <div className="grid gap-4">
            {dashboards.map((dashboard) => (
              <div key={dashboard.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{dashboard.title}</h3>
                    <p className="text-xs text-white/60">{dashboard.description}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3">
                  {dashboard.url ? (
                    <iframe
                      title={dashboard.title}
                      src={dashboard.url}
                      className="h-[360px] w-full"
                      style={{ border: "none" }}
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex h-[240px] items-center justify-center text-xs text-white/50">
                      Dashboard URL not configured yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

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
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPaymentPortal("monthly")}
                  data-testid="button-stripe-monthly"
                >
                  $9.99/mo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPaymentPortal("yearly")}
                  data-testid="button-stripe-yearly"
                >
                  $99/yr
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <button
              className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
              onClick={() => onNavigate?.("medications")}
              data-testid="button-medications"
            >
              <div className="flex items-center gap-3">
                <Pill className="w-5 h-5 text-primary" />
                <span className="text-sm">Medication Tracker</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>
            <button
              className={`w-full flex items-center justify-between p-4 border border-white/10 rounded-lg ${
                integrationsLocked
                  ? "opacity-50 cursor-not-allowed"
                  : "hover-elevate active-elevate-2"
              }`}
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
                className={`w-full min-h-[72px] flex items-center justify-between p-4 border border-white/10 rounded-lg ${
                  integrationsLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover-elevate active-elevate-2"
                }`}
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
                className={`w-full min-h-[72px] flex items-center justify-between p-4 border border-white/10 rounded-lg ${
                  integrationsLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover-elevate active-elevate-2"
                }`}
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
                className={`w-full min-h-[72px] flex items-center justify-between p-4 border border-white/10 rounded-lg ${
                  integrationsLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover-elevate active-elevate-2"
                }`}
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
            <button
              className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
              onClick={handleNotificationsClick}
              data-testid="button-notifications"
            >
              <span className="text-sm">Notifications</span>
              <span className="text-xs opacity-60">Enabled</span>
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
