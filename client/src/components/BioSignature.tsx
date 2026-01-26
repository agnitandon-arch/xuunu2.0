import { useEffect, useRef } from "react";

interface HealthData {
  glucose: number;
  activity: number;
  recovery: number;
  strain: number;
  aqi: number;
  heartRate?: number;
  sleep?: number;
  challengeCompletion?: number;
}

interface BioSignatureProps {
  healthData: HealthData;
  size?: number;
}

export default function BioSignature({ healthData, size = 400 }: BioSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const gridSize = 24; // 24x24 matrix for more detail
    const dotSize = size / gridSize;
    const centerX = size / 2;
    const centerY = size / 2;

    ctx.clearRect(0, 0, size, size);

    // Normalize health data to 0-1 range
    const normalizedData = {
      glucose: Math.min(healthData.glucose / 200, 1),
      activity: Math.min(healthData.activity / 12, 1),
      recovery: healthData.recovery / 100,
      strain: Math.min(healthData.strain / 20, 1),
      aqi: Math.min(healthData.aqi / 150, 1),
      heartRate: healthData.heartRate ? Math.min(healthData.heartRate / 120, 1) : 0.5,
      sleep: healthData.sleep ? healthData.sleep / 10 : 0.5,
      challengeCompletion: Math.min(Math.max(healthData.challengeCompletion ?? 0, 0), 1),
    };

    const healthMetricsStability =
      (normalizedData.glucose + normalizedData.heartRate + normalizedData.sleep) / 3;
    const environmentalQuality = Math.max(0, Math.min(1, 1 - normalizedData.aqi));
    const activityRecoveryBalance = Math.max(
      0,
      Math.min(
        1,
        ((normalizedData.activity + normalizedData.recovery) / 2) *
          (1 - normalizedData.strain * 0.75)
      )
    );

    const overallHealth = Math.max(
      0,
      Math.min(
        1,
        healthMetricsStability * 0.35 +
          environmentalQuality * 0.25 +
          activityRecoveryBalance * 0.25 +
          normalizedData.challengeCompletion * 0.15
      )
    );
    const cornerBoost = Math.max(0, (overallHealth - 0.35) / 0.65);

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = col * dotSize + dotSize / 2;
        const y = row * dotSize + dotSize / 2;

        const distanceFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        ) / (size / 2);

        const angle = Math.atan2(y - centerY, x - centerX);

        const latticeInfluence =
          (Math.cos(distanceFromCenter * Math.PI * 8) * 0.5 + 0.5) *
          (Math.cos(angle * 4) * 0.5 + 0.5);
        const stabilityInfluence =
          Math.cos((row - col) * 0.25 + healthMetricsStability * Math.PI) * 0.5 + 0.5;
        const environmentQualityInfluence =
          Math.sin(distanceFromCenter * 6 + environmentalQuality * Math.PI) * 0.5 + 0.5;
        const balanceInfluence =
          Math.cos((row + col) * 0.2 + activityRecoveryBalance * Math.PI) * 0.5 + 0.5;

        const baseInfluence =
          latticeInfluence * 0.3 +
          stabilityInfluence * 0.25 +
          environmentQualityInfluence * 0.2 +
          balanceInfluence * 0.15 +
          normalizedData.challengeCompletion * 0.1;

        const cornerDistance = Math.min(
          Math.hypot(x, y),
          Math.hypot(x - size, y),
          Math.hypot(x, y - size),
          Math.hypot(x - size, y - size)
        );
        const cornerFactor = Math.max(0, 1 - cornerDistance / (size * 0.45));
        const combinedInfluence = Math.min(1, baseInfluence + cornerFactor * cornerBoost * 0.45);

        const opacity = Math.pow(combinedInfluence, 1.5) * 0.9 + 0.1;
        const dotRadius = dotSize * 0.35 * (0.3 + combinedInfluence * 0.7);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, dotRadius);
        gradient.addColorStop(0, `rgba(0, 102, 255, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(0, 102, 255, ${opacity * 0.7})`);
        gradient.addColorStop(1, `rgba(0, 102, 255, ${opacity * 0.2})`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        if (combinedInfluence > 0.7 && col < gridSize - 1) {
          const nextX = (col + 1) * dotSize + dotSize / 2;
          const nextY = row * dotSize + dotSize / 2;

          ctx.strokeStyle = `rgba(0, 102, 255, ${opacity * 0.2})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nextX, nextY);
          ctx.stroke();
        }
      }
    }
  }, [healthData, size]);

  return (
    <div className="flex flex-col items-center" data-testid="bio-signature">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="rounded-lg"
      />
      <p className="mt-2 text-xs uppercase tracking-widest opacity-40">
        7-day Bio SYGnature
      </p>
    </div>
  );
}
