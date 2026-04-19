"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, BudgetWithSpent, CategoryExpense } from "@/lib/types/database";
import Toast from "@/components/ui/Toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMXN(n: number) {
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function monthRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function pct(spent: number, amount: number) {
  if (amount <= 0) return 0;
  return Math.min(100, Math.round((spent / amount) * 100));
}

function statusColor(p: number): string {
  if (p >= 100) return "#FF4D6D";
  if (p >= 80) return "#F59E0B";
  return "#00C896";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetsViewProps {
  userId: string;
  initialBudgets: BudgetWithSpent[];
  categories: Category[];
  initialExpensesByCategory: CategoryExpense[];
  initialMonth: number;
  initialYear: number;
  initialShowNew: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ pct: p, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(p), 60);
    return () => clearTimeout(t);
  }, [p]);

  return (
    <div
      style={{
        height: 8,
        borderRadius: 4,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          borderRadius: 4,
          background: color,
          transition: "width 0.7s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: `0 0 8px ${color}60`,
        }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BudgetsView({
  userId,
  initialBudgets,
  categories,
  initialExpensesByCategory,
  initialMonth,
  initialYear,
  initialShowNew,
}: BudgetsViewProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>(initialBudgets);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryExpense[]>(initialExpensesByCategory);
  const [loading, setLoading] = useState(false);

  // New budget modal
  const [showNew, setShowNew] = useState(initialShowNew);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Fetch data for the selected month ─────────────────────────────────────

  const fetchData = useCallback(async (m: number, y: number) => {
    setLoading(true);
    const supabase = createClient();
    const { start, end } = monthRange(m, y);

    const [{ data: budgetRows }, { data: txRows }] = await Promise.all([
      supabase
        .from("budgets")
        .select("*, category:categories(*)")
        .eq("user_id", userId)
        .eq("month", m)
        .eq("year", y),
      supabase
        .from("transactions")
        .select("*, category:categories(*)")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", start)
        .lte("date", end),
    ]);

    const txs = txRows ?? [];
    const totalExpenses = txs.reduce((s: number, t: { amount: number }) => s + t.amount, 0);

    // Build expenses by category
    const grouped: Record<string, CategoryExpense> = {};
    for (const tx of txs as Array<{ category_id: string | null; amount: number; category?: { name: string; icon: string; color: string } }>) {
      const key = tx.category_id ?? "__none__";
      if (!grouped[key]) {
        grouped[key] = {
          category_id: tx.category_id,
          name: tx.category?.name ?? "Otros",
          icon: tx.category?.icon ?? "📦",
          color: tx.category?.color ?? "#6B7280",
          amount: 0,
          percentage: 0,
        };
      }
      grouped[key].amount += tx.amount;
    }
    const expCat = Object.values(grouped).map((g) => ({
      ...g,
      percentage: totalExpenses > 0 ? Math.round((g.amount / totalExpenses) * 100) : 0,
    }));

    // Enrich budgets with spent
    const enriched: BudgetWithSpent[] = (budgetRows ?? []).map((b: BudgetWithSpent) => {
      const spent = txs
        .filter((t: { category_id: string | null }) => t.category_id === b.category_id)
        .reduce((s: number, t: { amount: number }) => s + t.amount, 0);
      return { ...b, spent };
    });

    setBudgets(enriched);
    setExpensesByCategory(expCat);
    setLoading(false);
  }, [userId]);

  // ── Month navigation ──────────────────────────────────────────────────────

  function prevMonth() {
    const newM = month === 1 ? 12 : month - 1;
    const newY = month === 1 ? year - 1 : year;
    setMonth(newM);
    setYear(newY);
    fetchData(newM, newY);
  }

  function nextMonth() {
    const newM = month === 12 ? 1 : month + 1;
    const newY = month === 12 ? year + 1 : year;
    setMonth(newM);
    setYear(newY);
    fetchData(newM, newY);
  }

  // ── Create budget ─────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setModalError("");
    const parsed = parseFloat(newAmount);
    if (!newCategoryId) { setModalError("Selecciona una categoría."); return; }
    if (isNaN(parsed) || parsed <= 0) { setModalError("Ingresa un monto válido."); return; }

    setSaving(true);
    const supabase = createClient();

    // Check if a budget already exists for this category + month + year
    const { data: existing } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", userId)
      .eq("category_id", newCategoryId)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    let saveError: string | null = null;

    if (existing?.id) {
      const { error } = await supabase
        .from("budgets")
        .update({ amount: parsed, period: "monthly" })
        .eq("id", existing.id);
      saveError = error?.message ?? null;
    } else {
      const { error } = await supabase.from("budgets").insert({
        user_id: userId,
        category_id: newCategoryId,
        amount: parsed,
        period: "monthly",
        month,
        year,
      });
      saveError = error?.message ?? null;
    }

    if (saveError) {
      console.log("Budget save error:", saveError);
      setModalError("Error al guardar. Intenta de nuevo.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowNew(false);
    setNewCategoryId("");
    setNewAmount("");
    setToast({ message: "Presupuesto guardado", type: "success" });
    fetchData(month, year);
  }

  // ── Delete budget ─────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) {
      console.log("Budget delete error:", error);
      setToast({ message: "Error al eliminar.", type: "error" });
    } else {
      setToast({ message: "Presupuesto eliminado", type: "success" });
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    }
    setDeletingId(null);
  }

  // ── Summary stats ─────────────────────────────────────────────────────────

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overBudgetCount = budgets.filter((b) => b.spent >= b.amount).length;

  // Categories that don't yet have a budget this month
  const budgetedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const availableCategories = categories.filter((c) => !budgetedCategoryIds.has(c.id));

  // ─────────────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    background: "#111827",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#F9FAFB",
    borderRadius: "12px",
    fontFamily: "var(--font-dm-sans)",
    outline: "none",
    width: "100%",
    padding: "12px 16px",
    fontSize: "14px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "6px",
    color: "#D1D5DB",
    fontFamily: "var(--font-dm-sans)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0F1E",
        padding: "24px 24px 40px",
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: "22px",
              fontWeight: 700,
              color: "#F9FAFB",
              margin: 0,
            }}
          >
            Presupuestos
          </h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>
            Controla cuánto gastas por categoría cada mes
          </p>
        </div>

        <button
          onClick={() => { setShowNew(true); setModalError(""); }}
          style={{
            background: "#1B4FD8",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-dm-sans)",
            boxShadow: "0 0 20px rgba(27,79,216,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span> Crear presupuesto
        </button>
      </div>

      {/* Month navigation */}
      <div
        className="flex items-center gap-3 mb-6"
        style={{ width: "fit-content" }}
      >
        <button
          onClick={prevMonth}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            color: "#D1D5DB",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          ←
        </button>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 600,
            fontSize: "15px",
            color: "#F9FAFB",
            minWidth: "130px",
            textAlign: "center",
          }}
        >
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={nextMonth}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            color: "#D1D5DB",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          →
        </button>
        {loading && (
          <span style={{ color: "#6B7280", fontSize: "13px" }}>Cargando...</span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Total presupuestado",
            value: formatMXN(totalBudgeted),
            color: "#1B4FD8",
            icon: "🎯",
          },
          {
            label: "Total gastado",
            value: formatMXN(totalSpent),
            color: totalSpent > totalBudgeted ? "#FF4D6D" : "#F59E0B",
            icon: "💸",
          },
          {
            label: totalRemaining >= 0 ? "Disponible" : "Excedido",
            value: formatMXN(Math.abs(totalRemaining)),
            color: totalRemaining >= 0 ? "#00C896" : "#FF4D6D",
            icon: totalRemaining >= 0 ? "✅" : "⚠️",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "18px 20px",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: "18px" }}>{card.icon}</span>
              <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>
                {card.label}
              </span>
            </div>
            <p
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: "22px",
                fontWeight: 700,
                color: card.color,
                margin: 0,
              }}
            >
              {card.value}
            </p>
            {card.label === "Total presupuestado" && overBudgetCount > 0 && (
              <p style={{ fontSize: "12px", color: "#FF4D6D", marginTop: "4px" }}>
                {overBudgetCount} categoría{overBudgetCount > 1 ? "s" : ""} excedida{overBudgetCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Budget cards */}
      {budgets.length === 0 ? (
        <div
          style={{
            background: "#111827",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: "20px",
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "40px", marginBottom: "16px" }}>🎯</p>
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: "18px",
              fontWeight: 600,
              color: "#F9FAFB",
              marginBottom: "8px",
            }}
          >
            Sin presupuestos este mes
          </p>
          <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "24px" }}>
            Crea tu primer presupuesto para controlar tus gastos por categoría
          </p>
          <button
            onClick={() => { setShowNew(true); setModalError(""); }}
            style={{
              background: "#1B4FD8",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            + Crear primer presupuesto
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => {
            const p = pct(budget.spent, budget.amount);
            const color = statusColor(p);
            const remaining = budget.amount - budget.spent;
            const isOver = budget.spent > budget.amount;

            return (
              <div
                key={budget.id}
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "16px",
                  padding: "18px 20px",
                }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "12px",
                        background: `${budget.category?.color ?? "#6B7280"}20`,
                        border: `1px solid ${budget.category?.color ?? "#6B7280"}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                      }}
                    >
                      {budget.category?.icon ?? "📦"}
                    </div>
                    <div>
                      <p
                        style={{
                          fontFamily: "var(--font-sora)",
                          fontWeight: 600,
                          fontSize: "15px",
                          color: "#F9FAFB",
                          margin: 0,
                        }}
                      >
                        {budget.category?.name ?? "Sin categoría"}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0" }}>
                        Mensual
                      </p>
                    </div>
                  </div>

                  {/* Delete button */}
                  {deletingId === budget.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(budget.id)}
                        style={{
                          background: "rgba(255,77,109,0.15)",
                          border: "1px solid rgba(255,77,109,0.3)",
                          borderRadius: "8px",
                          color: "#FF4D6D",
                          fontSize: "12px",
                          fontWeight: 600,
                          padding: "4px 10px",
                          cursor: "pointer",
                          fontFamily: "var(--font-dm-sans)",
                        }}
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#9CA3AF",
                          fontSize: "12px",
                          fontWeight: 600,
                          padding: "4px 10px",
                          cursor: "pointer",
                          fontFamily: "var(--font-dm-sans)",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(budget.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#4B5563",
                        cursor: "pointer",
                        fontSize: "18px",
                        lineHeight: 1,
                        padding: "4px",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#FF4D6D")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#4B5563")}
                      title="Eliminar presupuesto"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Amounts */}
                <div className="flex items-baseline justify-between mb-2">
                  <span
                    style={{
                      fontFamily: "var(--font-sora)",
                      fontSize: "20px",
                      fontWeight: 700,
                      color: color,
                    }}
                  >
                    {formatMXN(budget.spent)}
                  </span>
                  <span style={{ fontSize: "14px", color: "#6B7280" }}>
                    de {formatMXN(budget.amount)}
                  </span>
                </div>

                {/* Progress bar */}
                <ProgressBar pct={p} color={color} />

                {/* Footer row */}
                <div className="flex items-center justify-between mt-2">
                  <span style={{ fontSize: "12px", color: "#6B7280" }}>
                    {p}% utilizado
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: isOver ? "#FF4D6D" : "#9CA3AF",
                    }}
                  >
                    {isOver
                      ? `Excedido por ${formatMXN(budget.spent - budget.amount)}`
                      : `${formatMXN(remaining)} restante`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expenses without budget (uncovered categories) */}
      {(() => {
        const uncovered = expensesByCategory.filter(
          (e) => e.category_id && !budgetedCategoryIds.has(e.category_id)
        );
        if (uncovered.length === 0) return null;
        return (
          <div className="mt-8">
            <h2
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: "15px",
                fontWeight: 600,
                color: "#9CA3AF",
                marginBottom: "12px",
              }}
            >
              Gastos sin presupuesto asignado
            </h2>
            <div className="space-y-3">
              {uncovered.map((cat) => (
                <div
                  key={cat.category_id}
                  style={{
                    background: "#111827",
                    border: "1px dashed rgba(255,255,255,0.08)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: "22px" }}>{cat.icon}</span>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#D1D5DB", margin: 0 }}>
                        {cat.name}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0" }}>
                        Sin presupuesto
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        fontFamily: "var(--font-sora)",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#F59E0B",
                      }}
                    >
                      {formatMXN(cat.amount)}
                    </span>
                    <button
                      onClick={() => {
                        setNewCategoryId(cat.category_id ?? "");
                        setShowNew(true);
                        setModalError("");
                      }}
                      style={{
                        background: "rgba(27,79,216,0.15)",
                        border: "1px solid rgba(27,79,216,0.3)",
                        borderRadius: "8px",
                        color: "#60A5FA",
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "4px 10px",
                        cursor: "pointer",
                        fontFamily: "var(--font-dm-sans)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* New budget modal */}
      {showNew && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowNew(false); setModalError(""); } }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "20px",
              padding: "28px 24px",
              width: "100%",
              maxWidth: "420px",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#F9FAFB",
                  margin: 0,
                }}
              >
                Nuevo presupuesto
              </h2>
              <button
                onClick={() => { setShowNew(false); setModalError(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6B7280",
                  fontSize: "22px",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "2px 4px",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Month display (read-only) */}
              <div
                style={{
                  background: "rgba(27,79,216,0.1)",
                  border: "1px solid rgba(27,79,216,0.2)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  color: "#60A5FA",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                📅 {MONTH_NAMES[month - 1]} {year}
              </div>

              {/* Category */}
              <div>
                <label style={labelStyle}>Categoría</label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                  {availableCategories.length === 0 && (
                    <option disabled value="">
                      Todas las categorías tienen presupuesto
                    </option>
                  )}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={labelStyle}>Límite mensual (MXN)</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#6B7280",
                      fontSize: "14px",
                      fontFamily: "var(--font-sora)",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: "28px" }}
                    required
                  />
                </div>
              </div>

              {modalError && (
                <div
                  style={{
                    background: "rgba(255,77,109,0.1)",
                    border: "1px solid rgba(255,77,109,0.25)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    color: "#FF4D6D",
                  }}
                >
                  {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowNew(false); setModalError(""); }}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#9CA3AF",
                    fontSize: "14px",
                    fontWeight: 600,
                    padding: "11px",
                    cursor: "pointer",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || availableCategories.length === 0}
                  style={{
                    flex: 2,
                    background: "#1B4FD8",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: 600,
                    padding: "11px",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    fontFamily: "var(--font-dm-sans)",
                    boxShadow: "0 0 20px rgba(27,79,216,0.3)",
                  }}
                >
                  {saving ? "Guardando..." : "Guardar presupuesto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
