import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PlansToolbar from "./PlansToolbar";
import PlansListContent from "./PlansListContent";
import PaginationControls from "./PaginationControls";
import LeftSidebar from "./LeftSidebar";
import BottomCTA from "./BottomCTA";
import SkeletonList from "./SkeletonList";
import type { PlanStateFilter } from "./types";
import { usePlansQuery } from "./usePlansQuery";

export default function PlansList(): JSX.Element {
  const { state, params, setParams } = usePlansQuery();

  const onStateChange = (next: PlanStateFilter) => {
    setParams((p) => ({ state: next === "all" ? undefined : next, limit: p.limit, offset: 0 }));
  };

  const onPageChange = (page: number) => {
    setParams((p) => ({ ...p, offset: Math.max(0, (page - 1) * p.limit) }));
  };

  if (state.status === "loading" || state.status === "idle") {
    const hasActivePlan = state.data?.hasActivePlan ?? false;
    return (
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6" aria-busy>
        <aside className="hidden md:block" />
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Twoje plany</h1>
            {hasActivePlan ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled>Generuj plan</Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  użytkownik może mieć tylko jeden aktywny plan
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button asChild>
                <a href="/onboarding">Generuj plan</a>
              </Button>
            )}
          </div>
          <SkeletonList />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="max-w-lg">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Nie udało się pobrać planów. {state.error}
        </div>
        <div className="mt-3">
          <Button onClick={() => setParams((p) => ({ ...p }))}>Spróbuj ponownie</Button>
        </div>
      </div>
    );
  }

  const vm = state.data!;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6" data-testid="plans-list">
      <aside className="hidden md:block">
        <LeftSidebar hasActivePlan={vm.hasActivePlan} />
      </aside>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Twoje plany</h1>
          {vm.hasActivePlan ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled>Generuj plan</Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                użytkownik może mieć tylko jeden aktywny plan
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button asChild>
              <a href="/onboarding">Generuj plan</a>
            </Button>
          )}
        </div>
        <PlansToolbar state={params.state ?? "all"} total={vm.total} onStateChange={onStateChange} />
        <PlansListContent items={vm.items} hasActivePlan={vm.hasActivePlan} />
        <PaginationControls pagination={vm.pagination} onChange={onPageChange} />
      </div>
      <BottomCTA hasActivePlan={vm.hasActivePlan} />
    </div>
  );
}
