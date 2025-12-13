import AQIGauge from "../AQIGauge";

export default function AQIGaugeExample() {
  return (
    <div className="flex gap-8 items-center justify-center p-8">
      <AQIGauge aqi={35} />
      <AQIGauge aqi={75} />
      <AQIGauge aqi={125} />
      <AQIGauge aqi={180} />
    </div>
  );
}
