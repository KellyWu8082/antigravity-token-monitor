import type {
  CostBreakdown,
  ModelPricingRate,
  TokenBreakdown,
} from "@/types/token-usage";

const ONE_MILLION = 1_000_000;

/**
 * Reference public API pricing rates in USD per 1M tokens.
 * Output rate applies to combined response + thinking/reasoning tokens.
 */
export const MODEL_PRICING_CATALOG: readonly ModelPricingRate[] = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 / 3.7 / 3.6 Flash",
    inputPer1M: 0.75,
    cacheReadPer1M: 0.075,
    cacheWritePer1M: 0.75,
    outputPer1M: 3.75,
    note: "Gemini Flash 2026 标准费率 (缓存读取 0.1x，含 Thinking)",
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    inputPer1M: 1.5,
    cacheReadPer1M: 0.15,
    cacheWritePer1M: 1.5,
    outputPer1M: 9.0,
    note: "Gemini 3.5 Flash 费率 (缓存读取 0.1x，含 Thinking)",
  },
  {
    id: "gemini-3-flash",
    label: "Gemini 3 Flash (Base)",
    inputPer1M: 0.5,
    cacheReadPer1M: 0.05,
    cacheWritePer1M: 0.5,
    outputPer1M: 3.0,
    note: "Gemini 3 Flash 基础档 (缓存读取 0.1x)",
  },
  {
    id: "gemini-4-hydrogen",
    label: "Gemini 4 Hydrogen",
    inputPer1M: 1.5,
    cacheReadPer1M: 0.075,
    cacheWritePer1M: 1.5,
    outputPer1M: 7.5,
    note: "Gemini 4 Hydrogen 标准费率 (缓存读取 0.05x，含 Thinking)",
  },
  {
    id: "gemini-4-neon",
    label: "Gemini 4 Neon",
    inputPer1M: 3.0,
    cacheReadPer1M: 0.15,
    cacheWritePer1M: 3.0,
    outputPer1M: 15.0,
    note: "Gemini 4 Neon 标准费率 (缓存读取 0.05x，含 Thinking)",
  },
  {
    id: "gemini-4-carbon",
    label: "Gemini 4 Carbon",
    inputPer1M: 4.0,
    cacheReadPer1M: 0.2,
    cacheWritePer1M: 4.0,
    outputPer1M: 20.0,
    note: "Gemini 4 Carbon 标准费率 (2026-11-30 UTC 前轮次按 5 折活动价自动折算，缓存读取 0.05x，含 Thinking)",
  },
  {
    id: "gemini-4-argon",
    label: "Gemini 4 Argon",
    inputPer1M: 4.0,
    cacheReadPer1M: 0.2,
    cacheWritePer1M: 4.0,
    outputPer1M: 20.0,
    note: "Gemini 4 Argon 标准费率 (2026-11-30 UTC 前轮次按 5 折活动价自动折算，缓存读取 0.05x，含 Thinking)",
  },
  {
    id: "gemini-pro",
    label: "Gemini Pro (<=200K)",
    inputPer1M: 2.0,
    cacheReadPer1M: 0.2,
    cacheWritePer1M: 2.0,
    outputPer1M: 12.0,
    note: "Gemini Pro 标准上下文档 (含 Thinking)",
  },
  {
    id: "claude-opus-5.5",
    label: "Claude Opus 5.5",
    inputPer1M: 4.0,
    cacheReadPer1M: 0.2,
    cacheWritePer1M: 5.0,
    outputPer1M: 20.0,
    note: "Anthropic Opus 5.5 (缓存读取 0.05x / 写入 1.25x)",
  },
  {
    id: "claude-opus-4.6",
    label: "Claude Opus 4.6",
    inputPer1M: 5.0,
    cacheReadPer1M: 0.5,
    cacheWritePer1M: 6.25,
    outputPer1M: 25.0,
    note: "Anthropic Opus 4.6 (缓存读取 0.1x / 写入 1.25x)",
  },
  {
    id: "claude-sonnet",
    label: "Claude Sonnet (Fallback)",
    inputPer1M: 3.0,
    cacheReadPer1M: 0.3,
    cacheWritePer1M: 3.75,
    outputPer1M: 15.0,
    note: "Anthropic Sonnet 参考费率",
  },
] as const;

const RATE_BY_ID = new Map<string, ModelPricingRate>(
  MODEL_PRICING_CATALOG.map((item) => [item.id, item])
);

