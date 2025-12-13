import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, TrendingDown, TrendingUp, Activity, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { BioSignatureSnapshot } from "@shared/schema";
import { getIdealPatternGuidance } from "@/lib/bioSignatureHealth";

interface BioSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  healthData: any;
  userId: string;
}

export default function BioSignatureDialog({
  open,
  onOpenChange,
  healthData,
  userId,
}: BioSignatureDialogProps) {
  const [insights, setInsights] = useState<string>("");
  const [loadingInsights, setLoadingInsights] = useState(false);

  const { data: snapshots = [], isLoading } = useQuery<BioSignatureSnapshot[]>({
    queryKey: [`/api/bio-signature/history?userId=${userId}&limit=10`],
    enabled: !!userId && open,
  });

  const loadInsights = async () => {
    if (insights || !userId) return;
    
    setLoadingInsights(true);
    try {
      const response = await apiRequest("POST", "/api/bio-signature/insights", {
        userId,
        currentData: healthData,
        historicalSnapshots: snapshots,
      });
      const data = await response.json();
      setInsights(data.insights);
    } catch (error) {
      console.error("Failed to load insights:", error);
      setInsights("Unable to generate insights at this time.");
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (open && snapshots.length > 0 && !insights && !loadingInsights) {
      loadInsights();
    }
  }, [open, snapshots]);

  const latestSnapshot = snapshots[0];
  const daysSinceSnapshot = latestSnapshot
    ? Math.floor((Date.now() - new Date(latestSnapshot.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const compareMetric = (current: number, previous: number) => {
    const diff = current - previous;
    const pct = Math.abs(diff / previous * 100);
    return {
      diff,
      pct: pct.toFixed(1),
      isUp: diff > 0,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-bio-signature">
        <DialogHeader>
          <DialogTitle className="text-xl">Bio Signature Analysis</DialogTitle>
          <DialogDescription className="text-white/60">
            Your unique health pattern evolves every 7 days
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Bio Signature */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Current Pattern</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs opacity-60">Glucose</div>
                <div className="text-2xl font-mono font-bold mt-1">{healthData.glucose || "—"}</div>
                <div className="text-xs opacity-40">mg/dL</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs opacity-60">Recovery</div>
                <div className="text-2xl font-mono font-bold mt-1">{healthData.recovery || "—"}</div>
                <div className="text-xs opacity-40">%</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs opacity-60">Sleep</div>
                <div className="text-2xl font-mono font-bold mt-1">{healthData.sleep || "—"}</div>
                <div className="text-xs opacity-40">hrs</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs opacity-60">Heart Rate</div>
                <div className="text-2xl font-mono font-bold mt-1">{healthData.heartRate || "—"}</div>
                <div className="text-xs opacity-40">bpm</div>
              </div>
            </div>
          </div>

          {/* 7-Day Evolution */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : latestSnapshot ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">7-Day Evolution</span>
                <span className="text-xs opacity-40">({daysSinceSnapshot} days ago)</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                {healthData.glucose && latestSnapshot.glucose && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Glucose</span>
                    <div className="flex items-center gap-2">
                      {compareMetric(healthData.glucose, latestSnapshot.glucose).isUp ? (
                        <TrendingUp className="w-4 h-4 text-primary" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-primary" />
                      )}
                      <span className="font-mono">{compareMetric(healthData.glucose, latestSnapshot.glucose).pct}%</span>
                    </div>
                  </div>
                )}
                {healthData.recovery && latestSnapshot.recovery && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Recovery</span>
                    <div className="flex items-center gap-2">
                      {compareMetric(healthData.recovery, parseFloat(latestSnapshot.recovery)).isUp ? (
                        <TrendingUp className="w-4 h-4 text-primary" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-primary" />
                      )}
                      <span className="font-mono">{compareMetric(healthData.recovery, parseFloat(latestSnapshot.recovery)).pct}%</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs opacity-60 mt-2">
                Bio signature snapshots are automatically saved every 7 days to track your health pattern evolution.
              </p>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-sm opacity-60">
                No previous snapshots available. Your bio signature will be saved automatically every 7 days.
              </p>
            </div>
          )}

          {/* Ideal Pattern */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Ideal Bio Signature Pattern</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-xs leading-relaxed opacity-80 whitespace-pre-line">
                {getIdealPatternGuidance()}
              </p>
            </div>
          </div>

          {/* AI Insights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">AI-Powered Insights</span>
            </div>
            
            {loadingInsights ? (
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
            data-testid="button-close-bio-signature-dialog"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
