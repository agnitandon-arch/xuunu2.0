import { format, parseISO } from "date-fns";

export function formatDate(value: Date | string, pattern = "MMM d, yyyy") {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, pattern);
}