function getRate(id: string): ModelPricingRate {
  const found = RATE_BY_ID.get(id);
  if (found) return found;
  return MODEL_PRICING_CATALOG[0]!;
}

export interface ModelGroupIdentity {
  readonly groupId: string;
  readonly groupName: string;
}

/**
 * Normalizes model names/slugs into unified billing/display groups:
 * - Merges 3.8 / 3.7 / 3.6 Flash (identical pricing tier).
 * - Merges different thinking/reasoning levels (High, XHigh, Medium, Low, Thinking, etc.) of the same model.
 */
export function resolveModelGroup(
  modelName: string,
  modelSlug = ""
): ModelGroupIdentity {
  const combined = `${modelName} ${modelSlug}`.toLowerCase();

  if (
    (combined.includes("3.8") ||
      combined.includes("3.7") ||
      combined.includes("3.6")) &&
    combined.includes("flash")
  ) {
    return {
      groupId: "gemini-3.8-3.7-3.6-flash",
      groupName: "Gemini 3.8 / 3.7 / 3.6 Flash",
    };
  }
  if (combined.includes("hydrogen")) {
    return {
      groupId: "gemini-4-hydrogen",
      groupName: "Gemini 4 Hydrogen",
    };
  }
  if (combined.includes("neon")) {
    return {
      groupId: "gemini-4-neon",
      groupName: "Gemini 4 Neon",
    };
  }
  if (combined.includes("carbon")) {
    return {
      groupId: "gemini-4-carbon",
      groupName: "Gemini 4 Carbon",
    };
  }
  if (combined.includes("argon")) {
    return {
      groupId: "gemini-4-argon",
      groupName: "Gemini 4 Argon",
    };
  }
  if (
    combined.includes("3.5") &&
    combined.includes("flash")
  ) {
    return {
      groupId: "gemini-3.5-flash",
      groupName: "Gemini 3.5 Flash",
    };
  }
  if (combined.includes("gemini-3-flash-c")) {
    return {
      groupId: "gemini-3.5-flash",
      groupName: "Gemini 3.5 Flash",
    };
  }
  if (combined.includes("gemini-3-flash") || combined.includes("gemini 3 flash")) {
    return {
      groupId: "gemini-3-flash",
      groupName: "Gemini 3 Flash",
    };
  }
  if (combined.includes("opus") && (combined.includes("5.5") || combined.includes("5-5"))) {
    return {
      groupId: "claude-opus-5.5",
      groupName: "Claude Opus 5.5",
    };
  }
  if (combined.includes("opus") && (combined.includes("4.6") || combined.includes("4-6"))) {
    return {
      groupId: "claude-opus-4.6",
      groupName: "Claude Opus 4.6",
    };
  }
  if (combined.includes("gemini-pro") || combined.includes("gemini pro")) {
    return {
      groupId: "gemini-pro",
      groupName: "Gemini Pro",
    };
  }

  const stripped = (modelName || modelSlug || "Unknown Model")
    .replace(/\s*\((low|medium|high|xhigh|minimal|thinking|default)\)\s*$/i, "")
    .replace(/-(low|medium|high|xhigh|minimal|thinking|default)$/i, "")
    .trim();

  return {
    groupId: stripped.toLowerCase().replace(/\s+/g, "-"),
    groupName: stripped || "Unknown Model",
  };
}

interface PromotionalPricingWindow {
  readonly rateIds: ReadonlySet<string>;
  /** Exclusive upper bound in UTC ms (active while timestamp < endsBeforeMs). */
  readonly endsBeforeMs: number;
  readonly multiplier: number;
  readonly noteSuffix: string;
}

const PROMO_PRICING_WINDOWS: readonly PromotionalPricingWindow[] = [
  {
    rateIds: new Set(["gemini-4-carbon", "gemini-4-argon"]),
    endsBeforeMs: Date.parse("2026-12-01T00:00:00Z"),
    multiplier: 0.5,
    noteSuffix: " [尝鲜期 5 折生效]",
  },
];

