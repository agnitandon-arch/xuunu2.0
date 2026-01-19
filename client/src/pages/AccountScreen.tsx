import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DeviceIntegrationItem from "@/components/DeviceIntegrationItem";
import IndoorAirQualityCredentials from "@/components/IndoorAirQualityCredentials";
import { User, MapPin, Activity, Database, LogOut, RefreshCw, Watch, ChevronRight, Pill, Droplets } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AccountScreenProps {
  onLogout?: () => void;
  onNavigate?: (tab: string) => void;
}

export default function AccountScreen({ onLogout, onNavigate }: AccountScreenProps) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { cityName, isLoading: locationLoading, refetch } = useUserLocation();
  const [location, setLocation] = useState("");

  const connectBloodworkMutation = useMutation({
    mutationFn: async () => {
      if (!authUser?.uid) {
        throw new Error("User not authenticated");
      }

      const response = await apiRequest("POST", "/api/terra/auth", {
        userId: authUser.uid,
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to connect bloodwork",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (cityName) {
      setLocation(cityName);
    }
  }, [cityName]);

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto m-6 p-8 bg-black border border-white/10 rounded-lg">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="font-bold text-lg" data-testid="text-user-name">{authUser?.displayName || authUser?.email?.split('@')[0] || "User"}</div>
            <div className="text-sm opacity-60" data-testid="text-user-email">{authUser?.email || ""}</div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Location */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest opacity-60 flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                Default Location
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={refetch}
                disabled={locationLoading}
                className="h-6 w-6 p-0"
                data-testid="button-refresh-location"
              >
                <RefreshCw className={`w-3 h-3 ${locationLoading ? "animate-spin" : ""}`} />
              </Button>
            </Label>
            <Input
              value={location || (locationLoading ? "Detecting location..." : "Unknown")}
              onChange={(e) => setLocation(e.target.value)}
              className="h-12 bg-black border-white/20"
              data-testid="input-location"
            />
            <p className="text-xs opacity-60">
              Used for environmental data collection
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 mt-6 space-y-6">
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

        <Button
          variant="destructive"
          onClick={onLogout}
          className="w-full h-13 rounded-full"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>

        <div className="text-center pt-4">
          <p className="text-xs opacity-40">Xuunu v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
