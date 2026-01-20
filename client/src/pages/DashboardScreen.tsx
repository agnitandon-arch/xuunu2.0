import EnvironmentalSynergyRing from "@/components/EnvironmentalSynergyRing";
import BioSignature from "@/components/BioSignature";
import SynergyInsightsDialog from "@/components/SynergyInsightsDialog";
import BioSignatureDialog from "@/components/BioSignatureDialog";
import MedicationQuickLog from "@/components/MedicationQuickLog";
import DeviceIntegrationItem from "@/components/DeviceIntegrationItem";
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
import { MapPin, Loader2, Plus, Activity, Database, ChevronRight, Pill, Watch, Droplets } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { HealthEntry, EnvironmentalReading } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardScreenProps {
  onNavigate?: (tab: string) => void;
  onOpenProfile?: () => void;
  onTrackClick?: () => void;
}

export default function DashboardScreen({ onNavigate, onOpenProfile }: DashboardScreenProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showBioSignature, setShowBioSignature] = useState(false);
  const [showSynergyDialog, setShowSynergyDialog] = useState(false);
  const [showBioSignatureDialog, setShowBioSignatureDialog] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Dialog states for each metric
  const [glucoseDialog, setGlucoseDialog] = useState(false);
  const [hrvDialog, setHrvDialog] = useState(false);
  const [sleepDialog, setSleepDialog] = useState(false);
  const [bpDialog, setBpDialog] = useState(false);
  const [heartRateDialog, setHeartRateDialog] = useState(false);
  const [stepsDialog, setStepsDialog] = useState(false);
  
  // Form states
  const [glucose, setGlucose] = useState("");
  const [hrv, setHrv] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [steps, setSteps] = useState("");

  const { data: latestHealth, isLoading: healthLoading } = useQuery<HealthEntry | null>({
    queryKey: [`/api/health-entries/latest?userId=${user?.uid}`],
    enabled: !!user,
  });

  const { data: latestEnv, isLoading: envLoading } = useQuery<EnvironmentalReading | null>({
    queryKey: [`/api/environmental-readings/latest?userId=${user?.uid}`],
    enabled: !!user,
  });

  const { data: recentEntries, isLoading: entriesLoading } = useQuery<HealthEntry[]>({
    queryKey: [`/api/health-entries?userId=${user?.uid}&limit=3`],
    enabled: !!user,
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/health-entries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/health-entries/latest?userId=${user?.uid}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/health-entries?userId=${user?.uid}&limit=3`] });
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

  const handleGlucoseSubmit = () => {
    if (!glucose || !user) return;
    createEntryMutation.mutate({
      userId: user.uid,
      glucose: parseInt(glucose),
    });
    setGlucose("");
    setGlucoseDialog(false);
  };

  const handleHrvSubmit = () => {
    if (!hrv || !user) return;
    createEntryMutation.mutate({
      userId: user.uid,
      hrv: parseInt(hrv),
    });
    setHrv("");
    setHrvDialog(false);
  };

  const handleSleepSubmit = () => {
    if (!sleepHours || !user) return;
    createEntryMutation.mutate({
      userId: user.uid,
      sleepHours: parseFloat(sleepHours),
    });
    setSleepHours("");
    setSleepDialog(false);
  };

  const handleBpSubmit = () => {
    if (!systolic || !diastolic || !user) return;
    createEntryMutation.mutate({
      userId: user.uid,
      bloodPressureSystolic: parseInt(systolic),
      bloodPressureDiastolic: parseInt(diastolic),
    });
    setSystolic("");
    setDiastolic("");
    setBpDialog(false);
  };

  const handleHeartRateSubmit = () => {
    if (!heartRate || !user) return;
    createEntryMutation.mutate({
      userId: user.uid,
      heartRate: parseInt(heartRate),
    });
    setHeartRate("");
    setHeartRateDialog(false);
  };

  const handleStepsSubmit = () => {
    if (!steps || !user) return;
    createEntryMutation.mutate({
      userId: user.uid,
      steps: parseInt(steps),
    });
    setSteps("");
    setStepsDialog(false);
  };

  const handleLocationUpdate = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  // Only use real data from database/integrations - no fake values
  const healthData = {
    glucose: latestHealth?.glucose || 0,
    activity: 0, // Will come from Terra API integration
    recovery: 0, // Will come from Terra API integration
    strain: 0, // Will come from Terra API integration
    aqi: latestEnv?.aqi || 0,
    heartRate: latestHealth?.heartRate || 0,
    sleep: latestHealth?.sleepHours ? parseFloat(latestHealth.sleepHours.toString()) : 0,
  };

  // Calculate synergy level from real data only
  const synergyLevel = latestHealth && latestEnv && latestHealth.glucose && latestEnv.aqi ? 
    Math.min(100, Math.round(((latestHealth.glucose > 0 ? 30 : 0) + (latestEnv.aqi > 0 ? 30 : 0)) / 0.6)) : 
    0;

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenProfile}
            className="rounded-full"
            data-testid="button-open-profile"
          >
            <ProfileAvatar className="h-10 w-10" />
          </button>
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
                {/* Glucose */}
                <Dialog open={glucoseDialog} onOpenChange={setGlucoseDialog}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover-elevate active-elevate-2" data-testid="card-glucose">
                      <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Glucose</div>
                        <div className="text-3xl font-bold font-mono text-primary">
                          {latestHealth?.glucose || "--"}
                        </div>
                        {latestHealth?.glucose && <div className="text-xs opacity-60 mt-1">mg/dL</div>}
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10">
                    <DialogHeader>
                      <DialogTitle>Log Glucose</DialogTitle>
                      <DialogDescription>Enter your current blood glucose level</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="glucose">Glucose (mg/dL)</Label>
                        <Input
                          id="glucose"
                          type="number"
                          value={glucose}
                          onChange={(e) => setGlucose(e.target.value)}
                          placeholder="120"
                          className="bg-black border-white/20 mt-2"
                          data-testid="input-glucose"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleGlucoseSubmit} disabled={createEntryMutation.isPending} data-testid="button-submit-glucose">
                        {createEntryMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* HRV */}
                <Dialog open={hrvDialog} onOpenChange={setHrvDialog}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover-elevate active-elevate-2" data-testid="card-hrv">
                      <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-widest opacity-60 mb-2">HRV</div>
                        <div className="text-3xl font-bold font-mono text-primary">
                          {latestHealth?.hrv || "--"}
                        </div>
                        {latestHealth?.hrv && <div className="text-xs opacity-60 mt-1">ms</div>}
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10">
                    <DialogHeader>
                      <DialogTitle>Log HRV</DialogTitle>
                      <DialogDescription>Enter your Heart Rate Variability</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="hrv">HRV (ms)</Label>
                        <Input
                          id="hrv"
                          type="number"
                          value={hrv}
                          onChange={(e) => setHrv(e.target.value)}
                          placeholder="65"
                          className="bg-black border-white/20 mt-2"
                          data-testid="input-hrv"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleHrvSubmit} disabled={createEntryMutation.isPending} data-testid="button-submit-hrv">
                        {createEntryMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Sleep */}
                <Dialog open={sleepDialog} onOpenChange={setSleepDialog}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover-elevate active-elevate-2" data-testid="card-sleep">
                      <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Sleep</div>
                        <div className="text-3xl font-bold font-mono text-primary">
                          {latestHealth?.sleepHours ? parseFloat(latestHealth.sleepHours.toString()).toFixed(1) : "--"}
                        </div>
                        {latestHealth?.sleepHours && <div className="text-xs opacity-60 mt-1">hours</div>}
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10">
                    <DialogHeader>
                      <DialogTitle>Log Sleep</DialogTitle>
                      <DialogDescription>Enter your sleep duration</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="sleep">Sleep Duration (hours)</Label>
                        <Input
                          id="sleep"
                          type="number"
                          step="0.5"
                          value={sleepHours}
                          onChange={(e) => setSleepHours(e.target.value)}
                          placeholder="7.5"
                          className="bg-black border-white/20 mt-2"
                          data-testid="input-sleep"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSleepSubmit} disabled={createEntryMutation.isPending} data-testid="button-submit-sleep">
                        {createEntryMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Blood Pressure */}
                <Dialog open={bpDialog} onOpenChange={setBpDialog}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover-elevate active-elevate-2" data-testid="card-bp">
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
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10">
                    <DialogHeader>
                      <DialogTitle>Log Blood Pressure</DialogTitle>
                      <DialogDescription>Enter your blood pressure reading</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="systolic">Systolic (mmHg)</Label>
                        <Input
                          id="systolic"
                          type="number"
                          value={systolic}
                          onChange={(e) => setSystolic(e.target.value)}
                          placeholder="120"
                          className="bg-black border-white/20 mt-2"
                          data-testid="input-systolic"
                        />
                      </div>
                      <div>
                        <Label htmlFor="diastolic">Diastolic (mmHg)</Label>
                        <Input
                          id="diastolic"
                          type="number"
                          value={diastolic}
                          onChange={(e) => setDiastolic(e.target.value)}
                          placeholder="80"
                          className="bg-black border-white/20 mt-2"
                          data-testid="input-diastolic"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleBpSubmit} disabled={createEntryMutation.isPending} data-testid="button-submit-bp">
                        {createEntryMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Heart Rate */}
                <Dialog open={heartRateDialog} onOpenChange={setHeartRateDialog}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover-elevate active-elevate-2" data-testid="card-heart-rate">
                      <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Heart Rate</div>
                        <div className="text-3xl font-bold font-mono text-primary">
                          {latestHealth?.heartRate || "--"}
                        </div>
                        {latestHealth?.heartRate && <div className="text-xs opacity-60 mt-1">bpm</div>}
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10">
                    <DialogHeader>
                      <DialogTitle>Log Heart Rate</DialogTitle>
                      <DialogDescription>Enter your current heart rate</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                        <Input
                          id="heartRate"
                          type="number"
                          value={heartRate}
                          onChange={(e) => setHeartRate(e.target.value)}
                          placeholder="72"
                          className="bg-black border-white/20 mt-2"
                          data-testid="input-heart-rate"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleHeartRateSubmit} disabled={createEntryMutation.isPending} data-testid="button-submit-heart-rate">
                        {createEntryMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Steps */}
                <Dialog open={stepsDialog} onOpenChange={setStepsDialog}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer hover-elevate active-elevate-2" data-testid="card-steps">
                      <CardContent className="p-4">
                        <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Steps</div>
                        <div className="text-3xl font-bold font-mono text-primary">
                          {latestHealth?.steps ? latestHealth.steps.toLocaleString() : "--"}
                        </div>
                        {latestHealth?.steps && <div className="text-xs opacity-60 mt-1">today</div>}
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10">
                    <DialogHeader>
                      <DialogTitle>Log Steps</DialogTitle>
                      <DialogDescription>Enter your step count</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="steps">Steps</Label>
                        <Input
                          id="steps"
                          type="number"
                          value={steps}
                          onChange={(e) => setSteps(e.target.value)}
                          placeholder="10000"
                          className="bg-black border-white/20 mt-2"
                          data-testid="input-steps"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleStepsSubmit} disabled={createEntryMutation.isPending} data-testid="button-submit-steps">
                        {createEntryMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Environment Summary */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="text-xs uppercase tracking-widest opacity-40 mb-3">ENVIRONMENT</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold font-mono mb-1">{latestEnv?.aqi || "—"}</div>
                  <div className="text-xs opacity-60">AQI • {latestEnv?.aqi ? (latestEnv.aqi < 50 ? "Good" : latestEnv.aqi < 100 ? "Moderate" : "Unhealthy") : "No data"}</div>
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
          <div className="text-xs uppercase tracking-widest opacity-40 mb-4">RECENT ACTIVITY</div>
          {entriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : recentEntries && recentEntries.length > 0 ? (
            <div className="space-y-3">
              {recentEntries.map((entry, index) => (
                <button
                  key={entry.id}
                  className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
                  data-testid={`button-entry-${index}`}
                >
                  <div className="text-left">
                    <div className="text-sm opacity-60">{new Date(entry.timestamp).toLocaleString()}</div>
                    <div className="text-xs opacity-40 mt-1">
                      {entry.glucose && `Glucose: ${entry.glucose} • `}
                      {entry.heartRate && `HR: ${entry.heartRate} • `}
                      {entry.sleepHours && `Sleep: ${entry.sleepHours}h • `}
                      {entry.steps && `Steps: ${entry.steps.toLocaleString()}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 opacity-40">
              <p className="text-sm">No recent entries</p>
              <p className="text-xs mt-2">Tap any metric above to log your first entry</p>
            </div>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest opacity-40 mb-4">INTEGRATIONS</div>
          <div className="space-y-3">
            <DeviceIntegrationItem
              name="Health Care Provider Records"
              icon={<Activity className="w-6 h-6 text-primary" />}
              connected={true}
              lastSync="2 hours ago"
              onClick={() => console.log("Healthcare provider clicked")}
            />
            <button
              className="w-full flex items-center justify-between p-4 border border-white/10 rounded-lg hover-elevate active-elevate-2"
              onClick={() => console.log("Connect healthcare provider")}
              data-testid="button-connect-healthcare-provider"
            >
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-primary" />
                <span className="text-sm">Connect to Health Care Provider</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>
            <DeviceIntegrationItem
              name="Bloodwork Upload"
              icon={<Droplets className="w-6 h-6 text-primary" />}
              connected={false}
              onClick={() => connectBloodworkMutation.mutate()}
            />
          </div>
        </div>

        <div className="mt-6">
          <IndoorAirQualityCredentials />
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest opacity-40 mb-4">SETTINGS</div>
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
