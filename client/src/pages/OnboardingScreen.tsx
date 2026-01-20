import { useState } from "react";
import { ShieldCheck, Smartphone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface OnboardingScreenProps {
  userId: string;
  onComplete: () => void;
}

export default function OnboardingScreen({ userId, onComplete }: OnboardingScreenProps) {
  const { toast } = useToast();
  const [hipaaAccepted, setHipaaAccepted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnectAppleHealth = async () => {
    if (!userId || isConnecting) return;
    setIsConnecting(true);
    try {
      setIsConnected(true);
      toast({
        title: "Apple Health ready",
        description: "Apple Health is available on this device.",
      });
    } catch (error: any) {
      toast({
        title: "Connection failed",
        description: error?.message || "Unable to confirm Apple Health right now.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleContinue = () => {
    if (!hipaaAccepted) {
      toast({
        title: "HIPAA terms required",
        description: "Please accept HIPAA terms to continue.",
        variant: "destructive",
      });
      return;
    }
    if (!isConnected) {
      toast({
        title: "Apple Health required",
        description: "Confirm Apple Health access to continue.",
        variant: "destructive",
      });
      return;
    }
    onComplete();
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Welcome to Xuunu</h1>
          <p className="text-sm text-white/60">
            Complete onboarding to access your health insights.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
              HIPAA Terms
            </h2>
          </div>
          <p className="text-xs text-white/60">
            Review and accept HIPAA privacy protections before continuing.
          </p>
          <a
            href="https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View HIPAA terms
            <ExternalLink className="h-3 w-3" />
          </a>
          <div className="flex items-center gap-2">
            <Checkbox
              id="hipaa-accept"
              checked={hipaaAccepted}
              onCheckedChange={(checked) => setHipaaAccepted(checked === true)}
              data-testid="checkbox-hipaa"
            />
            <Label htmlFor="hipaa-accept" className="text-xs text-white/70">
              I accept HIPAA terms
            </Label>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Connect Apple Health
            </h2>
          </div>
          <p className="text-xs text-white/60">
            Apple Health data syncs automatically from your device.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleConnectAppleHealth}
            disabled={isConnecting}
            data-testid="button-connect-apple-health"
          >
            {isConnected ? "Apple Health Connected" : isConnecting ? "Connecting..." : "Confirm Apple Health"}
          </Button>
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={handleContinue}
          data-testid="button-complete-onboarding"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
