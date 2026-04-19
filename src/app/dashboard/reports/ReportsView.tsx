"use client";

import { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Transaction } from "@/lib/types/database";
import type { MonthlyTotal, CategoryTotal } from "@/lib/db/queries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "$" + Math.abs(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtFull(n: number) {
  return "$" + Math.abs(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEK_ORDER = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1F2937",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px",
      padding: "10px 14px",
      fontFamily: "var(--font-dm-sans)",
      fontSize: "13px",
      minWidth: "140px",
    }}>
      {label && <p style={{ color: "#9CA3AF", marginBottom: "6px", fontWeight: 600 }}>{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <span style={{ color: "#F9FAFB", fontWeight: 600 }}>{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#111827",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "20px",
      padding: "24px",
      marginBottom: "20px",
    }}>
      <h2 style={{
        fontFamily: "var(--font-sora)",
        fontSize: "16px",
        fontWeight: 700,
        color: "#F9FAFB",
        marginBottom: "20px",
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportsViewProps {
  userId: string;
  initialTransactions: Transaction[];
  initialMonthlyTotals: MonthlyTotal[];
  initialCategoryTotals: CategoryTotal[];
}

type Range = "3m" | "6m" | "year";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportsView({
  initialTransactions,
  initialMonthlyTotals,
  initialCategoryTotals,
}: ReportsViewProps) {
  const [range, setRange] = useState<Range>("6m");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Slice data based on selected range
  const monthlyTotals = useMemo((): MonthlyTotal[] => {
    if (range === "3m") return initialMonthlyTotals.slice(-3);
    if (range === "6m") return initialMonthlyTotals;
    // "year" — show all 12 months of the current year (we have up to 6 from server)
    return initialMonthlyTotals;
  }, [range, initialMonthlyTotals]);

  const transactions = useMemo((): Transaction[] => {
    if (range === "3m") {
      const cutoff = monthlyTotals[0];
      if (!cutoff) return initialTransactions;
      const startDate = `${cutoff.year}-${String(cutoff.month).padStart(2, "0")}-01`;
      return initialTransactions.filter((t) => t.date >= startDate);
    }
    return initialTransactions;
  }, [range, initialTransactions, monthlyTotals]);

  // Category totals re-computed from filtered transactions
  const categoryTotals = useMemo((): CategoryTotal[] => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const grandTotal = expenses.reduce((s, t) => s + t.amount, 0);
    const map: Record<string, CategoryTotal> = {};
    for (const tx of expenses) {
      const key = tx.category_id ?? "__none__";
      if (!map[key]) {
        map[key] = {
          category_id: tx.category_id,
          name: tx.category?.name ?? "Otros",
          icon: tx.category?.icon ?? "📦",
          color: tx.category?.color ?? "#6B7280",
          total: 0,
          percentage: 0,
          count: 0,
        };
      }
      map[key].total += tx.amount;
      map[key].count++;
    }
    return Object.values(map)
      .map((c) => ({ ...c, percentage: grandTotal > 0 ? Math.round((c.total / grandTotal) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  // Heatmap: average spend per day of week
  const heatmapData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const buckets: Record<string, { total: number; count: number }> = {};
    DAY_NAMES.forEach((d) => { buckets[d] = { total: 0, count: 0 }; });
    for (const tx of expenses) {
      const [y, m, d] = tx.date.split("-").map(Number);
      const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()];
      buckets[dayName].total += tx.amount;
      buckets[dayName].count++;
    }
    return WEEK_ORDER.map((day) => ({
      day,
      avg: buckets[day].count > 0 ? buckets[day].total / buckets[day].count : 0,
      total: buckets[day].total,
      count: buckets[day].count,
    }));
  }, [transactions]);

  const maxHeatmap = Math.max(...heatmapData.map((d) => d.avg), 1);

  // Summary stats
  const totalIncome = monthlyTotals.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyTotals.reduce((s, m) => s + m.expenses, 0);
  const netBalance = totalIncome - totalExpenses;
  const avgPerTx = transactions.filter((t) => t.type === "expense").length > 0
    ? totalExpenses / transactions.filter((t) => t.type === "expense").length
    : 0;

  // Insights
  const topCat = categoryTotals[0];
  const busiestDay = [...heatmapData].sort((a, b) => b.avg - a.avg)[0];
  const currentMonthTxs = transactions.filter((t) => {
    const now = new Date();
    return t.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  });

  const insights = [
    topCat && `Tu mayor gasto del período fue en ${topCat.icon} ${topCat.name} con ${fmtFull(topCat.total)}`,
    avgPerTx > 0 && `Gastas un promedio de ${fmtFull(avgPerTx)} por transacción`,
    busiestDay?.avg > 0 && `Tu día con más gastos es el ${busiestDay.day} (promedio ${fmtFull(busiestDay.avg)})`,
    currentMonthTxs.length > 0 && `Llevas ${currentMonthTxs.length} transacciones este mes`,
    netBalance >= 0 && `Ahorraste ${fmtFull(netBalance)} en este período 🎉`,
    netBalance < 0 && `Gastaste ${fmtFull(Math.abs(netBalance))} más de lo que ingresaste`,
  ].filter(Boolean) as string[];

  // Determine if we have enough data
  const monthsWithData = monthlyTotals.filter((m) => m.income > 0 || m.expenses > 0).length;
  const hasEnoughData = monthsWithData >= 1;

  // Bar chart data — shorten label for mobile
  const barData = monthlyTotals.map((m) => ({
    name: m.label.split(" ")[0], // "Ene", "Feb", etc.
    fullLabel: m.label,
    Ingresos: m.income,
    Gastos: m.expenses,
  }));

  const lineData = monthlyTotals.map((m) => ({
    name: m.label.split(" ")[0],
    Gastos: m.expenses,
  }));

  // ── Render ────────────────────────────────────────────────────────────────

  const pillBase: React.CSSProperties = {
    padding: "7px 16px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-dm-sans)",
    border: "1px solid transparent",
    transition: "all 0.15s",
  };
  const pillActive: React.CSSProperties = {
    background: "#1B4FD8",
    color: "#fff",
    border: "1px solid rgba(27,79,216,0.5)",
  };
  const pillInactive: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    color: "#9CA3AF",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0F1E",
      padding: "24px 24px 48px",
      fontFamily: "var(--font-dm-sans)",
    }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 style={{ fontFamily: "var(--font-sora)", fontSize: "22px", fontWeight: 700, color: "#F9FAFB", margin: 0 }}>
            Reportes
          </h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>
            Análisis de tus finanzas
          </p>
        </div>

        {/* Range toggle */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {([
            { key: "3m", label: "Últimos 3 meses" },
            { key: "6m", label: "Últimos 6 meses" },
            { key: "year", label: "Este año" },
          ] as { key: Range; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              style={{ ...pillBase, ...(range === key ? pillActive : pillInactive) }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!hasEnoughData && (
        <div style={{
          background: "#111827",
          border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: "20px",
          padding: "60px 24px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "40px", marginBottom: "16px" }}>📊</p>
          <p style={{ fontFamily: "var(--font-sora)", fontSize: "18px", fontWeight: 600, color: "#F9FAFB", marginBottom: "8px" }}>
            Datos insuficientes
          </p>
          <p style={{ color: "#6B7280", fontSize: "14px", maxWidth: "380px", margin: "0 auto" }}>
            Necesitas al menos un mes de transacciones para ver reportes completos.
            {transactions.length > 0 && ` Ya tienes ${transactions.length} transacciones registradas.`}
          </p>
        </div>
      )}

      {hasEnoughData && (
        <>
          {/* ── SECTION 1: Income vs Expenses Bar Chart ── */}
          <Section title="📊 Ingresos vs Gastos">
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: "400px" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} barGap={4} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#9CA3AF", fontSize: 12, fontFamily: "var(--font-dm-sans)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "var(--font-dm-sans)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)}
                      width={52}
                    />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Legend
                      wrapperStyle={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", paddingTop: "12px" }}
                    />
                    <Bar dataKey="Ingresos" fill="#00C896" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Gastos" fill="#FF4D6D" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[
                { label: "Total ingresos", value: fmtFull(totalIncome), color: "#00C896" },
                { label: "Total gastos", value: fmtFull(totalExpenses), color: "#FF4D6D" },
                { label: "Balance neto", value: (netBalance >= 0 ? "+" : "-") + fmtFull(netBalance), color: netBalance >= 0 ? "#F9FAFB" : "#FF4D6D" },
              ].map((s) => (
                <div key={s.label} style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  textAlign: "center",
                }}>
                  <p style={{ fontSize: "11px", color: "#6B7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {s.label}
                  </p>
                  <p style={{ fontFamily: "var(--font-sora)", fontSize: "16px", fontWeight: 700, color: s.color }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── SECTION 2: Line Chart + Top Categories ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Line chart */}
            <div style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "20px",
              padding: "24px",
            }}>
              <h2 style={{ fontFamily: "var(--font-sora)", fontSize: "16px", fontWeight: 700, color: "#F9FAFB", marginBottom: "20px" }}>
                📈 Tendencia de gastos
              </h2>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: "280px" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#9CA3AF", fontSize: 12, fontFamily: "var(--font-dm-sans)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "var(--font-dm-sans)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)}
                        width={48}
                      />
                      <Tooltip content={<DarkTooltip />} cursor={{ stroke: "rgba(27,79,216,0.3)", strokeWidth: 1 }} />
                      <Line
                        type="monotone"
                        dataKey="Gastos"
                        stroke="#1B4FD8"
                        strokeWidth={2.5}
                        dot={{ fill: "#1B4FD8", strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, fill: "#60A5FA" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top categories */}
            <div style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "20px",
              padding: "24px",
            }}>
              <h2 style={{ fontFamily: "var(--font-sora)", fontSize: "16px", fontWeight: 700, color: "#F9FAFB", marginBottom: "20px" }}>
                🏆 Top categorías
              </h2>

              {categoryTotals.length === 0 ? (
                <p style={{ color: "#6B7280", fontSize: "14px" }}>Sin gastos en este período.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {categoryTotals.slice(0, 5).map((cat, i) => (
                    <div key={cat.category_id ?? i}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <span style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#4B5563",
                          width: "18px",
                          flexShrink: 0,
                          textAlign: "right",
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: "18px", flexShrink: 0 }}>{cat.icon}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#D1D5DB", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {cat.name}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#F9FAFB", flexShrink: 0 }}>
                          {fmtFull(cat.total)}
                        </span>
                        <span style={{ fontSize: "12px", color: "#6B7280", flexShrink: 0, width: "34px", textAlign: "right" }}>
                          {cat.percentage}%
                        </span>
                      </div>
                      <div style={{ marginLeft: "28px", height: "5px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${cat.percentage}%`,
                          borderRadius: "3px",
                          background: cat.color,
                          transition: mounted ? "width 0.7s ease" : "none",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 3: Monthly Breakdown Table ── */}
          <Section title="📋 Resumen mensual">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#1F2937" }}>
                    {["Mes", "Ingresos", "Gastos", "Balance", "Transacciones"].map((col) => (
                      <th key={col} style={{
                        padding: "12px 16px",
                        textAlign: col === "Mes" || col === "Transacciones" ? "left" : "right",
                        color: "#9CA3AF",
                        fontWeight: 600,
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyTotals.map((m, i) => {
                    const bal = m.income - m.expenses;
                    return (
                      <tr
                        key={`${m.year}-${m.month}`}
                        style={{
                          background: i % 2 === 0 ? "#111827" : "#0D1117",
                          transition: "background 0.15s",
                          cursor: "default",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(27,79,216,0.08)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#111827" : "#0D1117")}
                      >
                        <td style={{ padding: "12px 16px", color: "#F9FAFB", fontWeight: 500 }}>{m.label}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#00C896", fontWeight: 600 }}>{fmtFull(m.income)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#FF4D6D", fontWeight: 600 }}>{fmtFull(m.expenses)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: bal >= 0 ? "#00C896" : "#FF4D6D", fontWeight: 700 }}>
                          {bal >= 0 ? "+" : "-"}{fmtFull(bal)}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#9CA3AF" }}>{m.count}</td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr style={{ background: "#1F2937", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <td style={{ padding: "12px 16px", color: "#F9FAFB", fontWeight: 700 }}>Total</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#00C896", fontWeight: 700 }}>{fmtFull(totalIncome)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#FF4D6D", fontWeight: 700 }}>{fmtFull(totalExpenses)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: netBalance >= 0 ? "#00C896" : "#FF4D6D", fontWeight: 700 }}>
                      {netBalance >= 0 ? "+" : "-"}{fmtFull(netBalance)}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#F9FAFB", fontWeight: 700 }}>
                      {monthlyTotals.reduce((s, m) => s + m.count, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── SECTION 4: Day-of-week Heatmap ── */}
          <Section title="🗓️ Días con más gastos">
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {heatmapData.map((d) => {
                const intensity = maxHeatmap > 0 ? d.avg / maxHeatmap : 0;
                const bg = intensity === 0
                  ? "rgba(255,255,255,0.04)"
                  : `rgba(27,79,216,${0.15 + intensity * 0.75})`;
                return (
                  <div
                    key={d.day}
                    title={d.avg > 0 ? `${d.day}: promedio ${fmtFull(d.avg)} (${d.count} txs)` : `${d.day}: sin gastos`}
                    style={{
                      flex: "1 1 0",
                      minWidth: "48px",
                      padding: "14px 8px",
                      borderRadius: "12px",
                      background: bg,
                      border: "1px solid rgba(255,255,255,0.06)",
                      textAlign: "center",
                      cursor: "default",
                      transition: "transform 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#9CA3AF", marginBottom: "6px" }}>{d.day}</p>
                    <p style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: intensity > 0.5 ? "#fff" : intensity > 0 ? "#93C5FD" : "#4B5563",
                    }}>
                      {d.avg > 0 ? fmt(d.avg) : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: "12px", color: "#4B5563", marginTop: "12px" }}>
              Promedio de gasto por día de la semana · Azul más intenso = más gasto
            </p>
          </Section>

          {/* ── SECTION 5: Insights ── */}
          {insights.length > 0 && (
            <div style={{
              background: "linear-gradient(135deg, rgba(27,79,216,0.08), rgba(0,200,150,0.05))",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              padding: "24px",
            }}>
              <h2 style={{ fontFamily: "var(--font-sora)", fontSize: "16px", fontWeight: 700, color: "#F9FAFB", marginBottom: "16px" }}>
                💡 Insights de Lana
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      fontSize: "14px",
                      color: "#D1D5DB",
                      fontFamily: "var(--font-dm-sans)",
                      lineHeight: 1.5,
                    }}
                  >
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
