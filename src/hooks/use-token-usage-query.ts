"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  DataSourceMode,
  SessionDetailResponse,
  TimeRangeFilter,
  TokenUsageDashboardResponse,
} from "@/types/token-usage";

export const TOKEN_USAGE_QUERY_KEY = ["antigravity", "token-usage"] as const;
export const SESSION_DETAIL_QUERY_KEY = ["antigravity", "session-detail"] as const;

interface ApiErrorPayload {
  readonly error: string;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

async function fetchTokenUsageDashboard(
  sourceMode: DataSourceMode,
  timeRange: TimeRangeFilter
): Promise<TokenUsageDashboardResponse> {
  if (typeof window !== "undefined" && window.antigravityDesktop) {
    return window.antigravityDesktop.getDashboard(sourceMode, timeRange);
  }

  const params = new URLSearchParams({
    source: sourceMode,
    range: timeRange,
  });
  const response = await fetch(`/api/antigravity/usage?${params.toString()}`, {
    cache: "no-store",
  });
  const data = (await response.json()) as
    | TokenUsageDashboardResponse
    | ApiErrorPayload;

  if (!response.ok || isApiErrorPayload(data)) {
    const errMsg = isApiErrorPayload(data)
      ? data.error
      : `请求失败 (${response.status})`;
    throw new Error(errMsg);
  }
  return data;
}

async function fetchSessionDetail(
  sessionId: string,
  sourceMode: DataSourceMode
): Promise<SessionDetailResponse> {
  if (typeof window !== "undefined" && window.antigravityDesktop) {
    return window.antigravityDesktop.getSessionDetail(sessionId, sourceMode);
  }

  const params = new URLSearchParams({ source: sourceMode });
  const response = await fetch(
    `/api/antigravity/usage/${encodeURIComponent(sessionId)}?${params.toString()}`,
    { cache: "no-store" }
  );
  const data = (await response.json()) as
    | SessionDetailResponse
    | ApiErrorPayload;

  if (!response.ok || isApiErrorPayload(data)) {
    const errMsg = isApiErrorPayload(data)
      ? data.error
      : `获取会话明细失败 (${response.status})`;
    throw new Error(errMsg);
  }
  return data;
}

export function useTokenUsageQuery(
  sourceMode: DataSourceMode,
  timeRange: TimeRangeFilter
) {
  return useQuery({
    queryKey: [...TOKEN_USAGE_QUERY_KEY, sourceMode, timeRange],
    queryFn: () => fetchTokenUsageDashboard(sourceMode, timeRange),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useSessionTokenDetailQuery(
  sessionId: string | null,
  sourceMode: DataSourceMode
) {
  return useQuery({
    queryKey: [...SESSION_DETAIL_QUERY_KEY, sessionId, sourceMode],
    queryFn: () => {
      if (!sessionId) {
        throw new Error("缺少 sessionId");
      }
      return fetchSessionDetail(sessionId, sourceMode);
    },
    enabled: sessionId !== null,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
