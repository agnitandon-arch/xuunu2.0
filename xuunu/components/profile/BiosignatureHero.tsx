type BiosignatureHeroProps = {
  score: number;
  trend?: string;
};

export default function BiosignatureHero({
  score,
  trend = "steady",
}: BiosignatureHeroProps) {
  return (
    <section className="card space-y-2">
      <p className="text-sm text-muted">Biosignature score</p>
      <div className="text-4xl font-semibold">{score}</div>
      <p className="text-sm text-muted">Trend: {trend}</p>
    </section>
  );
}
