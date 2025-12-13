import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Pill } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Medication, MedicationLog } from "@shared/schema";

export default function MedicationQuickLog() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: medications = [] } = useQuery<Medication[]>({
    queryKey: [`/api/medications?userId=${user?.uid}`],
    enabled: !!user?.uid,
  });

  const { data: logs = [] } = useQuery<MedicationLog[]>({
    queryKey: [`/api/medication-logs?userId=${user?.uid}`],
    enabled: !!user?.uid,
  });

  const logMedication = useMutation({
    mutationFn: async (data: { medicationId: string; scheduledTime?: string }) => {
      return apiRequest("POST", `/api/medication-logs`, {
        userId: user!.uid,
        medicationId: data.medicationId,
        takenAt: new Date().toISOString(),
        scheduledTime: data.scheduledTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/medication-logs?userId=${user?.uid}`] });
      toast({
        title: "Logged",
        description: "Medication marked as taken",
      });
    },
  });

  const getTodaysMedications = () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const today = now.toDateString();

    return medications
      .map((med) => {
        const scheduledTimes = (med.scheduledTimes as string[]) || [];
        const nextTime = scheduledTimes.find((time) => {
          const [hours, minutes] = time.split(":").map(Number);
          const timeInMinutes = hours * 60 + minutes;
          const isTaken = logs.some(
            (log) =>
              log.medicationId === med.id &&
              log.scheduledTime === time &&
              new Date(log.takenAt).toDateString() === today
          );
          return !isTaken && timeInMinutes >= currentTime - 120;
        });

        return nextTime ? { ...med, nextTime } : null;
      })
      .filter(Boolean)
      .slice(0, 3);
  };

  const upcomingMedications = getTodaysMedications();

  if (!user || upcomingMedications.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Pill className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Today's Medications</h3>
      </div>
      <div className="space-y-2">
        {upcomingMedications.map((med: any) => (
          <div
            key={med.id}
            className="flex items-center justify-between p-2 rounded-md bg-card border"
            data-testid={`medication-quick-log-${med.id}`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{med.name}</p>
              <p className="text-xs text-muted-foreground">
                {med.dosage} at {med.nextTime}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                logMedication.mutate({
                  medicationId: med.id,
                  scheduledTime: med.nextTime,
                })
              }
              disabled={logMedication.isPending}
              data-testid={`button-quick-log-${med.id}`}
            >
              <Check className="w-3 h-3 mr-1" />
              Taken
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
