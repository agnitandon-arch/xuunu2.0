import MetricCard from "../MetricCard";

export default function MetricCardExample() {
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <MetricCard label="GLUCOSE" value="125" unit="mg/dL" trend="down" trendValue="12%" />
        <MetricCard label="ACTIVITY" value="8.2" unit="hrs" trend="up" trendValue="5%" />
        <MetricCard label="RECOVERY" value="84" unit="%" />
        <MetricCard label="STRAIN" value="12.5" />
      </div>
    </div>
  );
}
