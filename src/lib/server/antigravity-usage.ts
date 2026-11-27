import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  calculateTokenCost,
  MODEL_PRICING_CATALOG,
  resolveModelGroup,
  resolveModelPricing,
} from "@/lib/token-pricing";
import type {
  CostBreakdown,
  DailyUsagePoint,
  DataSourceMode,
  DirectoryScanStatus,
  LocalSourceKey,
  ModelUsageSummary,
  SessionDetailResponse,
  SessionSummary,
  TimeRangeFilter,
  TokenBreakdown,
  TokenUsageDashboardResponse,
  TurnTokenDetail,
  WorkspaceUsageSummary,
} from "@/types/token-usage";
import { workspaceSelectionKey } from "@/lib/workspace-key";

interface ProtobufField {
  readonly fieldNum: number;
  readonly wireType: number;
  readonly varint: bigint;
  readonly bytes: Uint8Array | null;
}

interface ParsedTrajectoryMeta {
  readonly workspacePath: string | null;
  readonly workspaceName: string | null;
  readonly repoName: string | null;
  readonly gitBranch: string | null;
  readonly createdAtSec: number | null;
}

interface ParsedSessionCache {
  readonly mtimeMs: number;
  readonly fileSizeBytes: number;
  readonly summary: SessionSummary;
  readonly turns: readonly TurnTokenDetail[];
}

interface MutableTokenAccumulator {
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  responseTokens: number;
  inputCostUsd: number;
  cacheReadCostUsd: number;
  cacheWriteCostUsd: number;
  outputCostUsd: number;
  thinkingCostUsd: number;
  responseCostUsd: number;
  cacheSavingsUsd: number;
}

const SOURCE_CANDIDATES: readonly {
  readonly key: LocalSourceKey;
  readonly relParts: readonly string[];
}[] = [
  { key: "antigravity", relParts: [".gemini", "antigravity", "conversations"] },
  {
    key: "antigravity-ide",
    relParts: [".gemini", "antigravity-ide", "conversations"],
  },
  {
    key: "antigravity-cli",
    relParts: [".gemini", "antigravity-cli", "conversations"],
  },
];

const SESSION_CACHE = new Map<string, ParsedSessionCache>();
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_VALID_UNIX_SEC = 1_577_836_800; // 2020-01-01T00:00:00Z
const MAX_VALID_UNIX_SEC = 2_524_608_000; // 2050-01-01T00:00:00Z

function createAccumulator(): MutableTokenAccumulator {
  return {
    inputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
    responseTokens: 0,
    inputCostUsd: 0,
    cacheReadCostUsd: 0,
    cacheWriteCostUsd: 0,
    outputCostUsd: 0,
    thinkingCostUsd: 0,
    responseCostUsd: 0,
    cacheSavingsUsd: 0,
  };
}

function addToAccumulator(
  acc: MutableTokenAccumulator,
  usage: TokenBreakdown,
  cost: CostBreakdown,
): void {
  acc.inputTokens += usage.inputTokens;
  acc.cacheReadTokens += usage.cacheReadTokens;
  acc.cacheWriteTokens += usage.cacheWriteTokens;
  acc.outputTokens += usage.outputTokens;
  acc.thinkingTokens += usage.thinkingTokens;
  acc.responseTokens += usage.responseTokens;
  acc.inputCostUsd += cost.inputCostUsd;
  acc.cacheReadCostUsd += cost.cacheReadCostUsd;
  acc.cacheWriteCostUsd += cost.cacheWriteCostUsd;
  acc.outputCostUsd += cost.outputCostUsd;
  acc.thinkingCostUsd += cost.thinkingCostUsd;
  acc.responseCostUsd += cost.responseCostUsd;
  acc.cacheSavingsUsd += cost.cacheSavingsUsd;
}

function finalizeBreakdown(acc: MutableTokenAccumulator): TokenBreakdown {
  const totalTokens =
    acc.inputTokens +
    acc.cacheReadTokens +
    acc.cacheWriteTokens +
    acc.outputTokens;
  const uncachedTotalTokens = acc.inputTokens + acc.outputTokens;
  return {
    inputTokens: acc.inputTokens,
    cacheReadTokens: acc.cacheReadTokens,
    cacheWriteTokens: acc.cacheWriteTokens,
    outputTokens: acc.outputTokens,
    thinkingTokens: acc.thinkingTokens,
    responseTokens: acc.responseTokens,
    totalTokens,
    uncachedTotalTokens,
  };
}

