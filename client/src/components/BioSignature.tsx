import { useEffect, useRef, useState } from "react";

interface HealthData {
  glucose: number;
  activity: number;
  recovery: number;
  strain: number;
  aqi: number;
  heartRate?: number;
  sleep?: number;
}

interface BioSignatureProps {
  healthData: HealthData;
  size?: number;
}

export default function BioSignature({ healthData, size = 400 }: BioSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isAnimating, setIsAnimating] = useState(true);

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

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      
      time += 0.02;

      // Normalize health data to 0-1 range
      const normalizedData = {
        glucose: Math.min(healthData.glucose / 200, 1),
        activity: Math.min(healthData.activity / 12, 1),
        recovery: healthData.recovery / 100,
        strain: Math.min(healthData.strain / 20, 1),
        aqi: Math.min(healthData.aqi / 150, 1),
        heartRate: healthData.heartRate ? Math.min(healthData.heartRate / 120, 1) : 0.5,
        sleep: healthData.sleep ? healthData.sleep / 10 : 0.5,
      };

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const x = col * dotSize + dotSize / 2;
          const y = row * dotSize + dotSize / 2;

          // Distance from center for radial patterns
          const distanceFromCenter = Math.sqrt(
            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
          ) / (size / 2);

          // Angle from center for spiral patterns
          const angle = Math.atan2(y - centerY, x - centerX);

          // Create unique pattern based on multiple health metrics
          const glucoseInfluence = Math.sin(distanceFromCenter * 8 + normalizedData.glucose * Math.PI * 2 + time) * 0.5 + 0.5;
          const activityInfluence = Math.cos(angle * 4 + normalizedData.activity * Math.PI * 2 - time) * 0.5 + 0.5;
          const recoveryInfluence = Math.sin(row * 0.3 + normalizedData.recovery * Math.PI + time * 0.5) * 0.5 + 0.5;
          const strainInfluence = Math.cos(col * 0.3 + normalizedData.strain * Math.PI - time * 0.5) * 0.5 + 0.5;
          const aqiInfluence = Math.sin(distanceFromCenter * 5 + angle * 2 + normalizedData.aqi * Math.PI + time * 0.3) * 0.5 + 0.5;
          const heartRateInfluence = Math.cos((row + col) * 0.2 + normalizedData.heartRate * Math.PI + time * 0.7) * 0.5 + 0.5;

          // Combine influences with different weights
          const combinedInfluence = 
            glucoseInfluence * 0.25 +
            activityInfluence * 0.2 +
            recoveryInfluence * 0.2 +
            strainInfluence * 0.15 +
            aqiInfluence * 0.1 +
            heartRateInfluence * 0.1;

          // Calculate dot properties
          const opacity = Math.pow(combinedInfluence, 1.5) * 0.9 + 0.1;
          const dotRadius = (dotSize * 0.35) * (0.3 + combinedInfluence * 0.7);
          
          // Blue color intensity based on health metrics
          const blueIntensity = Math.floor(255 * combinedInfluence);
          
          // Create gradient for each dot
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, dotRadius);
          gradient.addColorStop(0, `rgba(0, 102, 255, ${opacity})`);
          gradient.addColorStop(0.5, `rgba(0, 102, 255, ${opacity * 0.7})`);
          gradient.addColorStop(1, `rgba(0, 102, 255, ${opacity * 0.2})`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          // Add connecting lines for high-intensity dots
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

      if (isAnimating) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [healthData, size, isAnimating]);

  return (
    <div className="flex flex-col items-center" data-testid="bio-signature">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="rounded-lg"
      />
      <button
        onClick={() => setIsAnimating(!isAnimating)}
        className="mt-4 text-xs uppercase tracking-widest opacity-60 hover-elevate active-elevate-2 px-4 py-2 rounded-full border border-white/10"
        data-testid="button-toggle-animation"
      >
        {isAnimating ? "Pause" : "Play"} Animation
      </button>
      <p className="mt-2 text-xs uppercase tracking-widest opacity-40">
        Unique Bio Signature
      </p>
    </div>
  );
}
