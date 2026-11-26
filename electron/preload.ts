import { contextBridge, ipcRenderer } from "electron";
import type {
  DataSourceMode,
  SessionDetailResponse,
  TimeRangeFilter,
  TokenUsageDashboardResponse,
} from "@/types/token-usage";

export interface DesktopRuntimeInfo {
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly appVersion: string;
  readonly electronVersion: string;
  readonly nodeVersion: string;
}

export interface AntigravityDesktopBridge {
  readonly platform: NodeJS.Platform;
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

const desktopBridge: AntigravityDesktopBridge = {
  platform: process.platform,
  getDashboard: (sourceMode, timeRange) =>
    ipcRenderer.invoke("antigravity:get-dashboard", sourceMode, timeRange),
  getSessionDetail: (sessionId, sourceMode) =>
    ipcRenderer.invoke("antigravity:get-session-detail", sessionId, sourceMode),
  revealDirectory: (dirPath) =>
    ipcRenderer.invoke("antigravity:reveal-dir", dirPath),
  getRuntimeInfo: () => ipcRenderer.invoke("antigravity:get-runtime-info"),
};

contextBridge.exposeInMainWorld("antigravityDesktop", desktopBridge);
