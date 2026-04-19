"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Transaction, Category, Account } from "@/lib/types/database";
import Toast from "@/components/ui/Toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtMXN(n: number) {
  return "$" + Math.abs(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// mounted=false during SSR and first paint — returns the raw date to avoid hydration mismatch
function formatDateHeader(dateStr: string, mounted: boolean): string {
  if (!mounted) return dateStr; // stable on both server and client first render
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];
  if (dateStr === todayStr) return "Hoy";
  if (dateStr === yStr) return "Ayer";
  return cap(
    new Date(dateStr + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  );
}

function getLast6Months(): { label: string; value: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = cap(
      d.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    );
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ label, value });
  }
  return months;
}

function groupByDate(txs: Transaction[]): [string, Transaction[]][] {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const date = tx.date.split("T")[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#F9FAFB",
  borderRadius: "10px",
  fontFamily: "var(--font-dm-sans)",
  fontSize: 13,
  padding: "8px 12px",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
};

function SummaryBar({
  count,
  expenses,
  income,
}: {
  count: number;
  expenses: number;
  income: number;
}) {
  const balance = income - expenses;
  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 rounded-xl mb-4"
      style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <span className="text-xs" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
        <span style={{ color: "#F9FAFB", fontWeight: 600 }}>{count}</span> transacciones
      </span>
      <span className="text-xs" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
        Gastos:{" "}
        <span style={{ color: "#FF4D6D", fontWeight: 600 }}>−{fmtMXN(expenses)}</span>
      </span>
      <span className="text-xs" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
        Ingresos:{" "}
        <span style={{ color: "#00C896", fontWeight: 600 }}>+{fmtMXN(income)}</span>
      </span>
      <span className="text-xs" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
        Balance:{" "}
        <span
          style={{ color: balance >= 0 ? "#F9FAFB" : "#FF4D6D", fontWeight: 600 }}
        >
          {balance >= 0 ? "" : "−"}{fmtMXN(balance)}
        </span>
      </span>
    </div>
  );
}