function finalizeCostBreakdown(acc: MutableTokenAccumulator): CostBreakdown {
  const totalCostUsd =
    acc.inputCostUsd +
    acc.cacheReadCostUsd +
    acc.cacheWriteCostUsd +
    acc.outputCostUsd;
  const uncachedCostUsd = acc.inputCostUsd + acc.outputCostUsd;
  return {
    inputCostUsd: acc.inputCostUsd,
    cacheReadCostUsd: acc.cacheReadCostUsd,
    cacheWriteCostUsd: acc.cacheWriteCostUsd,
    outputCostUsd: acc.outputCostUsd,
    thinkingCostUsd: acc.thinkingCostUsd,
    responseCostUsd: acc.responseCostUsd,
    totalCostUsd,
    uncachedCostUsd,
    cacheSavingsUsd: acc.cacheSavingsUsd,
  };
}

function computeCacheHitRate(
  inputTokens: number,
  cacheReadTokens: number,
): number {
  const denom = inputTokens + cacheReadTokens;
  if (denom <= 0) return 0;
  return Math.round((cacheReadTokens / denom) * 1000) / 10;
}

function decodeVarint(
  buf: Uint8Array,
  startPos: number,
): { readonly value: bigint; readonly nextPos: number } | null {
  let result = 0n;
  let shift = 0n;
  let pos = startPos;

  while (pos < buf.length) {
    const byte = buf[pos];
    if (byte === undefined) return null;
    pos += 1;
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return { value: result, nextPos: pos };
    }
    shift += 7n;
    if (shift > 63n) {
      return null;
    }
  }
  return null;
}

function toSafeNumber(val: bigint): number {
  if (val <= 0n) return 0;
  if (val >= MAX_SAFE_BIGINT) return Number.MAX_SAFE_INTEGER;
  return Number(val);
}

function iterProtobufFields(buf: Uint8Array): ProtobufField[] {
  const fields: ProtobufField[] = [];
  let pos = 0;

  while (pos < buf.length) {
    const tagRes = decodeVarint(buf, pos);
    if (!tagRes) break;
    pos = tagRes.nextPos;

    const tag = tagRes.value;
    if (tag <= 0n) break;
    const fieldNum = Number(tag >> 3n);
    const wireType = Number(tag & 0x07n);
    if (fieldNum === 0) break;

    if (wireType === 0) {
      const valRes = decodeVarint(buf, pos);
      if (!valRes) break;
      pos = valRes.nextPos;
      fields.push({
        fieldNum,
        wireType,
        varint: valRes.value,
        bytes: null,
      });
    } else if (wireType === 1) {
      if (pos + 8 > buf.length) break;
      pos += 8;
    } else if (wireType === 2) {
      const lenRes = decodeVarint(buf, pos);
      if (!lenRes) break;
      pos = lenRes.nextPos;
      const len = toSafeNumber(lenRes.value);
      if (len < 0 || pos + len > buf.length) break;
      const sub = buf.subarray(pos, pos + len);
      pos += len;
      fields.push({
        fieldNum,
        wireType,
        varint: 0n,
        bytes: sub,
      });
    } else if (wireType === 5) {
      if (pos + 4 > buf.length) break;
      pos += 4;
    } else {
      break;
    }
  }

  return fields;
}

function decodeUtf8(bytes: Uint8Array | null): string {
  if (!bytes || bytes.length === 0) return "";
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
    "utf8",
  );
}

function parseKeyValue(bytes: Uint8Array): {
  readonly key: string;
  readonly value: string;
} {
  let key = "";
  let value = "";
  for (const field of iterProtobufFields(bytes)) {
    if (field.wireType !== 2 || !field.bytes) continue;
    if (field.fieldNum === 1) key = decodeUtf8(field.bytes);
    else if (field.fieldNum === 2) value = decodeUtf8(field.bytes);
  }
  return { key, value };
}

