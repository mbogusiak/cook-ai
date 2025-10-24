import type { PlanStateFilter } from "./types";

type Props = {
  state: PlanStateFilter;
  total: number;
  onStateChange: (s: PlanStateFilter) => void;
};

export default function PlansToolbar({ state, total, onStateChange }: Props): JSX.Element {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <select
          aria-label="Filtr stanu"
          className="border rounded-md px-2 py-1"
          value={state}
          onChange={(e) => onStateChange(e.target.value as PlanStateFilter)}
        >
          <option value="all">Wszystkie</option>
          <option value="active">Aktywne</option>
          <option value="archived">Archiwalne</option>
          <option value="cancelled">Anulowane</option>
        </select>
        <span className="text-sm text-gray-600">Łącznie: {total}</span>
      </div>
    </div>
  );
}


