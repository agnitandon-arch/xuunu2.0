import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wind, Volume2, Droplets, TreePine, Sun, Thermometer, Radiation, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ManualReadingForm } from "@/components/ManualReadingForm";
import { useAuth } from "@/contexts/AuthContext";

interface PollutantData {
  // Air & VOCs
  vocs: number;
  aqi: number;
  pm25: number;
  
  // Noise
  noiseLevel: number;
  noisePeak: number;
  
  // Water
  waterQualityIndex: number;
  pH: number;
  
  // Soil
  soilContaminants: number;
  heavyMetals: number;
  
  // Light
  uvIndex: number;
  lightPollution: number;
  
  // Thermal
  temperature: number;
  humidity: number;
  
  // Radioactive
  radon: number;
  gamma: number;
  
  timestamp: string;
}

export default function PollutantsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<PollutantData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [openFormDialogs, setOpenFormDialogs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadPollutantData();
  }, [useLocation]);

  const loadPollutantData = async () => {
    if (useLocation && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `/api/environmental/comprehensive?lat=${latitude}&lng=${longitude}`
            );
            if (response.ok) {
              const result = await response.json();
              setData(result);
            } else {
              console.error("Environmental API not available");
              setData(null); // Show empty state
            }
          } catch (error) {
            console.error("Error fetching location-based data:", error);
            setData(null); // Show empty state
          }
        },
        () => {
          console.log("Location permission denied");
          setData(null); // Show empty state - user should manually enter data
        }
      );
    } else {
      // No location - show empty state for manual entry
      setData(null);
    }
  };

  const getQualityColor = (value: number, max: number, inverted = false) => {
    const percentage = (value / max) * 100;
    if (inverted) {
      return percentage >= 70 ? "text-primary" : "text-white/60";
    } else {
      return percentage <= 30 ? "text-primary" : "text-white/60";
    }
  };

  interface SecondaryMetric {
    label: string;
    value: number | undefined;
    unit?: string;
  }

  const categories: Array<{
    id: string;
    name: string;
    icon: typeof Wind;
    primary: { label: string; value: number | undefined; unit?: string; max?: number; inverted?: boolean };
    secondary: SecondaryMetric[];
    description: string;
    formFields: Array<{ name: string; label: string; unit?: string; type?: string }>;
  }> = [
    {
      id: "voc",
      name: "VOCs & Air",
      icon: Wind,
      primary: { label: "VOCs", value: data?.vocs, unit: "µg/m³", max: 200 },
      secondary: [
        { label: "AQI", value: data?.aqi },
        { label: "PM2.5", value: data?.pm25, unit: "µg/m³" },
      ],
      description: "Volatile Organic Compounds and air quality metrics from indoor/outdoor sources.",
      formFields: [
        { name: "vocs", label: "VOCs", unit: "µg/m³" },
        { name: "aqi", label: "AQI" },
        { name: "pm25", label: "PM2.5", unit: "µg/m³" },
      ],
    },
    {
      id: "noise",
      name: "Noise",
      icon: Volume2,
      primary: { label: "Current", value: data?.noiseLevel, unit: "dB", max: 100 },
      secondary: [
        { label: "Peak", value: data?.noisePeak, unit: "dB" },
      ],
      description: "Ambient noise levels that may trigger stress or affect concentration.",
      formFields: [
        { name: "noiseCurrent", label: "Current Level", unit: "dB" },
        { name: "noisePeak", label: "Peak Level", unit: "dB" },
      ],
    },
    {
      id: "water",
      name: "Water",
      icon: Droplets,
      primary: { label: "Quality", value: data?.waterQualityIndex, max: 100, inverted: true },
      secondary: [
        { label: "pH", value: data?.pH },
      ],
      description: "Water quality from municipal supply or home testing.",
      formFields: [
        { name: "waterQuality", label: "Water Quality Index" },
        { name: "waterPh", label: "pH" },
      ],
    },
    {
      id: "soil",
      name: "Soil",
      icon: TreePine,
      primary: { label: "Contaminants", value: data?.soilContaminants, max: 100 },
      secondary: [
        { label: "Heavy Metals", value: data?.heavyMetals, unit: "ppm" },
      ],
      description: "Soil quality for gardens, yards, or outdoor exposure areas.",
      formFields: [
        { name: "soilContaminants", label: "Contaminants" },
        { name: "soilHeavyMetals", label: "Heavy Metals", unit: "ppm" },
      ],
    },
    {
      id: "light",
      name: "Light",
      icon: Sun,
      primary: { label: "UV Index", value: data?.uvIndex, max: 11 },
      secondary: [
        { label: "Pollution", value: data?.lightPollution },
      ],
      description: "UV exposure and light pollution affecting sleep and health.",
      formFields: [
        { name: "uvIndex", label: "UV Index" },
        { name: "lightPollution", label: "Light Pollution" },
      ],
    },
    {
      id: "thermal",
      name: "Thermal",
      icon: Thermometer,
      primary: { label: "Temp", value: data?.temperature, unit: "°C" },
      secondary: [
        { label: "Humidity", value: data?.humidity, unit: "%" },
      ],
      description: "Temperature and humidity conditions affecting comfort and health.",
      formFields: [
        { name: "temperature", label: "Temperature", unit: "°C" },
        { name: "humidity", label: "Humidity", unit: "%" },
      ],
    },
    {
      id: "radiation",
      name: "Radiation",
      icon: Radiation,
      primary: { label: "Radon", value: data?.radon, unit: "Bq/m³", max: 150 },
      secondary: [
        { label: "Gamma", value: data?.gamma, unit: "µSv/h" },
      ],
      description: "Radioactive exposure from radon and environmental sources.",
      formFields: [
        { name: "radon", label: "Radon", unit: "Bq/m³" },
        { name: "gammaRadiation", label: "Gamma Radiation", unit: "µSv/h" },
      ],
    },
  ];

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="text-center pb-2">
          <h1 className="text-2xl font-bold mb-2">Environmental Pollutants</h1>
          <p className="text-sm opacity-60">
            Track indoor and outdoor environmental exposures
          </p>
        </div>

        {/* Location Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-sm">
            <div className="font-medium">Use Location Data</div>
            <div className="text-xs opacity-60">Fetch outdoor readings via GPS</div>
          </div>
          <Button
            size="sm"
            variant={useLocation ? "default" : "outline"}
            onClick={() => setUseLocation(!useLocation)}
            data-testid="button-toggle-location"
          >
            {useLocation ? "Enabled" : "Manual"}
          </Button>
        </div>

        {/* Pollutant Categories Grid */}
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            const primaryValue = category.primary.value;
            const colorClass = category.primary.max 
              ? getQualityColor(
                  primaryValue || 0, 
                  category.primary.max, 
                  category.primary.inverted
                )
              : "text-primary";

            return (
              <Dialog key={category.id}>
                <DialogTrigger asChild>
                  <Card 
                    className="cursor-pointer hover-elevate active-elevate-2 border-white/10"
                    data-testid={`card-${category.id}`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className="w-4 h-4 text-primary" />
                        {category.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <div className="text-xs opacity-60 mb-1">
                          {category.primary.label}
                        </div>
                        <div className={`text-2xl font-bold font-mono ${colorClass}`}>
                          {primaryValue !== undefined ? primaryValue : "--"}
                          {category.primary.unit && (
                            <span className="text-sm ml-1 opacity-60">
                              {category.primary.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      {category.secondary.map((sec, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="opacity-60">{sec.label}: </span>
                          <span className="font-mono">
                            {sec.value !== undefined ? sec.value : "--"}
                            {sec.unit && ` ${sec.unit}`}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </DialogTrigger>

                <DialogContent className="bg-black border-white/10">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-primary" />
                      {category.name} Details
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                      {category.description}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 pt-4">
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                      <div className="text-xs uppercase tracking-widest opacity-60 mb-2">
                        {category.primary.label}
                      </div>
                      <div className={`text-4xl font-bold font-mono ${colorClass}`}>
                        {primaryValue !== undefined ? primaryValue : "--"}
                      </div>
                      {category.primary.unit && (
                        <div className="text-sm opacity-60 mt-1">
                          {category.primary.unit}
                        </div>
                      )}
                    </div>

                    {category.secondary.length > 0 && (
                      <div className="space-y-2">
                        {category.secondary.map((sec, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10"
                          >
                            <span className="text-sm opacity-60">{sec.label}</span>
                            <span className="font-mono font-bold">
                              {sec.value !== undefined ? sec.value : "--"}
                              {sec.unit && ` ${sec.unit}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Dialog
                      open={openFormDialogs[category.id] || false}
                      onOpenChange={(open) =>
                        setOpenFormDialogs((prev) => ({
                          ...prev,
                          [category.id]: open,
                        }))
                      }
                    >
                      <DialogTrigger asChild>
                        <Button
                          className="w-full"
                          variant="outline"
                          data-testid={`button-open-form-${category.id}`}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Manual Reading
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-black border-white/10">
                        <DialogHeader>
                          <DialogTitle>Add {category.name} Reading</DialogTitle>
                          <DialogDescription className="text-white/60">
                            Enter manual readings for {category.name.toLowerCase()} data
                          </DialogDescription>
                        </DialogHeader>
                        <ManualReadingForm
                          category={{
                            id: category.id,
                            name: category.name,
                            fields: category.formFields,
                          }}
                          userId={user?.uid || ""}
                          onSuccess={() => {
                            setOpenFormDialogs((prev) => ({
                              ...prev,
                              [category.id]: false,
                            }));
                            loadPollutantData();
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>

        {/* Refresh Button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={loadPollutantData}
          data-testid="button-refresh-pollutants"
        >
          Refresh All Readings
        </Button>

        {/* Info Section */}
        <div className="pt-4 space-y-3 text-xs opacity-60">
          <p>
            <strong>Indoor Measurements:</strong> Use manual mode to enter readings from 
            home sensors, testing kits, or smart monitors.
          </p>
          <p>
            <strong>Outdoor Data:</strong> Enable location to fetch real-time environmental 
            data from your current area.
          </p>
          <p>
            <strong>Last Updated:</strong> {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
