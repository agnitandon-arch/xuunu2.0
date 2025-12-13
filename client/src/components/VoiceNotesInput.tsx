import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Send, Loader2, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

export default function VoiceNotesInput() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [wasRecorded, setWasRecorded] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [notificationContext, setNotificationContext] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setNote(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Access Denied",
            description: "Please enable microphone access in your browser settings.",
            variant: "destructive",
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice Input Unavailable",
        description: "Your browser doesn't support voice input.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      setWasRecorded(true);
    }
  };

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated");

      const response = await apiRequest("POST", "/api/notes", {
        userId: user.uid,
        content: note,
        isVoiceNote: wasRecorded ? 1 : 0,
        hasNotification: hasNotification ? 1 : 0,
        notificationContext: hasNotification ? (notificationContext || null) : null,
        notificationTrigger: hasNotification ? (notificationContext || null) : null,
        isCompleted: 0,
      });

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      toast({
        title: "Note Saved",
        description: hasNotification ? "Notification will be triggered based on context." : "Your note has been saved.",
      });
      setNote("");
      setWasRecorded(false);
      setHasNotification(false);
      setNotificationContext("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save note",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!note.trim()) {
      toast({
        title: "Empty Note",
        description: "Please enter or record a note first.",
        variant: "destructive",
      });
      return;
    }

    createNoteMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs opacity-60">
          <Mic className="w-3.5 h-3.5 text-primary" />
          <span>Voice input available - tap microphone to record</span>
        </div>
        <div className="relative">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isRecording ? "Listening..." : "Type a note or use voice input..."}
            className="min-h-[100px] pr-14 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            data-testid="textarea-note"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={toggleRecording}
            className={`absolute bottom-2 right-2 ${isRecording ? 'text-primary animate-pulse' : ''}`}
            data-testid="button-voice-input"
          >
            {isRecording ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Notification Toggle */}
      <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-primary" />
          <div>
            <Label htmlFor="notification-toggle" className="text-sm font-medium">
              Set as Reminder
            </Label>
            <p className="text-xs opacity-60 mt-0.5">
              Get notified based on context
            </p>
          </div>
        </div>
        <Switch
          id="notification-toggle"
          checked={hasNotification}
          onCheckedChange={setHasNotification}
          data-testid="switch-notification"
        />
      </div>

      {/* Notification Context */}
      {hasNotification && (
        <Input
          value={notificationContext}
          onChange={(e) => setNotificationContext(e.target.value)}
          placeholder="e.g., when I am on my daily walk"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          data-testid="input-notification-context"
        />
      )}

      <Button
        onClick={handleSubmit}
        disabled={createNoteMutation.isPending || !note.trim()}
        className="w-full"
        data-testid="button-save-note"
      >
        {createNoteMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Send className="w-4 h-4 mr-2" />
        )}
        Save Note
      </Button>
    </div>
  );
}
