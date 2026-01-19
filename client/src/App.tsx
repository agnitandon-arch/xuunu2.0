import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  useMedicationReminderPreference,
  useMedicationReminders,
} from "@/hooks/useMedicationReminders";
import MinimalBottomNav from "@/components/MinimalBottomNav";
import LoginScreen from "@/pages/LoginScreen";
import DashboardScreen from "@/pages/DashboardScreen";
import DataInsightsScreen from "@/pages/DataInsightsScreen";
import AccountScreen from "@/pages/AccountScreen";
import EnvironmentalScreen from "@/pages/EnvironmentalScreen";
import DeviceConnectionScreen from "@/pages/DeviceConnectionScreen";
import MedicationTrackerScreen from "@/pages/MedicationTrackerScreen";
import ShowcaseAll from "@/pages/ShowcaseAll";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showShowcase, setShowShowcase] = useState(false);

  const [medicationRemindersEnabled] = useMedicationReminderPreference();

  useMedicationReminders(user?.uid, medicationRemindersEnabled);

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
        return <DashboardScreen />;
      case "data":
        return <DataInsightsScreen />;
      case "environmental":
        return <EnvironmentalScreen />;
      case "account":
        return <AccountScreen onLogout={handleLogout} onNavigate={setActiveTab} />;
      case "devices":
        return <DeviceConnectionScreen />;
      case "medications":
        return <MedicationTrackerScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {renderScreen()}
      <MinimalBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
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
