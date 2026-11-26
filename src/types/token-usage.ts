export type DataSourceMode =
  | "deduped"
  | "antigravity"
  | "antigravity-ide"
  | "antigravity-cli";

export type TimeRangeFilter = "today" | "7d" | "14d" | "30d" | "all";

export type TrendGranularity = "hour" | "day";

export type LocalSourceKey =
  | "antigravity"
  | "antigravity-ide"
  | "antigravity-cli";

export interface ModelPricingRate {
  readonly id: string;
  readonly label: string;
  readonly inputPer1M: number;
  readonly cacheReadPer1M: number;
  readonly cacheWritePer1M: number;
  readonly outputPer1M: number;
  readonly note: string;
}

export interface CostBreakdown {
  readonly inputCostUsd: number;
  readonly cacheReadCostUsd: number;
  readonly cacheWriteCostUsd: number;
  /** Total output cost (thinkingCostUsd + responseCostUsd). */
  readonly outputCostUsd: number;
  readonly thinkingCostUsd: number;
  readonly responseCostUsd: number;
  /** inputCostUsd + cacheReadCostUsd + cacheWriteCostUsd + outputCostUsd */
  readonly totalCostUsd: number;
  /** inputCostUsd + outputCostUsd */
  readonly uncachedCostUsd: number;
  /** Estimated USD saved by cache hits compared to paying full inputPer1M for cacheReadTokens. */
  readonly cacheSavingsUsd: number;
}

export interface TokenBreakdown {
  readonly inputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  /** Total output tokens (thinkingTokens + responseTokens). */
  readonly outputTokens: number;
  readonly thinkingTokens: number;
  readonly responseTokens: number;
  /** inputTokens + cacheReadTokens + cacheWriteTokens + outputTokens (without double-counting thinking). */
  readonly totalTokens: number;
  /** inputTokens + outputTokens (excluding cache read/write). */
  readonly uncachedTotalTokens: number;
}

export interface TurnTokenDetail {
  readonly turnIndex: number;
  readonly stepIndex: number | null;
  readonly timestamp: string | null;
  readonly modelName: string;
  readonly modelSlug: string;
  readonly requestId: string | null;
  readonly usage: TokenBreakdown;
  readonly cost: CostBreakdown;
}

export interface SessionSummary {
  readonly sessionId: string;
  readonly sourceDir: LocalSourceKey;
  readonly dbPath: string;
  readonly fileSizeBytes: number;
  readonly workspacePath: string | null;
  readonly workspaceName: string | null;
  readonly repoName: string | null;
  readonly gitBranch: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly turns: number;
  readonly primaryModel: string;
  readonly models: readonly string[];
  readonly cacheHitRate: number;
  readonly usage: TokenBreakdown;
  readonly cost: CostBreakdown;
}

export interface ModelUsageSummary {
  readonly modelName: string;
  readonly modelSlug: string;
  readonly variants?: readonly string[];
  readonly turns: number;
  readonly sessionCount: number;
  readonly sharePct: number;
  readonly costSharePct: number;
  readonly cacheHitRate: number;
  readonly pricing: ModelPricingRate;
  readonly usage: TokenBreakdown;
  readonly cost: CostBreakdown;
}

export interface WorkspaceUsageSummary {
  readonly workspaceName: string;
  readonly workspacePath: string | null;
  readonly repoName: string | null;
  readonly sessionCount: number;
  readonly turns: number;
  readonly sharePct: number;
  readonly usage: TokenBreakdown;
  readonly cost: CostBreakdown;
}

export interface DailyUsagePoint {
  readonly date: string;
  readonly turns: number;
  readonly sessionCount: number;
  readonly usage: TokenBreakdown;
  readonly cost: CostBreakdown;
}

export interface ActivityDay {
  readonly date: string;
  readonly turns: number;
  readonly totalTokens: number;
  readonly totalCostUsd: number;
}

export interface DirectoryScanStatus {
  readonly sourceKey: LocalSourceKey;
  readonly dirPath: string;
  readonly exists: boolean;
  readonly dbCount: number;
}

export interface TokenUsageTotals extends TokenBreakdown {
  readonly sessions: number;
  readonly turns: number;
  readonly modelCount: number;
  readonly workspaceCount: number;
  readonly cacheHitRate: number;
  readonly cost: CostBreakdown;
}

export interface TokenUsageDashboardResponse {
  readonly generatedAt: string;
  readonly scanDurationMs: number;
  readonly sourceMode: DataSourceMode;
  readonly timeRange: TimeRangeFilter;
  readonly directories: readonly DirectoryScanStatus[];
  readonly dedupedDuplicatesCount: number;
  readonly skippedDbCount: number;
  readonly pricingCatalog: readonly ModelPricingRate[];
  readonly totals: TokenUsageTotals;
  readonly trendGranularity: TrendGranularity;
  readonly dailyTrend: readonly DailyUsagePoint[];
  readonly activityCalendar: readonly ActivityDay[];
  readonly modelBreakdown: readonly ModelUsageSummary[];
  readonly workspaceBreakdown: readonly WorkspaceUsageSummary[];
  readonly sessions: readonly SessionSummary[];
}

export interface SessionDetailResponse {
  readonly session: SessionSummary;
  readonly modelBreakdown: readonly ModelUsageSummary[];
  readonly turns: readonly TurnTokenDetail[];
}
