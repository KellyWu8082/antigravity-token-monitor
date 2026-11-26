import { STATUS_LABELS } from "@/lib/utils";
import type {
  NexusTask,
  ParsedAiIntent,
  TaskPriority,
  TaskStatus,
} from "@/types/nexus";

interface StatusPattern {
  readonly status: TaskStatus;
  readonly keywords: readonly string[];
}

const STATUS_PATTERNS: readonly StatusPattern[] = [
  {
    status: "in_review",
    keywords: ["审查", "已审核", "审核", "review", "in review", "pr"],
  },
  {
    status: "in_progress",
    keywords: ["进行中", "开发中", "处理中", "progress", "wip", "doing"],
  },
  {
    status: "done",
    keywords: ["已完成", "完成", "归档", "关闭", "done", "complete", "completed"],
  },
  {
    status: "todo",
    keywords: ["待处理", "待办", "backlog", "todo", "to do"],
  },
];

const PRIORITY_PATTERNS: readonly {
  readonly priority: TaskPriority;
  readonly label: string;
  readonly keywords: readonly string[];
}[] = [
  { priority: "urgent", label: "紧急", keywords: ["紧急", "urgent", "p0", "critical"] },
  { priority: "high", label: "高优先级", keywords: ["高优先级", "高", "high", "p1"] },
  { priority: "medium", label: "中优先级", keywords: ["中优先级", "中等", "medium", "p2"] },
  { priority: "low", label: "低优先级", keywords: ["低优先级", "低", "low", "p3"] },
];

function detectStatusInSegment(segment: string): TaskStatus | null {
  const lower = segment.toLowerCase();
  for (const pattern of STATUS_PATTERNS) {
    if (pattern.keywords.some((kw) => lower.includes(kw))) {
      return pattern.status;
    }
  }
  return null;
}

function detectPriorityInText(text: string): {
  priority: TaskPriority;
  label: string;
} | null {
  const lower = text.toLowerCase();
  for (const pattern of PRIORITY_PATTERNS) {
    if (pattern.keywords.some((kw) => lower.includes(kw))) {
      return { priority: pattern.priority, label: pattern.label };
    }
  }
  return null;
}

/**
 * Parses natural-language commands (Chinese & English) into executable workspace intents
 * plus fuzzy task lookups so Cmd+K responds cleanly to both conversational AI commands
 * and classic command-palette queries.
 */
