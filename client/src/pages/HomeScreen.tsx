import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";
import EnvironmentalCard from "@/components/EnvironmentalCard";
import HealthEntryCard from "@/components/HealthEntryCard";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface HomeScreenProps {
  userName?: string;
  onLogClick: () => void;
}

export default function HomeScreen({ userName = "User", onLogClick }: HomeScreenProps) {
  const { user } = useAuth();

  const { data: latestEnvReading, isError: envError, isLoading: envLoading } = useQuery({
    queryKey: [`/api/environmental-readings/latest?userId=${user?.uid}`],
    queryFn: async () => {
      if (!user?.uid) return null;
      const response = await fetch(`/api/environmental-readings/latest?userId=${user.uid}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch environmental data: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!user?.uid,
  });

  const { data: healthEntries = [], isError: healthError, isLoading: healthLoading } = useQuery({
    queryKey: [`/api/health-entries?userId=${user?.uid}`],
    queryFn: async () => {
      if (!user?.uid) return [];
      const response = await fetch(`/api/health-entries?userId=${user.uid}&limit=3`);
      if (!response.ok) {
        throw new Error(`Failed to fetch health entries: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!user?.uid,
  });

  const lastEntry = healthEntries[0];
  const lastLoggedText = healthLoading
    ? "Loading..."
    : healthError
    ? "Unable to load"
    : lastEntry 
    ? `Last logged ${formatDistanceToNow(new Date(lastEntry.timestamp), { addSuffix: true })}`
    : "No entries yet";

  return (
    <div className="flex-1 overflow-y-auto pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-md mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-welcome">
            Welcome back, {userName}
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-date">
            {format(new Date(), "EEEE, MMMM dd, yyyy")}
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span data-testid="text-last-logged">{lastLoggedText}</span>
        </div>
        
        {envError ? (
          <div className="p-6 bg-destructive/10 rounded-lg border border-destructive text-center">
            <p className="text-sm text-destructive font-medium">Failed to load environmental data</p>
            <p className="text-xs text-muted-foreground mt-1">Please try refreshing the page</p>
          </div>
        ) : envLoading ? (
          <div className="p-6 bg-card rounded-lg border border-card-border text-center">
            <p className="text-sm text-muted-foreground">Loading environmental data...</p>
          </div>
        ) : latestEnvReading ? (
          <EnvironmentalCard
            aqi={latestEnvReading.aqi || 0}
            temperature={latestEnvReading.temperature ? parseFloat(latestEnvReading.temperature as string) : 0}
            feelsLike={latestEnvReading.feelsLike ? parseFloat(latestEnvReading.feelsLike as string) : 0}
            humidity={latestEnvReading.humidity || 0}
            weather="Conditions"
            pm25={latestEnvReading.pm25 ? parseFloat(latestEnvReading.pm25 as string) : undefined}
            pm10={latestEnvReading.pm10 ? parseFloat(latestEnvReading.pm10 as string) : undefined}
          />
        ) : (
          <div className="p-6 bg-card rounded-lg border border-card-border text-center">
            <p className="text-sm text-muted-foreground">No environmental data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Enter a location on the Environmental screen to track air quality</p>
          </div>
        )}
        
        <Button 
          className="w-full h-14 text-lg"
          onClick={onLogClick}
          data-testid="button-log-health"
        >
          <Plus className="w-5 h-5 mr-2" />
          Log Health Data
        </Button>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Entries</h2>
          {healthError ? (
            <div className="p-6 bg-destructive/10 rounded-lg border border-destructive text-center">
              <p className="text-sm text-destructive font-medium">Failed to load health entries</p>
              <p className="text-xs text-muted-foreground mt-1">Please try refreshing the page</p>
            </div>
          ) : healthLoading ? (
            <div className="p-6 bg-card rounded-lg border border-card-border text-center">
              <p className="text-sm text-muted-foreground">Loading health entries...</p>
            </div>
          ) : healthEntries.length > 0 ? (
            <div className="space-y-3">
              {healthEntries.map((entry: any) => (
                <HealthEntryCard
                  key={entry.id}
                  timestamp={new Date(entry.timestamp)}
                  glucose={entry.glucose}
                  symptomSeverity={entry.symptomSeverity}
                  symptoms={entry.symptoms || []}
                  notes={entry.notes}
                  onClick={() => console.log("View entry", entry.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-card rounded-lg border border-card-border text-center">
              <p className="text-sm text-muted-foreground">No health entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">Tap "Log Health Data" to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
