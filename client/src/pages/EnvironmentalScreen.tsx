import { useState } from "react";
import EnvironmentalMap from "@/components/EnvironmentalMap";
import HourlyImpactTracker from "@/components/HourlyImpactTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function EnvironmentalScreen() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleLocationUpdate = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-3 pb-4">
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold mb-2">Environmental Health</h1>
            <p className="text-sm opacity-60">
              Comprehensive environmental monitoring across 7 categories
            </p>
          </div>
          <ProfileAvatar className="h-9 w-9" />
        </div>

        <Tabs defaultValue="location" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="location" data-testid="tab-location">Location</TabsTrigger>
            <TabsTrigger value="impact" data-testid="tab-impact">Impact</TabsTrigger>
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
            <strong>7 Environmental Categories:</strong> Air, Noise, Water, Soil, Light, Thermal, and Radioactive exposure tracking.
          </p>
          <p>
            <strong>Data Sources:</strong> Multiple APIs including OpenWeatherMap, IQAir, EPA databases, and local monitoring stations.
          </p>
          <p>
            <strong>Privacy:</strong> Location data is only used to fetch environmental conditions and is not stored on external servers.
          </p>
        </div>
      </div>
    </div>
  );
}
