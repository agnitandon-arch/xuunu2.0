interface BiologicalAgeRingProps {
  biologicalAge: number;
  chronologicalAge: number;
  size?: number;
}

export default function BiologicalAgeRing({ 
  biologicalAge, 
  chronologicalAge,
  size = 200 
}: BiologicalAgeRingProps) {
  const difference = chronologicalAge - biologicalAge;
  const percentage = 75;
  const circumference = 2 * Math.PI * 85;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center" data-testid="ring-biological-age">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <defs>
            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#0066FF', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#0066FF', stopOpacity: 0.3 }} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r="85"
            stroke="url(#blueGradient)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-7xl font-bold font-mono" data-testid="text-bio-age">{biologicalAge}</span>
          <span className="text-xs uppercase tracking-widest mt-1 opacity-60">BIOLOGICAL AGE</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <span className="text-sm opacity-60">
          {difference > 0 ? `${difference} years younger` : `${Math.abs(difference)} years older`}
        </span>
        <span className="text-xs opacity-40 block">than chronological age</span>
      </div>
    </div>
  );
}
