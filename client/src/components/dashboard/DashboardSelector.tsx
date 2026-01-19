interface DashboardSelectorProps {
  onSelectDashboard: (dashboard: string) => void;
  currentDashboard: string;
}

export function DashboardSelector({
  onSelectDashboard,
  currentDashboard,
}: DashboardSelectorProps) {
  const dashboards = [
    { id: "performance", label: "🏃 Performance Metrics", icon: "📈" },
    { id: "health", label: "❤️ Health Trends", icon: "💊" },
    { id: "recovery", label: "💤 Sleep & Recovery", icon: "🔋" },
    { id: "energy", label: "⚡ Energy & Nutrition", icon: "🍎" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 mb-6">
      {dashboards.map((dashboard) => (
        <button
          key={dashboard.id}
          onClick={() => onSelectDashboard(dashboard.id)}
          className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
            currentDashboard === dashboard.id
              ? "bg-primary text-white"
              : "bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:border-primary"
          }`}
        >
          <span className="mr-2">{dashboard.icon}</span>
          {dashboard.label}
        </button>
      ))}
    </div>
  );
}