function TxRow({
  tx,
  onDeleteRequest,
  pendingDelete,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  tx: Transaction;
  onDeleteRequest: (id: string) => void;
  pendingDelete: string | null;
  onDeleteConfirm: (tx: Transaction) => void;
  onDeleteCancel: () => void;
}) {
  const isConfirming = pendingDelete === tx.id;
  const catColor = tx.category?.color ?? "#6B7280";
  const catIcon = tx.category?.icon ?? "💳";
  const isIncome = tx.type === "income";

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors duration-150"
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.05)",
        cursor: "default",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "#1F2937")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "#111827")
      }
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{
          background: `${catColor}18`,
          border: `1px solid ${catColor}35`,
        }}
      >
        {catIcon}
      </div>

      {/* Center info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
        >
          {tx.description}
        </p>
        <p
          className="text-xs truncate"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          {tx.category?.name ?? "Sin categoría"}
          {tx.account?.name ? ` · ${tx.account.name}` : ""}
        </p>
      </div>

      {/* Right: amount + delete */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p
            className="text-sm font-bold"
            style={{
              color: isIncome ? "#00C896" : "#FF4D6D",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            {isIncome ? "+" : "−"}{fmtMXN(tx.amount)}
          </p>
        </div>

        {/* Delete controls */}
        {isConfirming ? (
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs"
              style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
            >
              ¿Eliminar?
            </span>
            <button
              onClick={() => onDeleteConfirm(tx)}
              className="text-xs font-semibold px-2 py-1 rounded-lg transition-colors"
              style={{
                background: "rgba(255,77,109,0.15)",
                color: "#FF4D6D",
                border: "1px solid rgba(255,77,109,0.25)",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              Sí
            </button>
            <button
              onClick={onDeleteCancel}
              className="text-xs font-semibold px-2 py-1 rounded-lg transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#9CA3AF",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => onDeleteRequest(tx.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-base p-1 rounded-lg hover:bg-white/5"
            style={{ color: "#6B7280" }}
            title="Eliminar"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

export default function TransactionsList({
  transactions,
  categories,
  accounts: _accounts,
}: TransactionsListProps) {
  const [txList, setTxList] = useState<Transaction[]>(transactions);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // mounted gates all new Date() calls so SSR and first client paint are identical
  const [mounted, setMounted] = useState(false);
  const [months, setMonths] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    setMounted(true);
    setMonths(getLast6Months());
  }, []);
  const isAnyFilterActive =
    search !== "" ||
    typeFilter !== "all" ||
    categoryFilter !== "" ||
    monthFilter !== "";

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("");
    setMonthFilter("");
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return txList.filter((tx) => {
      if (
        q &&
        !tx.description.toLowerCase().includes(q) &&
        !(tx.category?.name ?? "").toLowerCase().includes(q) &&
        !(tx.account?.name ?? "").toLowerCase().includes(q)
      )
        return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (categoryFilter && tx.category_id !== categoryFilter) return false;
      if (monthFilter && !tx.date.startsWith(monthFilter)) return false;
      return true;
    });
  }, [txList, search, typeFilter, categoryFilter, monthFilter]);

  const summary = useMemo(() => {
    const expenses = filtered
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const income = filtered
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    return { count: filtered.length, expenses, income };
  }, [filtered]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  async function handleDeleteConfirm(tx: Transaction) {
    setPendingDelete(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", tx.id);

    if (error) {
      console.log("Delete error:", error);
      setToast({ message: "Error al eliminar la transacción", type: "error" });
      return;
    }

    // Revert account balance
    if (tx.account_id && tx.account) {
      const delta = tx.type === "income" ? -tx.amount : tx.amount;
      await supabase
        .from("accounts")
        .update({ balance: tx.account.balance + delta })
        .eq("id", tx.account_id);
    }

    setTxList((prev) => prev.filter((t) => t.id !== tx.id));
    setToast({ message: "Transacción eliminada", type: "success" });
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
        >
          Transacciones
        </h1>
        <Link
          href="/dashboard/transactions/new"
          className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
          style={{
            background: "#1B4FD8",
            color: "#fff",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          + Nueva transacción
        </Link>
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 180 }}>
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "#6B7280" }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar transacción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-colors"
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#F9FAFB",
              fontFamily: "var(--font-dm-sans)",
            }}
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Todos los tipos</option>
          <option value="expense">Gastos</option>
          <option value="income">Ingresos</option>
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>

        {/* Month filter */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">Todos los meses</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {isAnyFilterActive && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 hover:bg-white/5"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#9CA3AF",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Summary bar ── */}
      {txList.length > 0 && (
        <SummaryBar
          count={summary.count}
          expenses={summary.expenses}
          income={summary.income}
        />
      )}

      {/* ── Empty states ── */}
      {txList.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-20 text-center rounded-2xl"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span className="text-5xl mb-4">📭</span>
          <p
            className="text-base font-semibold mb-2"
            style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
          >
            Aún no hay transacciones
          </p>
          <p
            className="text-sm mb-6"
            style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
          >
            Registra tu primer gasto o ingreso para empezar
          </p>
          <Link
            href="/dashboard/transactions/new"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
            style={{
              background: "#1B4FD8",
              color: "#fff",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            + Agregar primera transacción
          </Link>
        </div>
      )}

      {txList.length > 0 && filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 text-center rounded-2xl"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span className="text-4xl mb-3">🔍</span>
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
          >
            No se encontraron transacciones
          </p>
          <p
            className="text-xs mb-5"
            style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
          >
            Intenta con otros filtros o términos de búsqueda
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 hover:bg-white/5"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#F9FAFB",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* ── Grouped transaction list ── */}
      {groups.length > 0 && (
        <div className="space-y-6">
          {groups.map(([date, txs]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-xs font-semibold uppercase tracking-wider flex-shrink-0"
                  style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}
                >
                  {formatDateHeader(date, mounted)}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
                <span
                  className="text-xs flex-shrink-0"
                  style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}
                >
                  {txs.length} mov.
                </span>
              </div>

              {/* Transactions for this date */}
              <div className="space-y-2">
                {txs.map((tx) => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    onDeleteRequest={(id) => setPendingDelete(id)}
                    pendingDelete={pendingDelete}
                    onDeleteConfirm={handleDeleteConfirm}
                    onDeleteCancel={() => setPendingDelete(null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toast ── */}
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
