/**
 * Dropdown menu with plan management actions
 */

import { MoreVertical, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionMenuProps {
  canArchive: boolean;
  onArchive: () => void;
  onCancel: () => void;
  isDisabled?: boolean;
}

export function ActionMenu({ canArchive, onArchive, onCancel, isDisabled }: ActionMenuProps) {
  if (isDisabled) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Otwórz menu akcji planu"
          className="transition-transform duration-200 hover:scale-110"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onArchive} disabled={!canArchive} className="cursor-pointer">
          <CheckCircle className="mr-2 h-4 w-4 shrink-0" />
          <div className="flex flex-col">
            <span>Archiwizuj plan</span>
            {!canArchive && <span className="text-xs text-muted-foreground">(Ukończ 90% posiłków)</span>}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCancel} className="text-destructive focus:text-destructive cursor-pointer">
          <XCircle className="mr-2 h-4 w-4 shrink-0" />
          Anuluj plan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
