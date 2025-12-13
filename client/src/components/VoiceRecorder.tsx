import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Trash2, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

export default function VoiceRecorder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Microphone Access Denied",
        description: "Please enable microphone access to record voice notes.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setDuration(recordingTime);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  };

  const saveVoiceNoteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid || !audioBlob) throw new Error("Missing data");

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const audioData = await base64Promise;

      const response = await apiRequest("POST", "/api/notes", {
        userId: user.uid,
        content: `Voice note (${formatTime(duration)})`,
        isVoiceNote: 1,
        audioData: audioData,
        audioDuration: duration,
        hasNotification: 0,
        isCompleted: 0,
      });

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notes?userId=${user?.uid}&voiceOnly=1`] });
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      toast({
        title: "Voice Note Saved",
        description: "Your voice note has been saved successfully.",
      });
      deleteRecording();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save voice note",
        variant: "destructive",
      });
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Voice Notes</h3>
          <p className="text-xs opacity-60 mt-0.5">Record audio notes</p>
        </div>
        <Mic className="w-5 h-5 text-primary" />
      </div>

      {!audioUrl ? (
        <div className="flex flex-col items-center py-6">
          {isRecording ? (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-primary/40 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="text-2xl font-mono mb-4">{formatTime(recordingTime)}</div>
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="rounded-full"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </Button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Mic className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm opacity-60 mb-4">Tap to start recording</p>
              <Button
                onClick={startRecording}
                size="lg"
                className="rounded-full"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
            <Button
              onClick={togglePlayback}
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-primary/20"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-primary" />
              ) : (
                <Play className="w-6 h-6 text-primary ml-1" />
              )}
            </Button>
            
            <div className="flex-1">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-full rounded-full" />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs opacity-60">{formatTime(duration)}</span>
                <span className="text-xs opacity-60">Voice Note</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={deleteRecording}
              variant="outline"
              className="flex-1 border-white/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={() => saveVoiceNoteMutation.mutate()}
              disabled={saveVoiceNoteMutation.isPending}
              className="flex-1"
            >
              {saveVoiceNoteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
