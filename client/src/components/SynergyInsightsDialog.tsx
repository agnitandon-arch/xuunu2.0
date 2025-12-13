import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, TrendingUp, Info } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface SynergyInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  synergyLevel: number;
  healthData: any;
  environmentalData: any;
  userId: string;
}

export default function SynergyInsightsDialog({
  open,
  onOpenChange,
  synergyLevel,
  healthData,
  environmentalData,
  userId,
}: SynergyInsightsDialogProps) {
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadInsights = async () => {
    if (insights) return;
    
    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/synergy-insights", {
        userId,
        synergyLevel,
        healthData,
        environmentalData,
      });
      const data = await response.json();
      setInsights(data.insights);
    } catch (error) {
      console.error("Failed to load insights:", error);
      setInsights("Unable to generate insights at this time.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen && !insights && !loading) {
      loadInsights();
    }
  };

  const getColor = () => {
    if (synergyLevel >= 80) return "#0066FF";
    if (synergyLevel >= 60) return "#0088FF";
    if (synergyLevel >= 40) return "#00AAFF";
    return "#00CCFF";
  };

  const getLabel = () => {
    if (synergyLevel >= 80) return "Optimal Synergy";
    if (synergyLevel >= 60) return "High Synergy";
    if (synergyLevel >= 40) return "Moderate Synergy";
    return "Building Synergy";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-black border-white/10 text-white max-w-md" data-testid="dialog-synergy-insights">
        <DialogHeader>
          <DialogTitle className="text-xl">Environmental Synergy Level</DialogTitle>
          <DialogDescription className="text-white/60">
            Understanding your health-environment alignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Synergy Level Display */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
            <div className="text-6xl font-bold font-mono" style={{ color: getColor() }}>
              {synergyLevel}
            </div>
            <div className="text-sm opacity-60 mt-1">SYNERGY LEVEL</div>
            <div className="mt-3 text-sm font-medium" style={{ color: getColor() }}>
              {getLabel()}
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">How It's Calculated</span>
            </div>
            <div className="space-y-2 text-sm opacity-80">
              <div className="flex items-center justify-between">
                <span>Health Metrics Stability</span>
                <span className="font-mono">{Math.min(90, Math.round((healthData.recovery || 75) * 0.9))}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Environmental Quality</span>
                <span className="font-mono">{Math.min(100, Math.round(100 - (environmentalData.aqi || 65) * 0.5))}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Activity-Recovery Balance</span>
                <span className="font-mono">{Math.min(100, Math.round((healthData.recovery || 75) * 1.1))}%</span>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">AI-Powered Insights</span>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm leading-relaxed">{insights || "Loading insights..."}</p>
              </div>
            )}
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full"
            data-testid="button-close-synergy-dialog"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
