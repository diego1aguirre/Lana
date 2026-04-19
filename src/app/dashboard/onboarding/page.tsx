"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const COLORS = [
  { hex: "#1B4FD8", label: "Azul" },
  { hex: "#00C896", label: "Verde" },
  { hex: "#F59E0B", label: "Amarillo" },
  { hex: "#8B5CF6", label: "Morado" },
  { hex: "#EC4899", label: "Rosa" },
  { hex: "#EF4444", label: "Rojo" },
];

const ACCOUNT_TYPES = [
  { value: "checking", label: "Cuenta de débito" },
  { value: "savings", label: "Cuenta de ahorros" },
  { value: "credit", label: "Tarjeta de crédito" },
  { value: "cash", label: "Efectivo" },
];

const TYPE_ICONS: Record<string, string> = {
  checking: "💳",
  savings: "🏦",
  credit: "💳",
  cash: "💵",
};

interface AccountData {
  name: string;
  type: string;
  balance: string;
  color: string;
}

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className="rounded-full transition-all duration-300"
          style={{
            width: s === step ? 24 : 8,
            height: 8,
            background: s <= step ? "#1B4FD8" : "rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </div>
  );
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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState<AccountData>({
    name: "",
    type: "checking",
    balance: "",
    color: "#1B4FD8",
  });
  const [createdAccount, setCreatedAccount] = useState<AccountData | null>(null);

  // Fetch user name on mount
  useState(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "amigo";
        setUserName(name.split(" ")[0]);
      }
    })();
  });

  async function handleCreateAccount() {
    setError("");
    if (!account.name.trim()) {
      setError("El nombre de la cuenta es requerido.");
      return;
    }
    const balance = parseFloat(account.balance);
    if (isNaN(balance)) {
      setError("Ingresa un saldo válido.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Ensure profile row exists (trigger may not have fired for existing users)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: user.user_metadata?.full_name ?? null,
          monthly_income: 0,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.log("Profile upsert error:", profileError);
      // Non-fatal — continue to account creation
    }

    const icon = TYPE_ICONS[account.type] ?? "💳";

    const { error: dbError } = await supabase.from("accounts").insert({
      user_id: user.id,
      name: account.name.trim(),
      type: account.type,
      balance,
      currency: "MXN",
      color: account.color,
      icon,
      is_active: true,
    });

    setLoading(false);

    if (dbError) {
      console.log("Account insert error:", dbError);
      setError(`Error al crear la cuenta: ${dbError.message}`);
      return;
    }

    setCreatedAccount(account);
    setStep(3);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#0A0F1E" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 md:p-10"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-2">
          <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}>
            lana
          </span>
          <span className="w-1.5 h-1.5 rounded-full ml-0.5 mb-0.5 inline-block" style={{ background: "#00C896" }} />
        </div>

        <ProgressDots step={step} />

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div className="text-center">
            <div className="text-5xl mb-6">🎉</div>
            <h1
              className="text-2xl font-bold mb-3"
              style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
            >
              ¡Bienvenido a Lana{userName ? `, ${userName}` : ""}!
            </h1>
            <p
              className="text-sm leading-relaxed mb-8"
              style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
            >
              Vamos a configurar tu cuenta en 2 minutos para que puedas empezar
              a controlar tus finanzas.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.01]"
              style={{
                background: "#1B4FD8",
                color: "#fff",
                fontFamily: "var(--font-dm-sans)",
                boxShadow: "0 0 20px rgba(27,79,216,0.3)",
              }}
            >
              Empezar →
            </button>
          </div>
        )}

        {/* ── Step 2: Create account ── */}
        {step === 2 && (
          <div>
            <h1
              className="text-xl font-bold mb-1 text-center"
              style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
            >
              ¿Cuál es tu cuenta principal?
            </h1>
            <p
              className="text-sm text-center mb-6"
              style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
            >
              Puedes agregar más cuentas después
            </p>

            <div className="space-y-4">
              {/* Account name */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}>
                  Nombre de la cuenta
                </label>
                <input
                  type="text"
                  placeholder="ej. BBVA Débito"
                  value={account.name}
                  onChange={(e) => setAccount({ ...account, name: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* Account type */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}>
                  Tipo de cuenta
                </label>
                <select
                  value={account.type}
                  onChange={(e) => setAccount({ ...account, type: e.target.value })}
                  style={selectStyle}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Balance */}
              <div>
                <label className="block text-sm font-medium mb-1.5"
                  style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}>
                  Saldo actual (MXN)
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                    style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={account.balance}
                    onChange={(e) => setAccount({ ...account, balance: e.target.value })}
                    style={{ ...inputStyle, paddingLeft: "28px" }}
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium mb-2"
                  style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}>
                  Color de la cuenta
                </label>
                <div className="flex gap-2.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.label}
                      onClick={() => setAccount({ ...account, color: c.hex })}
                      className="w-8 h-8 rounded-full transition-all duration-150 flex items-center justify-center"
                      style={{
                        background: c.hex,
                        outline: account.color === c.hex ? `2px solid white` : "none",
                        outlineOffset: "2px",
                        transform: account.color === c.hex ? "scale(1.1)" : "scale(1)",
                      }}
                    >
                      {account.color === c.hex && (
                        <span className="text-white text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
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
                onClick={handleCreateAccount}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "#1B4FD8",
                  color: "#fff",
                  fontFamily: "var(--font-dm-sans)",
                  boxShadow: "0 0 20px rgba(27,79,216,0.3)",
                }}
              >
                {loading ? "Creando cuenta..." : "Continuar →"}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full py-2.5 text-sm transition-colors hover:text-white"
                style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
              >
                ← Atrás
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && createdAccount && (
          <div className="text-center">
            <div className="text-5xl mb-6">🚀</div>
            <h1
              className="text-2xl font-bold mb-3"
              style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
            >
              ¡Todo listo!
            </h1>
            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
            >
              Tu cuenta está configurada y lista para usar.
            </p>

            {/* Summary card */}
            <div
              className="rounded-xl p-4 mb-6 text-left"
              style={{ background: "#1F2937", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: createdAccount.color }}
                >
                  {TYPE_ICONS[createdAccount.type]}
                </div>
                <div>
                  <p className="text-sm font-semibold"
                    style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}>
                    {createdAccount.name}
                  </p>
                  <p className="text-xs"
                    style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}>
                    {ACCOUNT_TYPES.find((t) => t.value === createdAccount.type)?.label}
                    {" · "}
                    ${parseFloat(createdAccount.balance || "0").toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })} MXN
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.01]"
              style={{
                background: "#1B4FD8",
                color: "#fff",
                fontFamily: "var(--font-dm-sans)",
                boxShadow: "0 0 20px rgba(27,79,216,0.3)",
              }}
            >
              Ir a mi dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
