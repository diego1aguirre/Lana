"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const categories = [
  { name: "Comida & restaurantes", value: 32, color: "#1B4FD8" },
  { name: "Transporte", value: 18, color: "#00C896" },
  { name: "Entretenimiento", value: 14, color: "#F59E0B" },
  { name: "Supermercado", value: 12, color: "#8B5CF6" },
  { name: "Servicios", value: 10, color: "#EC4899" },
  { name: "Otros", value: 14, color: "#6B7280" },
];

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
        style={{
          background: "#1F2937",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
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

function CenterLabel() {
  return (
    <g>
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "var(--font-dm-sans)" }}
      >
        Gastos
      </text>
      <text
        x="50%"
        y="60%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: "#F9FAFB", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-sora)" }}
      >
        $12,840
      </text>
    </g>
  );
}

export default function CategoryChart() {
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={categories}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
          >
            {categories.map((cat, i) => (
              <Cell key={i} fill={cat.color} stroke="transparent" />
            ))}
            <CenterLabel />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
        {categories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: cat.color }}
            />
            <span
              className="text-xs truncate"
              style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
            >
              {cat.name}
            </span>
            <span
              className="text-xs font-semibold ml-auto"
              style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
            >
              {cat.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
