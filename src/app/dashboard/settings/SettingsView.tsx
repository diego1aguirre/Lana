"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Account } from "@/lib/types/database";
import Toast from "@/components/ui/Toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMXN(n: number) {
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Cuenta de débito",
  savings: "Ahorros",
  credit: "Crédito",
  cash: "Efectivo",
};

const COLORS = ["#1B4FD8", "#00C896", "#FF4D6D", "#F59E0B", "#8B5CF6", "#EC4899"];

const ACCOUNT_ICONS = ["🏦", "💳", "💵", "🏧", "💰", "🏪"];

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "#1F2937",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#F9FAFB",
  borderRadius: "12px",
  fontFamily: "var(--font-dm-sans)",
  outline: "none",
  width: "100%",
  padding: "11px 14px",
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "perfil" | "cuentas" | "seguridad" | "danger";

interface SettingsViewProps {
  userId: string;
  email: string;
  initialProfile: Profile | null;
  initialAccounts: Account[];
}

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────

function TabPerfil({
  userId,
  email,
  profile,
  onToast,
}: {
  userId: string;
  email: string;
  profile: Profile | null;
  onToast: (msg: string, type: "success" | "error") => void;
}) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [monthlyIncome, setMonthlyIncome] = useState(String(profile?.monthly_income ?? ""));
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName.trim() || null,
        monthly_income: parseFloat(monthlyIncome) || 0,
      },
      { onConflict: "id" }
    );
    setSaving(false);
    if (error) {
      console.log("Profile save error:", error);
      onToast("Error al guardar el perfil.", "error");
    } else {
      onToast("Perfil actualizado ✓", "success");
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-sora)", fontSize: "16px", fontWeight: 700, color: "#F9FAFB", marginBottom: "24px" }}>
        Información personal
      </h2>

      {/* Avatar */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
        <div style={{
          width: 80, height: 80,
          borderRadius: "50%",
          background: "#1B4FD8",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-sora)",
          fontSize: "28px",
          fontWeight: 700,
          color: "#fff",
          border: "3px solid rgba(27,79,216,0.4)",
          boxShadow: "0 0 24px rgba(27,79,216,0.3)",
        }}>
          {initials(fullName || (profile?.full_name ?? null))}
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={labelStyle}>Nombre completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tu nombre"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            disabled
            style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }}
          />
          <p style={{ fontSize: "12px", color: "#4B5563", marginTop: "4px", fontFamily: "var(--font-dm-sans)" }}>
            El email no puede cambiarse desde aquí.
          </p>
        </div>

        <div>
          <label style={labelStyle}>Ingreso mensual (MXN)</label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
              color: "#6B7280", fontSize: "14px", fontFamily: "var(--font-sora)",
            }}>$</span>
            <input
              type="number"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{ ...inputStyle, paddingLeft: "26px" }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            background: "#1B4FD8",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "12px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            fontFamily: "var(--font-dm-sans)",
            boxShadow: "0 0 20px rgba(27,79,216,0.3)",
            marginTop: "4px",
          }}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  onToast,
  onRefresh,
}: {
  account: Account;
  onToast: (msg: string, type: "success" | "error") => void;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(String(account.balance));
  const [color, setColor] = useState(account.color);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("accounts")
      .update({ name: name.trim(), balance: parseFloat(balance) || 0, color })
      .eq("id", account.id);
    setSaving(false);
    if (error) {
      console.log("Account update error:", error);
      onToast("Error al actualizar la cuenta.", "error");
    } else {
      onToast("Cuenta actualizada ✓", "success");
      setEditing(false);
      onRefresh();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("accounts")
      .update({ is_active: false })
      .eq("id", account.id);
    setDeleting(false);
    if (error) {
      console.log("Account delete error:", error);
      onToast("Error al eliminar la cuenta.", "error");
    } else {
      onToast("Cuenta eliminada.", "success");
      onRefresh();
    }
  }

  return (
    <div style={{
      background: "#0D1117",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "14px",
      overflow: "hidden",
    }}>
      {/* Main row */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Color dot + icon */}
        <div style={{
          width: 40, height: 40, borderRadius: "12px", flexShrink: 0,
          background: `${account.color}20`,
          border: `1px solid ${account.color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px",
        }}>
          {account.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#F9FAFB", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {account.name}
          </p>
          <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0", fontFamily: "var(--font-dm-sans)" }}>
            {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
          </p>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{
            fontFamily: "var(--font-sora)",
            fontSize: "15px",
            fontWeight: 700,
            color: account.balance >= 0 ? "#00C896" : "#FF4D6D",
            margin: 0,
          }}>
            {fmtMXN(account.balance)}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <button
            onClick={() => { setEditing((e) => !e); setConfirmDelete(false); }}
            title="Editar"
            style={{
              background: editing ? "rgba(27,79,216,0.2)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${editing ? "rgba(27,79,216,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "8px",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: "14px",
              color: editing ? "#60A5FA" : "#6B7280",
              transition: "all 0.15s",
            }}
          >
            ✏️
          </button>
          <button
            onClick={() => { setConfirmDelete((c) => !c); setEditing(false); }}
            title="Eliminar"
            style={{
              background: confirmDelete ? "rgba(255,77,109,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${confirmDelete ? "rgba(255,77,109,0.3)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "8px",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: "14px",
              color: confirmDelete ? "#FF4D6D" : "#6B7280",
              transition: "all 0.15s",
            }}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{
          borderTop: "1px solid rgba(255,77,109,0.2)",
          background: "rgba(255,77,109,0.05)",
          padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <p style={{ fontSize: "13px", color: "#FCA5A5", fontFamily: "var(--font-dm-sans)", margin: 0 }}>
            ¿Eliminar &ldquo;{account.name}&rdquo;?
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                background: "#FF4D6D",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.6 : 1,
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {deleting ? "..." : "Sí, eliminar"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#9CA3AF",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{
          borderTop: "1px solid rgba(27,79,216,0.2)",
          background: "rgba(27,79,216,0.04)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <div>
            <label style={{ ...labelStyle, fontSize: "12px" }}>Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ ...inputStyle, padding: "9px 12px", fontSize: "13px" }}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: "12px" }}>Balance (MXN)</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              step="0.01"
              style={{ ...inputStyle, padding: "9px 12px", fontSize: "13px" }}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: "12px" }}>Color</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28,
                    borderRadius: "50%",
                    background: c,
                    border: color === c ? "3px solid #fff" : "3px solid transparent",
                    cursor: "pointer",
                    boxShadow: color === c ? `0 0 8px ${c}` : "none",
                    transition: "all 0.15s",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: "#1B4FD8",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "9px 20px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#9CA3AF",
                padding: "9px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add account form ─────────────────────────────────────────────────────────

function AddAccountForm({
  userId,
  onToast,
  onRefresh,
  onCancel,
}: {
  userId: string;
  onToast: (msg: string, type: "success" | "error") => void;
  onRefresh: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ACCOUNT_ICONS[0]);
  const [type, setType] = useState<Account["type"]>("checking");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();

    // Ensure profile exists
    await supabase.from("profiles").upsert({ id: userId, full_name: null, monthly_income: 0 }, { onConflict: "id" });

    const { error } = await supabase.from("accounts").insert({
      user_id: userId,
      name: name.trim(),
      balance: parseFloat(balance) || 0,
      color,
      icon,
      type,
      currency: "MXN",
      is_active: true,
    });
    setSaving(false);
    if (error) {
      console.log("Account create error:", error);
      onToast("Error al crear la cuenta.", "error");
    } else {
      onToast("Cuenta creada ✓", "success");
      onRefresh();
      onCancel();
    }
  }

  return (
    <form
      onSubmit={handleSave}
      style={{
        background: "rgba(27,79,216,0.06)",
        border: "1px solid rgba(27,79,216,0.2)",
        borderRadius: "14px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <p style={{ fontFamily: "var(--font-sora)", fontSize: "14px", fontWeight: 600, color: "#F9FAFB", margin: 0 }}>
        Nueva cuenta
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label style={{ ...labelStyle, fontSize: "12px" }}>Nombre</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi cuenta" style={{ ...inputStyle, padding: "9px 12px", fontSize: "13px" }} required />
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: "12px" }}>Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Account["type"])}
            style={{ ...inputStyle, padding: "9px 12px", fontSize: "13px", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
          >
            <option value="checking">Débito</option>
            <option value="savings">Ahorros</option>
            <option value="credit">Crédito</option>
            <option value="cash">Efectivo</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ ...labelStyle, fontSize: "12px" }}>Balance inicial (MXN)</label>
        <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" step="0.01" style={{ ...inputStyle, padding: "9px 12px", fontSize: "13px" }} />
      </div>
      <div>
        <label style={{ ...labelStyle, fontSize: "12px" }}>Ícono</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {ACCOUNT_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              style={{
                width: 36, height: 36,
                borderRadius: "10px",
                fontSize: "18px",
                border: icon === ic ? "2px solid #1B4FD8" : "2px solid rgba(255,255,255,0.08)",
                background: icon === ic ? "rgba(27,79,216,0.2)" : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ ...labelStyle, fontSize: "12px" }}>Color</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: 28, height: 28,
                borderRadius: "50%",
                background: c,
                border: color === c ? "3px solid #fff" : "3px solid transparent",
                cursor: "pointer",
                boxShadow: color === c ? `0 0 8px ${c}` : "none",
                transition: "all 0.15s",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: "#1B4FD8",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "9px 20px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          {saving ? "Guardando..." : "Crear cuenta"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            color: "#9CA3AF",
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-dm-sans)",
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Tab: Cuentas ─────────────────────────────────────────────────────────────

function TabCuentas({
  userId,
  initialAccounts,
  onToast,
}: {
  userId: string;
  initialAccounts: Account[];
  onToast: (msg: string, type: "success" | "error") => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [showAdd, setShowAdd] = useState(false);

  async function refreshAccounts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    setAccounts((data as Account[]) ?? []);
  }

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-sora)", fontSize: "16px", fontWeight: 700, color: "#F9FAFB", marginBottom: "20px" }}>
        Mis cuentas
      </h2>

      {accounts.length === 0 && !showAdd && (
        <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "16px", fontFamily: "var(--font-dm-sans)" }}>
          No tienes cuentas activas.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
        {accounts.map((acc) => (
          <AccountCard
            key={acc.id}
            account={acc}
            onToast={onToast}
            onRefresh={refreshAccounts}
          />
        ))}
      </div>

      {showAdd ? (
        <AddAccountForm
          userId={userId}
          onToast={onToast}
          onRefresh={refreshAccounts}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: "100%",
            background: "rgba(27,79,216,0.08)",
            border: "1px dashed rgba(27,79,216,0.3)",
            borderRadius: "12px",
            color: "#60A5FA",
            padding: "12px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-dm-sans)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span> Agregar cuenta
        </button>
      )}
    </div>
  );
}

// ─── Tab: Seguridad ───────────────────────────────────────────────────────────

function TabSeguridad({
  onToast,
}: {
  onToast: (msg: string, type: "success" | "error") => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const allValid = checks.length && checks.upper && checks.number;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allValid) { onToast("La contraseña no cumple los requisitos.", "error"); return; }
    if (password !== confirm) { onToast("Las contraseñas no coinciden.", "error"); return; }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      console.log("Password update error:", error);
      onToast("Error al actualizar. Intenta de nuevo.", "error");
    } else {
      onToast("Contraseña actualizada. Revisa tu email para confirmar.", "success");
      setPassword("");
      setConfirm("");
    }
  }

  const checkStyle = (ok: boolean): React.CSSProperties => ({
    fontSize: "13px",
    color: ok ? "#00C896" : "#6B7280",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "var(--font-dm-sans)",
    transition: "color 0.2s",
  });

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-sora)", fontSize: "16px", fontWeight: 700, color: "#F9FAFB", marginBottom: "24px" }}>
        Cambiar contraseña
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={labelStyle}>Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
            autoComplete="new-password"
          />
        </div>

        {/* Requirements */}
        {password.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}>
            <p style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 600, marginBottom: "4px", fontFamily: "var(--font-dm-sans)" }}>
              Requisitos
            </p>
            <div style={checkStyle(checks.length)}>
              <span>{checks.length ? "✓" : "○"}</span> Mínimo 8 caracteres
            </div>
            <div style={checkStyle(checks.upper)}>
              <span>{checks.upper ? "✓" : "○"}</span> Al menos una mayúscula
            </div>
            <div style={checkStyle(checks.number)}>
              <span>{checks.number ? "✓" : "○"}</span> Al menos un número
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Confirmar contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            style={{
              ...inputStyle,
              border: confirm && confirm !== password
                ? "1px solid rgba(255,77,109,0.5)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
            autoComplete="new-password"
          />
          {confirm && confirm !== password && (
            <p style={{ fontSize: "12px", color: "#FF4D6D", marginTop: "4px", fontFamily: "var(--font-dm-sans)" }}>
              Las contraseñas no coinciden
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !allValid || password !== confirm}
          style={{
            background: "#1B4FD8",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "12px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: (saving || !allValid || password !== confirm) ? "not-allowed" : "pointer",
            opacity: (saving || !allValid || password !== confirm) ? 0.5 : 1,
            fontFamily: "var(--font-dm-sans)",
            boxShadow: "0 0 20px rgba(27,79,216,0.3)",
            marginTop: "4px",
          }}
        >
          {saving ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </form>
    </div>
  );
}

// ─── Tab: Danger Zone ─────────────────────────────────────────────────────────

function TabDanger({
  userId,
  onToast,
}: {
  userId: string;
  onToast: (msg: string, type: "success" | "error") => void;
}) {
  const router = useRouter();
  const [deleteMode, setDeleteMode] = useState<"transactions" | "account" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignOutAll() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    router.push("/login");
  }

  async function handleDeleteTransactions() {
    if (confirmText !== "ELIMINAR") return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("user_id", userId);
    setLoading(false);
    if (error) {
      console.log("Delete transactions error:", error);
      onToast("Error al eliminar las transacciones.", "error");
    } else {
      onToast("Todas las transacciones eliminadas.", "success");
      setDeleteMode(null);
      setConfirmText("");
    }
  }

  async function handleDeleteAccount() {
    if (confirmText !== "ELIMINAR CUENTA") return;
    setLoading(true);
    const supabase = createClient();
    // Delete profile (cascades to all user data via FK)
    await supabase.from("profiles").delete().eq("id", userId);
    await supabase.auth.signOut();
    router.push("/");
  }

  const dangerBtn: React.CSSProperties = {
    width: "100%",
    border: "1px solid rgba(255,77,109,0.35)",
    background: "transparent",
    color: "#FF4D6D",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-dm-sans)",
    textAlign: "left",
    transition: "background 0.15s",
  };

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-sora)", fontSize: "16px", fontWeight: 700, color: "#FF4D6D", marginBottom: "8px" }}>
        ⚠️ Zona de peligro
      </h2>
      <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "24px", fontFamily: "var(--font-dm-sans)" }}>
        Las siguientes acciones son permanentes. Procede con cuidado.
      </p>

      <div style={{
        border: "1px solid rgba(255,77,109,0.2)",
        borderRadius: "16px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "1px",
        background: "rgba(255,77,109,0.04)",
      }}>
        {/* Sign out all devices */}
        <div style={{ padding: "16px 20px" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#F9FAFB", fontFamily: "var(--font-dm-sans)", marginBottom: "2px" }}>
                Cerrar sesión en todos los dispositivos
              </p>
              <p style={{ fontSize: "12px", color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}>
                Revoca todas las sesiones activas de tu cuenta.
              </p>
            </div>
            <button
              onClick={handleSignOutAll}
              style={{ ...dangerBtn, width: "auto", padding: "8px 16px", flexShrink: 0 }}
            >
              Cerrar todas las sesiones
            </button>
          </div>
        </div>

        <div style={{ height: "1px", background: "rgba(255,77,109,0.15)" }} />

        {/* Delete all transactions */}
        <div style={{ padding: "16px 20px" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap" style={{ marginBottom: deleteMode === "transactions" ? "16px" : 0 }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#F9FAFB", fontFamily: "var(--font-dm-sans)", marginBottom: "2px" }}>
                Eliminar todas las transacciones
              </p>
              <p style={{ fontSize: "12px", color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}>
                Borra permanentemente todo tu historial de movimientos.
              </p>
            </div>
            <button
              onClick={() => { setDeleteMode(deleteMode === "transactions" ? null : "transactions"); setConfirmText(""); }}
              style={{ ...dangerBtn, width: "auto", padding: "8px 16px", flexShrink: 0 }}
            >
              Eliminar transacciones
            </button>
          </div>
          {deleteMode === "transactions" && (
            <div style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: "12px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#FCA5A5", marginBottom: "10px", fontFamily: "var(--font-dm-sans)" }}>
                Escribe <strong>ELIMINAR</strong> para confirmar:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ELIMINAR"
                style={{ ...inputStyle, marginBottom: "10px", borderColor: "rgba(255,77,109,0.3)" }}
              />
              <button
                onClick={handleDeleteTransactions}
                disabled={confirmText !== "ELIMINAR" || loading}
                style={{
                  background: confirmText === "ELIMINAR" ? "#FF4D6D" : "rgba(255,77,109,0.2)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "9px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: confirmText === "ELIMINAR" ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {loading ? "Eliminando..." : "Confirmar eliminación"}
              </button>
            </div>
          )}
        </div>

        <div style={{ height: "1px", background: "rgba(255,77,109,0.15)" }} />

        {/* Delete account */}
        <div style={{ padding: "16px 20px" }}>
          <div className="flex items-start justify-between gap-4 flex-wrap" style={{ marginBottom: deleteMode === "account" ? "16px" : 0 }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#FF4D6D", fontFamily: "var(--font-dm-sans)", marginBottom: "2px" }}>
                Eliminar cuenta permanentemente
              </p>
              <p style={{ fontSize: "12px", color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}>
                Elimina tu perfil y todos tus datos. Esta acción es <strong style={{ color: "#FF4D6D" }}>permanente e irreversible</strong>.
              </p>
            </div>
            <button
              onClick={() => { setDeleteMode(deleteMode === "account" ? null : "account"); setConfirmText(""); }}
              style={{
                ...dangerBtn,
                width: "auto",
                padding: "8px 16px",
                background: "rgba(255,77,109,0.15)",
                flexShrink: 0,
              }}
            >
              Eliminar mi cuenta
            </button>
          </div>
          {deleteMode === "account" && (
            <div style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: "12px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#FCA5A5", marginBottom: "10px", fontFamily: "var(--font-dm-sans)" }}>
                Escribe <strong>ELIMINAR CUENTA</strong> para confirmar:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ELIMINAR CUENTA"
                style={{ ...inputStyle, marginBottom: "10px", borderColor: "rgba(255,77,109,0.3)" }}
              />
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== "ELIMINAR CUENTA" || loading}
                style={{
                  background: confirmText === "ELIMINAR CUENTA" ? "#FF4D6D" : "rgba(255,77,109,0.2)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "9px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: confirmText === "ELIMINAR CUENTA" ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                {loading ? "Eliminando..." : "Eliminar mi cuenta definitivamente"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsView({
  userId,
  email,
  initialProfile,
  initialAccounts,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("perfil");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: "perfil", label: "Perfil" },
    { key: "cuentas", label: "Cuentas" },
    { key: "seguridad", label: "Seguridad" },
    { key: "danger", label: "Danger Zone" },
  ];

  function handleToast(msg: string, type: "success" | "error") {
    setToast({ message: msg, type });
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0F1E",
      padding: "24px 24px 48px",
      fontFamily: "var(--font-dm-sans)",
    }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-sora)", fontSize: "22px", fontWeight: 700, color: "#F9FAFB", margin: 0 }}>
          Configuración
        </h1>
        <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>
          Administra tu perfil, cuentas y preferencias
        </p>
      </div>

      {/* Tab nav */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        marginBottom: "28px",
        gap: "0",
        overflowX: "auto",
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isDanger = tab.key === "danger";
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "var(--font-dm-sans)",
                background: "none",
                border: "none",
                borderBottom: isActive
                  ? `2px solid ${isDanger ? "#FF4D6D" : "#1B4FD8"}`
                  : "2px solid transparent",
                color: isActive
                  ? isDanger ? "#FF4D6D" : "#F9FAFB"
                  : isDanger ? "rgba(255,77,109,0.6)" : "#9CA3AF",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                marginBottom: "-1px",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = isDanger ? "#FF4D6D" : "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = isDanger ? "rgba(255,77,109,0.6)" : "#9CA3AF";
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "20px",
        padding: "28px 24px",
        maxWidth: "600px",
      }}>
        {activeTab === "perfil" && (
          <TabPerfil
            userId={userId}
            email={email}
            profile={initialProfile}
            onToast={handleToast}
          />
        )}
        {activeTab === "cuentas" && (
          <TabCuentas
            userId={userId}
            initialAccounts={initialAccounts}
            onToast={handleToast}
          />
        )}
        {activeTab === "seguridad" && (
          <TabSeguridad onToast={handleToast} />
        )}
        {activeTab === "danger" && (
          <TabDanger userId={userId} onToast={handleToast} />
        )}
      </div>

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
