import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, MapPin } from "lucide-react";

interface HealthEntryCardProps {
  timestamp: Date;
  glucose: number;
  symptomSeverity: number;
  symptoms: string[];
  location?: string;
  weather?: string;
  aqi?: number;
  notes?: string;
  onClick?: () => void;
}

export default function HealthEntryCard({
  timestamp,
  glucose,
  symptomSeverity,
  symptoms,
  location,
  weather,
  aqi,
  notes,
  onClick,
}: HealthEntryCardProps) {
  const getGlucoseColor = (value: number) => {
    if (value < 140) return "text-health-good";
    if (value < 200) return "text-health-warning";
    return "text-health-danger";
  };

  const getSeverityColor = (value: number) => {
    if (value <= 3) return "bg-health-good/10 text-health-good border-health-good/20";
    if (value <= 6) return "bg-health-warning/10 text-health-warning border-health-warning/20";
    return "bg-health-danger/10 text-health-danger border-health-danger/20";
  };

  const getAQIColor = (value: number) => {
    if (value <= 50) return "text-health-good";
    if (value <= 100) return "text-health-warning";
    return "text-health-danger";
  };

  return (
    <Card 
      className={`p-4 ${onClick ? 'cursor-pointer hover-elevate active-elevate-2' : ''}`}
      onClick={onClick}
      data-testid="card-health-entry"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold" data-testid="text-entry-date">
            {format(timestamp, "MMM dd, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-entry-time">
            {format(timestamp, "h:mm a")}
          </p>
        </div>
        
        <div className="text-right">
          <p className={`text-2xl font-mono font-bold ${getGlucoseColor(glucose)}`} data-testid="text-glucose">
            {glucose}
          </p>
          <p className="text-xs text-muted-foreground">mg/dL</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">Severity:</span>
        <Badge 
          variant="outline" 
          className={`${getSeverityColor(symptomSeverity)} font-mono`}
          data-testid="badge-severity"
        >
          {symptomSeverity}/10
        </Badge>
      </div>
      
      {symptoms.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {symptoms.map((symptom, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-xs"
              data-testid={`badge-symptom-${index}`}
            >
              {symptom}
            </Badge>
          ))}
        </div>
      )}
      
      {notes && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid="text-notes">
          {notes}
        </p>
      )}
      
      <div className="flex items-center justify-between pt-3 border-t border-card-border text-xs">
        {location && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span data-testid="text-location">{location}</span>
          </div>
        )}
        
        {weather && aqi !== undefined && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Cloud className="w-3 h-3" />
              <span data-testid="text-entry-weather">{weather}</span>
            </div>
            <span className={`font-mono font-semibold ${getAQIColor(aqi)}`} data-testid="text-entry-aqi">
              AQI {aqi}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
