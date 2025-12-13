import { Cloud, Droplets, Wind } from "lucide-react";
import { Card } from "@/components/ui/card";
import AQIGauge from "./AQIGauge";

interface EnvironmentalCardProps {
  aqi: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  weather: string;
  pm25?: number;
  pm10?: number;
}

export default function EnvironmentalCard({
  aqi,
  temperature,
  feelsLike,
  humidity,
  weather,
  pm25,
  pm10,
}: EnvironmentalCardProps) {
  return (
    <Card className="p-6" data-testid="card-environmental">
      <h3 className="text-base font-semibold mb-4">Environmental Conditions</h3>
      
      <div className="flex items-center justify-between mb-6">
        <AQIGauge aqi={aqi} size={100} />
        
        <div className="flex-1 ml-6 space-y-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Weather:</span>
            <span className="text-sm font-medium" data-testid="text-weather">{weather}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Temp:</span>
            <span className="text-sm font-medium font-mono" data-testid="text-temperature">
              {temperature}°F
              <span className="text-muted-foreground ml-1">(feels {feelsLike}°F)</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Humidity:</span>
            <span className="text-sm font-medium font-mono" data-testid="text-humidity">{humidity}%</span>
          </div>
        </div>
      </div>
      
      {(pm25 !== undefined || pm10 !== undefined) && (
        <div className="flex gap-4 pt-4 border-t border-card-border">
          {pm25 !== undefined && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">PM2.5</p>
              <p className="text-lg font-mono font-semibold" data-testid="text-pm25">{pm25}</p>
            </div>
          )}
          {pm10 !== undefined && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">PM10</p>
              <p className="text-lg font-mono font-semibold" data-testid="text-pm10">{pm10}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
