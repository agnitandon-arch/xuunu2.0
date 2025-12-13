import { useState, useEffect } from "react";
import { Wind, Droplets, Volume2, Thermometer, Sun, AlertTriangle, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EnvironmentalDataProps {
  latitude: number;
  longitude: number;
}

interface ComprehensiveData {
  // Air
  aqi: number;
  pm25: number;
  pm10: number;
  so2: number;
  no2: number;
  nox: number;
  co: number;
  o3: number;
  vocs: number;
  
  // Noise
  noiseLevel: number;
  noisePeak: number;
  noiseAverage: number;
  
  // Water
  waterQualityIndex: number;
  pH: number;
  turbidity: number;
  chlorine: number;
  lead: number;
  bacteria: number;
  
  // Soil
  soilMoisture: number;
  soilPH: number;
  soilContaminants: number;
  heavyMetals: number;
  
  // Light
  lightPollution: number;
  uvIndex: number;
  lux: number;
  blueLight: number;
  
  // Thermal
  temperature: number;
  feelsLike: number;
  humidity: number;
  heatIndex: number;
  pressure: number;
  
  // Radioactive
  radon: number;
  gamma: number;
  cosmicRays: number;
  
  timestamp: string;
}

export default function ComprehensiveEnvironmentalData({ latitude, longitude }: EnvironmentalDataProps) {
  const [data, setData] = useState<ComprehensiveData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvironmentalData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/environmental/comprehensive?lat=${latitude}&lng=${longitude}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch comprehensive environmental data");
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Comprehensive environmental data error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch comprehensive environmental data");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (latitude && longitude) {
      fetchEnvironmentalData();
    }
  }, [latitude, longitude]);

  if (isLoading) {
    return (
      <div className="p-8 text-center" data-testid="environmental-data-loading">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm opacity-60">Loading environmental data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center border border-white/10 rounded-lg" data-testid="environmental-data-error">
        <p className="text-sm opacity-60 mb-4">{error || "No environmental data available"}</p>
        <p className="text-xs opacity-40">Please manually enter indoor data or connect air quality devices in Account settings.</p>
      </div>
    );
  }

  const getQualityLevel = (value: number, max: number, inverted = false) => {
    const percentage = (value / max) * 100;
    if (inverted) {
      if (percentage >= 80) return { label: "Excellent", color: "#0066FF" };
      if (percentage >= 60) return { label: "Good", color: "#0088FF" };
      if (percentage >= 40) return { label: "Moderate", color: "#00AAFF" };
      return { label: "Poor", color: "#00CCFF" };
    } else {
      if (percentage <= 20) return { label: "Excellent", color: "#0066FF" };
      if (percentage <= 40) return { label: "Good", color: "#0088FF" };
      if (percentage <= 60) return { label: "Moderate", color: "#00AAFF" };
      return { label: "Poor", color: "#00CCFF" };
    }
  };

  return (
    <div className="space-y-4" data-testid="comprehensive-environmental-data">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest">Environmental Health</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchEnvironmentalData}
          data-testid="button-refresh-environmental"
        >
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="air" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/5">
          <TabsTrigger value="air" data-testid="tab-air">Air</TabsTrigger>
          <TabsTrigger value="noise" data-testid="tab-noise">Noise</TabsTrigger>
          <TabsTrigger value="water" data-testid="tab-water">Water</TabsTrigger>
          <TabsTrigger value="more" data-testid="tab-more">More</TabsTrigger>
        </TabsList>

        {/* AIR QUALITY */}
        <TabsContent value="air" className="mt-4 space-y-4">
          <div className="p-6 bg-white/5 rounded-lg border border-white/10 text-center">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Air Quality Index</div>
            <div className="text-5xl font-bold font-mono mb-2 text-primary">{data.aqi}</div>
            <div className="text-sm font-medium">{getQualityLevel(data.aqi, 150, false).label}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest opacity-60">Particulate Matter</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">PM2.5</div>
                <div className="font-mono font-bold">{data.pm25} µg/m³</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">PM10</div>
                <div className="font-mono font-bold">{data.pm10} µg/m³</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest opacity-60">Gas Pollutants (PPM)</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">SO₂</div>
                <div className="font-mono font-bold">{data.so2} ppm</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">NO₂</div>
                <div className="font-mono font-bold">{data.no2} ppm</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">NOx</div>
                <div className="font-mono font-bold">{data.nox} ppm</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">CO</div>
                <div className="font-mono font-bold">{data.co} ppm</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">O₃</div>
                <div className="font-mono font-bold">{data.o3} ppb</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">VOCs</div>
                <div className="font-mono font-bold">{data.vocs} µg/m³</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* NOISE */}
        <TabsContent value="noise" className="mt-4 space-y-4">
          <div className="p-6 bg-white/5 rounded-lg border border-white/10 text-center">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Current Noise Level</div>
            <div className="text-5xl font-bold font-mono mb-2 text-primary">{data.noiseLevel}</div>
            <div className="text-sm font-medium">Decibels (dB)</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Peak (1hr)</div>
              <div className="font-mono text-2xl font-bold">{data.noisePeak} dB</div>
            </div>
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Average (1hr)</div>
              <div className="font-mono text-2xl font-bold">{data.noiseAverage} dB</div>
            </div>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Noise Impact</div>
            <p className="text-sm">
              {data.noiseLevel < 50 && "Quiet environment - minimal noise impact."}
              {data.noiseLevel >= 50 && data.noiseLevel < 70 && "Moderate noise - may affect concentration."}
              {data.noiseLevel >= 70 && "Elevated noise - potential stress and health impact."}
            </p>
          </div>
        </TabsContent>

        {/* WATER */}
        <TabsContent value="water" className="mt-4 space-y-4">
          <div className="p-6 bg-white/5 rounded-lg border border-white/10 text-center">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Water Quality Index</div>
            <div className="text-5xl font-bold font-mono mb-2 text-primary">{data.waterQualityIndex}</div>
            <div className="text-sm font-medium">{getQualityLevel(data.waterQualityIndex, 100, true).label}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest opacity-60">Chemical Properties</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">pH Level</div>
                <div className="font-mono font-bold">{data.pH}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Turbidity</div>
                <div className="font-mono font-bold">{data.turbidity} NTU</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Chlorine</div>
                <div className="font-mono font-bold">{data.chlorine} ppm</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Lead</div>
                <div className="font-mono font-bold">{data.lead} ppb</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Bacteria</div>
                <div className="font-mono font-bold">{data.bacteria} CFU</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* MORE (Soil, Light, Thermal, Radioactive) */}
        <TabsContent value="more" className="mt-4 space-y-6">
          {/* Soil */}
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-widest">Soil Quality</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Moisture</div>
                <div className="font-mono font-bold">{data.soilMoisture}%</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">pH</div>
                <div className="font-mono font-bold">{data.soilPH}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Contaminants</div>
                <div className="font-mono font-bold">{data.soilContaminants}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Heavy Metals</div>
                <div className="font-mono font-bold">{data.heavyMetals} ppm</div>
              </div>
            </div>
          </div>

          {/* Light */}
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-widest">Light Exposure</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">UV Index</div>
                <div className="font-mono font-bold">{data.uvIndex}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Illuminance</div>
                <div className="font-mono font-bold">{data.lux} lux</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Light Pollution</div>
                <div className="font-mono font-bold">{data.lightPollution}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Blue Light</div>
                <div className="font-mono font-bold">{data.blueLight}%</div>
              </div>
            </div>
          </div>

          {/* Thermal */}
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-widest">Thermal Conditions</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Temperature</div>
                <div className="font-mono font-bold">{data.temperature}°C</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Feels Like</div>
                <div className="font-mono font-bold">{data.feelsLike}°C</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Humidity</div>
                <div className="font-mono font-bold">{data.humidity}%</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Pressure</div>
                <div className="font-mono font-bold">{data.pressure} hPa</div>
              </div>
            </div>
          </div>

          {/* Radioactive */}
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-widest">Radiation Exposure</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Radon</div>
                <div className="font-mono font-bold">{data.radon} Bq/m³</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Gamma</div>
                <div className="font-mono font-bold">{data.gamma} µSv/h</div>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs opacity-60 mb-1">Cosmic Rays</div>
                <div className="font-mono font-bold">{data.cosmicRays} µSv/h</div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-xs opacity-40 text-center pt-2">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
