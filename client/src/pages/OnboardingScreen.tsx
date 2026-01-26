import { useEffect, useState } from "react";
import { ShieldCheck, Smartphone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface OnboardingScreenProps {
  userId: string;
  onComplete: () => void;
}

export default function OnboardingScreen({ userId, onComplete }: OnboardingScreenProps) {
  const { toast } = useToast();
  const [hipaaAccepted, setHipaaAccepted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    const loadOnboarding = async () => {
      try {
        const ref = doc(db, "users", userId, "settings", "onboarding");
        const snapshot = await getDoc(ref);
        const data = snapshot.data() ?? {};
        setHipaaAccepted(!!data.hipaaAccepted);
        setIsConnected(!!data.isConnected);
        if (data.platform === "ios" || data.platform === "android") {
          setPlatform(data.platform);
        }
      } catch {
        // Ignore load errors.
      }
    };
    void loadOnboarding();
  }, [userId]);

  const saveOnboarding = async (updates: Record<string, unknown>) => {
    try {
      await setDoc(doc(db, "users", userId, "settings", "onboarding"), updates, { merge: true });
    } catch {
      // Ignore save errors.
    }
  };

  const handleSelectPlatform = async (value: "ios" | "android") => {
    setPlatform(value);
    if (value === "ios") {
      setIsConnected(true);
      await saveOnboarding({
        platform: value,
        isConnected: true,
      });
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
        window.open("https://fit.google.com/", "_blank");
      }
      setSkipConnection(false);
      setIsConnected(true);
      await saveOnboarding({
        platform: value,
        isConnected: true,
      });
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
    if (!isConnected) {
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
              onCheckedChange={(checked) => {
                const nextValue = checked === true;
                setHipaaAccepted(nextValue);
                void saveOnboarding({ hipaaAccepted: nextValue });
              }}
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
          {platform === "ios" && isConnected && (
            <div className="text-xs text-green-400">
              Apple Health connected.
            </div>
          )}
          {platform === "android" && isConnected && (
            <div className="text-xs text-green-400">
              Google Health connected.
            </div>
          )}
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
