interface CompleteProps {
  onStart: () => void;
}

export default function Complete({ onStart }: CompleteProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-white">
          🎉 Ready to Optimize!
        </h2>
        <p className="text-sm text-white/70">
          Your onboarding is complete and your biosignature begins now.
        </p>
      </div>

      <div className="rounded-2xl border border-[#0066ff]/40 bg-[#0066ff]/15 p-4 text-sm text-white/80">
        Unlike apps that compare you to average athletes, Xuunu learns YOUR
        unique patterns. In 7 days, you'll see how your sleep, recovery, and
        energy uniquely affect YOUR performance.
      </div>

      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-full bg-[#0066ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a75ff]"
      >
        Start Tracking
      </button>
    </div>
  );
}
