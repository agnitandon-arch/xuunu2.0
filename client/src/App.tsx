import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginScreen from "@/pages/LoginScreen";
import DashboardScreen from "@/pages/DashboardScreen";
import DataInsightsScreen from "@/pages/DataInsightsScreen";
import AccountScreen from "@/pages/AccountScreen";
import DeviceConnectionScreen from "@/pages/DeviceConnectionScreen";
import MedicationTrackerScreen from "@/pages/MedicationTrackerScreen";
import ShowcaseAll from "@/pages/ShowcaseAll";
import { Loader2 } from "lucide-react";
import FriendProfileScreen, { FriendProfile } from "@/pages/FriendProfileScreen";
import PublicProfileScreen from "@/pages/PublicProfileScreen";
import OnboardingScreen from "@/pages/OnboardingScreen";
import ErrorBoundary from "@/components/ErrorBoundary";

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showShowcase, setShowShowcase] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

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

  if (showShowcase) {
    return (
      <div>
        <ShowcaseAll />
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
    return <LoginScreen />;
  }

  if (!hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        userId={user.uid}
        onComplete={() => setHasCompletedOnboarding(true)}
      />
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
      {renderScreen()}
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
    </QueryClientProvider>
  );
}

export default App;
