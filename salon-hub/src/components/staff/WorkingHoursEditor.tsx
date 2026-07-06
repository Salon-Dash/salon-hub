import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

// Ordered week; keys are DayOfWeek names the staff-service expects in `schedule`.
export const WEEK_DAYS = [
  { key: "MONDAY", label: "Monday" },
  { key: "TUESDAY", label: "Tuesday" },
  { key: "WEDNESDAY", label: "Wednesday" },
  { key: "THURSDAY", label: "Thursday" },
  { key: "FRIDAY", label: "Friday" },
  { key: "SATURDAY", label: "Saturday" },
  { key: "SUNDAY", label: "Sunday" },
] as const;

export type DayKey = (typeof WEEK_DAYS)[number]["key"];
export type DaySchedule = { enabled: boolean; start: string; end: string };
export type WeekSchedule = Record<DayKey, DaySchedule>;

// Sensible default for a new staff member: Mon–Fri 09:00–17:00, weekend off.
export const DEFAULT_WEEK: WeekSchedule = WEEK_DAYS.reduce((acc, d) => {
  const weekend = d.key === "SATURDAY" || d.key === "SUNDAY";
  acc[d.key] = { enabled: !weekend, start: "09:00", end: "17:00" };
  return acc;
}, {} as WeekSchedule);

// Convert editor state to the staff-service `schedule` payload: enabled days only,
// each as [start, end] in "HH:mm". Empty/disabled days are omitted (= not working).
export function scheduleToPayload(week: WeekSchedule): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const d of WEEK_DAYS) {
    const s = week[d.key];
    if (s?.enabled && s.start && s.end) out[d.key] = [s.start, s.end];
  }
  return out;
}

// Build editor state from a StaffDto's workingHoursStart/End maps
// (keys "MONDAY"…, values "HH:mm" or "HH:mm:ss"). A day is enabled iff both set.
export function weekFromWorkingHours(
  start?: Record<string, string> | null,
  end?: Record<string, string> | null
): WeekSchedule {
  const hhmm = (v?: string) => (v ? v.slice(0, 5) : "");
  return WEEK_DAYS.reduce((acc, d) => {
    const s = hhmm(start?.[d.key]);
    const e = hhmm(end?.[d.key]);
    acc[d.key] = { enabled: Boolean(s && e), start: s || "09:00", end: e || "17:00" };
    return acc;
  }, {} as WeekSchedule);
}

export function WorkingHoursEditor({
  value,
  onChange,
}: {
  value: WeekSchedule;
  onChange: (next: WeekSchedule) => void;
}) {
  const setDay = (key: DayKey, patch: Partial<DaySchedule>) =>
    onChange({ ...value, [key]: { ...value[key], ...patch } });

  return (
    <div className="space-y-2">
      {WEEK_DAYS.map((d) => {
        const day = value[d.key];
        return (
          <div key={d.key} className="flex items-center gap-3">
            <Switch
              checked={day.enabled}
              onCheckedChange={(checked) => setDay(d.key, { enabled: checked })}
              aria-label={`${day.enabled ? "Disable" : "Enable"} ${d.label}`}
            />
            <span className="w-24 text-sm text-gray-700">{d.label}</span>
            {day.enabled ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={day.start}
                  onChange={(e) => setDay(d.key, { start: e.target.value })}
                  className="w-32"
                  aria-label={`${d.label} start time`}
                />
                <span className="text-gray-400">–</span>
                <Input
                  type="time"
                  value={day.end}
                  onChange={(e) => setDay(d.key, { end: e.target.value })}
                  className="w-32"
                  aria-label={`${d.label} end time`}
                />
              </div>
            ) : (
              <span className="text-sm text-gray-400">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
