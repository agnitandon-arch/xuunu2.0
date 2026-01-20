type HealthContextProps = {
  summary: string;
};

export default function HealthContext({ summary }: HealthContextProps) {
  return (
    <section className="card space-y-2">
      <h3 className="text-lg font-semibold">Health context</h3>
      <p className="text-sm text-muted">{summary}</p>
    </section>
  );
}
