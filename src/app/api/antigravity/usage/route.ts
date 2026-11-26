import { NextResponse, type NextRequest } from "next/server";
import { getAntigravityUsageDashboard } from "@/lib/server/antigravity-usage";
import type { DataSourceMode, TimeRangeFilter } from "@/types/token-usage";

export const dynamic = "force-dynamic";

const VALID_SOURCES = new Set<DataSourceMode>([
  "deduped",
  "antigravity",
  "antigravity-ide",
  "antigravity-cli",
]);

const VALID_RANGES = new Set<TimeRangeFilter>([
  "today",
  "7d",
  "14d",
  "30d",
  "all",
]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSource = searchParams.get("source") ?? "deduped";
    const rawRange = searchParams.get("range") ?? "today";

    const sourceMode: DataSourceMode = VALID_SOURCES.has(
      rawSource as DataSourceMode
    )
      ? (rawSource as DataSourceMode)
      : "deduped";

    const timeRange: TimeRangeFilter = VALID_RANGES.has(
      rawRange as TimeRangeFilter
    )
      ? (rawRange as TimeRangeFilter)
      : "today";

    const payload = getAntigravityUsageDashboard(sourceMode, timeRange);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "读取本机 Antigravity 数据库失败";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