export function parseAiCommandQuery(
  rawQuery: string,
  tasks: readonly NexusTask[]
): readonly ParsedAiIntent[] {
  const query = rawQuery.trim();
  const intents: ParsedAiIntent[] = [];

  if (!query) {
    const reviewTasks = tasks.filter((t) => t.status === "in_review");
    if (reviewTasks.length > 0) {
      intents.push({
        kind: "batch_move",
        id: "preset-move-review-done",
        title: `AI 建议：将 ${reviewTasks.length} 项「已审核」任务一键移至「已完成」`,
        subtitle: `命中 ${reviewTasks.map((t) => t.code).join("、")} · 乐观更新实时同步`,
        targetStatus: "done",
        matchedTaskIds: reviewTasks.map((t) => t.id),
        matchedCodes: reviewTasks.map((t) => t.code),
      });
    }

    intents.push(
      {
        kind: "ai_rebalance",
        id: "preset-ai-rebalance",
        title: "AI 智能重排：按阻塞权重与紧急度重新梳理列队列",
        subtitle: "自动提升高置信度研发任务至队列顶部",
      },
      {
        kind: "switch_section",
        id: "preset-goto-analytics",
        title: "前往 AI 效能分析仪表盘",
        subtitle: "查看生产力波动 SVG 曲线、AI 代码采纳率与动态流水线",
        section: "analytics",
      },
      {
        kind: "switch_section",
        id: "preset-switch-list",
        title: "切换主工作台至「列表视图」",
        subtitle: "以高密度工程表格检视全量任务进度",
        section: "workspace",
        viewMode: "list",
      },
      {
        kind: "switch_section",
        id: "preset-switch-kanban",
        title: "切换主工作台至「多维看板视图」",
        subtitle: "启用跨列拖拽与物理微动效",
        section: "workspace",
        viewMode: "kanban",
      },
      {
        kind: "set_theme",
        id: "preset-theme-dark",
        title: "切换视觉主题：科技深蓝暗黑模式 (Dark)",
        subtitle: "Slate-950 分层质感搭配极光高亮",
        theme: "dark",
      },
      {
        kind: "set_theme",
        id: "preset-theme-light",
        title: "切换视觉主题：高对比高级灰白 (Light)",
        subtitle: "Zinc-50 呼吸感昼间工作模式",
        theme: "light",
      }
    );

    return intents;
  }

  const lower = query.toLowerCase();

  // 1. Detect natural-language move commands: e.g. "将审查任务移至已完成", "move review to done", "把 NX-101 移到已完成"
  const moveVerbs = ["移至", "移到", "移动到", "转为", "标记为", "改为", "move", "put", "send", "mark"];
  const hasMoveVerb = moveVerbs.some((verb) => lower.includes(verb));

  const codeMatches = query.toUpperCase().match(/NX-\d+/g) ?? [];

  if (hasMoveVerb || lower.includes(" to ") || lower.includes("至") || lower.includes("到")) {
    const splitRegex = /(?:移至|移到|移动到|转为|标记为|改为|\bto\b|\binto\b)/i;
    const parts = query.split(splitRegex);
    const sourcePart = parts[0] ?? query;
    const targetPart = parts[parts.length - 1] ?? query;

    const targetStatus = detectStatusInSegment(targetPart);
    const sourceStatus =
      parts.length > 1 ? detectStatusInSegment(sourcePart) : null;

    if (targetStatus) {
      let matchedTasks: NexusTask[] = [];
      if (codeMatches.length > 0) {
        const codeSet = new Set(codeMatches);
        matchedTasks = tasks.filter(
          (t) => codeSet.has(t.code.toUpperCase()) && t.status !== targetStatus
        );
      } else if (sourceStatus) {
        matchedTasks = tasks.filter((t) => t.status === sourceStatus);
      } else {
        const cleanKeywords = sourcePart
          .replace(/(?:将|把|所有|全部|任务|move|all|tasks|the)/gi, "")
          .trim()
          .toLowerCase();
        if (cleanKeywords.length >= 2) {
          matchedTasks = tasks.filter(
            (t) =>
              t.status !== targetStatus &&
              (t.title.toLowerCase().includes(cleanKeywords) ||
                t.tags.some((tag) => tag.toLowerCase().includes(cleanKeywords)))
          );
        }
      }

      if (matchedTasks.length > 0) {
        intents.push({
          kind: "batch_move",
          id: `nl-move-${targetStatus}-${matchedTasks.map((t) => t.id).join("-")}`,
          title: `AI 指令执行：将 ${matchedTasks.length} 项任务移至「${STATUS_LABELS[targetStatus]}」`,
          subtitle: `匹配任务：${matchedTasks.map((t) => `${t.code} ${t.title}`).join("；")}`,
          targetStatus,
          matchedTaskIds: matchedTasks.map((t) => t.id),
          matchedCodes: matchedTasks.map((t) => t.code),
        });
      }
    }
  }

  // 2. Detect priority assignment for specific task code
  const detectedPriority = detectPriorityInText(query);
  if (detectedPriority && codeMatches.length > 0) {
    const codeSet = new Set(codeMatches);
    const matched = tasks.filter((t) => codeSet.has(t.code.toUpperCase()));
    if (matched.length > 0) {
      intents.push({
        kind: "set_priority",
        id: `nl-priority-${detectedPriority.priority}`,
        title: `调整优先级：将 ${matched.map((t) => t.code).join("、")} 设为「${detectedPriority.label}」`,
        subtitle: "立即通过 TanStack Query 乐观更新同步至所有视图",
        targetPriority: detectedPriority.priority,
        matchedTaskIds: matched.map((t) => t.id),
        matchedCodes: matched.map((t) => t.code),
      });
    }
  }

  // 3. Detect natural-language task creation: e.g. "新建任务：优化首屏加载" / "create task ..."
  const createPrefixMatch = query.match(
    /^(?:新建任务|创建任务|添加任务|create task|new task|add task)\s*[:：]?\s*(.+)$/i
  );
  if (createPrefixMatch && createPrefixMatch[1]) {
    const rawTitle = createPrefixMatch[1].trim();
    const inferredPriority = detectPriorityInText(rawTitle)?.priority ?? "medium";
    const inferredStatus = detectStatusInSegment(rawTitle) ?? "todo";
    intents.push({
      kind: "create_task",
      id: `nl-create-${rawTitle}`,
      title: `AI 快速创建任务：「${rawTitle}」`,
      subtitle: `自动归类至「${STATUS_LABELS[inferredStatus]}」 · 优先级 ${inferredPriority.toUpperCase()}`,
      taskTitle: rawTitle,
      priority: inferredPriority,
      status: inferredStatus,
    });
  }

  // 4. Filter by priority
  if (
    detectedPriority &&
    codeMatches.length === 0 &&
    !createPrefixMatch &&
    (lower.includes("筛选") ||
      lower.includes("过滤") ||
      lower.includes("只看") ||
      lower.includes("filter") ||
      lower.includes("紧急") ||
      lower.includes("urgent"))
  ) {
    intents.push({
      kind: "filter_priority",
      id: `nl-filter-${detectedPriority.priority}`,
      title: `筛选工作台：仅显示「${detectedPriority.label}」任务`,
      subtitle: "聚焦关键阻塞事项，可在过滤栏随时复位",
      priority: detectedPriority.priority,
    });
  }

  if (lower.includes("清除筛选") || lower.includes("全部任务") || lower.includes("reset filter")) {
    intents.push({
      kind: "filter_priority",
      id: "nl-filter-reset",
      title: "重置工作台筛选：显示全量任务",
      subtitle: "恢复所有优先级与执行人可见性",
      priority: "all",
    });
  }

  // 5. Navigation & theme intents
  if (
    lower.includes("分析") ||
    lower.includes("效能") ||
    lower.includes("仪表盘") ||
    lower.includes("图表") ||
    lower.includes("analytics") ||
    lower.includes("dashboard")
  ) {
    intents.push({
      kind: "switch_section",
      id: "nl-nav-analytics",
      title: "打开「AI 效能分析仪表盘」",
      subtitle: "检视团队周生产力波动与 AI 代码采纳率",
      section: "analytics",
    });
  }

  if (lower.includes("列表") || lower.includes("list")) {
    intents.push({
      kind: "switch_section",
      id: "nl-view-list",
      title: "切换工作台至「列表视图」",
      subtitle: "紧凑工程行视图，支持快速内联编辑",
      section: "workspace",
      viewMode: "list",
    });
  }

  if (lower.includes("看板") || lower.includes("kanban") || lower.includes("board")) {
    intents.push({
      kind: "switch_section",
      id: "nl-view-kanban",
      title: "切换工作台至「多维看板视图」",
      subtitle: "支持跨列拖拽动效与实时进度追踪",
      section: "workspace",
      viewMode: "kanban",
    });
  }

  if (lower.includes("暗黑") || lower.includes("深色") || lower.includes("dark")) {
    intents.push({
      kind: "set_theme",
      id: "nl-theme-dark",
      title: "切换主题：深色模式 (Dark Mode)",
      subtitle: "深邃 Slate-950 科技暗蓝基调",
      theme: "dark",
    });
  }

  if (lower.includes("浅色") || lower.includes("明亮") || lower.includes("light")) {
    intents.push({
      kind: "set_theme",
      id: "nl-theme-light",
      title: "切换主题：明亮模式 (Light Mode)",
      subtitle: "Zinc-50 干净高对比度日间界面",
      theme: "light",
    });
  }

  if (lower.includes("系统") || lower.includes("自动") || lower.includes("system")) {
    intents.push({
      kind: "set_theme",
      id: "nl-theme-system",
      title: "切换主题：跟随操作系统偏好 (System)",
      subtitle: "自动响应 prefers-color-scheme",
      theme: "system",
    });
  }

  if (
    lower.includes("重排") ||
    lower.includes("优化") ||
    lower.includes("ai") ||
    lower.includes("sort")
  ) {
    intents.push({
      kind: "ai_rebalance",
      id: "nl-ai-rebalance",
      title: "AI 智能重排：按风险与优先级自动整理列顺序",
      subtitle: "重新计算任务置信度并置顶高优任务",
    });
  }

  // 6. Fuzzy match existing tasks to jump straight into their detail modal
  const matchingTasks = tasks
    .filter(
      (t) =>
        t.code.toLowerCase().includes(lower) ||
        t.title.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lower))
    )
    .slice(0, 5);

  for (const task of matchingTasks) {
    intents.push({
      kind: "open_task",
      id: `open-${task.id}`,
      title: `${task.code} · ${task.title}`,
      subtitle: `当前列：${STATUS_LABELS[task.status]} · AI 进度 ${task.aiProgress}%`,
      taskId: task.id,
      taskCode: task.code,
    });
  }

  // Fallback quick-create suggestion if user typed arbitrary phrase without explicit match
  if (intents.length === 0 && query.length >= 2) {
    intents.push({
      kind: "create_task",
      id: `fallback-create-${query}`,
      title: `以此语义创建新任务：「${query}」`,
      subtitle: "未匹配到既有操作，AI 可一键将输入转化为待处理任务",
      taskTitle: query,
      priority: detectedPriority?.priority ?? "medium",
      status: "todo",
    });
  }

  return intents;
}

