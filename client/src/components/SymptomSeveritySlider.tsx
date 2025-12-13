import { Slider } from "@/components/ui/slider";

interface SymptomSeveritySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function SymptomSeveritySlider({ value, onChange }: SymptomSeveritySliderProps) {
  const getColor = (val: number) => {
    if (val <= 3) return "#7ED321";
    if (val <= 6) return "#F5A623";
    return "#D0021B";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-base font-semibold">Symptom Severity</label>
        <div 
          className="text-4xl font-bold font-mono"
          style={{ color: getColor(value) }}
          data-testid="text-severity-value"
        >
          {value}
        </div>
      </div>
      
      <div className="px-2">
        <Slider
          value={[value]}
          onValueChange={(vals) => onChange(vals[0])}
          min={1}
          max={10}
          step={1}
          className="w-full"
          data-testid="slider-severity"
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground px-2">
        <span>1 (Minimal)</span>
        <span>10 (Severe)</span>
      </div>
    </div>
  );
}
