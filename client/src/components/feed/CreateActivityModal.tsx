import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ImagePlus, Loader2, X } from "lucide-react";

interface CreateActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HealthDataSnapshot {
  sleep?: number;
  hrv?: number;
  glucose?: number;
  recovery?: number;
}

interface MetricField {
  key: string;
  label: string;
  unit?: string;
  placeholder: string;
}

const activityTypes = ["Run", "Lift", "Cycle", "Swim", "Walk", "Yoga", "Other"];
const visibilityOptions = ["public", "followers", "private"];

const metricFieldsByType: Record<string, MetricField[]> = {
  Run: [
    { key: "distance", label: "Distance", unit: "mi", placeholder: "5.2" },
    { key: "duration", label: "Duration", unit: "min", placeholder: "45" },
    { key: "pace", label: "Pace", unit: "/mi", placeholder: "8:40" },
  ],
  Lift: [
    { key: "sets", label: "Sets", placeholder: "4" },
    { key: "reps", label: "Reps", placeholder: "10" },
    { key: "weight", label: "Weight", unit: "lb", placeholder: "135" },
  ],
  Cycle: [
    { key: "distance", label: "Distance", unit: "mi", placeholder: "18.4" },
    { key: "duration", label: "Duration", unit: "min", placeholder: "60" },
    { key: "elevation", label: "Elevation", unit: "ft", placeholder: "820" },
  ],
  Swim: [
    { key: "distance", label: "Distance", unit: "m", placeholder: "1200" },
    { key: "duration", label: "Duration", unit: "min", placeholder: "30" },
  ],
  Walk: [
    { key: "distance", label: "Distance", unit: "mi", placeholder: "2.5" },
    { key: "duration", label: "Duration", unit: "min", placeholder: "35" },
  ],
  Yoga: [
    { key: "duration", label: "Duration", unit: "min", placeholder: "45" },
  ],
  Other: [],
};

const defaultHealthToggles = {
  sleep: true,
  hrv: true,
  glucose: true,
  recovery: true,
};
type HealthToggleKey = keyof typeof defaultHealthToggles;

