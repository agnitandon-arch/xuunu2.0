import EnvironmentalCard from "../EnvironmentalCard";

export default function EnvironmentalCardExample() {
  return (
    <div className="p-4 max-w-md">
      <EnvironmentalCard
        aqi={65}
        temperature={72}
        feelsLike={70}
        humidity={55}
        weather="Partly Cloudy"
        pm25={12.5}
        pm10={22.3}
      />
    </div>
  );
}
