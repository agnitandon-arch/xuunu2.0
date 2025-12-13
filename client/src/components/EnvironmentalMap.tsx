import { useState, useEffect } from "react";
import { MapPin, Navigation, RefreshCw, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Common Arizona locations for manual selection
const ARIZONA_CITIES = [
  { name: "Phoenix", lat: 33.4484, lng: -112.0740 },
  { name: "Scottsdale", lat: 33.4942, lng: -111.9261 },
  { name: "Tempe", lat: 33.4152, lng: -111.9093 },
  { name: "Mesa", lat: 33.4152, lng: -111.8315 },
  { name: "Chandler", lat: 33.3062, lng: -111.8413 },
  { name: "Glendale", lat: 33.5387, lng: -112.1860 },
  { name: "Tucson", lat: 32.2226, lng: -110.9747 },
  { name: "Gilbert", lat: 33.3528, lng: -111.7890 },
];

interface EnvironmentalMapProps {
  onLocationUpdate?: (lat: number, lng: number) => void;
  onCityNameUpdate?: (cityName: string) => void;
}

export default function EnvironmentalMap({ onLocationUpdate, onCityNameUpdate }: EnvironmentalMapProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  const getLocation = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        onLocationUpdate?.(latitude, longitude);
        
        // Fetch city name using reverse geocoding
        try {
          const response = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            const cityText = data.formatted || "Unknown Location";
            setCityName(cityText);
            onCityNameUpdate?.(cityText);
          }
        } catch (err) {
          console.error("Error fetching city name:", err);
        }
        
        setIsLoading(false);
      },
      (error) => {
        setError(`Unable to retrieve location: ${error.message}`);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const selectCity = async (cityName: string) => {
    const city = ARIZONA_CITIES.find(c => c.name === cityName);
    if (!city) return;

    setIsLoading(true);
    setError(null);

    try {
      setLocation({ lat: city.lat, lng: city.lng });
      onLocationUpdate?.(city.lat, city.lng);

      // Fetch city name using reverse geocoding
      const response = await fetch(`/api/geocode/reverse?lat=${city.lat}&lng=${city.lng}`);
      if (response.ok) {
        const data = await response.json();
        const cityText = data.formatted || city.name;
        setCityName(cityText);
        onCityNameUpdate?.(cityText);
      } else {
        setCityName(city.name + ", Arizona");
        onCityNameUpdate?.(city.name + ", Arizona");
      }
      
      setShowManualInput(false);
    } catch (err) {
      console.error("Error setting manual location:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  return (
    <div className="space-y-4" data-testid="environmental-map">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-widest">Location Tracking</h3>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowManualInput(!showManualInput)}
            data-testid="button-manual-location"
            title="Manual location input"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={getLocation}
            disabled={isLoading}
            data-testid="button-refresh-location"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-3">
          <p className="text-sm text-primary">{error}</p>
          <div className="space-y-2">
            <p className="text-xs opacity-80">Select your Arizona city manually:</p>
            <Select onValueChange={selectCity}>
              <SelectTrigger className="h-10 bg-black border-primary/30" data-testid="select-manual-city">
                <SelectValue placeholder="Choose your city..." />
              </SelectTrigger>
              <SelectContent>
                {ARIZONA_CITIES.map((city) => (
                  <SelectItem key={city.name} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {!error && showManualInput && (
        <div className="p-4 bg-white/5 border border-white/20 rounded-lg space-y-3">
          <p className="text-sm">Select your Arizona city manually:</p>
          <Select onValueChange={selectCity}>
            <SelectTrigger className="h-10" data-testid="select-manual-city-alt">
              <SelectValue placeholder="Choose your city..." />
            </SelectTrigger>
            <SelectContent>
              {ARIZONA_CITIES.map((city) => (
                <SelectItem key={city.name} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {location && (
        <div className="space-y-4">
          {cityName && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-xs opacity-60 mb-1">CURRENT LOCATION</div>
              <div className="text-sm font-semibold">{cityName}</div>
            </div>
          )}

          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="aspect-video bg-black relative">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01},${location.lat - 0.01},${location.lng + 0.01},${location.lat + 0.01}&layer=mapnik&marker=${location.lat},${location.lng}`}
                allowFullScreen
                title="Location Map"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-xs opacity-60 mb-1">LATITUDE</div>
              <div className="font-mono text-sm">{location.lat.toFixed(6)}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-xs opacity-60 mb-1">LONGITUDE</div>
              <div className="font-mono text-sm">{location.lng.toFixed(6)}</div>
            </div>
          </div>

          <a
            href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full p-3 bg-primary/10 border border-primary/30 rounded-lg hover-elevate active-elevate-2 text-sm"
            data-testid="link-open-maps"
          >
            <Navigation className="w-4 h-4" />
            Open in Google Maps
          </a>
        </div>
      )}

      {!location && !error && !isLoading && (
        <div className="p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm opacity-60">Click refresh to get your location</p>
        </div>
      )}
    </div>
  );
}
