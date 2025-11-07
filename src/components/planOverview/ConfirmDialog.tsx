/**
 * Confirmation dialog for destructive actions
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  action: "archive" | "cancel" | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Returns dialog title based on action type
 */
function getTitle(action: "archive" | "cancel" | null): string {
  if (action === "archive") {
    return "Archiwizować plan?";
  }
  if (action === "cancel") {
    return "Anulować plan?";
  }
  return "";
}

/**
 * Returns dialog description based on action type
 */
function getDescription(action: "archive" | "cancel" | null): string {
  if (action === "archive") {
    return "Plan zostanie oznaczony jako ukończony. Nie będziesz mógł już edytować posiłków.";
  }
  if (action === "cancel") {
    return "Plan zostanie anulowany. Wszystkie dane zostaną zachowane, ale nie będziesz mógł już edytować posiłków.";
  }
  return "";
}

/**
 * Returns button text based on action type
 */
function getConfirmButtonText(action: "archive" | "cancel" | null, isLoading: boolean): string {
  if (isLoading) {
    return "Przetwarzanie...";
  }
  if (action === "archive") {
    return "Archiwizuj";
  }
  if (action === "cancel") {
    return "Anuluj plan";
  }
  return "Potwierdź";
}

export function ConfirmDialog({ isOpen, action, onConfirm, onCancel, isLoading }: ConfirmDialogProps) {
  if (!action) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle(action)}</DialogTitle>
          <DialogDescription>{getDescription(action)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cofnij
          </Button>
          <Button variant={action === "cancel" ? "destructive" : "default"} onClick={onConfirm} disabled={isLoading}>
            {getConfirmButtonText(action, isLoading || false)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
