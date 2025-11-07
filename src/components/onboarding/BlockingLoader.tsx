import React from "react";

interface Props {
  open: boolean;
  message?: string;
}

export function BlockingLoader({ open, message }: Props): React.ReactElement | null {
  if (!open) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card shadow-lg">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{message ?? "Przetwarzanie..."}</p>
      </div>
    </div>
  );
}
