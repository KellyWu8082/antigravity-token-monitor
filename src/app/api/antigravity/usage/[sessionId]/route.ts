import { NextResponse, type NextRequest } from "next/server";
import { getAntigravitySessionDetail } from "@/lib/server/antigravity-usage";
import type { DataSourceMode } from "@/types/token-usage";

export const dynamic = "force-dynamic";

const VALID_SOURCES = new Set<DataSourceMode>([
  "deduped",
  "antigravity",
  "antigravity-ide",
  "antigravity-cli",
]);

export async function GET(
  request: NextRequest,
  context: { readonly params: Promise<{ readonly sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const { searchParams } = new URL(request.url);
    const rawSource = searchParams.get("source") ?? "deduped";

    const sourceMode: DataSourceMode = VALID_SOURCES.has(
      rawSource as DataSourceMode
    )
      ? (rawSource as DataSourceMode)
      : "deduped";

    const detail = getAntigravitySessionDetail(sessionId, sourceMode);
    if (!detail) {
      return NextResponse.json(
        { error: `未找到会话 ${sessionId} 的 Token 明细` },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(detail, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "读取会话 Token 详情失败";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

