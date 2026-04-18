"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const weeklyData = [
  { week: "Sem. 1", amount: 2840 },
  { week: "Sem. 2", amount: 3120 },
  { week: "Sem. 3", amount: 2650 },
  { week: "Sem. 4", amount: 4230 },
];

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
        style={{
          background: "#1F2937",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
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

export default function WeeklyChart() {
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={weeklyData} barSize={40} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fill: "#9CA3AF", fontSize: 12, fontFamily: "var(--font-dm-sans)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)", radius: 8 }}
          />
          <Bar dataKey="amount" fill="#1B4FD8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div
        className="flex gap-4 mt-3 pt-3 text-xs"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          color: "#9CA3AF",
          fontFamily: "var(--font-dm-sans)",
        }}
      >
        <span>
          Total abril:{" "}
          <span style={{ color: "#F9FAFB", fontWeight: 600 }}>$12,840.00</span>
        </span>
        <span>•</span>
        <span>
          Promedio semanal:{" "}
          <span style={{ color: "#F9FAFB", fontWeight: 600 }}>$3,210.00</span>
        </span>
      </div>
    </div>
  );
}
