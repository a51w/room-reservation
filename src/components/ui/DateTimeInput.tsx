"use client";

// Native <input type="datetime-local"> renders its time picker in whatever format the
// browser/OS decides (often 24-hour), independent of the AM/PM formatting the rest of
// this app uses (date-utils' formatTimeLabel). This builds the same value shape a
// datetime-local input would ("YYYY-MM-DDTHH:mm", 24-hour internally) but with explicit
// 12-hour + AM/PM controls, so what you pick always matches what gets displayed later.

interface DateTimeInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface ParsedValue {
  date: string;
  hour12: number;
  minute: number;
  period: "AM" | "PM";
}

function parseValue(value: string): ParsedValue {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return { date: datePart ?? "", hour12: 9, minute: 0, period: "AM" };
  }
  const [hourStr, minuteStr] = timePart.split(":");
  const hour24 = Number(hourStr);
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { date: datePart, hour12, minute: Number(minuteStr), period };
}

function buildValue(date: string, hour12: number, minute: number, period: "AM" | "PM"): string {
  if (!date) return "";
  const hour24 = (hour12 % 12) + (period === "PM" ? 12 : 0);
  return `${date}T${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function DateTimeInput({ id, label, value, onChange, required }: DateTimeInputProps) {
  const { date, hour12, minute, period } = parseValue(value);

  const update = (next: Partial<ParsedValue>) => {
    onChange(
      buildValue(next.date ?? date, next.hour12 ?? hour12, next.minute ?? minute, next.period ?? period)
    );
  };

  const selectClass =
    "bg-white px-2 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={id}
          type="date"
          value={date}
          onChange={(e) => update({ date: e.target.value })}
          required={required}
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          aria-label={`${label} hour`}
          value={hour12}
          onChange={(e) => update({ hour12: Number(e.target.value) })}
          className={selectClass}
        >
          {HOURS_12.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} minute`}
          value={minute}
          onChange={(e) => update({ minute: Number(e.target.value) })}
          className={selectClass}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} AM or PM`}
          value={period}
          onChange={(e) => update({ period: e.target.value as "AM" | "PM" })}
          className={selectClass}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}