function parseModelUsageStats(bytes: Uint8Array): TokenBreakdown | null {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheWriteTokens = 0;
  let cacheReadTokens = 0;
  let thinkingTokens = 0;
  let responseTokens = 0;

  for (const field of iterProtobufFields(bytes)) {
    if (field.wireType !== 0) continue;
    const val = toSafeNumber(field.varint);
    switch (field.fieldNum) {
      case 2:
        inputTokens = val;
        break;
      case 3:
        outputTokens = val;
        break;
      case 4:
        cacheWriteTokens = val;
        break;
      case 5:
        cacheReadTokens = val;
        break;
      case 9:
        thinkingTokens = val;
        break;
      case 10:
        responseTokens = val;
        break;
      default:
        break;
    }
  }

  if (outputTokens === 0 && (thinkingTokens > 0 || responseTokens > 0)) {
    outputTokens = thinkingTokens + responseTokens;
  } else if (responseTokens === 0 && outputTokens >= thinkingTokens) {
    responseTokens = outputTokens - thinkingTokens;
  }

  const totalTokens =
    inputTokens + cacheReadTokens + cacheWriteTokens + outputTokens;
  if (totalTokens === 0 && thinkingTokens === 0 && responseTokens === 0) {
    return null;
  }

  return {
    inputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    outputTokens,
    thinkingTokens,
    responseTokens,
    totalTokens,
    uncachedTotalTokens: inputTokens + outputTokens,
  };
}

/**
 * Parses `GeneratorMetadata.chat_model` (field 1) strictly along the verified schema path
 * to avoid capturing unrelated uint64(-1) or context-limit varints from sibling messages.
 */
function parseGenMetadataTurn(
  turnIndex: number,
  blob: Uint8Array,
  stepTimestamps: ReadonlyMap<number, number>,
  fallbackTimestampMs: number,
): TurnTokenDetail | null {
  let usage: TokenBreakdown | null = null;
  let modelName = "";
  let modelSlug = "";
  let stepIndex: number | null = null;
  let requestId: string | null = null;

  for (const topField of iterProtobufFields(blob)) {
    if (topField.fieldNum !== 1 || topField.wireType !== 2 || !topField.bytes) {
      continue;
    }

    for (const chatField of iterProtobufFields(topField.bytes)) {
      if (chatField.wireType !== 2 || !chatField.bytes) continue;

      if (chatField.fieldNum === 4) {
        usage = parseModelUsageStats(chatField.bytes);
      } else if (chatField.fieldNum === 19) {
        modelSlug = decodeUtf8(chatField.bytes).trim();
      } else if (chatField.fieldNum === 21) {
        modelName = decodeUtf8(chatField.bytes).trim();
      } else if (chatField.fieldNum === 20) {
        const kv = parseKeyValue(chatField.bytes);
        if (kv.key === "last_step_index") {
          const parsed = Number.parseInt(kv.value, 10);
          if (Number.isFinite(parsed)) {
            stepIndex = parsed;
          }
        } else if (kv.key === "request_id" && kv.value) {
          requestId = kv.value;
        }
      }
    }
  }

  if (!usage) return null;

  const resolvedModelName = modelName || modelSlug || "Unknown Model";
  const resolvedSlug = modelSlug || resolvedModelName;

  let timestamp: string | null = null;
  if (stepIndex !== null) {
    const unixSec = stepTimestamps.get(stepIndex);
    if (unixSec !== undefined) {
      timestamp = new Date(unixSec * 1000).toISOString();
    }
  }

  const cost = calculateTokenCost(
    resolvedModelName,
    resolvedSlug,
    usage,
    timestamp ?? fallbackTimestampMs,
  );

  return {
    turnIndex,
    stepIndex,
    timestamp,
    modelName: resolvedModelName,
    modelSlug: resolvedSlug,
    requestId,
    usage,
    cost,
  };
}

function normalizeWorkspacePath(rawUri: string): {
  readonly path: string | null;
  readonly name: string | null;
} {
  if (!rawUri) return { path: null, name: null };
  let cleaned = rawUri.trim();
  if (cleaned.startsWith("file://")) {
    try {
      cleaned = decodeURIComponent(cleaned.slice("file://".length));
    } catch {
      cleaned = cleaned.slice("file://".length);
    }
    // Strip leading slash on Windows drive paths like /C:/Users/...
    if (/^\/[A-Za-z]:[\\/]/.test(cleaned)) {
      cleaned = cleaned.slice(1);
    }
  }
  const trimmedTrailing = cleaned.replace(/[\\/]+$/, "");
  const segments = trimmedTrailing.split(/[\\/]/).filter(Boolean);
  const baseName = segments.at(-1) ?? path.basename(cleaned);
  return {
    path: trimmedTrailing || cleaned || null,
    name: baseName || trimmedTrailing || cleaned || null,
  };
}

