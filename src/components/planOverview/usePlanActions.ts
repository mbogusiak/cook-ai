/**
 * Custom hook for plan actions (archive, cancel)
 */

import { useState } from "react";
import type { UpdatePlanCommand } from "@/types";
import type { UsePlanActionsResult, ApiError } from "./types";

export function usePlanActions(
  planId: number,
  onSuccess: (action?: "archive" | "cancel") => void
): UsePlanActionsResult {
  const [isArchiving, setIsArchiving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const archivePlan = async () => {
    setIsArchiving(true);
    setError(null);

    try {
      // Map UI state 'completed' to database state 'archived'
      const body: UpdatePlanCommand = { state: "archived" };

      const response = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw {
          status: response.status,
          message: errorText || "Failed to archive plan",
        };
      }

      onSuccess("archive");
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setIsArchiving(false);
    }
  };

  const cancelPlan = async () => {
    setIsCancelling(true);
    setError(null);

    try {
      const body: UpdatePlanCommand = { state: "cancelled" };

      const response = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw {
          status: response.status,
          message: errorText || "Failed to cancel plan",
        };
      }

      onSuccess("cancel");
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    archivePlan,
    cancelPlan,
    isArchiving,
    isCancelling,
    error,
  };
}
