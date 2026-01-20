import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, Minus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import VoiceNotesInput from "@/components/VoiceNotesInput";
import { apiRequest } from "@/lib/queryClient";

interface TrackEntryScreenProps {
  onSave?: () => void;
}

export default function TrackEntryScreen({ onSave }: TrackEntryScreenProps) {
  const { user } = useAuth();
  const [glucose, setGlucose] = useState(120);
  const [severity, setSeverity] = useState(5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const symptomOptions = ["Fatigue", "Pain", "Brain Fog", "Nausea", "Headache"];

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const payload = {
        userId: user.uid,
        glucose,
        symptomSeverity: severity,
        symptoms,
        notes: notes || null,
      };

      await apiRequest("POST", "/api/health-entries", payload);

      setIsLoading(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSave) onSave();
      }, 2000);
    } catch (error) {
      console.error("Error saving health entry:", error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to save health entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Entry Saved</h2>
          <p className="text-sm opacity-60">Your health data has been logged</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto m-6 p-8 bg-black border border-white/10 rounded-lg">
        <h1 className="text-2xl font-bold mb-6">Track Entry</h1>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest opacity-60">
              Blood Glucose (mg/dL)
            </Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setGlucose(Math.max(50, glucose - 5))}
                className="h-13 w-13 rounded-full border-white/10"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={glucose}
                onChange={(e) => setGlucose(Number(e.target.value))}
                className="h-13 text-center text-3xl font-mono font-bold bg-black border-white/20"
                data-testid="input-glucose"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setGlucose(Math.min(400, glucose + 5))}
                className="h-13 w-13 rounded-full border-white/10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest opacity-60">
              Symptom Severity (1-10)
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setSeverity(num)}
                  className={`flex-1 h-10 rounded-md border transition-all ${
                    severity >= num
                      ? "bg-primary border-primary text-white"
                      : "bg-black border-white/10 opacity-40"
                  }`}
                  data-testid={`button-severity-${num}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest opacity-60">
              Symptoms
            </Label>
            <div className="flex flex-wrap gap-2">
              {symptomOptions.map((symptom) => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    symptoms.includes(symptom)
                      ? "bg-primary text-white"
                      : "bg-white/5 border border-white/10"
                  }`}
                  data-testid={`button-symptom-${symptom.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest opacity-60">
              Notes (Optional)
            </Label>
            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="quick" data-testid="tab-quick-notes">Quick Note</TabsTrigger>
                <TabsTrigger value="voice" data-testid="tab-voice-notes">Voice Note + Reminder</TabsTrigger>
              </TabsList>
              <TabsContent value="quick" className="mt-0">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How are you feeling?"
                  className="min-h-24 resize-none bg-black border-white/20"
                  data-testid="input-notes"
                />
              </TabsContent>
              <TabsContent value="voice" className="mt-0">
                <VoiceNotesInput />
                <p className="text-xs opacity-40 mt-2">
                  Standalone notes with voice input and notification reminders
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full h-13 rounded-full mt-8"
          data-testid="button-save"
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
