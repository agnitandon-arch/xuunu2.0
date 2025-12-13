import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import HealthEntryCard from "@/components/HealthEntryCard";

export default function HistoryScreen() {
  //todo: remove mock functionality - replace with real data from Firebase
  const mockEntries = [
    {
      timestamp: new Date(),
      glucose: 125,
      symptomSeverity: 3,
      symptoms: ["Fatigue"],
      location: "Seattle, WA",
      weather: "Cloudy",
      aqi: 45,
      notes: "Feeling good today"
    },
    {
      timestamp: new Date(Date.now() - 86400000),
      glucose: 165,
      symptomSeverity: 6,
      symptoms: ["Fatigue", "Brain Fog", "Headache"],
      location: "Seattle, WA",
      weather: "Rainy",
      aqi: 95,
    },
    {
      timestamp: new Date(Date.now() - 172800000),
      glucose: 110,
      symptomSeverity: 2,
      symptoms: [],
      location: "Seattle, WA",
      weather: "Sunny",
      aqi: 35,
      notes: "Great day, low symptoms"
    },
    {
      timestamp: new Date(Date.now() - 259200000),
      glucose: 145,
      symptomSeverity: 5,
      symptoms: ["Pain", "Fatigue"],
      location: "Seattle, WA",
      weather: "Overcast",
      aqi: 75,
    },
    {
      timestamp: new Date(Date.now() - 345600000),
      glucose: 190,
      symptomSeverity: 8,
      symptoms: ["Fatigue", "Nausea", "Headache", "Brain Fog"],
      location: "Seattle, WA",
      weather: "Rainy",
      aqi: 125,
      notes: "Difficult day, high AQI affected symptoms"
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-md mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Health History</h1>
          <p className="text-sm text-muted-foreground">
            Last 7 days • {mockEntries.length} entries
          </p>
        </div>

        <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">Upgrade to Premium</h3>
                <Badge variant="outline" className="text-xs">Free Tier</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                View unlimited history, get AI-powered insights, and export your data
              </p>
              <button 
                className="text-xs font-semibold text-primary hover-elevate active-elevate-2 px-3 py-1.5 rounded-md"
                data-testid="button-upgrade"
              >
                Learn More
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {mockEntries.map((entry, index) => (
            <HealthEntryCard
              key={index}
              {...entry}
              onClick={() => console.log("View entry", index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
