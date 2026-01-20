import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Target } from "lucide-react";
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

  const { data: snapshots = [] } = useQuery<BioSignatureSnapshot[]>({
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-bio-signature">
        <DialogHeader>
          <DialogTitle className="text-xl">Bio Signature Analysis</DialogTitle>
          <DialogDescription className="text-white/60">
            Review your bio signature insights and targets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
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
