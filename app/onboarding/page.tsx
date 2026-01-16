"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { auth, db, storage } from "../../client/src/lib/firebase";
import { toast } from "../../client/src/hooks/use-toast";
import { Toaster } from "../../client/src/components/ui/toaster";
import Welcome from "../../components/onboarding/Welcome";
import SelectActivities, {
  type ActivityOption,
} from "../../components/onboarding/SelectActivities";
import ConnectDevices, {
  type DeviceOption,
} from "../../components/onboarding/ConnectDevices";
import CreateProfile from "../../components/onboarding/CreateProfile";
import Complete from "../../components/onboarding/Complete";

const activityOptions: ActivityOption[] = [
  { id: "running", label: "Running/Cardio", emoji: "🏃" },
  { id: "strength", label: "Strength Training", emoji: "🏋️" },
  { id: "sleep", label: "Sleep & Recovery", emoji: "💤" },
  { id: "hrv", label: "HRV & Readiness", emoji: "❤️" },
  { id: "energy", label: "Energy Levels", emoji: "⚡" },
  { id: "body", label: "Body Composition", emoji: "⚖️" },
  { id: "cycling", label: "Cycling", emoji: "🚴" },
  { id: "yoga", label: "Yoga/Mobility", emoji: "🧘" },
];

const deviceOptions: DeviceOption[] = [
  {
    name: "Apple Health",
    emoji: "🍎",
    description: "Sync workouts, recovery, and heart rate.",
  },
  {
    name: "Google Fit",
    emoji: "📱",
    description: "Bring in steps, HR, and activity data.",
  },
  {
    name: "Fitbit",
    emoji: "⌚",
    description: "Track sleep, recovery, and readiness.",
  },
  {
    name: "Oura",
    emoji: "💍",
    description: "Add sleep and recovery insights.",
  },
  {
    name: "Whoop",
    emoji: "🧢",
    description: "Connect strain and recovery scores.",
  },
  {
    name: "Dexcom",
    emoji: "🩸",
    description: "Monitor glucose with performance data.",
  },
];

const steps = [1, 2, 3, 4, 5];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isWidgetLoading, setIsWidgetLoading] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        window.location.href = "/auth/signin";
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const handleToggleActivity = (activityId: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activityId)
        ? prev.filter((item) => item !== activityId)
        : [...prev, activityId],
    );
  };

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    setAvatarPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return file ? URL.createObjectURL(file) : "";
    });
  };

  const handleOpenWidget = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to connect your devices.",
        variant: "destructive",
      });
      return;
    }

    setIsWidgetLoading(true);
    try {
      const response = await fetch("/api/terra/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load Terra widget.");
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("Missing Terra widget URL.");
      }

      setWidgetUrl(data.url);
      setIsWidgetOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to open Terra widget.";
      toast({
        title: "Unable to connect devices",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsWidgetLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to finish onboarding.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = "";
      if (avatarFile) {
        const avatarRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(avatarRef, avatarFile);
        avatarUrl = await getDownloadURL(avatarRef);
      }

      await setDoc(doc(db, "users", user.uid), {
        fullName: fullName.trim(),
        bio: bio.trim(),
        avatarUrl,
        favoriteActivities: selectedActivities,
        stats: {
          totalActivities: 0,
          followers: 0,
          following: 0,
          currentStreak: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Profile saved",
        description: "Your profile is ready to go.",
      });
      setStep(5);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save profile.";
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (step === 4) {
      await handleSaveProfile();
      return;
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStartTracking = () => {
    window.location.href = "/feed";
  };

  const isContinueDisabled =
    isSaving || (step === 2 && selectedActivities.length === 0);

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Welcome />;
      case 2:
        return (
          <SelectActivities
            activities={activityOptions}
            selected={selectedActivities}
            onToggle={handleToggleActivity}
          />
        );
      case 3:
        return (
          <ConnectDevices
            devices={deviceOptions}
            isWidgetLoading={isWidgetLoading}
            onOpenWidget={handleOpenWidget}
            onSkip={() => setStep(4)}
          />
        );
      case 4:
        return (
          <CreateProfile
            activities={activityOptions}
            selectedActivities={selectedActivities}
            fullName={fullName}
            bio={bio}
            avatarPreviewUrl={avatarPreviewUrl}
            onFullNameChange={setFullName}
            onBioChange={setBio}
            onAvatarChange={handleAvatarChange}
            onToggleActivity={handleToggleActivity}
          />
        );
      case 5:
        return <Complete onStart={handleStartTracking} />;
      default:
        return <Welcome />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066ff]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {steps.map((dot) => (
              <span
                key={dot}
                className={`h-2 w-2 rounded-full transition ${
                  step >= dot ? "bg-[#0066ff]" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-white/50">Step {step} of 5</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {step < 5 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || isSaving}
              className="w-full rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={isContinueDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0066ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a75ff] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {step === 4 ? "Save & Continue" : "Continue"}
            </button>
          </div>
        )}
      </div>

      {isWidgetOpen && widgetUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">
                Terra Connect
              </p>
              <button
                type="button"
                onClick={() => setIsWidgetOpen(false)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Close
              </button>
            </div>
            <iframe
              title="Terra Widget"
              src={widgetUrl}
              className="h-[70vh] w-full"
            />
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
