import EnvironmentalSynergyRing from "@/components/EnvironmentalSynergyRing";
import BioSignature from "@/components/BioSignature";
import SynergyInsightsDialog from "@/components/SynergyInsightsDialog";
import BioSignatureDialog from "@/components/BioSignatureDialog";
import MedicationQuickLog from "@/components/MedicationQuickLog";
import IndoorAirQualityCredentials from "@/components/IndoorAirQualityCredentials";
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
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { HealthEntry, EnvironmentalReading } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { seedInitialData } from "@/lib/localStore";

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
  const [showIndoorAirQuality, setShowIndoorAirQuality] = useState(false);

  const { data: latestHealth, isLoading: healthLoading } = useQuery<HealthEntry | null>({
    queryKey: [`/api/health-entries/latest?userId=${user?.uid}`],
    enabled: !!user,
  });

  const { data: latestEnv, isLoading: envLoading } = useQuery<EnvironmentalReading | null>({
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

  const connectBloodworkMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }

      const response = await apiRequest("POST", "/api/terra/auth", {
        userId: user.uid,
        mode: "labs",
      });

      return await response.json();
    },
    onSuccess: (data: { url: string }) => {
      window.open(data.url, "_blank");
      toast({
        title: "Connect Bloodwork",
        description: "Complete the lab connection in the new window.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect bloodwork",
        variant: "destructive",
      });
    },
  });

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
              onClick={onOpenProfile}
              className="rounded-full"
              data-testid="button-open-profile"
            >
              <div className="flex flex-col items-center gap-1">
                <ProfileAvatar className="h-10 w-10" />
                <span className="text-[10px] uppercase tracking-widest text-white/50">
                  Member
                </span>
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
                <Card data-testid="card-glucose">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Glucose</div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.glucose || "--"}
                    </div>
                    {latestHealth?.glucose && <div className="text-xs opacity-60 mt-1">mg/dL</div>}
                  </CardContent>
                </Card>

                <Card data-testid="card-hrv">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-2">HRV</div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.hrv || "--"}
                    </div>
                    {latestHealth?.hrv && <div className="text-xs opacity-60 mt-1">ms</div>}
                  </CardContent>
                </Card>

                <Card data-testid="card-sleep">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Sleep</div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.sleepHours ? parseFloat(latestHealth.sleepHours.toString()).toFixed(1) : "--"}
                    </div>
                    {latestHealth?.sleepHours && <div className="text-xs opacity-60 mt-1">hours</div>}
                  </CardContent>
                </Card>

                <Card data-testid="card-bp">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Blood Pressure</div>
                    <div className="text-2xl font-bold font-mono text-primary">
                      {latestHealth?.bloodPressureSystolic && latestHealth?.bloodPressureDiastolic
                        ? `${latestHealth.bloodPressureSystolic}/${latestHealth.bloodPressureDiastolic}`
                        : "--"}
                    </div>
                    {latestHealth?.bloodPressureSystolic && <div className="text-xs opacity-60 mt-1">mmHg</div>}
                  </CardContent>
                </Card>

                <Card data-testid="card-heart-rate">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Heart Rate</div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.heartRate || "--"}
                    </div>
                    {latestHealth?.heartRate && <div className="text-xs opacity-60 mt-1">bpm</div>}
                  </CardContent>
                </Card>

                <Card data-testid="card-steps">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Steps</div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestHealth?.steps ? latestHealth.steps.toLocaleString() : "--"}
                    </div>
                    {latestHealth?.steps && <div className="text-xs opacity-60 mt-1">today</div>}
                  </CardContent>
                </Card>

                <Dialog open={strengthDialog} onOpenChange={setStrengthDialog}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover-elevate active-elevate-2" data-testid="card-strength">
                      <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Strength Training</div>
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
                    <Card className="cursor-pointer hover-elevate active-elevate-2" data-testid="card-cardio">
                      <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Cardio</div>
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

                <Card data-testid="card-aqi">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-2">AQI</div>
                    <div className="text-3xl font-bold font-mono text-primary">
                      {latestEnv?.aqi || "--"}
                    </div>
                    {latestEnv?.aqi && <div className="text-xs opacity-60 mt-1">AQI</div>}
                  </CardContent>
                </Card>

                <Card data-testid="card-noise">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Headphone Noise</div>
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

        <div>
          <div className="text-xs uppercase tracking-widest opacity-40 mb-4">INTEGRATIONS</div>
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
              className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
              onClick={() => onNavigate?.("devices")}
              data-testid="button-device-connections"
            >
              <div className="flex items-center gap-3">
                <Watch className="w-5 h-5 text-primary" />
                <span className="text-sm">Device Connections</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>
            <div className="space-y-3 pl-4">
              <button
                className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
                onClick={() => console.log("Connect healthcare provider")}
                data-testid="button-connect-healthcare-provider"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-primary" />
                  <span className="text-sm">Connect to Health Care Provider</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
              <button
                className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
                onClick={() => connectBloodworkMutation.mutate()}
                data-testid="button-upload-bloodwork"
              >
                <div className="flex items-center gap-3">
                  <Droplets className="w-5 h-5 text-primary" />
                  <span className="text-sm">Upload Bloodwork</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
              <button
                className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
                onClick={() => setShowIndoorAirQuality((prev) => !prev)}
                data-testid="button-connect-indoor-air"
              >
                <div className="flex items-center gap-3">
                  <Wind className="w-5 h-5 text-primary" />
                  <span className="text-sm">Connect to Indoor Air Quality</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60" />
              </button>
              {showIndoorAirQuality && (
                <div className="pt-2">
                  <IndoorAirQualityCredentials />
                </div>
              )}
            </div>
            <button
              className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
              data-testid="button-notifications"
            >
              <span className="text-sm">Notifications</span>
              <span className="text-xs opacity-60">Enabled</span>
            </button>
            <button
              className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
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

        <div className="pt-4">
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full h-13 rounded-full"
            data-testid="button-logout"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
