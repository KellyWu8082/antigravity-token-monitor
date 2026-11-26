"use client";

import { ChevronDown, Info } from "lucide-react";
import { formatRatePer1M } from "@/lib/token-format";
import type { TokenUsageDashboardResponse } from "@/types/token-usage";

interface ScriptAuditBannerProps {
  readonly data: TokenUsageDashboardResponse;
}

export function ScriptAuditBanner({ data }: ScriptAuditBannerProps) {
  return (
    <details className="nx-disclosure rounded-3xl border border-zinc-900/[0.08] bg-white/75 px-5 py-3.5 text-xs shadow-glass-light backdrop-blur-md dark:border-white/[0.07] dark:bg-slate-900/65 dark:shadow-glass-dark">
      <summary className="flex flex-wrap items-center justify-between gap-2 text-zinc-600 transition-colors hover:text-zinc-900 dark:text-slate-300 dark:hover:text-white">
        <span className="inline-flex items-center gap-2 font-medium">
          <ChevronDown
            className="nx-disclosure-chevron h-4 w-4 shrink-0 text-indigo-500 dark:text-cyan-400"
            aria-hidden="true"
          />
          <span>公开 API 参考单价表（USD / 1M Tokens）</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-slate-500">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>按公开 API 费率折算，仅作本机额度参考</span>
        </span>
      </summary>

      <div className="mt-3.5 overflow-x-auto rounded-2xl border border-zinc-900/[0.08] bg-white/85 nx-scrollbar dark:border-white/[0.08] dark:bg-slate-950/60">
        <table className="w-full min-w-[600px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-zinc-900/[0.08] text-zinc-500 dark:border-white/[0.08] dark:text-slate-400">
              <th scope="col" className="px-3.5 py-2.5 font-semibold">
                模型档位
              </th>
              <th
                scope="col"
                className="px-3.5 py-2.5 text-right font-semibold"
              >
                Input
              </th>
              <th
                scope="col"
                className="px-3.5 py-2.5 text-right font-semibold"
              >
                Cache Read
              </th>
              <th
                scope="col"
                className="px-3.5 py-2.5 text-right font-semibold"
              >
                Cache Write
              </th>
              <th
                scope="col"
                className="px-3.5 py-2.5 text-right font-semibold"
              >
                Output (含 Thinking)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/[0.05] font-mono tabular-nums dark:divide-white/[0.05]">
            {data.pricingCatalog.map((rate) => (
              <tr
                key={rate.id}
                title={rate.note}
                className="transition-colors hover:bg-indigo-500/[0.03] dark:hover:bg-cyan-400/[0.04]"
              >
                <td className="px-3.5 py-2 font-sans">
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {rate.label}
                  </div>
                  <div className="text-[10px] text-zinc-400 dark:text-slate-500">
                    {rate.note}
                  </div>
                </td>
                <td className="px-3.5 py-2 text-right text-indigo-600 dark:text-indigo-300">
                  {formatRatePer1M(rate.inputPer1M)}
                </td>
                <td className="px-3.5 py-2 text-right text-cyan-700 dark:text-cyan-300">
                  {formatRatePer1M(rate.cacheReadPer1M)}
                </td>
                <td className="px-3.5 py-2 text-right text-zinc-600 dark:text-slate-300">
                  {formatRatePer1M(rate.cacheWritePer1M)}
                </td>
                <td className="px-3.5 py-2 text-right text-emerald-600 dark:text-emerald-300">
                  {formatRatePer1M(rate.outputPer1M)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
