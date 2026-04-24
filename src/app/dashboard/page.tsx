import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getAccounts,
  getTotalBalance,
  getMonthlyExpenses,
  getMonthlyIncome,
  getExpensesByCategory,
  getWeeklyExpenses,
  getTransactions,
  getBudgets,
} from "@/lib/db/queries";
import { formatMXN } from "@/lib/design-tokens";
import WeeklyChart from "./components/WeeklyChart";
import CategoryChart from "./components/CategoryChart";
import PageTransition from "@/components/ui/PageTransition";
import type { Transaction, BudgetWithSpent } from "@/lib/types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getSpanishDate() {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getMonthName(month: number, year: number) {
  return new Date(year, month - 1).toLocaleDateString("es-MX", { month: "long" });
}

function budgetColor(spent: number, limit: number) {
  const pct = (spent / limit) * 100;
  if (pct > 100) return "#FF4D6D";
  if (pct > 80) return "#F59E0B";
  return "#00C896";
}

function txDate(dateStr: string) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];

  if (dateStr === todayStr) return "Hoy";
  if (dateStr === yStr) return "Ayer";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, subColor,
}: {
  icon: string; label: string; value: string; sub: string; subColor: string;
}) {
  return (
    <div
      className="card-hover rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
          {label}
        </span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold"
        style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: subColor, fontFamily: "var(--font-dm-sans)" }}>
        {sub}
      </p>
    </div>
  );
}

function EmptyState({ icon, title, sub, href, cta }: {
  icon: string; title: string; sub: string; href: string; cta: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl"
      style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm font-semibold mb-1"
        style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}>{title}</p>
      <p className="text-xs mb-5" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>{sub}</p>
      <Link href={href}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
        style={{ background: "#1B4FD8", color: "#fff", fontFamily: "var(--font-dm-sans)" }}>
        {cta}
      </Link>
    </div>
  );
}

function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  if (!transactions.length) {
    return (
      <EmptyState
        icon="💸"
        title="Aún no hay transacciones"
        sub="¡Agrega una para empezar a rastrear tus gastos!"
        href="/dashboard/transactions/new"
        cta="+ Nueva transacción"
      />
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div key={tx.id}
          className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors duration-150 hover:bg-white/[0.02]"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: "#1F2937" }}>
              {tx.category?.icon ?? "💳"}
            </div>
            <div>
              <p className="text-sm font-semibold"
                style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}>
                {tx.description}
              </p>
              <p className="text-xs" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
                {tx.category?.name ?? "Sin categoría"} · {txDate(tx.date)}
              </p>
            </div>
          </div>
          <span className="text-sm font-bold"
            style={{
              color: tx.type === "income" ? "#00C896" : "#FF4D6D",
              fontFamily: "var(--font-dm-sans)",
            }}>
            {tx.type === "income" ? "+" : "−"}
            {formatMXN(Math.abs(tx.amount))}
          </span>
        </div>
      ))}
    </div>
  );
}

