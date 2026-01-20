import type { BiosignatureInput } from "./calculate";

export function buildBiosignatureInsights(input: BiosignatureInput) {
  const insights: string[] = [];

  if ((input.activityScore ?? 0) > 70) {
    insights.push("Activity levels look strong today.");
  }

  if ((input.recoveryScore ?? 0) < 40) {
    insights.push("Plan a lighter workload to improve recovery.");
  }

  if ((input.stressScore ?? 0) > 70) {
    insights.push("Consider a calming routine to lower stress.");
  }

  return insights.length ? insights : ["Keep building consistent habits."];
}
