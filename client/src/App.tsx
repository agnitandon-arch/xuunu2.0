import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MinimalBottomNav from "@/components/MinimalBottomNav";
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

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showShowcase, setShowShowcase] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);

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

  const renderScreen = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardScreen onNavigate={setActiveTab} />;
      case "data":
        return (
          <DataInsightsScreen
            onPreviewPublicProfile={() => setActiveTab("public-profile")}
            onViewFriend={(friend) => {
              setSelectedFriend(friend);
              setActiveTab("friend-profile");
            }}
          />
        );
      case "account":
        return (
          <AccountScreen
            onLogout={handleLogout}
            onViewFriend={(friend) => {
              setSelectedFriend(friend);
              setActiveTab("friend-profile");
            }}
          />
        );
      case "friend-profile":
        return (
          <FriendProfileScreen
            friend={selectedFriend}
            onBack={() => setActiveTab("account")}
          />
        );
      case "public-profile":
        return <PublicProfileScreen onBack={() => setActiveTab("data")} />;
      case "devices":
        return <DeviceConnectionScreen />;
      case "medications":
        return <MedicationTrackerScreen />;
      default:
        return <DashboardScreen onNavigate={setActiveTab} />;
    }
  };

  const navTab = activeTab === "public-profile" ? "data" : activeTab;

  return (
    <div className="min-h-screen bg-black text-white">
      {renderScreen()}
      <MinimalBottomNav activeTab={navTab} onTabChange={setActiveTab} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
