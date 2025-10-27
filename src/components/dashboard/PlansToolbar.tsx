import { Badge } from "@/components/ui/badge";
import type { PlanStateFilter } from "./types";

type Props = {
  state: PlanStateFilter;
  total: number;
  onStateChange: (s: PlanStateFilter) => void;
};

export default function PlansToolbar({ state, total, onStateChange }: Props): JSX.Element {
  const filterOptions: Array<{ value: PlanStateFilter; label: string }> = [
    { value: "all", label: "Wszystkie" },
    { value: "active", label: "Aktywne" },
    { value: "archived", label: "Archiwalne" },
    { value: "cancelled", label: "Anulowane" }
  ];

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <label htmlFor="state-filter" className="text-sm font-medium text-muted-foreground">
          Filtr:
        </label>
        <select
          id="state-filter"
          aria-label="Filtr stanu planów"
          className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
          value={state}
          onChange={(e) => onStateChange(e.target.value as PlanStateFilter)}
        >
          {filterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Badge variant="secondary" className="ml-2">
          {total} plan{total !== 1 ? "ów" : ""}
        </Badge>
      </div>
    </div>
  );
}