function BudgetProgress({ budgets }: { budgets: BudgetWithSpent[] }) {
  if (!budgets.length) {
    return (
      <EmptyState
        icon="🎯"
        title="Sin presupuestos"
        sub="Define límites por categoría para controlar tus gastos"
        href="/dashboard/budgets"
        cta="+ Crear presupuesto"
      />
    );
  }

  return (
    <div className="space-y-3">
      {budgets.map((b) => {
        const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
        const over = b.spent > b.amount;
        const color = budgetColor(b.spent, b.amount);

        return (
          <div key={b.id} className="rounded-2xl p-5"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold"
                  style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}>
                  {b.category?.icon} {b.category?.name ?? "Sin categoría"}
                </span>
                {over && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,77,109,0.15)", color: "#FF4D6D" }}>
                    ¡Límite superado!
                  </span>
                )}
              </div>
              <span className="text-xs" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
                {formatMXN(b.spent)}{" "}
                <span style={{ color: "#6B7280" }}>/ {formatMXN(b.amount)}</span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: "#1F2937" }}>
              <div className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: color }} />
            </div>
            <p className="text-xs mt-2" style={{ color, fontFamily: "var(--font-dm-sans)" }}>
              {over
                ? `Superado por ${formatMXN(b.spent - b.amount)}`
                : `${Math.round(pct)}% utilizado`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthName = getMonthName(month, year);

  // Fetch all data in parallel
  const [
    accounts,
    totalBalance,
    expenses,
    income,
    categoryData,
    weeklyData,
    recentTxs,
    budgets,
  ] = await Promise.all([
    getAccounts(user.id),
    getTotalBalance(user.id),
    getMonthlyExpenses(user.id, month, year),
    getMonthlyIncome(user.id, month, year),
    getExpensesByCategory(user.id, month, year),
    getWeeklyExpenses(user.id, month, year),
    getTransactions(user.id, 6),
    getBudgets(user.id, month, year),
  ]);

  const hasNoAccounts = accounts.length === 0;
  const savings = income - expenses;
  const budgetTotal = budgets.reduce((s, b) => s + b.amount, 0);
  const budgetPctUsed = budgetTotal > 0 ? Math.round((expenses / budgetTotal) * 100) : 0;

  const fullName: string = user.user_metadata?.full_name ?? "";
  const email: string = user.email ?? "";
  const firstName = cap((fullName || email.split("@")[0]).split(" ")[0]);

  const totalLabel = monthName;
  const categoryTotalLabel =
    "$" +
    expenses.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <PageTransition>
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-1"
            style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
            {cap(getSpanishDate())} · Aquí está el resumen de tus finanzas
          </p>
        </div>
        <Link href="/dashboard/transactions/new"
          className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
          style={{ background: "#1B4FD8", color: "#fff", fontFamily: "var(--font-dm-sans)" }}>
          + Nueva
        </Link>
      </header>

      {/* ── No accounts empty state ── */}
      {hasNoAccounts ? (
        <EmptyState
          icon="🏦"
          title="Agrega tu primera cuenta para empezar"
          sub="Conecta tus cuentas bancarias y empieza a rastrear tus finanzas"
          href="/dashboard/onboarding"
          cta="+ Agregar cuenta"
        />
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon="💰"
              label="Saldo total"
              value={formatMXN(totalBalance)}
              sub={accounts.length === 1 ? "1 cuenta activa" : `${accounts.length} cuentas activas`}
              subColor="#00C896"
            />
            <StatCard
              icon="📉"
              label={`Gastos de ${monthName}`}
              value={formatMXN(expenses)}
              sub={budgetTotal > 0 ? `${budgetPctUsed}% del presupuesto` : "Sin presupuesto definido"}
              subColor={budgetPctUsed > 80 ? "#F59E0B" : "#9CA3AF"}
            />
            <StatCard
              icon="📈"
              label={`Ingresos de ${monthName}`}
              value={formatMXN(income)}
              sub={income > 0 ? "Registrados este mes" : "Sin ingresos aún"}
              subColor="#00C896"
            />
            <StatCard
              icon="🏦"
              label="Balance del mes"
              value={formatMXN(Math.abs(savings))}
              sub={savings >= 0 ? "Positivo este mes 🎉" : "Gastos mayores a ingresos"}
              subColor={savings >= 0 ? "#00C896" : "#FF4D6D"}
            />
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 rounded-2xl p-6"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}>
              <h2 className="text-base font-bold mb-5"
                style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
                Gastos por semana
              </h2>
              <WeeklyChart data={weeklyData} totalLabel={totalLabel} />
            </div>

            <div className="lg:col-span-2 rounded-2xl p-6"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}>
              <h2 className="text-base font-bold mb-5"
                style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
                Por categoría
              </h2>
              <CategoryChart data={categoryData} totalLabel={categoryTotalLabel} />
            </div>
          </div>

          {/* ── Transactions + Budgets ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <section className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold"
                  style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
                  Últimas transacciones
                </h2>
                <Link href="/dashboard/transactions"
                  className="text-xs font-semibold transition-colors hover:text-white"
                  style={{ color: "#1B4FD8", fontFamily: "var(--font-dm-sans)" }}>
                  Ver todas →
                </Link>
              </div>
              <RecentTransactions transactions={recentTxs} />
            </section>

            <section className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold"
                  style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
                  Presupuestos del mes
                </h2>
                <Link href="/dashboard/budgets"
                  className="text-xs font-semibold transition-colors hover:text-white"
                  style={{ color: "#1B4FD8", fontFamily: "var(--font-dm-sans)" }}>
                  Gestionar →
                </Link>
              </div>
              <BudgetProgress budgets={budgets} />
            </section>
          </div>
        </>
      )}
    </div>
    </PageTransition>
  );
}
