import { useEffect, useState } from "react";
import { ShieldCheck, Smartphone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface OnboardingScreenProps {
  userId: string;
  onComplete: () => void;
}

const APPLE_HEALTH_STORAGE_KEY = "xuunu-apple-health-connected";
const HEALTH_PLATFORM_KEY = "xuunu-health-platform";
const HEALTH_CONNECTION_SKIPPED_KEY = "xuunu-health-connection-skipped";

export default function OnboardingScreen({ userId, onComplete }: OnboardingScreenProps) {
  const { toast } = useToast();
  const [hipaaAccepted, setHipaaAccepted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [skipConnection, setSkipConnection] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(APPLE_HEALTH_STORAGE_KEY);
    if (stored === "true") {
      setIsConnected(true);
    }
    const storedPlatform = window.localStorage.getItem(HEALTH_PLATFORM_KEY);
    if (storedPlatform === "ios" || storedPlatform === "android") {
      setPlatform(storedPlatform);
    }
    const skipped = window.localStorage.getItem(HEALTH_CONNECTION_SKIPPED_KEY);
    if (skipped === "true") {
      setSkipConnection(true);
    }
  }, []);

  const handleSelectPlatform = async (value: "ios" | "android") => {
    setPlatform(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HEALTH_PLATFORM_KEY, value);
    }
    if (value === "ios") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(APPLE_HEALTH_STORAGE_KEY, "true");
        window.localStorage.removeItem(HEALTH_CONNECTION_SKIPPED_KEY);
      }
      setSkipConnection(false);
      setIsConnected(true);
      toast({
        title: "Apple Health connected",
        description: "Apple Health syncs automatically on iOS.",
      });
    } else {
      const isAndroid =
        typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
      if (!isAndroid) {
        toast({
          title: "Google Health requires Android",
          description: "Open onboarding on an Android device to connect Google Health.",
          variant: "destructive",
        });
        return;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(APPLE_HEALTH_STORAGE_KEY, "true");
        window.localStorage.removeItem(HEALTH_CONNECTION_SKIPPED_KEY);
        window.open("https://fit.google.com/", "_blank");
      }
      setSkipConnection(false);
      setIsConnected(true);
      toast({
        title: "Google Health connection started",
        description: "Complete the connection on your Android device.",
      });
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
    if (!platform) {
      toast({
        title: "Select your phone type",
        description: "Choose iPhone or Android to continue.",
        variant: "destructive",
      });
      return;
    }
    if (!isConnected && !skipConnection) {
      toast({
        title: "Health connection required",
        description: "Connect your health account to continue.",
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
              Phone Type
            </h2>
          </div>
          <p className="text-xs text-white/60">
            iPhone connects to Apple Health automatically. Android uses Google Health.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={platform === "ios" ? "default" : "outline"}
              onClick={() => handleSelectPlatform("ios")}
              data-testid="button-select-ios"
            >
              iPhone
            </Button>
            <Button
              type="button"
              variant={platform === "android" ? "default" : "outline"}
              onClick={() => handleSelectPlatform("android")}
              data-testid="button-select-android"
            >
              Android
            </Button>
          </div>
          {platform === "ios" && (
            <div className="text-xs text-green-400">
              Apple Health connected automatically.
            </div>
          )}
          {platform === "android" && (
            <div className="text-xs text-green-400">
              Google Health connection started.
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSkipConnection(true);
              if (typeof window !== "undefined") {
                window.localStorage.setItem(HEALTH_CONNECTION_SKIPPED_KEY, "true");
              }
              toast({
                title: "We'll remind you later",
                description: "You can connect your health account anytime.",
              });
            }}
            className="w-full"
            data-testid="button-remind-later"
          >
            Remind me later
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
