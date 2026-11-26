# Antigravity Token Monitor

> 本地离线 **Antigravity IDE Token 与费用遥测桌面应用** —— 只读解析本机会话 SQLite 数据库与 Protobuf 轨迹，提供多维度用量总览、趋势分析、模型排行、近一年热力图、项目分布及逐轮次 Token 明细。

## 核心特性

- **12 列 Bento 仪表盘总览**
  - **4 列核心 KPI**：参考费用（含净消耗与成本构成条）、Token 总量（`Input / Cache / Thinking / Response` 四色构成条）、Prompt 缓存命中率与节省金额、活跃会话与轮次统计。
  - **交互式消耗趋势图**：支持「今日分时 / 近 7 天 / 近 14 天 / 近 30 天 / 全部」及「费用 / 全量 Token / 净消耗」口径切换，支持悬停与点击钉选查看单点 4 项拆解。
  - **模型排行 & 项目分布**：双口径排序（Token / 费用），支持点击联动交叉筛选下方会话明细。
  - **近一年活跃热力图**：支持出勤率、连续活跃天数、单日峰值统计及点击查看当日明细。
  - **逐轮次明细下钻**：点击任意会话即可在原生 `<dialog>` 弹窗中查看每一轮次的模型、`Input`、`Cache Read`、`Thinking`、`Response` 与估算费用。
- **多数据源管理**：自动发现本机 `~/.gemini/antigravity`、`~/.gemini/antigravity-ide`、`~/.gemini/antigravity-cli` 会话目录，支持跨目录按会话 ID 自动合并去重。
- **原生桌面体验**：支持 macOS (`arm64`) 与 Windows (`x64`) 独立安装包，遵循系统明暗色主题（支持明亮 / 暗黑 / 跟随系统切换）。

---

## 隐私与安全设计

- **100% 本地离线运行**：所有 UI 资源与字体（`Inter`、`Noto Sans SC`、`JetBrains Mono`）均打包在应用内部，**不发起任何外网请求，不上传任何会话数据**。
- **零开放端口**：Electron 主进程通过自定义 `app://` 协议与安全 IPC（`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`）直接通信，不监听任何本地端口。
- **严格只读访问**：SQLite 会话库全程以 `{ readOnly: true }` 只读模式打开，不会修改或写入任何 Antigravity 数据文件。
- **最终用户零依赖**：打包后的 macOS `.dmg` 与 Windows `.exe` 已内置完整 Chromium 与 Node.js（含原生 `node:sqlite`），**安装和使用软件无需提前安装 Node.js**。

---

## 本机数据读取路径

程序自动通过当前系统用户主目录（`os.homedir()`）只读扫描以下目录中的 `.db` 会话文件（与软件自身安装路径无关）：

| 平台 | 默认扫描目录 |
| :--- | :--- |
| **macOS** | `~/.gemini/antigravity/conversations/*.db`<br>`~/.gemini/antigravity-ide/conversations/*.db`<br>`~/.gemini/antigravity-cli/conversations/*.db` |
| **Windows** | `C:\Users\<用户名>\.gemini\antigravity\conversations\*.db`<br>`C:\Users\<用户名>\.gemini\antigravity-ide\conversations\*.db`<br>`C:\Users\<用户名>\.gemini\antigravity-cli\conversations\*.db` |

> **计费说明**：页面中显示的费用基于公开 API 单价折算（可在首页底部展开「公开 API 参考单价表」查看），仅作本机额度消耗参考。

---

## 技术栈

- **前端框架**：Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS + Framer Motion + Lucide Icons
- **数据状态**：TanStack Query v5（自动适配桌面端 Electron IPC 与浏览器开发模式 `/api/*` 双轨请求）
- **桌面外壳**：Electron 45（内置 Node 24 与原生 `node:sqlite`）+ esbuild + electron-builder 26

---

## 目录结构

```text
├── electron/
│   ├── main.ts                  # Electron 主进程（app:// 协议、IPC、窗口与菜单管理）
│   └── preload.ts               # 安全 Preload 桥接（暴露 window.antigravityDesktop）
├── scripts/
│   ├── build-desktop.mjs        # Next.js 静态导出 + esbuild 打包主进程/Preload
│   └── generate-icons.mjs       # 生成多分辨率应用图标（PNG / ICO / ICNS）
├── build/                       # 应用图标资源（icon.png / icon.ico / icon.icns）
├── src/
│   ├── app/                     # Next.js 路由、全局样式与开发模式 API Route
│   ├── components/token-usage/  # 首页 Bento 仪表盘与各可视化面板组件
│   ├── hooks/                   # TanStack Query 双轨数据 Hook 与主题管理
│   ├── lib/server/              # SQLite 只读扫描与 Protobuf 轨迹解码核心引擎
│   └── types/                   # TypeScript 类型定义与桌面端 IPC 桥接声明
├── electron-builder.yml         # macOS / Windows 跨平台打包配置
└── package.json
```

---

## 本地开发

### 环境要求（仅开发 / 打包构建需要）
- Node.js **>= 22.5**（需支持内置 `node:sqlite`）
- `pnpm`

### 安装依赖

```bash
pnpm install
```

### 启动开发模式

```bash
# 方式 1：浏览器开发模式（热更新，走本地 Next.js API）
pnpm dev

# 方式 2：编译并启动 Electron 桌面窗口预览
pnpm desktop:start
```

---

## 打包桌面安装包

打包产物会输出至 `release/` 目录（已在 `.gitignore` 中排除）。

```bash
# 打包 macOS 安装镜像 (.dmg) 与压缩包 (.zip)
pnpm dist:mac

# 打包 Windows 安装程序 (Setup.exe) 与单文件绿色便携版 (Portable.exe)
pnpm dist:win

# 仅执行类型检查
pnpm typecheck

# 重新生成应用图标（PNG / ICO / ICNS）
pnpm icons:generate
```

> **国内网络镜像加速（可选）**：如拉取 Electron 二进制较慢，可在打包命令前加上环境变量：
> ```bash
> ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" \
> ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/" \
> pnpm dist:mac
> ```

### 未签名安装包首次运行提示
- **macOS**：如提示“无法验证开发者”，右键应用图标选择「打开」，或执行：
  ```bash
  xattr -cr "/Applications/Antigravity Token.app"
  ```
- **Windows**：如 Windows Defender SmartScreen 弹出提示，点击「更多信息 → 仍要运行」即可。