function parseTrajectoryMetadata(
  blob: Uint8Array | null,
): ParsedTrajectoryMeta {
  if (!blob) {
    return {
      workspacePath: null,
      workspaceName: null,
      repoName: null,
      gitBranch: null,
      createdAtSec: null,
    };
  }

  let rawWorkspaceUri = "";
  let repoName: string | null = null;
  let gitBranch: string | null = null;
  let createdAtSec: number | null = null;

  for (const field of iterProtobufFields(blob)) {
    if (field.wireType !== 2 || !field.bytes) continue;

    if (field.fieldNum === 1) {
      for (const wsField of iterProtobufFields(field.bytes)) {
        if (wsField.wireType !== 2 || !wsField.bytes) continue;
        if (wsField.fieldNum === 1 && !rawWorkspaceUri) {
          rawWorkspaceUri = decodeUtf8(wsField.bytes);
        } else if (wsField.fieldNum === 3) {
          for (const repoField of iterProtobufFields(wsField.bytes)) {
            if (repoField.fieldNum === 1 && repoField.wireType === 2) {
              const name = decodeUtf8(repoField.bytes).trim();
              if (name) repoName = name;
            }
          }
        } else if (wsField.fieldNum === 4) {
          const branch = decodeUtf8(wsField.bytes).trim();
          if (branch) gitBranch = branch;
        }
      }
    } else if (field.fieldNum === 7 && !rawWorkspaceUri) {
      rawWorkspaceUri = decodeUtf8(field.bytes);
    } else if (field.fieldNum === 2) {
      for (const tsField of iterProtobufFields(field.bytes)) {
        if (tsField.fieldNum === 1 && tsField.wireType === 0) {
          const sec = toSafeNumber(tsField.varint);
          if (sec >= MIN_VALID_UNIX_SEC && sec <= MAX_VALID_UNIX_SEC) {
            createdAtSec = sec;
          }
        }
      }
    }
  }

  const ws = normalizeWorkspacePath(rawWorkspaceUri);
  return {
    workspacePath: ws.path,
    workspaceName: ws.name,
    repoName,
    gitBranch,
    createdAtSec,
  };
}

function parseStepTimestampSec(blob: Uint8Array): number | null {
  for (const field of iterProtobufFields(blob)) {
    if (field.fieldNum === 1 && field.wireType === 2 && field.bytes) {
      for (const tsField of iterProtobufFields(field.bytes)) {
        if (tsField.fieldNum === 1 && tsField.wireType === 0) {
          const sec = toSafeNumber(tsField.varint);
          if (sec >= MIN_VALID_UNIX_SEC && sec <= MAX_VALID_UNIX_SEC) {
            return sec;
          }
        }
      }
    }
  }
  return null;
}

