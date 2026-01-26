import { Suspense, lazy, useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import type { FriendProfile } from "@/pages/FriendProfileScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";

const LoginScreen = lazy(() => import("@/pages/LoginScreen"));
const DashboardScreen = lazy(() => import("@/pages/DashboardScreen"));
const DataInsightsScreen = lazy(() => import("@/pages/DataInsightsScreen"));
const AccountScreen = lazy(() => import("@/pages/AccountScreen"));
const DeviceConnectionScreen = lazy(() => import("@/pages/DeviceConnectionScreen"));
const MedicationTrackerScreen = lazy(() => import("@/pages/MedicationTrackerScreen"));
const ShowcaseAll = lazy(() => import("@/pages/ShowcaseAll"));
const FriendProfileScreen = lazy(() => import("@/pages/FriendProfileScreen"));
const PublicProfileScreen = lazy(() => import("@/pages/PublicProfileScreen"));
const OnboardingScreen = lazy(() => import("@/pages/OnboardingScreen"));
const GroupUpdatesScreen = lazy(() => import("@/pages/GroupUpdatesScreen"));

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showShowcase, setShowShowcase] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [openChallengePicker, setOpenChallengePicker] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.appReady = "true";
      sessionStorage.removeItem("xuunu-recover-attempted");
    }
  }, []);

  useEffect(() => {
    if (user?.uid) {
      setHasCompletedOnboarding(false);
    }
  }, [user?.uid]);

  const handleLogout = async () => {
    await signOut();
    setActiveTab("dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const screenFallback = (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  if (showShowcase) {
    return (
      <div>
        <Suspense fallback={screenFallback}>
          <ShowcaseAll />
        </Suspense>
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setShowShowcase(false)}
            className="bg-primary text-white px-6 py-3 rounded-full font-semibold hover-elevate active-elevate-2"
          >
            Exit Showcase
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={screenFallback}>
        <LoginScreen />
      </Suspense>
    );
  }

  if (!hasCompletedOnboarding) {
    return (
      <Suspense fallback={screenFallback}>
        <OnboardingScreen
          userId={user.uid}
          onComplete={() => setHasCompletedOnboarding(true)}
        />
      </Suspense>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardScreen
            onNavigate={setActiveTab}
            onOpenProfile={() => setActiveTab("data")}
          />
        );
      case "data":
        return (
          <DataInsightsScreen
            onBack={() => setActiveTab("dashboard")}
            onPreviewPublicProfile={() => setActiveTab("public-profile")}
            onViewFriend={(friend) => {
              setSelectedFriend(friend);
              setActiveTab("friend-profile");
            }}
            onViewGroup={(group) => {
              setSelectedGroup(group);
              setActiveTab("group-updates");
            }}
            openChallengePicker={openChallengePicker}
            onChallengePickerOpened={() => setOpenChallengePicker(false)}
          />
        );
      case "account":
        return <AccountScreen onLogout={handleLogout} />;
      case "friend-profile":
        return (
          <FriendProfileScreen
            friend={selectedFriend}
            onBack={() => setActiveTab("data")}
          />
        );
      case "public-profile":
        return <PublicProfileScreen onBack={() => setActiveTab("data")} />;
      case "group-updates":
        return selectedGroup ? (
          <GroupUpdatesScreen
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
            onBack={() => setActiveTab("data")}
          />
        ) : (
          <DataInsightsScreen onBack={() => setActiveTab("dashboard")} />
        );
      case "devices":
        return <DeviceConnectionScreen />;
      case "medications":
        return <MedicationTrackerScreen onBack={() => setActiveTab("dashboard")} />;
      default:
        return (
          <DashboardScreen
            onNavigate={setActiveTab}
            onOpenProfile={() => setActiveTab("data")}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Suspense fallback={screenFallback}>{renderScreen()}</Suspense>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
      <Analytics />
    </QueryClientProvider>
  );
}

export default App;
