interface AQIGaugeProps {
  aqi: number;
  size?: number;
}

export default function AQIGauge({ aqi, size = 120 }: AQIGaugeProps) {
  const getAQIColor = (value: number) => {
    if (value <= 50) return "#7ED321";
    if (value <= 100) return "#F5A623";
    if (value <= 150) return "#FF8C00";
    return "#D0021B";
  };

  const getAQILabel = (value: number) => {
    if (value <= 50) return "Good";
    if (value <= 100) return "Moderate";
    if (value <= 150) return "Unhealthy";
    return "Very Unhealthy";
  };

  const percentage = Math.min((aqi / 200) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const color = getAQIColor(aqi);
  const label = getAQILabel(aqi);

  return (
    <div className="flex flex-col items-center" data-testid="gauge-aqi">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r="45"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r="45"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono" data-testid="text-aqi-value">{aqi}</span>
          <span className="text-xs text-muted-foreground">AQI</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-semibold" style={{ color }} data-testid="text-aqi-label">
        {label}
      </span>
    </div>
  );
}
