import type {
  DataSourceMode,
  SessionDetailResponse,
  TimeRangeFilter,
  TokenUsageDashboardResponse,
} from "@/types/token-usage";

export interface DesktopRuntimeInfo {
  readonly platform: string;
  readonly arch: string;
  readonly appVersion: string;
  readonly electronVersion: string;
  readonly nodeVersion: string;
}

export interface AntigravityDesktopBridge {
  readonly platform: string;
  readonly getDashboard: (
    sourceMode: DataSourceMode,
    timeRange: TimeRangeFilter,
  ) => Promise<TokenUsageDashboardResponse>;
  readonly getSessionDetail: (
    sessionId: string,
    sourceMode: DataSourceMode,
  ) => Promise<SessionDetailResponse>;
  readonly revealDirectory: (
    dirPath: string,
  ) => Promise<{ readonly ok: boolean; readonly error?: string }>;
  readonly getRuntimeInfo: () => Promise<DesktopRuntimeInfo>;
}

declare global {
  interface Window {
    readonly antigravityDesktop?: AntigravityDesktopBridge;
  }
}
