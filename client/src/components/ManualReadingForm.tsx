import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const INTEGER_FIELDS = [
  "vocs", "aqi", "noiseCurrent", "noisePeak", "noiseAverage",
  "waterQuality", "waterBacteria", "soilContaminants",
  "lightPollution", "uvIndex", "illuminance", "blueLight",
  "humidity", "pressure", "radon"
];

interface ManualReadingFormProps {
  category: {
    id: string;
    name: string;
    fields: Array<{ name: string; label: string; unit?: string; type?: string }>;
  };
  userId: string;
  onSuccess: () => void;
}

export function ManualReadingForm({ category, userId, onSuccess }: ManualReadingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const handleInputChange = (fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: Record<string, string | number> = {
        userId,
        locationMode: "manual",
      };

      category.fields.forEach((field) => {
        const value = formValues[field.name];
        if (value && value !== "") {
          if (INTEGER_FIELDS.includes(field.name)) {
            const intValue = parseInt(value, 10);
            if (!isNaN(intValue)) {
              payload[field.name] = intValue;
            }
          } else {
            payload[field.name] = value;
          }
        }
      });

      await apiRequest("POST", "/api/environmental-readings", payload);

      await queryClient.invalidateQueries({ queryKey: ["/api/environmental-readings"] });

      toast({
        title: "Reading Saved",
        description: `${category.name} data has been recorded successfully.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving reading:", error);
      toast({
        title: "Error",
        description: "Failed to save reading. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {category.fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name} className="text-sm text-white/80">
            {field.label}
            {field.unit && <span className="ml-1 text-white/50">({field.unit})</span>}
          </Label>
          <Input
            id={field.name}
            type={field.type || "number"}
            step="any"
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={formValues[field.name] || ""}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            data-testid={`input-${field.name}`}
          />
        </div>
      ))}

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting}
          data-testid="button-submit-reading"
        >
          {isSubmitting ? "Saving..." : "Save Reading"}
        </Button>
      </div>
    </form>
  );
}