function parseSessionDatabase(
  sessionId: string,
  sourceDir: LocalSourceKey,
  dbPath: string,
  mtimeMs: number,
  fileSizeBytes: number,
): ParsedSessionCache | null {
  const cached = SESSION_CACHE.get(dbPath);
  if (
    cached &&
    cached.mtimeMs === mtimeMs &&
    cached.fileSizeBytes === fileSizeBytes
  ) {
    return cached;
  }

  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { readonly name: string }[];
    const tableSet = new Set(tables.map((t) => t.name));

    if (!tableSet.has("gen_metadata")) {
      return null;
    }

    let trajectoryMeta: ParsedTrajectoryMeta = {
      workspacePath: null,
      workspaceName: null,
      repoName: null,
      gitBranch: null,
      createdAtSec: null,
    };

    if (tableSet.has("trajectory_metadata_blob")) {
      const metaRow = db
        .prepare(
          "SELECT data FROM trajectory_metadata_blob WHERE data IS NOT NULL LIMIT 1",
        )
        .get() as { readonly data: Uint8Array } | undefined;
      if (metaRow?.data) {
        trajectoryMeta = parseTrajectoryMetadata(metaRow.data);
      }
    }

    const stepTimestamps = new Map<number, number>();
    let minStepSec: number | null = null;
    let maxStepSec: number | null = null;

    if (tableSet.has("steps")) {
      const stepRows = db
        .prepare("SELECT idx, metadata FROM steps WHERE metadata IS NOT NULL")
        .all() as { readonly idx: number; readonly metadata: Uint8Array }[];

      for (const row of stepRows) {
        const sec = parseStepTimestampSec(row.metadata);
        if (sec !== null) {
          stepTimestamps.set(row.idx, sec);
          if (minStepSec === null || sec < minStepSec) minStepSec = sec;
          if (maxStepSec === null || sec > maxStepSec) maxStepSec = sec;
        }
      }
    }

    const genRows = db
      .prepare(
        "SELECT idx, data FROM gen_metadata WHERE data IS NOT NULL ORDER BY idx ASC",
      )
      .all() as { readonly idx: number; readonly data: Uint8Array }[];

    const fallbackSec = Math.floor(mtimeMs / 1000);
    const createdAtSec =
      trajectoryMeta.createdAtSec ?? minStepSec ?? fallbackSec;
    const sessionFallbackTimestampMs = createdAtSec * 1000;

    const turns: TurnTokenDetail[] = [];
    const acc = createAccumulator();
    const modelTurns = new Map<string, number>();

    for (const row of genRows) {
      const turn = parseGenMetadataTurn(
        row.idx,
        row.data,
        stepTimestamps,
        sessionFallbackTimestampMs,
      );
      if (!turn) continue;
      turns.push(turn);
      addToAccumulator(acc, turn.usage, turn.cost);
      modelTurns.set(turn.modelName, (modelTurns.get(turn.modelName) ?? 0) + 1);
    }

    if (turns.length === 0) {
      return null;
    }

    const updatedAtSec = Math.max(maxStepSec ?? createdAtSec, fallbackSec);

    const sortedModels = [...modelTurns.entries()].sort((a, b) => b[1] - a[1]);
    const primaryModel = sortedModels[0]?.[0] ?? "Unknown Model";
    const usage = finalizeBreakdown(acc);
    const cost = finalizeCostBreakdown(acc);

    const summary: SessionSummary = {
      sessionId,
      sourceDir,
      dbPath,
      fileSizeBytes,
      workspacePath: trajectoryMeta.workspacePath,
      workspaceName: trajectoryMeta.workspaceName,
      repoName: trajectoryMeta.repoName,
      gitBranch: trajectoryMeta.gitBranch,
      createdAt: new Date(createdAtSec * 1000).toISOString(),
      updatedAt: new Date(updatedAtSec * 1000).toISOString(),
      turns: turns.length,
      primaryModel,
      models: sortedModels.map(([m]) => m),
      cacheHitRate: computeCacheHitRate(
        usage.inputTokens,
        usage.cacheReadTokens,
      ),
      usage,
      cost,
    };

    const parsed: ParsedSessionCache = {
      mtimeMs,
      fileSizeBytes,
      summary,
      turns,
    };
    SESSION_CACHE.set(dbPath, parsed);
    return parsed;
  } finally {
    try {
      db?.close();
    } catch {
      // Ignore close failures on read-only handles
    }
  }
}

interface DiscoveredFile {
  readonly sessionId: string;
  readonly sourceDir: LocalSourceKey;
  readonly dbPath: string;
  readonly mtimeMs: number;
  readonly fileSizeBytes: number;
}

function discoverConversationDbs(sourceMode: DataSourceMode): {
  readonly directories: readonly DirectoryScanStatus[];
  readonly files: readonly DiscoveredFile[];
  readonly dedupedDuplicatesCount: number;
} {
  const home = os.homedir();
  const directories: DirectoryScanStatus[] = [];
  const collected: DiscoveredFile[] = [];

  for (const candidate of SOURCE_CANDIDATES) {
    const dirPath = path.join(home, ...candidate.relParts);
    const exists = fs.existsSync(dirPath);
    let dbCount = 0;

    if (exists) {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        const shouldInclude =
          sourceMode === "deduped" || sourceMode === candidate.key;

        for (const entry of entries) {
          if (!entry.isFile() || !entry.name.endsWith(".db")) continue;
          dbCount += 1;
          if (!shouldInclude) continue;

          const sessionId = entry.name.slice(0, -3);
          const dbPath = path.join(dirPath, entry.name);
          try {
            const stat = fs.statSync(dbPath);
            collected.push({
              sessionId,
              sourceDir: candidate.key,
              dbPath,
              mtimeMs: stat.mtimeMs,
              fileSizeBytes: stat.size,
            });
          } catch {
            // Skip unreadable file metadata
          }
        }
      } catch {
        // Skip unreadable directory
      }
    }

    directories.push({
      sourceKey: candidate.key,
      dirPath,
      exists,
      dbCount,
    });
  }

  if (sourceMode !== "deduped") {
    return {
      directories,
      files: collected,
      dedupedDuplicatesCount: 0,
    };
  }

  const deduped = new Map<string, DiscoveredFile>();
  let duplicates = 0;

  for (const file of collected) {
    const existing = deduped.get(file.sessionId);
    if (!existing) {
      deduped.set(file.sessionId, file);
      continue;
    }
    duplicates += 1;
    // Prefer the newer modification timestamp, breaking ties by larger file size then antigravity main dir
    if (
      file.mtimeMs > existing.mtimeMs ||
      (file.mtimeMs === existing.mtimeMs &&
        file.fileSizeBytes > existing.fileSizeBytes)
    ) {
      deduped.set(file.sessionId, file);
    }
  }

  return {
    directories,
    files: [...deduped.values()],
    dedupedDuplicatesCount: duplicates,
  };
}

