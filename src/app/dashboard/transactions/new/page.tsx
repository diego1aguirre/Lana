import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccounts, getCategories } from "@/lib/db/queries";
import TransactionForm from "./TransactionForm";

export default async function NewTransactionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [categories, accounts] = await Promise.all([
    getCategories(user.id),
    getAccounts(user.id),
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/transactions"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors hover:bg-white/5"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          ←
        </Link>
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
          >
            Nueva transacción
          </h1>
          <p
            className="text-xs"
            style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
          >
            Registra un gasto o ingreso manualmente
          </p>
        </div>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl block mb-3">🏦</span>
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
            >
              Necesitas al menos una cuenta
            </p>
            <p
              className="text-xs mb-6"
              style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
            >
              Agrega una cuenta antes de registrar transacciones
            </p>
            <Link
              href="/dashboard/onboarding"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
              style={{ background: "#1B4FD8", color: "#fff", fontFamily: "var(--font-dm-sans)" }}
            >
              + Agregar cuenta
            </Link>
          </div>
        ) : (
          <TransactionForm
            categories={categories}
            accounts={accounts}
            userId={user.id}
          />
        )}
      </div>
    </div>
  );
}
