import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { seedInitialData } from "@/lib/localStore";
import { Apple, Smartphone } from "lucide-react";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const STORAGE_KEY_PREFIX = "xuunu-onboarding-complete";

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState<"ios" | "android" | null>(null);

  const markComplete = () => {
    if (typeof window !== "undefined" && user?.uid) {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}:${user.uid}`, "true");
    }
    if (user?.uid) {
      seedInitialData(user.uid);
    }
    onComplete();
  };

  const handleConnect = async (platform: "ios" | "android") => {
    if (!user?.uid) return;
    setIsConnecting(platform);
    const provider = platform === "ios" ? "APPLE_HEALTH" : "GOOGLE_FIT";

    try {
      const response = await apiRequest("POST", "/api/terra/auth", {
        userId: user.uid,
        provider,
      });
      const data = await response.json();
      if (data?.url) {
        window.open(data.url, "_blank");
      }
      toast({
        title: "Connect device",
        description: "Finish connecting in the new window to sync your data.",
      });
      markComplete();
    } catch (error) {
      toast({
        title: "Connection failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to start device connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-md mx-auto px-6 py-12 space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-2xl font-bold">Welcome to Xuunu</h1>
          <p className="text-sm text-white/60">
            Choose your platform to connect Apple Health or Google Fit for your first
            biosignature calculations.
          </p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => handleConnect("ios")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-white/20"
            data-testid="button-connect-ios"
            disabled={isConnecting !== null}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Apple className="h-6 w-6 text-white/80" />
                <div>
                  <p className="text-base font-semibold">iOS / Apple Health</p>
                  <p className="text-xs text-white/60">
                    Connect Apple Health to sync your data.
                  </p>
                </div>
              </div>
              <span className="text-xs text-white/60">
                {isConnecting === "ios" ? "Connecting..." : "Connect"}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleConnect("android")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-white/20"
            data-testid="button-connect-android"
            disabled={isConnecting !== null}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-6 w-6 text-white/80" />
                <div>
                  <p className="text-base font-semibold">Android / Google Fit</p>
                  <p className="text-xs text-white/60">
                    Connect Google Fit to sync your data.
                  </p>
                </div>
              </div>
              <span className="text-xs text-white/60">
                {isConnecting === "android" ? "Connecting..." : "Connect"}
              </span>
            </div>
          </button>
        </div>

        <div className="space-y-2 text-center text-xs text-white/50">
          <p>We only store authentication server-side. Health data stays on your device.</p>
          <Button type="button" variant="ghost" className="text-white/70" onClick={markComplete}>
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
