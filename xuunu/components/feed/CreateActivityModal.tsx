import Button from "@/components/ui/Button";

type CreateActivityModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateActivityModal({
  isOpen,
  onClose,
}: CreateActivityModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold">Log a new activity</h3>
      <p className="text-sm text-muted">Capture workouts and health context.</p>
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
