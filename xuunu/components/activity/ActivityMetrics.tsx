type ActivityMetricsProps = {
  metrics: Record<string, string | number>;
};

export default function ActivityMetrics({ metrics }: ActivityMetricsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key} className="card">
          <div className="text-xs uppercase text-muted">{key}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}
