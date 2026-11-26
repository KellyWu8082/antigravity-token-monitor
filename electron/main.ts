import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeTheme,
  net,
  protocol,
  shell,
  type MenuItemConstructorOptions,
} from "electron";
import {
  getAntigravitySessionDetail,
  getAntigravityUsageDashboard,
} from "@/lib/server/antigravity-usage";
import type { DataSourceMode, TimeRangeFilter } from "@/types/token-usage";

const APP_PROTOCOL = "app";
const APP_ORIGIN = `${APP_PROTOCOL}://-`;

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

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;

function sanitizeSourceMode(raw: unknown): DataSourceMode {
  if (typeof raw === "string" && VALID_SOURCES.has(raw as DataSourceMode)) {
    return raw as DataSourceMode;
  }
  return "deduped";
}

function sanitizeTimeRange(raw: unknown): TimeRangeFilter {
  if (typeof raw === "string" && VALID_RANGES.has(raw as TimeRangeFilter)) {
    return raw as TimeRangeFilter;
  }
  return "today";
}

function getExportRootDir(): string {
  return path.resolve(app.getAppPath(), "out");
}

function resolveStaticFile(requestUrl: string): string | null {
  const outRoot = getExportRootDir();
  let pathname = "/";
  try {
    const parsed = new URL(requestUrl);
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }

  const normalizedRel = pathname.replace(/^\/+/, "");
  const candidate = path.resolve(outRoot, normalizedRel || "index.html");

  // Prevent directory traversal outside out/
  const isInsideOut =
    candidate === outRoot || candidate.startsWith(`${outRoot}${path.sep}`);
  if (!isInsideOut) {
    return null;
  }

  if (fs.existsSync(candidate)) {
    const stat = fs.statSync(candidate);
    if (stat.isFile()) return candidate;
    if (stat.isDirectory()) {
      const nestedIndex = path.join(candidate, "index.html");
      if (fs.existsSync(nestedIndex)) return nestedIndex;
    }
  }

  if (!path.extname(candidate)) {
    const htmlCandidate = `${candidate}.html`;
    if (fs.existsSync(htmlCandidate)) return htmlCandidate;
    const rootIndex = path.join(outRoot, "index.html");
    if (fs.existsSync(rootIndex)) return rootIndex;
  }

  return null;
}

function registerAppProtocol(): void {
  protocol.handle(APP_PROTOCOL, (request) => {
    const filePath = resolveStaticFile(request.url);
    if (!filePath) {
      return new Response("Not Found", { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function isAllowedGeminiPath(targetPath: string): boolean {
  const geminiRoot = path.resolve(os.homedir(), ".gemini");
  const resolved = path.resolve(targetPath);
  return (
    resolved === geminiRoot || resolved.startsWith(`${geminiRoot}${path.sep}`)
  );
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    "antigravity:get-dashboard",
    (_event, rawSource: unknown, rawRange: unknown) => {
      const sourceMode = sanitizeSourceMode(rawSource);
      const timeRange = sanitizeTimeRange(rawRange);
      return getAntigravityUsageDashboard(sourceMode, timeRange);
    },
  );

  ipcMain.handle(
    "antigravity:get-session-detail",
    (_event, rawSessionId: unknown, rawSource: unknown) => {
      if (typeof rawSessionId !== "string" || rawSessionId.trim().length === 0) {
        throw new Error("缺少有效的 sessionId");
      }
      const sourceMode = sanitizeSourceMode(rawSource);
      const detail = getAntigravitySessionDetail(
        rawSessionId.trim(),
        sourceMode,
      );
      if (!detail) {
        throw new Error(`未找到会话 ${rawSessionId} 的 Token 明细`);
      }
      return detail;
    },
  );

  ipcMain.handle("antigravity:reveal-dir", async (_event, rawPath: unknown) => {
    if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
      return { ok: false, error: "无效目录路径" };
    }
    if (!isAllowedGeminiPath(rawPath)) {
      return { ok: false, error: "仅允许打开本机 ~/.gemini 下的目录" };
    }
    const resolved = path.resolve(rawPath);
    if (!fs.existsSync(resolved)) {
      return { ok: false, error: "目录不存在" };
    }
    const err = await shell.openPath(resolved);
    return err ? { ok: false, error: err } : { ok: true };
  });

  ipcMain.handle("antigravity:get-runtime-info", () => ({
    platform: process.platform,
    arch: process.arch,
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
  }));
}

function setupApplicationMenu(): void {
  const isMac = process.platform === "darwin";
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const, label: "关于 Antigravity Token" },
              { type: "separator" as const },
              { role: "hide" as const, label: "隐藏" },
              { role: "hideOthers" as const, label: "隐藏其他" },
              { role: "unhide" as const, label: "全部显示" },
              { type: "separator" as const },
              { role: "quit" as const, label: "退出 Antigravity Token" },
            ],
          },
        ]
      : []),
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "拷贝" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "forceReload", label: "强制重新加载" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "切换全屏" },
        ...(!app.isPackaged
          ? [{ role: "toggleDevTools" as const, label: "开发者工具" }]
          : []),
      ],
    },
    {
      label: "窗口",
      submenu: [
        { role: "minimize", label: "最小化" },
        { role: "close", label: "关闭窗口" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow(): BrowserWindow {
  const isMac = process.platform === "darwin";
  const win = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "Antigravity Token Telemetry",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#070b14" : "#fafafa",
    ...(isMac
      ? {
          titleBarStyle: "hiddenInset" as const,
          trafficLightPosition: { x: 16, y: 15 },
        }
      : {
          autoHideMenuBar: true,
        }),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  const devServerUrl = process.env.ELECTRON_DEV_URL;
  if (devServerUrl) {
    void win.loadURL(devServerUrl);
  } else {
    void win.loadURL(`${APP_ORIGIN}/`);
  }

  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  return win;
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    setupApplicationMenu();
    registerIpcHandlers();
    if (!process.env.ELECTRON_DEV_URL) {
      registerAppProtocol();
    }
    mainWindow = createMainWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
