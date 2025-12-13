import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, MapPin, Calendar, Mail, LogOut, Info, MessageCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useUserLocation } from "@/hooks/useUserLocation";

interface ProfileScreenProps {
  onLogout?: () => void;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const { cityName, isLoading: locationLoading, refetch } = useUserLocation();
  const [defaultLocation, setDefaultLocation] = useState("");

  useEffect(() => {
    if (cityName) {
      setDefaultLocation(cityName);
    }
  }, [cityName]);
  
  //todo: remove mock functionality - replace with real Firebase auth user
  const user = {
    email: "sarah@example.com",
    displayName: "Sarah Johnson",
    createdAt: new Date(2024, 0, 15),
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-md mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings</p>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg" data-testid="text-user-name">{user.displayName}</p>
              <p className="text-sm text-muted-foreground" data-testid="text-user-email">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Member since:</span>
              <span className="font-medium" data-testid="text-member-since">
                {format(user.createdAt, "MMMM dd, yyyy")}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email verified</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Default Location
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={refetch}
              disabled={locationLoading}
              className="h-8 w-8 p-0"
              data-testid="button-refresh-location"
            >
              <RefreshCw className={`w-4 h-4 ${locationLoading ? "animate-spin" : ""}`} />
            </Button>
          </h3>
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm">
              City or ZIP code
            </Label>
            <Input
              id="location"
              value={defaultLocation || (locationLoading ? "Detecting location..." : "Unknown")}
              onChange={(e) => setDefaultLocation(e.target.value)}
              className="h-12"
              data-testid="input-default-location"
            />
            <p className="text-xs text-muted-foreground">
              Used to automatically fetch environmental data for your entries
            </p>
          </div>
          <Button variant="outline" className="w-full mt-4" data-testid="button-save-location">
            Save Location
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">About Xuunu</h3>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Xuunu helps you track your health data and understand how environmental conditions affect your diabetes and chronic illness symptoms.
            </p>
            <div className="flex items-center gap-2 text-primary">
              <Info className="w-4 h-4" />
              <span>Version 1.0.0</span>
            </div>
          </div>
        </Card>

        <button
          className="flex items-center gap-2 text-sm text-primary hover-elevate active-elevate-2 p-3 rounded-md w-full"
          data-testid="button-contact-support"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Contact Support</span>
        </button>

        <Button
          variant="destructive"
          className="w-full h-12"
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
