const INTEGER_FMT = new Intl.NumberFormat("en-US");
const COMPACT_FMT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});
const DATETIME_FMT = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const SHORT_DATETIME_FMT = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function formatTokenCount(value: number): string {
  return INTEGER_FMT.format(Math.round(value));
}

export function formatCompactTokens(value: number): string {
  if (value < 1000) return String(Math.round(value));
  return COMPACT_FMT.format(value);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  return DATETIME_FMT.format(new Date(ms));
}

export function formatShortDateTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  return SHORT_DATETIME_FMT.format(new Date(ms));
}

export function formatRelativeTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return "刚刚";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小时前`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} 天前`;
  return formatDateTime(iso);
}

const USD_STANDARD_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const USD_PRECISE_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const USD_RATE_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export function formatUsd(amount: number, precise = false): string {
  if (!Number.isFinite(amount) || amount <= 0) return "$0.00";
  if (precise && amount < 1) {
    return USD_PRECISE_FMT.format(amount);
  }
  if (amount > 0 && amount < 0.01) {
    return USD_PRECISE_FMT.format(amount);
  }
  return USD_STANDARD_FMT.format(amount);
}

export function formatRatePer1M(amount: number): string {
  return USD_RATE_FMT.format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

