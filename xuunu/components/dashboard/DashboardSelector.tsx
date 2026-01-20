import Button from "@/components/ui/Button";

type DashboardOption = {
  id: string;
  label: string;
};

type DashboardSelectorProps = {
  options: DashboardOption[];
  activeId: string;
  onSelect: (id: string) => void;
};

export default function DashboardSelector({
  options,
  activeId,
  onSelect,
}: DashboardSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.id}
          variant={option.id === activeId ? "primary" : "secondary"}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
