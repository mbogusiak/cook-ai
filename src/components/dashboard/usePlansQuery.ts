import { useEffect, useState } from "react";
import type {
  ActivePlanPresence,
  FetchState,
  PlanListItemVM,
  PlansListVM,
  PlansQueryParams,
  PaginationState,
} from "./types";

const DEFAULT_LIMIT = 10;

function formatDateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function toPaginationState(meta: { total: number; limit: number; offset: number; has_more: boolean }): PaginationState {
  const currentPage = Math.floor(meta.offset / meta.limit) + 1;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  return {
    total: meta.total,
    limit: meta.limit,
    offset: meta.offset,
    hasMore: meta.has_more,
    currentPage,
    totalPages,
  };
}

export function usePlansQuery() {
  const getInitialParams = (): PlansQueryParams => {
    if (typeof window === "undefined") {
      return { state: undefined, limit: DEFAULT_LIMIT, offset: 0 };
    }
    const url = new URL(window.location.href);
    const state = (url.searchParams.get("state") as PlansQueryParams["state"]) || undefined;
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || DEFAULT_LIMIT)));
    const offset = (page - 1) * limit;
    return { state, limit, offset } as PlansQueryParams;
  };

  const [params, setParams] = useState<PlansQueryParams>(getInitialParams);
  const [state, setState] = useState<FetchState<PlansListVM>>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setState({ status: "loading" });
      const qs = new URLSearchParams();
      // Note: user_id is automatically taken from session on the server
      if (params.state) qs.set("state", params.state);
      qs.set("limit", String(Math.min(Math.max(params.limit, 1), 50)));
      qs.set("offset", String(Math.max(params.offset, 0)));
      try {
        const res = await fetch(`/api/plans?${qs.toString()}`);
        if (res.status === 401) {
          if (!cancelled) {
            setState({ status: "error", error: "Unauthorized" });
            window.location.href = "/";
          }
          return;
        }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const items: PlanListItemVM[] = json.data.map((dto: any) => ({
          id: dto.id,
          startDateLabel: formatDateLabel(dto.start_date),
          endDateLabel: formatDateLabel(dto.end_date),
          state: dto.state,
          isActive: dto.state === "active",
        }));
        // Check for active plan across ALL user's plans, not just filtered ones
        const hasActivePlan: ActivePlanPresence =
          json.has_active_plan ?? json.data.some((d: any) => d.state === "active");
        const pagination = toPaginationState(json.pagination);
        setState({
          status: "success",
          data: { items, pagination, hasActivePlan, total: json.pagination.total },
        });
      } catch (e: any) {
        if (cancelled) return;
        setState({ status: "error", error: e?.message ?? "Unknown error" });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params.state, params.limit, params.offset]);

  // sync to URL without full reload (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const page = Math.floor(params.offset / params.limit) + 1;
    const url = new URL(window.location.href);
    if (params.state) url.searchParams.set("state", params.state);
    else url.searchParams.delete("state");
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(params.limit));
    window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, [params.state, params.limit, params.offset]);

  return { state, params, setParams } as const;
}