function parseTimestampMs(
  atTimestamp?: string | number | Date | null
): number | null {
  if (atTimestamp === undefined || atTimestamp === null) return null;
  if (typeof atTimestamp === "number") {
    return Number.isFinite(atTimestamp) ? atTimestamp : null;
  }
  if (atTimestamp instanceof Date) {
    const ms = atTimestamp.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = Date.parse(atTimestamp);
  return Number.isFinite(ms) ? ms : null;
}

function roundRate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function applyPromotionalPricing(
  rate: ModelPricingRate,
  atTimestamp?: string | number | Date | null
): ModelPricingRate {
  const ms = parseTimestampMs(atTimestamp);
  if (ms === null) return rate;

  for (const promo of PROMO_PRICING_WINDOWS) {
    if (promo.rateIds.has(rate.id) && ms < promo.endsBeforeMs) {
      return {
        ...rate,
        inputPer1M: roundRate(rate.inputPer1M * promo.multiplier),
        cacheReadPer1M: roundRate(rate.cacheReadPer1M * promo.multiplier),
        cacheWritePer1M: roundRate(rate.cacheWritePer1M * promo.multiplier),
        outputPer1M: roundRate(rate.outputPer1M * promo.multiplier),
        note: `${rate.note}${promo.noteSuffix}`,
      };
    }
  }
  return rate;
}

export function resolveModelPricing(
  modelName: string,
  modelSlug: string,
  atTimestamp?: string | number | Date | null
): ModelPricingRate {
  const key = `${modelName} ${modelSlug}`.toLowerCase();

  let baseRate: ModelPricingRate;
  if (key.includes("opus") && (key.includes("5.5") || key.includes("5-5"))) {
    baseRate = getRate("claude-opus-5.5");
  } else if (
    key.includes("opus") &&
    (key.includes("4.6") || key.includes("4-6"))
  ) {
    baseRate = getRate("claude-opus-4.6");
  } else if (key.includes("opus")) {
    baseRate = getRate("claude-opus-4.6");
  } else if (key.includes("sonnet")) {
    baseRate = getRate("claude-sonnet");
  } else if (key.includes("hydrogen")) {
    baseRate = getRate("gemini-4-hydrogen");
  } else if (key.includes("neon")) {
    baseRate = getRate("gemini-4-neon");
  } else if (key.includes("carbon")) {
    baseRate = getRate("gemini-4-carbon");
  } else if (key.includes("argon")) {
    baseRate = getRate("gemini-4-argon");
  } else if (key.includes("3.5") && key.includes("flash")) {
    baseRate = getRate("gemini-3.5-flash");
  } else if (
    (key.includes("3.8") || key.includes("3.7") || key.includes("3.6")) &&
    key.includes("flash")
  ) {
    baseRate = getRate("gemini-3.8-flash");
  } else if (key.includes("flash")) {
    baseRate = getRate("gemini-3-flash");
  } else if (key.includes("pro")) {
    baseRate = getRate("gemini-pro");
  } else {
    baseRate = getRate("gemini-pro");
  }

  return applyPromotionalPricing(baseRate, atTimestamp);
}

export function calculateTokenCost(
  modelName: string,
  modelSlug: string,
  usage: TokenBreakdown,
  atTimestamp?: string | number | Date | null
): CostBreakdown {
  const rate = resolveModelPricing(modelName, modelSlug, atTimestamp);

  const inputCostUsd = (usage.inputTokens / ONE_MILLION) * rate.inputPer1M;
  const cacheReadCostUsd =
    (usage.cacheReadTokens / ONE_MILLION) * rate.cacheReadPer1M;
  const cacheWriteCostUsd =
    (usage.cacheWriteTokens / ONE_MILLION) * rate.cacheWritePer1M;
  const thinkingCostUsd =
    (usage.thinkingTokens / ONE_MILLION) * rate.outputPer1M;
  const responseCostUsd =
    (usage.responseTokens / ONE_MILLION) * rate.outputPer1M;
  const outputCostUsd = (usage.outputTokens / ONE_MILLION) * rate.outputPer1M;

  const totalCostUsd =
    inputCostUsd + cacheReadCostUsd + cacheWriteCostUsd + outputCostUsd;
  const uncachedCostUsd = inputCostUsd + outputCostUsd;
  const cacheSavingsUsd = Math.max(
    0,
    (usage.cacheReadTokens / ONE_MILLION) *
      (rate.inputPer1M - rate.cacheReadPer1M)
  );

  return {
    inputCostUsd,
    cacheReadCostUsd,
    cacheWriteCostUsd,
    outputCostUsd,
    thinkingCostUsd,
    responseCostUsd,
    totalCostUsd,
    uncachedCostUsd,
    cacheSavingsUsd,
  };
}
