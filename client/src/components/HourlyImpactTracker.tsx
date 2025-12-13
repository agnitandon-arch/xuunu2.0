import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface HourlyDataPoint {
  time: string;
  glucose?: number;
  heartRate?: number;
  symptoms: string[];
  severityLevel: number;
  aqi: number;
  pm25: number;
  no2: number;
  impactScore: number;
}

export default function HourlyImpactTracker() {
  const [hourlyData, setHourlyData] = useState<HourlyDataPoint[]>([]);

  useEffect(() => {
    // TODO: Replace with actual API call
    // Generate mock data for past hour (4 data points, 15 min intervals)
    const now = new Date();
    const mockData: HourlyDataPoint[] = Array.from({ length: 4 }, (_, i) => {
      const time = new Date(now.getTime() - (3 - i) * 15 * 60 * 1000);
      return {
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        glucose: 115 + Math.random() * 20,
        heartRate: 68 + Math.random() * 10,
        symptoms: i > 1 ? ["Fatigue"] : [],
        severityLevel: i > 1 ? 3 : 1,
        aqi: 50 + i * 10,
        pm25: 10 + i * 3,
        no2: 12 + i * 2,
        impactScore: i * 20 + 10,
      };
    });
    setHourlyData(mockData);
  }, []);

  const getImpactColor = (score: number) => {
    if (score < 25) return "text-primary/60";
    if (score < 50) return "text-primary/80";
    if (score < 75) return "text-primary";
    return "text-primary";
  };

  const getTrendIcon = (index: number) => {
    if (index === 0) return null;
    const current = hourlyData[index].impactScore;
    const previous = hourlyData[index - 1].impactScore;
    
    if (current > previous) {
      return <TrendingUp className="w-3 h-3 text-primary" />;
    }
    return <TrendingDown className="w-3 h-3 text-primary/60" />;
  };

  return (
    <div className="space-y-4" data-testid="hourly-impact-tracker">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-widest">Past Hour Impact</h3>
      </div>

      <div className="space-y-3">
        {hourlyData.map((point, index) => (
          <div
            key={index}
            className="p-4 bg-white/5 rounded-lg border border-white/10 hover-elevate"
            data-testid={`hourly-point-${index}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono opacity-60">{point.time}</span>
                {getTrendIcon(index)}
              </div>
              <div className={`text-sm font-bold ${getImpactColor(point.impactScore)}`}>
                Impact: {point.impactScore}%
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="opacity-60 mb-1">Glucose</div>
                <div className="font-mono font-bold">{point.glucose?.toFixed(0)} mg/dL</div>
              </div>
              <div>
                <div className="opacity-60 mb-1">Heart Rate</div>
                <div className="font-mono font-bold">{point.heartRate?.toFixed(0)} bpm</div>
              </div>
              <div>
                <div className="opacity-60 mb-1">AQI</div>
                <div className="font-mono font-bold">{point.aqi}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <div className="opacity-60 mb-1">PM2.5</div>
                <div className="font-mono">{point.pm25.toFixed(1)} µg/m³</div>
              </div>
              <div>
                <div className="opacity-60 mb-1">NO₂</div>
                <div className="font-mono">{point.no2.toFixed(1)} ppm</div>
              </div>
            </div>

            {point.symptoms.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="text-xs opacity-60 mb-1">Symptoms</div>
                <div className="flex gap-2">
                  {point.symptoms.map((symptom, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-primary/20 rounded text-xs"
                    >
                      {symptom}
                    </span>
                  ))}
                  <span className="px-2 py-1 bg-white/10 rounded text-xs">
                    Level {point.severityLevel}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Correlation Analysis</div>
        <p className="text-sm">
          Environmental conditions show increasing impact over the past hour. 
          PM2.5 and NO₂ levels correlating with slight fatigue symptoms.
        </p>
      </div>
    </div>
  );
}
