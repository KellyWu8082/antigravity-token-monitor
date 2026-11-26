"use client";

import { useQuery } from "@tanstack/react-query";
import { ANALYTICS_QUERY_KEY, TIMELINE_QUERY_KEY } from "@/hooks/use-tasks-query";
import {
  fetchActivityTimeline,
  fetchAnalyticsSnapshot,
} from "@/lib/mock-api";
import type { AnalyticsTimeframe } from "@/types/nexus";

export function useAnalyticsSnapshotQuery(timeframe: AnalyticsTimeframe) {
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, timeframe],
    queryFn: () => fetchAnalyticsSnapshot(timeframe),
    staleTime: 30 * 1000,
  });
}

export function useActivityTimelineQuery() {
  return useQuery({
    queryKey: TIMELINE_QUERY_KEY,
    queryFn: fetchActivityTimeline,
    staleTime: 15 * 1000,
  });
}

