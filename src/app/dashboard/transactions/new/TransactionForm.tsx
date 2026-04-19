"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Category, Account } from "@/lib/types/database";
import Toast from "@/components/ui/Toast";

interface TransactionFormProps {
  categories: Category[];
  accounts: Account[];
  userId: string;
}

const inputStyle: React.CSSProperties = {
  background: "#1F2937",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#F9FAFB",
  borderRadius: "12px",
  fontFamily: "var(--font-dm-sans)",
  outline: "none",
  width: "100%",
  padding: "12px 16px",
  fontSize: "14px",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: 500,
  marginBottom: "6px",
  color: "#D1D5DB",
  fontFamily: "var(--font-dm-sans)",
};

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function TransactionForm({
  categories,
  accounts,
  userId,
}: TransactionFormProps) {
  const router = useRouter();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(amount);
    if (!description.trim()) { setError("La descripción es requerida."); return; }
    if (isNaN(parsed) || parsed <= 0) { setError("Ingresa un monto válido mayor a cero."); return; }
    if (!accountId) { setError("Selecciona una cuenta."); return; }
    if (!date) { setError("La fecha es requerida."); return; }

    setLoading(true);
    const supabase = createClient();

    const { error: dbError } = await supabase.from("transactions").insert({
      user_id: userId,
      type,
      description: description.trim(),
      amount: parsed,
      category_id: categoryId || null,
      account_id: accountId || null,
      date,
      notes: notes.trim() || null,
    });

    if (dbError) {
      console.log("Transaction insert error:", dbError);
      setLoading(false);
      setError("Error al guardar la transacción. Intenta de nuevo.");
      return;
    }

    // Update account balance
    if (accountId) {
      const account = accounts.find((a) => a.id === accountId);
      if (account) {
        const delta = type === "income" ? parsed : -parsed;
        await supabase
          .from("accounts")
          .update({ balance: account.balance + delta })
          .eq("id", accountId);
      }
    }

    // Show success toast, then navigate
    setToast({ message: "Transacción guardada exitosamente", type: "success" });
    setTimeout(() => {
      router.push("/dashboard/transactions");
      router.refresh();
    }, 1200);
  }

  const isIncome = type === "income";
  const accentColor = isIncome ? "#00C896" : "#FF4D6D";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type toggle */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: "#1F2937" }}
      >
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setType(t); setCategoryId(""); }}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: type === t
                ? (t === "income" ? "rgba(0,200,150,0.15)" : "rgba(255,77,109,0.15)")
                : "transparent",
              color: type === t
                ? (t === "income" ? "#00C896" : "#FF4D6D")
                : "#9CA3AF",
              fontFamily: "var(--font-dm-sans)",
              border: type === t
                ? `1px solid ${t === "income" ? "rgba(0,200,150,0.3)" : "rgba(255,77,109,0.3)"}`
                : "1px solid transparent",
            }}
          >
            {t === "expense" ? "📉 Gasto" : "📈 Ingreso"}
          </button>
        ))}
      </div>

      {/* Amount (prominent) */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: "#1F2937", border: `1px solid ${accentColor}30` }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
          Monto en MXN
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold" style={{ color: accentColor, fontFamily: "var(--font-sora)" }}>
            $
          </span>
          <input
            type="number"
            placeholder="0.00"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-transparent text-3xl font-bold text-center w-40 outline-none"
            style={{ color: "#F9FAFB", fontFamily: "var(--font-sora)" }}
            required
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Descripción</label>
        <input
          type="text"
          placeholder={isIncome ? "ej. Nómina quincenal" : "ej. Uber Eats"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={inputStyle}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Category */}
        <div>
          <label style={labelStyle}>Categoría</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={selectStyle}
          >
            <option value="">Sin categoría</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Account */}
        <div>
          <label style={labelStyle}>Cuenta</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={selectStyle}
            required
          >
            {accounts.length === 0 && (
              <option value="">Sin cuentas — agrega una primero</option>
            )}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date */}
      <div>
        <label style={labelStyle}>Fecha</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ ...inputStyle, colorScheme: "dark" }}
          required
        />
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>
          Notas{" "}
          <span style={{ color: "#6B7280", fontWeight: 400 }}>(opcional)</span>
        </label>
        <textarea
          placeholder="Añade un comentario..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(255,77,109,0.1)",
            border: "1px solid rgba(255,77,109,0.25)",
            color: "#FF4D6D",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || accounts.length === 0}
        className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "#1B4FD8",
          color: "#fff",
          fontFamily: "var(--font-dm-sans)",
          boxShadow: "0 0 20px rgba(27,79,216,0.3)",
        }}
      >
        {loading ? "Guardando..." : "Guardar transacción"}
      </button>

      <div className="text-center">
        <Link
          href="/dashboard/transactions"
          className="text-sm transition-colors hover:text-white"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          Cancelar
        </Link>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </form>
  );
}
