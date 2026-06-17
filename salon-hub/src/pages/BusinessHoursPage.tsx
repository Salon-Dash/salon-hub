import { useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useBusinessHours } from "@/hooks/useBusinessHours";

const DAYS = [
  { key: "MONDAY",    label: "Monday" },
  { key: "TUESDAY",   label: "Tuesday" },
  { key: "WEDNESDAY", label: "Wednesday" },
  { key: "THURSDAY",  label: "Thursday" },
  { key: "FRIDAY",    label: "Friday" },
  { key: "SATURDAY",  label: "Saturday" },
  { key: "SUNDAY",    label: "Sunday" },
];

const DEFAULT_START = "09:00";
const DEFAULT_END   = "18:00";

interface DayState { enabled: boolean; startTime: string; endTime: string }

export default function BusinessHoursPage() {
  const { businessHours, loading, updateBusinessHours } = useBusinessHours();
  const [saving, setSaving] = useState(false);

  const [schedule, setSchedule] = useState<Record<string, DayState>>(() =>
    Object.fromEntries(DAYS.map(d => [d.key, { enabled: true, startTime: DEFAULT_START, endTime: DEFAULT_END }]))
  );

  // Populate from API once loaded
  useEffect(() => {
    if (!businessHours.length) return;
    const next: Record<string, DayState> = {};
    for (const d of DAYS) {
      const api = businessHours.find(h => h.dayOfWeek === d.key);
      next[d.key] = {
        enabled:   api ? api.enabled : false,
        startTime: api?.startTime ?? DEFAULT_START,
        endTime:   api?.endTime   ?? DEFAULT_END,
      };
    }
    setSchedule(next);
  }, [businessHours]);

  const toggle = (day: string) =>
    setSchedule(s => ({ ...s, [day]: { ...s[day], enabled: !s[day].enabled } }));

  const setTime = (day: string, field: "startTime" | "endTime", value: string) =>
    setSchedule(s => ({ ...s, [day]: { ...s[day], [field]: value } }));

  const applyToAll = (day: string) => {
    const { startTime, endTime } = schedule[day];
    const next: Record<string, DayState> = {};
    for (const d of DAYS) {
      next[d.key] = { ...schedule[d.key], startTime, endTime };
    }
    setSchedule(next);
    toast.success("Applied to all days");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = DAYS.map(d => ({
        dayOfWeek: d.key,
        enabled:   schedule[d.key].enabled,
        startTime: schedule[d.key].startTime,
        endTime:   schedule[d.key].endTime,
      }));
      await updateBusinessHours(payload);
      toast.success("Business hours saved");
    } catch {
      toast.error("Failed to save business hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Business Hours"
        subtitle="Set when your business is open. The calendar will show bookings only during open hours."
        actions={
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      <div className="p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              Toggle each day open or closed and set the opening and closing times.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4">Loading…</p>
            ) : (
              DAYS.map(d => {
                const day = schedule[d.key];
                return (
                  <div
                    key={d.key}
                    className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
                      day.enabled ? "bg-card" : "bg-muted/30 opacity-60"
                    }`}
                  >
                    {/* Toggle */}
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={() => toggle(d.key)}
                      id={`toggle-${d.key}`}
                    />

                    {/* Day label */}
                    <Label
                      htmlFor={`toggle-${d.key}`}
                      className="w-28 cursor-pointer font-medium text-sm"
                    >
                      {d.label}
                    </Label>

                    {/* Time inputs */}
                    {day.enabled ? (
                      <>
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={e => setTime(d.key, "startTime", e.target.value)}
                          className="rounded border px-2 py-1 text-sm bg-background"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={e => setTime(d.key, "endTime", e.target.value)}
                          className="rounded border px-2 py-1 text-sm bg-background"
                        />
                        <button
                          onClick={() => applyToAll(d.key)}
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          Apply to all
                        </button>
                      </>
                    ) : (
                      <span className="ml-auto text-sm text-muted-foreground">Closed</span>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
