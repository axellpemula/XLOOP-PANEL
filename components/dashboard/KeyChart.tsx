"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { DashboardStats } from "@/lib/utils/types";

function GlassTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-strong rounded-lg px-3 py-2" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
      <p className="text-label text-muted">{label}</p>
      <p className="text-body text-text tabular">{payload[0].value} key</p>
    </div>
  );
}

export function KeyChart({ data }: { data: DashboardStats["chart"] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="rgba(255,255,255,0.18)"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            dy={4}
          />
          <YAxis
            stroke="rgba(255,255,255,0.18)"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={40}
          />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: "rgba(255,255,255,0.18)" }} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "var(--accent)", stroke: "none" }}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
