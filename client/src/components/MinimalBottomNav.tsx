import { Home, BarChart2, User } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { cn } from "@/lib/utils";

interface MinimalBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MinimalBottomNav({ activeTab, onTabChange }: MinimalBottomNavProps) {
  const tabs = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "data", icon: BarChart2, label: "Share My Progress" },
    { id: "account", icon: User, label: "Account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isAccountTab = tab.id === "account";
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`button-nav-${tab.id}`}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive ? "text-white" : "text-white/40"
              }`}
            >
              {isAccountTab ? (
                <ProfileAvatar
                  className={cn(
                    "h-6 w-6",
                    isActive ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-black" : ""
                  )}
                />
              ) : (
                <tab.icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.5} />
              )}
              {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-1"></div>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
