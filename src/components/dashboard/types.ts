import type { PlanDTO, PlansListResponse, PaginationMeta } from "@/types";

export type PlanStateFilter = "all" | "active" | "archived" | "cancelled";

export interface PlansQueryParams {
  state?: Exclude<PlanStateFilter, "all">;
  limit: number;
  offset: number;
}

export interface PlanListItemVM {
  id: number;
  startDateLabel: string;
  endDateLabel: string;
  state: PlanDTO["state"];
  isActive: boolean;
}

export type ViewStatus = "idle" | "loading" | "success" | "error";

export interface PaginationState {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

export interface PlansListVM {
  items: PlanListItemVM[];
  pagination: PaginationState;
  hasActivePlan: boolean;
  total: number;
}

export interface FetchState<T> {
  status: ViewStatus;
  data?: T;
  error?: string;
}

export type ActivePlanPresence = boolean;

export type PlansApiResponse = PlansListResponse;
