"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { CategoryExpense } from "@/lib/types/database";

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { color: string } }[];
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
          {payload[0].name}
        </p>
        <p
          className="text-sm font-semibold"
          style={{ color: payload[0].payload.color, fontFamily: "var(--font-dm-sans)" }}
        >
          {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
}

interface CenterLabelProps {
  totalLabel: string;
}

function CenterLabel({ totalLabel }: CenterLabelProps) {
  return (
    <g>
      <text
        x="50%"
        y="44%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "var(--font-dm-sans)" }}
      >
        Gastos
      </text>
      <text
        x="50%"
        y="59%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fill: "#F9FAFB",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "var(--font-sora)",
        }}
      >
        {totalLabel}
      </text>
    </g>
  );
}

interface CategoryChartProps {
  data: CategoryExpense[];
  totalLabel: string;
}

export default function CategoryChart({ data, totalLabel }: CategoryChartProps) {
  if (!data.length) {
    return (
      <div
        className="flex flex-col items-center justify-center h-52 rounded-xl"
        style={{ background: "#1F2937" }}
      >
        <span className="text-2xl mb-2">🍩</span>
        <p className="text-sm" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
          Sin categorías este mes
        </p>
      </div>
    );
  }

  // Map to recharts-friendly format
  const chartData = data.map((d) => ({
    name: d.name,
    value: d.percentage,
    color: d.color,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
            <CenterLabel totalLabel={totalLabel} />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
        {data.map((cat) => (
          <div key={cat.name} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: cat.color }}
            />
            <span
              className="text-xs truncate"
              style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
            >
              {cat.icon} {cat.name}
            </span>
            <span
              className="text-xs font-semibold ml-auto flex-shrink-0"
              style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
            >
              {cat.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
