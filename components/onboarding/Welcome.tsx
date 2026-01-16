const features = [
  {
    icon: "🧬",
    title: "Your Unique Biosignature",
    description: "Personalized pattern, not population averages.",
  },
  {
    icon: "📊",
    title: "Complete Performance Picture",
    description: "GPS + HR + sleep + recovery + energy.",
  },
  {
    icon: "🏃",
    title: "Share Your Wins",
    description: "Post workouts with comprehensive context.",
  },
];

export default function Welcome() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-white/60">
          Welcome
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Track. Optimize. Perform.
        </h1>
        <p className="text-sm text-white/70">
          More than just GPS. See how your sleep, recovery, and energy affect
          your performance.
        </p>
      </div>

      <div className="grid gap-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{feature.icon}</span>
              <div className="space-y-1">
                <p className="text-base font-semibold text-white">
                  {feature.title}
                </p>
                <p className="text-sm text-white/60">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
