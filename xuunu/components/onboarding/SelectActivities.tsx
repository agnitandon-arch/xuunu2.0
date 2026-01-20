import Button from "@/components/ui/Button";

type SelectActivitiesProps = {
  onNext?: () => void;
};

export default function SelectActivities({ onNext }: SelectActivitiesProps) {
  return (
    <section className="card space-y-4">
      <h2 className="text-2xl font-semibold">Select activities</h2>
      <p className="text-sm text-muted">
        Choose what you want to track in your feed.
      </p>
      <Button onClick={onNext}>Continue</Button>
    </section>
  );
}
