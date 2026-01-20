type StatItem = {
  label: string;
  value: string;
};

type StatsGridProps = {
  stats: StatItem[];
};

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {stats.map((stat) => (
        <div key={stat.label} className="card space-y-1">
          <p className="text-xs uppercase text-muted">{stat.label}</p>
          <p className="text-lg font-semibold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