export default function CreateActivityModal({
  open,
  onOpenChange,
}: CreateActivityModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activityType, setActivityType] = useState("Run");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [healthData, setHealthData] = useState<HealthDataSnapshot | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthToggles, setHealthToggles] = useState<Record<HealthToggleKey, boolean>>(
    defaultHealthToggles
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeMetricFields = useMemo(
    () => metricFieldsByType[activityType] ?? [],
    [activityType]
  );

  useEffect(() => {
    setMetricValues({});
  }, [activityType]);

  useEffect(() => {
    if (!open || !user) return;

    const fetchHealthData = async () => {
      setHealthLoading(true);
      try {
        const healthQuery = query(
          collection(db, "healthData"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snapshot = await getDocs(healthQuery);
        const docData = snapshot.docs[0]?.data();
        if (docData) {
          setHealthData({
            sleep: docData.sleepHours ?? docData.sleep ?? undefined,
            hrv: docData.hrv ?? undefined,
            glucose: docData.glucose ?? undefined,
            recovery: docData.recoveryScore ?? docData.recovery ?? undefined,
          });
        } else {
          setHealthData(null);
        }
      } catch (error) {
        toast({
          title: "Unable to load health context",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setHealthLoading(false);
      }
    };

    fetchHealthData();
  }, [open, user, toast]);

  useEffect(() => {
    const previews = photos.map((photo) => URL.createObjectURL(photo));
    setPhotoPreviews(previews);
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [photos]);

  const handlePhotosChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    setPhotos((prev) => [...prev, ...selected]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMetricChange = (key: string, value: string) => {
    setMetricValues((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setActivityType("Run");
    setTitle("");
    setDescription("");
    setVisibility("public");
    setMetricValues({});
    setPhotos([]);
    setHealthData(null);
    setHealthToggles(defaultHealthToggles);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!user || !title) return;

    setIsSubmitting(true);
    try {
      const activityRef = doc(collection(db, "activities"));
      const activityId = activityRef.id;

      const uploadedPhotoUrls = await Promise.all(
        photos.map(async (photo) => {
          const storageRef = ref(
            storage,
            `activities/${activityId}/${Date.now()}-${photo.name}`
          );
          await uploadBytes(storageRef, photo);
          return getDownloadURL(storageRef);
        })
      );

      const metricsPayload = activeMetricFields
        .map((field) => {
          const value = metricValues[field.key];
          if (!value) return null;
          return {
            label: field.label,
            value,
            unit: field.unit,
          };
        })
        .filter(Boolean);

      const healthContextPayload: Record<string, number> = {};
      if (healthData?.sleep !== undefined && healthToggles.sleep) {
        healthContextPayload.sleep = healthData.sleep;
      }
      if (healthData?.hrv !== undefined && healthToggles.hrv) {
        healthContextPayload.hrv = healthData.hrv;
      }
      if (healthData?.glucose !== undefined && healthToggles.glucose) {
        healthContextPayload.glucose = healthData.glucose;
      }
      if (healthData?.recovery !== undefined && healthToggles.recovery) {
        healthContextPayload.recovery = healthData.recovery;
      }

      await setDoc(activityRef, {
        userId: user.uid,
        userName: user.displayName || "Xuunu Member",
        userAvatar: user.photoURL || null,
        activityType,
        title,
        description,
        photos: uploadedPhotoUrls,
        metrics: metricsPayload,
        healthContext: healthContextPayload,
        visibility,
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Activity created",
        description: "Your activity is now live in the feed.",
      });
      handleOpenChange(false);
    } catch (error) {
      toast({
        title: "Unable to create activity",
        description: "Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create activity</DialogTitle>
          <DialogDescription>Share your latest training session.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Activity type
              </Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Visibility
              </Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Title
            </Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Morning Run"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="How did it feel? What stood out?"
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Photos
            </Label>
            <div className="rounded-lg border border-dashed border-muted/50 bg-muted/5 p-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
                Upload photos (multiple)
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotosChange}
                />
              </label>
            </div>

            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {photoPreviews.map((preview, index) => (
                  <div key={preview} className="relative">
                    <img
                      src={preview}
                      alt={`Upload preview ${index + 1}`}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeMetricFields.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Metrics
              </Label>
              <div className="grid gap-4 md:grid-cols-3">
                {activeMetricFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                      {field.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={metricValues[field.key] ?? ""}
                        onChange={(event) =>
                          handleMetricChange(field.key, event.target.value)
                        }
                        placeholder={field.placeholder}
                      />
                      {field.unit ? (
                        <span className="text-xs text-muted-foreground">
                          {field.unit}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              GPS upload
            </Label>
            <div className="rounded-lg border border-dashed border-muted/50 bg-muted/5 p-4 text-xs text-muted-foreground">
              GPS upload coming soon
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-muted/40 bg-muted/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Health context</p>
                <p className="text-xs text-muted-foreground">
                  Auto-populated from your latest metrics
                </p>
              </div>
              {healthLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  { key: "sleep", label: "Sleep", value: healthData?.sleep, unit: "h" },
                  { key: "hrv", label: "HRV", value: healthData?.hrv },
                  { key: "glucose", label: "Glucose", value: healthData?.glucose },
                  {
                    key: "recovery",
                    label: "Recovery",
                    value: healthData?.recovery,
                    unit: "%",
                  },
                ] satisfies Array<{
                  key: HealthToggleKey;
                  label: string;
                  value?: number;
                  unit?: string;
                }>
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg border border-muted/30 bg-background/60 px-3 py-2"
                >
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-sm font-mono">
                      {item.value !== undefined ? item.value : "--"}
                      {item.value !== undefined && item.unit ? item.unit : ""}
                    </p>
                  </div>
                  <Switch
                    checked={healthToggles[item.key]}
                    onCheckedChange={(checked) =>
                      setHealthToggles((prev) => ({
                        ...prev,
                        [item.key]: checked,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title || isSubmitting || !user}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing
              </>
            ) : (
              "Publish activity"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
