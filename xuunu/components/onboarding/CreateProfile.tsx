import Button from "@/components/ui/Button";

type CreateProfileProps = {
  onNext?: () => void;
};

export default function CreateProfile({ onNext }: CreateProfileProps) {
  return (
    <section className="card space-y-4">
      <h2 className="text-2xl font-semibold">Create your profile</h2>
      <p className="text-sm text-muted">
        Add your personal health context and goals.
      </p>
      <Button onClick={onNext}>Save profile</Button>
    </section>
  );
}
