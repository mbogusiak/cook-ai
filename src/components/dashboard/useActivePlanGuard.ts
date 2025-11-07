import { useMemo } from "react";
import type { PlansListVM } from "./types";

export function useActivePlanGuard(vm?: PlansListVM) {
  const hasActivePlan = !!vm?.hasActivePlan;
  const getBlockedCtaMessage = () => (hasActivePlan ? "Masz już aktywny plan" : "");
  return useMemo(() => ({ hasActivePlan, getBlockedCtaMessage }), [hasActivePlan]);
}
