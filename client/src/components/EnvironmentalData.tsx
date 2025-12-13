import { useState, useEffect } from "react";
import { Wind, Droplets, Gauge, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnvironmentalDataProps {
  latitude: number;
  longitude: number;
}

interface PollutantData {
  aqi: number;
  pm25: number;
  pm10: number;
  so2: number;
  no2: number;
  nox: number;
  co: number;
  o3: number;
  vocs?: number;
  radon?: number;
  timestamp: string;
}

export default function EnvironmentalData({ latitude, longitude }: EnvironmentalDataProps) {
  const [data, setData] = useState<PollutantData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvironmentalData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/environmental?lat=${latitude}&lng=${longitude}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch environmental data");
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Environmental data error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch environmental data");
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

  const getAQILevel = (aqi: number) => {
    if (aqi <= 50) return { label: "Good", color: "#0066FF" };
    if (aqi <= 100) return { label: "Moderate", color: "#0088FF" };
    if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "#00AAFF" };
    if (aqi <= 200) return { label: "Unhealthy", color: "#00CCFF" };
    return { label: "Very Unhealthy", color: "#00EEFF" };
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center" data-testid="environmental-data-loading">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm opacity-60">Loading environmental data...</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const aqiLevel = getAQILevel(data.aqi);

  return (
    <div className="space-y-4" data-testid="environmental-data">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest">Environmental Data</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchEnvironmentalData}
          data-testid="button-refresh-environmental"
        >
          Refresh
        </Button>
      </div>

      {/* AQI Hero */}
      <div className="p-6 bg-white/5 rounded-lg border border-white/10 text-center">
        <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Air Quality Index</div>
        <div className="text-5xl font-bold font-mono mb-2" style={{ color: aqiLevel.color }}>
          {data.aqi}
        </div>
        <div className="text-sm font-medium" style={{ color: aqiLevel.color }}>
          {aqiLevel.label}
        </div>
      </div>

      {/* Particulate Matter */}
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

      {/* Gas Pollutants */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest opacity-60">Gas Pollutants (PPM)</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-xs opacity-60 mb-1">SO₂ (Sulfur)</div>
            <div className="font-mono font-bold">{data.so2} ppm</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-xs opacity-60 mb-1">NO₂ (Nitrogen)</div>
            <div className="font-mono font-bold">{data.no2} ppm</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-xs opacity-60 mb-1">NOx</div>
            <div className="font-mono font-bold">{data.nox} ppm</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-xs opacity-60 mb-1">CO (Carbon)</div>
            <div className="font-mono font-bold">{data.co} ppm</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-xs opacity-60 mb-1">O₃ (Ozone)</div>
            <div className="font-mono font-bold">{data.o3} ppb</div>
          </div>
        </div>
      </div>

      {/* Other Pollutants */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest opacity-60">Other Pollutants</div>
        <div className="grid grid-cols-2 gap-3">
          {data.vocs && (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-xs opacity-60 mb-1">VOCs</div>
              <div className="font-mono font-bold">{data.vocs} µg/m³</div>
            </div>
          )}
          {data.radon && (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-xs opacity-60 mb-1">Radon</div>
              <div className="font-mono font-bold">{data.radon} Bq/m³</div>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs opacity-40 text-center pt-2">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
