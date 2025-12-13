interface EnvironmentalSynergyRingProps {
  synergyLevel: number; // 0-100
  size?: number;
}

export default function EnvironmentalSynergyRing({ 
  synergyLevel, 
  size = 200 
}: EnvironmentalSynergyRingProps) {
  const percentage = Math.min(Math.max(synergyLevel, 0), 100);
  const circumference = 2 * Math.PI * 85;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 80) return "#0066FF";
    if (percentage >= 60) return "#0088FF";
    if (percentage >= 40) return "#00AAFF";
    return "#00CCFF";
  };

  const getLabel = () => {
    if (percentage >= 80) return "Optimal Synergy";
    if (percentage >= 60) return "High Synergy";
    if (percentage >= 40) return "Moderate Synergy";
    return "Building Synergy";
  };

  return (
    <div className="flex flex-col items-center" data-testid="ring-synergy">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <defs>
            <linearGradient id="synergyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: getColor(), stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: getColor(), stopOpacity: 0.5 }} />
            </linearGradient>
          </defs>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="85"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r="85"
            stroke="url(#synergyGradient)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-7xl font-bold font-mono" data-testid="text-synergy-level">{Math.round(percentage)}</span>
          <span className="text-xs uppercase tracking-widest mt-1 opacity-60">SYNERGY LEVEL</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <span className="text-sm font-medium" style={{ color: getColor() }}>
          {getLabel()}
        </span>
        <span className="text-xs opacity-40 block mt-1">Environmental alignment score</span>
      </div>
    </div>
  );
}
