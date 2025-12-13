import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Lock, BarChart } from "lucide-react";

export default function InsightsScreen() {
  //todo: remove mock functionality - calculate from real data
  const entryCount = 12;
  const hasEnoughData = entryCount >= 10;

  const insights = hasEnoughData ? {
    avgGlucoseByAQI: [
      { level: "Good (0-50)", avgGlucose: 118, count: 4 },
      { level: "Moderate (51-100)", avgGlucose: 145, count: 5 },
      { level: "Unhealthy (101+)", avgGlucose: 172, count: 3 },
    ],
    correlations: [
      { label: "High AQI days", impact: "+28 mg/dL glucose", trend: "up" },
      { label: "Low humidity", impact: "+15% symptoms", trend: "up" },
      { label: "Good AQI days", impact: "-2 severity points", trend: "down" },
    ],
    bestDay: { date: "March 15", glucose: 105, severity: 1 },
    worstDay: { date: "March 10", glucose: 195, severity: 9 },
  } : null;

  return (
    <div className="flex-1 overflow-y-auto pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-md mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-sm text-muted-foreground">
            {entryCount} entries logged
          </p>
        </div>

        {!hasEnoughData ? (
          <Card className="p-8 text-center">
            <BarChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Log More Data to See Patterns</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You need at least 10 entries to see meaningful insights. You have {entryCount} so far.
            </p>
            <Badge variant="secondary">{10 - entryCount} more needed</Badge>
          </Card>
        ) : insights && (
          <>
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Average Glucose by Air Quality</h3>
              <div className="space-y-3">
                {insights.avgGlucoseByAQI.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{item.level}</p>
                      <p className="text-xs text-muted-foreground">{item.count} entries</p>
                    </div>
                    <p className="text-lg font-mono font-bold" data-testid={`text-avg-glucose-${index}`}>
                      {item.avgGlucose} <span className="text-xs text-muted-foreground">mg/dL</span>
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Key Correlations</h3>
              <div className="space-y-3">
                {insights.correlations.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {item.trend === "up" ? (
                      <TrendingUp className="w-5 h-5 text-health-warning flex-shrink-0" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-health-good flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Best & Worst Days</h3>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-health-good/10 border border-health-good/20">
                  <p className="text-xs text-muted-foreground mb-1">Best Day</p>
                  <p className="font-semibold">{insights.bestDay.date}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="font-mono">{insights.bestDay.glucose} mg/dL</span>
                    <span>Severity: {insights.bestDay.severity}/10</span>
                  </div>
                </div>
                
                <div className="p-3 rounded-md bg-health-danger/10 border border-health-danger/20">
                  <p className="text-xs text-muted-foreground mb-1">Worst Day</p>
                  <p className="font-semibold">{insights.worstDay.date}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="font-mono">{insights.worstDay.glucose} mg/dL</span>
                    <span>Severity: {insights.worstDay.severity}/10</span>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}

        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">AI-Powered Insights</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Get personalized recommendations and predictive analytics with Premium
              </p>
              <Badge variant="outline" className="text-xs">Premium Feature</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
