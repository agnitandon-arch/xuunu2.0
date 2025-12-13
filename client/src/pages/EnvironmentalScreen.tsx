import { useState } from "react";
import EnvironmentalMap from "@/components/EnvironmentalMap";
import ComprehensiveEnvironmentalData from "@/components/ComprehensiveEnvironmentalData";
import HourlyImpactTracker from "@/components/HourlyImpactTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EnvironmentalScreen() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleLocationUpdate = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <div className="text-center pb-4">
          <h1 className="text-2xl font-bold mb-2">Environmental Health</h1>
          <p className="text-sm opacity-60">Comprehensive environmental monitoring across 7 categories</p>
        </div>

        <Tabs defaultValue="location" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5">
            <TabsTrigger value="location" data-testid="tab-location">Location</TabsTrigger>
            <TabsTrigger value="data" data-testid="tab-data" disabled={!location}>
              Health Data
            </TabsTrigger>
            <TabsTrigger value="impact" data-testid="tab-impact">Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="location" className="mt-6">
            <EnvironmentalMap onLocationUpdate={handleLocationUpdate} />
          </TabsContent>

          <TabsContent value="data" className="mt-6">
            {location ? (
              <ComprehensiveEnvironmentalData latitude={location.lat} longitude={location.lng} />
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm opacity-60">Please enable location tracking first</p>
              </div>
            )}
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
