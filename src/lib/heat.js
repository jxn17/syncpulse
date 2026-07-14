import { differenceInDays, isToday, isYesterday } from "date-fns";

// Shared "how long since this project was touched" status used by both the
// orbit stage and the flat card grid.
export function getHeatStatus(lastTouched) {
  if (!lastTouched) return { label: "never", color: "#6B7280", glow: "", days: 999 };
  const days = differenceInDays(new Date(), new Date(lastTouched));
  if (isToday(new Date(lastTouched))) return { label: "today ✓", color: "#4ADE80", glow: "glow-green", days: 0 };
  if (isYesterday(new Date(lastTouched))) return { label: "yesterday", color: "#FACC15", glow: "glow-yellow", days: 1 };
  if (days <= 3) return { label: `${days}d ago`, color: "#FB923C", glow: "", days };
  return { label: `${days}d ago`, color: "#F87171", glow: "glow-red", days };
}
