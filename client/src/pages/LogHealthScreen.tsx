import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import SymptomSeveritySlider from "@/components/SymptomSeveritySlider";
import { format } from "date-fns";

interface LogHealthScreenProps {
  onSave?: () => void;
}

export default function LogHealthScreen({ onSave }: LogHealthScreenProps) {
  const [glucose, setGlucose] = useState("");
  const [severity, setSeverity] = useState(5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const symptomOptions = ["Fatigue", "Pain", "Brain Fog", "Nausea", "Headache", "Other"];

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      if (onSave) onSave();
    }, 2000);
  };

  if (showSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-health-good mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Entry Saved!</h2>
          <p className="text-muted-foreground">Your health data has been logged</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-md mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Log Health Data</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-log-datetime">
            {format(new Date(), "EEEE, MMMM dd, yyyy 'at' h:mm a")}
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="glucose" className="text-base font-semibold">
              Blood Glucose (mg/dL)
            </Label>
            <Input
              id="glucose"
              type="number"
              placeholder="120"
              value={glucose}
              onChange={(e) => setGlucose(e.target.value)}
              className="h-14 text-lg font-mono"
              data-testid="input-glucose"
            />
          </div>

          <SymptomSeveritySlider value={severity} onChange={setSeverity} />

          <div className="space-y-3">
            <Label className="text-base font-semibold">Symptoms</Label>
            <div className="grid grid-cols-2 gap-3">
              {symptomOptions.map((symptom) => (
                <div
                  key={symptom}
                  className="flex items-center space-x-2 p-3 rounded-md border border-border hover-elevate cursor-pointer"
                  onClick={() => toggleSymptom(symptom)}
                >
                  <Checkbox
                    id={symptom}
                    checked={symptoms.includes(symptom)}
                    onCheckedChange={() => toggleSymptom(symptom)}
                    data-testid={`checkbox-symptom-${symptom.toLowerCase().replace(" ", "-")}`}
                  />
                  <Label
                    htmlFor={symptom}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {symptom}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-semibold">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="How are you feeling? Any observations?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-24 resize-none"
              data-testid="input-notes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-base font-semibold">
              Location
            </Label>
            <Input
              id="location"
              placeholder="City or ZIP code"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-12"
              data-testid="input-location"
            />
            <p className="text-xs text-muted-foreground">
              Used to fetch environmental data
            </p>
          </div>
        </Card>

        <Button
          className="w-full h-14 text-lg"
          onClick={handleSave}
          disabled={isLoading || !glucose}
          data-testid="button-save-entry"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Entry"
          )}
        </Button>
      </div>
    </div>
  );
}
