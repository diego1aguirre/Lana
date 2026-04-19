"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyExpense } from "@/lib/types/database";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "#1F2937", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p
          className="text-xs mb-1"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          {label}
        </p>
        <p
          className="text-sm font-semibold"
          style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
        >
          ${payload[0].value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
}

interface WeeklyChartProps {
  data: WeeklyExpense[];
  totalLabel: string;
}

export default function WeeklyChart({ data, totalLabel }: WeeklyChartProps) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  const avg = data.length > 0 ? total / data.length : 0;

  const hasData = data.some((d) => d.amount > 0);

  if (!hasData) {
    return (
      <div
        className="flex flex-col items-center justify-center h-52 rounded-xl"
        style={{ background: "#1F2937" }}
      >
        <span className="text-2xl mb-2">📊</span>
        <p className="text-sm" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
          Sin gastos este mes
        </p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          barSize={40}
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
        >
          <XAxis
            dataKey="week"
            tick={{ fill: "#9CA3AF", fontSize: 12, fontFamily: "var(--font-dm-sans)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="amount" fill="#1B4FD8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div
        className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 text-xs"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          color: "#9CA3AF",
          fontFamily: "var(--font-dm-sans)",
        }}
      >
        <span>
          Total {totalLabel}:{" "}
          <span style={{ color: "#F9FAFB", fontWeight: 600 }}>
            ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        </span>
        <span>•</span>
        <span>
          Promedio semanal:{" "}
          <span style={{ color: "#F9FAFB", fontWeight: 600 }}>
            ${avg.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        </span>
      </div>
    </div>
  );
}
