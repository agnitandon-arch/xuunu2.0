import { Home, BarChart2, MapPin, User } from "lucide-react";

interface MinimalBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MinimalBottomNav({ activeTab, onTabChange }: MinimalBottomNavProps) {
  const tabs = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "data", icon: BarChart2, label: "Data" },
    { id: "environmental", icon: MapPin, label: "Map" },
    { id: "account", icon: User, label: "Account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`button-nav-${tab.id}`}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive ? "text-white" : "text-white/40"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.5} />
              {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-1"></div>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