function getTimeRangeCutoffMs(timeRange: TimeRangeFilter): number | null {
  if (timeRange === "all") return null;
  if (timeRange === "today") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return startOfToday.getTime();
  }
  const days = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function toLocalDateKey(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalHourKey(isoString: string): string {
  const hour = String(new Date(isoString).getHours()).padStart(2, "0");
  return `${toLocalDateKey(isoString)} ${hour}:00`;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const ACTIVITY_DAY_COUNT = 365;

function fillTodayHourBuckets(
  bucketMap: Map<
    string,
    {
      turns: number;
      sessions: Set<string>;
      acc: MutableTokenAccumulator;
    }
  >,
): void {
  if (bucketMap.size === 0) return;

  const now = new Date();
  const dayKey = toLocalDateKey(now.toISOString());
  let endHour = now.getHours();

  for (const key of bucketMap.keys()) {
    const matched = /^(\d{4}-\d{2}-\d{2}) (\d{2}):00$/.exec(key);
    if (!matched || matched[1] !== dayKey) continue;
    endHour = Math.max(endHour, Number(matched[2]));
  }

  for (let hour = 0; hour <= endHour; hour += 1) {
    const key = `${dayKey} ${String(hour).padStart(2, "0")}:00`;
    if (bucketMap.has(key)) continue;
    bucketMap.set(key, {
      turns: 0,
      sessions: new Set<string>(),
      acc: createAccumulator(),
    });
  }
}

interface MutableModelGroupEntry {
  readonly groupName: string;
  readonly modelSlug: string;
  readonly variants: Set<string>;
  turns: number;
  readonly sessions: Set<string>;
  readonly acc: MutableTokenAccumulator;
}

function accumulateModelGroupTurn(
  modelMap: Map<string, MutableModelGroupEntry>,
  turn: TurnTokenDetail,
  sessionId: string,
): void {
  const group = resolveModelGroup(turn.modelName, turn.modelSlug);
  let entry = modelMap.get(group.groupId);
  if (!entry) {
    entry = {
      groupName: group.groupName,
      modelSlug: group.groupId,
      variants: new Set<string>(),
      turns: 0,
      sessions: new Set<string>(),
      acc: createAccumulator(),
    };
    modelMap.set(group.groupId, entry);
  }
  entry.turns += 1;
  entry.variants.add(turn.modelName);
  entry.sessions.add(sessionId);
  addToAccumulator(entry.acc, turn.usage, turn.cost);
}

function finalizeModelBreakdown(
  modelMap: Map<string, MutableModelGroupEntry>,
  totalTokensDenom: number,
  totalCostDenom: number,
): ModelUsageSummary[] {
  return [...modelMap.values()]
    .map((entry) => {
      const usage = finalizeBreakdown(entry.acc);
      const cost = finalizeCostBreakdown(entry.acc);
      return {
        modelName: entry.groupName,
        modelSlug: entry.modelSlug,
        variants: [...entry.variants].sort(),
        turns: entry.turns,
        sessionCount: entry.sessions.size,
        sharePct:
          totalTokensDenom > 0
            ? Math.round((usage.totalTokens / totalTokensDenom) * 1000) / 10
            : 0,
        costSharePct:
          totalCostDenom > 0
            ? Math.round((cost.totalCostUsd / totalCostDenom) * 1000) / 10
            : 0,
        cacheHitRate: computeCacheHitRate(
          usage.inputTokens,
          usage.cacheReadTokens,
        ),
        pricing: resolveModelPricing(entry.groupName, entry.modelSlug),
        usage,
        cost,
      };
    })
    .sort((a, b) => b.cost.totalCostUsd - a.cost.totalCostUsd);
}

export function getAntigravityUsageDashboard(
  sourceMode: DataSourceMode = "deduped",
  timeRange: TimeRangeFilter = "today",
): TokenUsageDashboardResponse {
  const startedAt = Date.now();
  const { directories, files, dedupedDuplicatesCount } =
    discoverConversationDbs(sourceMode);

  const cutoffMs = getTimeRangeCutoffMs(timeRange);
  const nowMs = Date.now();
  const calendarStart = new Date(nowMs);
  calendarStart.setHours(0, 0, 0, 0);
  calendarStart.setDate(calendarStart.getDate() - (ACTIVITY_DAY_COUNT - 1));
  const calendarStartMs = calendarStart.getTime();
  let skippedDbCount = 0;
  const activityMap = new Map<
    string,
    { turns: number; totalTokens: number; totalCostUsd: number }
  >();

  const grandAcc = createAccumulator();
  let totalTurnsCount = 0;

  const modelMap = new Map<string, MutableModelGroupEntry>();

  const workspaceMap = new Map<
    string,
    {
      workspaceName: string;
      workspacePath: string | null;
      repoName: string | null;
      sessionCount: number;
      turns: number;
      acc: MutableTokenAccumulator;
    }
  >();

  const dailyMap = new Map<
    string,
    {
      turns: number;
      sessions: Set<string>;
      acc: MutableTokenAccumulator;
    }
  >();

  const filteredSessions: SessionSummary[] = [];

  for (const file of files) {
    let parsed: ParsedSessionCache | null = null;
    try {
      parsed = parseSessionDatabase(
        file.sessionId,
        file.sourceDir,
        file.dbPath,
        file.mtimeMs,
        file.fileSizeBytes,
      );
    } catch {
      skippedDbCount += 1;
      continue;
    }

    if (!parsed) continue;

    const sessionFallbackIso = parsed.summary.updatedAt;
    const sessionAcc = createAccumulator();
    const sessionModelCounts = new Map<string, number>();
    let matchedTurns = 0;

    for (const turn of parsed.turns) {
      const effectiveIso = turn.timestamp ?? sessionFallbackIso;
      const effectiveMs = Date.parse(effectiveIso);
      if (Number.isNaN(effectiveMs)) continue;

      if (effectiveMs >= calendarStartMs) {
        const dayKey = toLocalDateKey(effectiveIso);
        let day = activityMap.get(dayKey);
        if (!day) {
          day = { turns: 0, totalTokens: 0, totalCostUsd: 0 };
          activityMap.set(dayKey, day);
        }
        day.turns += 1;
        day.totalTokens += turn.usage.totalTokens;
        day.totalCostUsd += turn.cost.totalCostUsd;
      }

      if (cutoffMs !== null && effectiveMs < cutoffMs) {
        continue;
      }

      matchedTurns += 1;
      totalTurnsCount += 1;
      addToAccumulator(grandAcc, turn.usage, turn.cost);
      addToAccumulator(sessionAcc, turn.usage, turn.cost);
      sessionModelCounts.set(
        turn.modelName,
        (sessionModelCounts.get(turn.modelName) ?? 0) + 1,
      );

      // Model aggregate (grouped by price tier & thinking-level family)
      accumulateModelGroupTurn(modelMap, turn, parsed.summary.sessionId);

      const dateKey =
        timeRange === "today"
          ? toLocalHourKey(effectiveIso)
          : toLocalDateKey(effectiveIso);
      let dailyEntry = dailyMap.get(dateKey);
      if (!dailyEntry) {
        dailyEntry = {
          turns: 0,
          sessions: new Set<string>(),
          acc: createAccumulator(),
        };
        dailyMap.set(dateKey, dailyEntry);
      }
      dailyEntry.turns += 1;
      dailyEntry.sessions.add(parsed.summary.sessionId);
      addToAccumulator(dailyEntry.acc, turn.usage, turn.cost);
    }

    if (matchedTurns === 0) continue;

    const sessionUsage = finalizeBreakdown(sessionAcc);
    const sessionCost = finalizeCostBreakdown(sessionAcc);
    const sortedSessionModels = [...sessionModelCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    );

    const sessionSummary: SessionSummary = {
      ...parsed.summary,
      turns: matchedTurns,
      primaryModel: sortedSessionModels[0]?.[0] ?? parsed.summary.primaryModel,
      models: sortedSessionModels.map(([m]) => m),
      cacheHitRate: computeCacheHitRate(
        sessionUsage.inputTokens,
        sessionUsage.cacheReadTokens,
      ),
      usage: sessionUsage,
      cost: sessionCost,
    };

    filteredSessions.push(sessionSummary);

    // Workspace aggregate
    const wsKey = workspaceSelectionKey(parsed.summary);
    const wsName =
      parsed.summary.workspaceName ??
      parsed.summary.repoName ??
      "未绑定工作区 / 独立对话";

    let wsEntry = workspaceMap.get(wsKey);
    if (!wsEntry) {
      wsEntry = {
        workspaceName: wsName,
        workspacePath: parsed.summary.workspacePath,
        repoName: parsed.summary.repoName,
        sessionCount: 0,
        turns: 0,
        acc: createAccumulator(),
      };
      workspaceMap.set(wsKey, wsEntry);
    }
    wsEntry.sessionCount += 1;
    wsEntry.turns += matchedTurns;
    addToAccumulator(wsEntry.acc, sessionUsage, sessionCost);
  }

  filteredSessions.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  const grandTotals = finalizeBreakdown(grandAcc);
  const grandCost = finalizeCostBreakdown(grandAcc);
  const grandTotalTokens = grandTotals.totalTokens;
  const grandTotalCostUsd = grandCost.totalCostUsd;

  const modelBreakdown = finalizeModelBreakdown(
    modelMap,
    grandTotalTokens,
    grandTotalCostUsd,
  );

  const workspaceBreakdown: WorkspaceUsageSummary[] = [...workspaceMap.values()]
    .map((entry) => {
      const usage = finalizeBreakdown(entry.acc);
      const cost = finalizeCostBreakdown(entry.acc);
      return {
        workspaceName: entry.workspaceName,
        workspacePath: entry.workspacePath,
        repoName: entry.repoName,
        sessionCount: entry.sessionCount,
        turns: entry.turns,
        sharePct:
          grandTotalTokens > 0
            ? Math.round((usage.totalTokens / grandTotalTokens) * 1000) / 10
            : 0,
        usage,
        cost,
      };
    })
    .sort((a, b) => b.cost.totalCostUsd - a.cost.totalCostUsd);

  if (timeRange === "today") {
    fillTodayHourBuckets(dailyMap);
  }

  const activityCalendar = Array.from({ length: ACTIVITY_DAY_COUNT }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    const key = formatLocalDate(date);
    const day = activityMap.get(key);
    return {
      date: key,
      turns: day?.turns ?? 0,
      totalTokens: day?.totalTokens ?? 0,
      totalCostUsd: day?.totalCostUsd ?? 0,
    };
  });

  const trendGranularity = timeRange === "today" ? "hour" : "day";
  const dailyTrend: DailyUsagePoint[] = [...dailyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, entry]) => ({
      date,
      turns: entry.turns,
      sessionCount: entry.sessions.size,
      usage: finalizeBreakdown(entry.acc),
      cost: finalizeCostBreakdown(entry.acc),
    }));

  return {
    generatedAt: new Date().toISOString(),
    scanDurationMs: Date.now() - startedAt,
    sourceMode,
    timeRange,
    directories,
    dedupedDuplicatesCount,
    skippedDbCount,
    pricingCatalog: MODEL_PRICING_CATALOG,
    totals: {
      ...grandTotals,
      sessions: filteredSessions.length,
      turns: totalTurnsCount,
      modelCount: modelBreakdown.length,
      workspaceCount: workspaceBreakdown.length,
      cacheHitRate: computeCacheHitRate(
        grandTotals.inputTokens,
        grandTotals.cacheReadTokens,
      ),
      cost: grandCost,
    },
    trendGranularity,
    dailyTrend,
    activityCalendar,
    modelBreakdown,
    workspaceBreakdown,
    sessions: filteredSessions,
  };
}

export function getAntigravitySessionDetail(
  sessionId: string,
  sourceMode: DataSourceMode = "deduped",
): SessionDetailResponse | null {
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    return null;
  }

  const { files } = discoverConversationDbs(sourceMode);
  const target = files.find((f) => f.sessionId === sessionId);
  if (!target) return null;

  const parsed = parseSessionDatabase(
    target.sessionId,
    target.sourceDir,
    target.dbPath,
    target.mtimeMs,
    target.fileSizeBytes,
  );
  if (!parsed) return null;

  const modelMap = new Map<string, MutableModelGroupEntry>();

  for (const turn of parsed.turns) {
    accumulateModelGroupTurn(modelMap, turn, parsed.summary.sessionId);
  }

  const sessionTotal = parsed.summary.usage.totalTokens;
  const sessionTotalCostUsd = parsed.summary.cost.totalCostUsd;
  const modelBreakdown = finalizeModelBreakdown(
    modelMap,
    sessionTotal,
    sessionTotalCostUsd,
  );

  return {
    session: parsed.summary,
    modelBreakdown,
    turns: parsed.turns,
  };
}
