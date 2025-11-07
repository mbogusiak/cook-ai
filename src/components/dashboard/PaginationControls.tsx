import { Button } from "@/components/ui/button";
import type { PaginationState } from "./types";

interface Props {
  pagination: PaginationState;
  onChange: (nextPage: number) => void;
}

export default function PaginationControls({ pagination, onChange }: Props): JSX.Element {
  const canPrev = pagination.currentPage > 1;
  const canNext = pagination.currentPage < pagination.totalPages;
  return (
    <div className="flex items-center justify-between" role="navigation" aria-label="Paginacja planów">
      <Button disabled={!canPrev} onClick={() => onChange(pagination.currentPage - 1)} aria-label="Poprzednia strona">
        Poprzednia
      </Button>
      <div className="text-sm text-gray-600">
        Strona {pagination.currentPage} z {pagination.totalPages}
      </div>
      <Button disabled={!canNext} onClick={() => onChange(pagination.currentPage + 1)} aria-label="Następna strona">
        Następna
      </Button>
    </div>
  );
}
