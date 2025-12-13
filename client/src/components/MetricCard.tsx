interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down";
  trendValue?: string;
}

export default function MetricCard({ label, value, unit, trend, trendValue }: MetricCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6" data-testid={`card-metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="text-xs uppercase tracking-widest opacity-40 mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold font-mono" data-testid={`text-metric-value-${label.toLowerCase().replace(/\s/g, '-')}`}>
          {value}
        </span>
        {unit && <span className="text-sm opacity-60">{unit}</span>}
      </div>
      {trendValue && (
        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
          <span>{trend === "up" ? "↑" : "↓"}</span>
          <span data-testid="text-trend">{trendValue}</span>
        </div>
      )}
    </div>
  );
}
