import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Pause, Trash2, Loader2, Mic } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface VoiceNote {
  id: string;
  content: string;
  audioData: string | null;
  audioDuration: number | null;
  createdAt: string;
}

export default function VoiceNotesList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: notes = [], isLoading, isError } = useQuery({
    queryKey: [`/api/notes?userId=${user?.uid}&voiceOnly=1`],
    queryFn: async () => {
      if (!user?.uid) return [];
      const response = await fetch(`/api/notes?userId=${user.uid}`);
      if (!response.ok) throw new Error("Failed to fetch notes");
      const allNotes = await response.json();
      return allNotes.filter((note: VoiceNote) => note.audioData);
    },
    enabled: !!user?.uid,
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await apiRequest("DELETE", `/api/notes/${noteId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notes?userId=${user?.uid}&voiceOnly=1`] });
      toast({
        title: "Voice Note Deleted",
        description: "The voice note has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete voice note",
        variant: "destructive",
      });
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const playAudio = (note: VoiceNote) => {
    if (!note.audioData) return;

    if (playingId === note.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(note.audioData);
    audioRef.current = audio;
    
    audio.onended = () => {
      setPlayingId(null);
      audioRef.current = null;
    };
    
    audio.onerror = () => {
      toast({
        title: "Playback Error",
        description: "Could not play this voice note.",
        variant: "destructive",
      });
      setPlayingId(null);
    };

    audio.play();
    setPlayingId(note.id);
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin opacity-60" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <p className="text-sm text-center opacity-60">Failed to load voice notes</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Saved Voice Notes</h3>
          <p className="text-xs opacity-60 mt-0.5">{notes.length} recording{notes.length !== 1 ? "s" : ""}</p>
        </div>
        <Mic className="w-5 h-5 opacity-40" />
      </div>

      {notes.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Mic className="w-8 h-8 opacity-20" />
          </div>
          <p className="text-sm opacity-60">No voice notes yet</p>
          <p className="text-xs opacity-40 mt-1">Record your first voice note above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note: VoiceNote) => (
            <div
              key={note.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
            >
              <Button
                onClick={() => playAudio(note)}
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-primary/20 shrink-0"
              >
                {playingId === note.id ? (
                  <Pause className="w-5 h-5 text-primary" />
                ) : (
                  <Play className="w-5 h-5 text-primary ml-0.5" />
                )}
              </Button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">
                    {note.audioDuration ? formatTime(note.audioDuration) : "--:--"}
                  </span>
                  {playingId === note.id && (
                    <span className="text-xs text-primary animate-pulse">Playing...</span>
                  )}
                </div>
                <p className="text-xs opacity-60 truncate">
                  {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </p>
              </div>
              
              <Button
                onClick={() => deleteNoteMutation.mutate(note.id)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-60 hover:opacity-100 hover:text-destructive shrink-0"
                disabled={deleteNoteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
