import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WeeklyChart from "./components/WeeklyChart";
import CategoryChart from "./components/CategoryChart";
import { formatMXN } from "@/lib/design-tokens";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
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

// Capitalise first letter
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  subColor,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  subColor: string;
}) {
  return (
    <div
      className="card-hover rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          {label}
        </span>
        <span className="text-xl">{icon}</span>
      </div>
      <p
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
      >
        {value}
      </p>
      <p className="text-xs" style={{ color: subColor, fontFamily: "var(--font-dm-sans)" }}>
        {sub}
      </p>
    </div>
  );
}

// ─── Recent transactions ──────────────────────────────────────────────────────

const transactions = [
  { emoji: "🍔", merchant: "McDonald's", category: "Comida", date: "Hoy", amount: -187.0 },
  { emoji: "💰", merchant: "Depósito nómina", category: "Ingresos", date: "Ayer", amount: 14250.0 },
  { emoji: "🚗", merchant: "Uber", category: "Transporte", date: "Ayer", amount: -94.0 },
  { emoji: "🛒", merchant: "Walmart", category: "Supermercado", date: "15 abr", amount: -1243.5 },
  { emoji: "🎬", merchant: "Netflix", category: "Entretenimiento", date: "14 abr", amount: -219.0 },
  { emoji: "⚡", merchant: "CFE", category: "Servicios", date: "13 abr", amount: -487.0 },
];

function RecentTransactions() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-base font-bold"
          style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
        >
          Últimas transacciones
        </h2>
        <a
          href="/dashboard/transactions"
          className="text-xs font-semibold transition-colors hover:text-white"
          style={{ color: "#1B4FD8", fontFamily: "var(--font-dm-sans)" }}
        >
          Ver todas →
        </a>
      </div>

      <div className="space-y-2">
        {transactions.map((tx, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors duration-150 hover:bg-white/[0.02]"
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: "#1F2937" }}
              >
                {tx.emoji}
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
                >
                  {tx.merchant}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
                >
                  {tx.category} · {tx.date}
                </p>
              </div>
            </div>
            <span
              className="text-sm font-bold"
              style={{
                color: tx.amount > 0 ? "#00C896" : "#FF4D6D",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {tx.amount > 0 ? "+" : ""}
              {formatMXN(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Budget progress ───────────────────────────────────────────────────────────

const budgets = [
  { label: "Comida", spent: 4120, limit: 5000, color: "#F59E0B" },
  { label: "Transporte", spent: 1840, limit: 3000, color: "#00C896" },
  { label: "Entretenimiento", spent: 2890, limit: 2500, color: "#FF4D6D" },
];

function BudgetProgress() {
  return (
    <section>
      <h2
        className="text-base font-bold mb-4"
        style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
      >
        Presupuestos del mes
      </h2>

      <div className="space-y-3">
        {budgets.map((b) => {
          const pct = Math.min((b.spent / b.limit) * 100, 100);
          const over = b.spent > b.limit;

          return (
            <div
              key={b.label}
              className="rounded-2xl p-5"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
                  >
                    {b.label}
                  </span>
                  {over && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(255,77,109,0.15)", color: "#FF4D6D" }}
                    >
                      ¡Límite superado!
                    </span>
                  )}
                </div>
                <span
                  className="text-xs"
                  style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
                >
                  {formatMXN(b.spent)}{" "}
                  <span style={{ color: "#6B7280" }}>/ {formatMXN(b.limit)}</span>
                </span>
              </div>

              {/* Track */}
              <div className="w-full h-2 rounded-full" style={{ background: "#1F2937" }}>
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: b.color }}
                />
              </div>

              <p
                className="text-xs mt-2"
                style={{
                  color: over ? "#FF4D6D" : b.color,
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {over
                  ? `Superado por ${formatMXN(b.spent - b.limit)}`
                  : `${Math.round(pct)}% utilizado`}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const fullName: string = user.user_metadata?.full_name ?? "";
  const email: string = user.email ?? "";
  const firstName = (fullName || email.split("@")[0]).split(" ")[0];

  const greeting = getGreeting();
  const dateStr = cap(getSpanishDate());

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Header ── */}
      <header>
        <h1
          className="text-2xl lg:text-3xl font-bold mb-1"
          style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
        >
          {greeting}, {cap(firstName)} 👋
        </h1>
        <p className="text-sm" style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
          {dateStr} · Aquí está el resumen de tus finanzas
        </p>
      </header>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon="💰"
          label="Saldo total"
          value={formatMXN(47382.5)}
          sub="+2.4% este mes"
          subColor="#00C896"
        />
        <StatCard
          icon="📉"
          label="Gastos de abril"
          value={formatMXN(12840)}
          sub="68% del presupuesto"
          subColor="#F59E0B"
        />
        <StatCard
          icon="📈"
          label="Ingresos de abril"
          value={formatMXN(28500)}
          sub="Nómina + freelance"
          subColor="#00C896"
        />
        <StatCard
          icon="🏦"
          label="Ahorrado este mes"
          value={formatMXN(8200)}
          sub="Meta: $10,000"
          subColor="#9CA3AF"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Weekly bar chart — 60% */}
        <div
          className="lg:col-span-3 rounded-2xl p-6"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <h2
            className="text-base font-bold mb-5"
            style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
          >
            Gastos por semana
          </h2>
          <WeeklyChart />
        </div>

        {/* Category donut — 40% */}
        <div
          className="lg:col-span-2 rounded-2xl p-6"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <h2
            className="text-base font-bold mb-5"
            style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
          >
            Por categoría
          </h2>
          <CategoryChart />
        </div>
      </div>

      {/* ── Transactions + Budgets ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <RecentTransactions />
        </div>
        <div className="lg:col-span-2">
          <BudgetProgress />
        </div>
      </div>
    </div>
  );
}
