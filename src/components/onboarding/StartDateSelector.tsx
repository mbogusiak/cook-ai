import React from "react";

interface Props {
  value: string;
  error?: string;
  onChange: (isoDate: string) => void;
}

function formatISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getNextMonday(from: Date): Date {
  const date = new Date(from);
  const day = date.getDay(); // 0..6, Sun..Sat
  const delta = (8 - (day || 7)) % 7;
  date.setDate(date.getDate() + (delta === 0 ? 7 : delta));
  return date;
}

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("pl-PL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function StartDateSelector({ value, onChange, error }: Props): React.ReactElement {
  const [mode, setMode] = React.useState<"today" | "tomorrow" | "next_monday" | "custom">("next_monday");
  const [customDate, setCustomDate] = React.useState<string>("");

  React.useEffect(() => {
    const today = new Date();
    if (mode === "today") onChange(formatISO(today));
    if (mode === "tomorrow") {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      onChange(formatISO(d));
    }
    if (mode === "next_monday") onChange(formatISO(getNextMonday(today)));
    if (mode === "custom" && customDate) onChange(customDate);
  }, [mode, customDate, onChange]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg font-semibold mb-4">Kiedy chcesz rozpocząć plan?</p>

        <div className="space-y-3">
          {/* Today */}
          <div
            className={`flex items-center px-4 py-3 rounded-xl border transition-all ${
              mode === "today" ? "bg-orange-50 border-orange-500" : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="start_date_mode"
              value="today"
              checked={mode === "today"}
              onChange={(e) => setMode(e.target.value as "today")}
              className="w-5 h-5 accent-orange-500 appearance-none border-2 border-gray-300 rounded-full checked:border-orange-500 checked:bg-orange-500 cursor-pointer"
              data-testid="start-date-today"
            />
            <span className="ml-3 text-base">Dzisiaj</span>
          </div>

          {/* Tomorrow */}
          <div
            className={`flex items-center px-4 py-3 rounded-xl border transition-all ${
              mode === "tomorrow" ? "bg-orange-50 border-orange-500" : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="start_date_mode"
              value="tomorrow"
              checked={mode === "tomorrow"}
              onChange={(e) => setMode(e.target.value as "tomorrow")}
              className="w-5 h-5 accent-orange-500 appearance-none border-2 border-gray-300 rounded-full checked:border-orange-500 checked:bg-orange-500 cursor-pointer"
              data-testid="start-date-tomorrow"
            />
            <span className="ml-3 text-base">Jutro</span>
          </div>

          {/* Next Monday */}
          <div
            className={`flex items-center px-4 py-3 rounded-xl border transition-all ${
              mode === "next_monday"
                ? "bg-orange-50 border-orange-500"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="start_date_mode"
              value="next_monday"
              checked={mode === "next_monday"}
              onChange={(e) => setMode(e.target.value as "next_monday")}
              className="w-5 h-5 accent-orange-500 appearance-none border-2 border-gray-300 rounded-full checked:border-orange-500 checked:bg-orange-500 cursor-pointer"
              data-testid="start-date-next-monday"
            />
            <span className="ml-3 text-base">
              Najbliższy poniedziałek <span className="text-muted-foreground">(zalecane)</span>{" "}
            </span>
          </div>

          {/* Custom Date */}
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="block cursor-pointer">
            <div
              className={`flex items-center px-4 py-3 rounded-xl border transition-all ${
                mode === "custom" ? "bg-orange-50 border-orange-500" : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="start_date_mode"
                value="custom"
                checked={mode === "custom"}
                onChange={(e) => setMode(e.target.value as "custom")}
                className="w-5 h-5 accent-orange-500 appearance-none border-2 border-gray-300 rounded-full checked:border-orange-500 checked:bg-orange-500 cursor-pointer"
              />
              <span className="ml-3 text-base">Wybierz datę</span>
            </div>
          </label>

          {/* Custom Date Picker */}
          {mode === "custom" && (
            <div className="mt-4 pl-8">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.currentTarget.value)}
                className="border rounded-lg px-4 py-2 h-10 w-full"
                min={formatISO(new Date())}
              />
            </div>
          )}
        </div>
      </div>

      {/* Selected Date Display */}
      <div>
        <p className="text-sm text-muted-foreground">
          Wybrana data: <span className="text-foreground font-medium">{formatDateDisplay(value)}</span>
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
