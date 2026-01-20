import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Clock, Check, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Medication, MedicationLog } from "@shared/schema";

interface MedicationTrackerScreenProps {
  onBack?: () => void;
}

export default function MedicationTrackerScreen({ onBack }: MedicationTrackerScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: "",
    dosage: "",
    frequency: "",
    scheduledTimes: [""],
    notes: "",
  });

  const { data: medications = [], isLoading: medicationsLoading } = useQuery<Medication[]>({
    queryKey: [`/api/medications?userId=${user?.uid}`],
    enabled: !!user?.uid,
  });

  const { data: logs = [] } = useQuery<MedicationLog[]>({
    queryKey: [`/api/medication-logs?userId=${user?.uid}`],
    enabled: !!user?.uid,
  });

  const createMedication = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.uid) {
        throw new Error("User not authenticated");
      }
      if (!user.email) {
        throw new Error("Missing user email");
      }
      await apiRequest("POST", "/api/users/sync", {
        id: user.uid,
        email: user.email,
      });
      return apiRequest("POST", `/api/medications`, {
        ...data,
        userId: user.uid,
        isActive: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/medications?userId=${user?.uid}`] });
      setIsAddDialogOpen(false);
      setNewMedication({
        name: "",
        dosage: "",
        frequency: "",
        scheduledTimes: [""],
        notes: "",
      });
      toast({
        title: "Medication added",
        description: "Your medication has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to add medication. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logMedication = useMutation({
    mutationFn: async (data: { medicationId: string; scheduledTime?: string; notes?: string }) => {
      return apiRequest("POST", `/api/medication-logs`, {
        userId: user!.uid,
        medicationId: data.medicationId,
        takenAt: new Date().toISOString(),
        scheduledTime: data.scheduledTime,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/medication-logs?userId=${user?.uid}`] });
      toast({
        title: "Medication logged",
        description: "Your medication has been marked as taken.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log medication. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMedication = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/medications/${id}?userId=${user!.uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/medications?userId=${user?.uid}`] });
      toast({
        title: "Medication deleted",
        description: "The medication has been removed.",
      });
    },
  });

  const handleAddTime = () => {
    setNewMedication({
      ...newMedication,
      scheduledTimes: [...newMedication.scheduledTimes, ""],
    });
  };

  const handleRemoveTime = (index: number) => {
    setNewMedication({
      ...newMedication,
      scheduledTimes: newMedication.scheduledTimes.filter((_, i) => i !== index),
    });
  };

  const handleTimeChange = (index: number, value: string) => {
    const times = [...newMedication.scheduledTimes];
    times[index] = value;
    setNewMedication({
      ...newMedication,
      scheduledTimes: times,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedication.name || !newMedication.dosage || !newMedication.frequency) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const validTimes = newMedication.scheduledTimes.filter((t) => t.trim() !== "");
    if (validTimes.length === 0) {
      toast({
        title: "Missing schedule",
        description: "Please add at least one reminder time.",
        variant: "destructive",
      });
      return;
    }

    createMedication.mutate({
      ...newMedication,
      scheduledTimes: validTimes,
    });
  };

  const getMedicationLog = (medicationId: string) => {
    const today = new Date().toDateString();
    return logs.filter(
      (log) =>
        log.medicationId === medicationId &&
        new Date(log.takenAt).toDateString() === today
    );
  };

  const reminderTimeouts = useRef<number[]>([]);

  useEffect(() => {
    reminderTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    reminderTimeouts.current = [];

    if (typeof window === "undefined" || !("Notification" in window)) return;
    const notificationsEnabled =
      window.localStorage.getItem("xuunu-notifications-enabled") === "true" &&
      Notification.permission === "granted";
    if (!notificationsEnabled) return;

    const now = new Date();
    medications.forEach((medication) => {
      medication.scheduledTimes?.forEach((time) => {
        const [hoursText, minutesText] = time.split(":");
        const hours = Number(hoursText);
        const minutes = Number(minutesText);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;

        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        const delay = next.getTime() - now.getTime();
        if (delay <= 0) return;

        const timeoutId = window.setTimeout(() => {
          try {
            new Notification("Medication reminder", {
              body: `${medication.name} ${medication.dosage}`,
            });
          } catch {
            // Ignore notification errors.
          }
        }, delay);
        reminderTimeouts.current.push(timeoutId);
      });
    });

    return () => {
      reminderTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      reminderTimeouts.current = [];
    };
  }, [medications]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Please log in to track medications</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto p-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Medications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your medications and set reminders
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (onBack ? onBack() : window.history.back())}
              data-testid="button-exit-medications"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-medication">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Medication
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Medication</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Medication Name</Label>
                    <Input
                      id="name"
                      data-testid="input-medication-name"
                      value={newMedication.name}
                      onChange={(e) =>
                        setNewMedication({ ...newMedication, name: e.target.value })
                      }
                      placeholder="e.g., Metformin"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="dosage">Dosage</Label>
                    <Input
                      id="dosage"
                      data-testid="input-medication-dosage"
                      value={newMedication.dosage}
                      onChange={(e) =>
                        setNewMedication({ ...newMedication, dosage: e.target.value })
                      }
                      placeholder="e.g., 500mg"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Input
                      id="frequency"
                      data-testid="input-medication-frequency"
                      value={newMedication.frequency}
                      onChange={(e) =>
                        setNewMedication({ ...newMedication, frequency: e.target.value })
                      }
                      placeholder="e.g., Twice daily"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Reminder Times</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddTime}
                        data-testid="button-add-time"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Time
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {newMedication.scheduledTimes.map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="time"
                            data-testid={`input-time-${index}`}
                            value={time}
                            onChange={(e) => handleTimeChange(index, e.target.value)}
                            className="flex-1"
                          />
                          {newMedication.scheduledTimes.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTime(index)}
                              data-testid={`button-remove-time-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      data-testid="input-medication-notes"
                      value={newMedication.notes}
                      onChange={(e) =>
                        setNewMedication({ ...newMedication, notes: e.target.value })
                      }
                      placeholder="Any additional notes..."
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMedication.isPending}
                    data-testid="button-submit-medication"
                  >
                    {createMedication.isPending ? "Adding..." : "Add Medication"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {medicationsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </Card>
            ))}
          </div>
        ) : medications.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No medications tracked yet</p>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-first-medication"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Medication
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {medications.map((medication) => {
              const todayLogs = getMedicationLog(medication.id);
              const scheduledTimes = medication.scheduledTimes as string[];
              const takenTimes = todayLogs.map((log) => log.scheduledTime).filter(Boolean);

              return (
                <Card
                  key={medication.id}
                  className="p-4"
                  data-testid={`card-medication-${medication.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{medication.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {medication.dosage} · {medication.frequency}
                      </p>
                      {medication.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {medication.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMedication.mutate(medication.id)}
                      data-testid={`button-delete-medication-${medication.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      Today's Schedule
                    </p>
                    <div className="grid gap-2">
                      {scheduledTimes.map((time, index) => {
                        const isTaken = takenTimes.includes(time);
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 rounded-md bg-card border"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{time}</span>
                              {isTaken && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            {!isTaken && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  logMedication.mutate({
                                    medicationId: medication.id,
                                    scheduledTime: time,
                                  })
                                }
                                data-testid={`button-log-medication-${medication.id}-${index}`}
                              >
                                Mark Taken
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
