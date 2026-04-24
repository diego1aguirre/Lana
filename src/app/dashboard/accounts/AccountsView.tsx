"use client";

import { useState, useCallback } from "react";
// useCallback retained for refreshAccounts / refreshLinks
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Account } from "@/lib/types/database";
import type { BelvoLink } from "./page";
import Toast from "@/components/ui/Toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMXN(n: number) {
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2 });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Débito",
  savings: "Ahorros",
  credit: "Crédito",
  cash: "Efectivo",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface AccountsViewProps {
  userId: string;
  initialAccounts: Account[];
  initialBelvoLinks: BelvoLink[];
}

export default function AccountsView({
  userId,
  initialAccounts,
  initialBelvoLinks,
}: AccountsViewProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [belvoLinks, setBelvoLinks] = useState<BelvoLink[]>(initialBelvoLinks);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Refresh accounts from Supabase
  const refreshAccounts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    setAccounts((data as Account[]) ?? []);
  }, [userId]);

  // Refresh belvo links
  const refreshLinks = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("belvo_links")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setBelvoLinks((data as BelvoLink[]) ?? []);
  }, [userId]);

  // ── Sync a Belvo link ─────────────────────────────────────────────────────

  async function handleSync(linkId: string, institutionName: string | null) {
    setSyncingId(linkId);
    try {
      const res = await fetch("/api/belvo/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_id: linkId }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = `${institutionName ?? "Banco"}: ${data.transactions_synced} transacciones sincronizadas`;
        setToast({ message: msg, type: "success" });
        await Promise.all([refreshLinks(), refreshAccounts()]);
      } else {
        setToast({ message: data.error ?? "Error al sincronizar.", type: "error" });
      }
    } catch {
      setToast({ message: "Error de red al sincronizar.", type: "error" });
    }
    setSyncingId(null);
  }

  // ── Disconnect a Belvo link ───────────────────────────────────────────────

  async function handleDisconnect(linkId: string) {
    setDisconnectingId(linkId);
    const supabase = createClient();
    const { error } = await supabase
      .from("belvo_links")
      .delete()
      .eq("link_id", linkId)
      .eq("user_id", userId);
    if (error) {
      setToast({ message: "Error al desconectar.", type: "error" });
    } else {
      setToast({ message: "Banco desconectado.", type: "success" });
      await refreshLinks();
    }
    setDisconnectingId(null);
  }

  // ─────────────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: "#111827",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "16px",
    padding: "16px 18px",
  };

  const btnOutline: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "9px",
    color: "#9CA3AF",
    fontSize: "12px",
    fontWeight: 600,
    padding: "6px 12px",
    cursor: "pointer",
    fontFamily: "var(--font-dm-sans)",
    transition: "all 0.15s",
  };

  const btnBlue: React.CSSProperties = {
    background: "#1B4FD8",
    border: "none",
    borderRadius: "9px",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 600,
    padding: "6px 12px",
    cursor: "pointer",
    fontFamily: "var(--font-dm-sans)",
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
            Mis Cuentas
          </h1>
          <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>
            Conecta tus bancos mexicanos y gestiona tus cuentas
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard/settings?tab=cuentas")}
          style={{
            background: "#1B4FD8",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-dm-sans)",
            boxShadow: "0 0 24px rgba(27,79,216,0.35)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            whiteSpace: "nowrap",
          }}
        >
          ➕ Agregar cuenta manual
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: "#1F2937",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "14px",
        padding: "14px 18px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
      }}>
        <span style={{ fontSize: "20px", flexShrink: 0 }}>💡</span>
        <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>
          Agrega tus cuentas manualmente y registra tus transacciones. La sincronización automática con bancos estará disponible pronto.
        </p>
      </div>

      {/* Bank connection — coming soon card */}
      <div style={{
        background: "#111827",
        border: "1px solid rgba(245,158,11,0.20)",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "28px",
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "12px", flexShrink: 0,
          background: "rgba(245,158,11,0.10)",
          border: "1px solid rgba(245,158,11,0.20)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "22px",
        }}>
          🚀
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "#F9FAFB", margin: "0 0 6px", fontFamily: "var(--font-sora)" }}>
            Conexión bancaria automática
          </p>
          <p style={{ fontSize: "13px", color: "#9CA3AF", margin: "0 0 10px", lineHeight: 1.6 }}>
            Conecta tus cuentas de BBVA, Santander, Citibanamex, Banorte y más para sincronizar tus transacciones automáticamente.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.30)",
              color: "#FCD34D",
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: "999px",
              letterSpacing: "0.02em",
            }}>
              Disponible próximamente • Acceso en revisión
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#4B5563", margin: "10px 0 0" }}>
            Mientras tanto, puedes agregar tus cuentas y transacciones manualmente.
          </p>
        </div>
      </div>

      {/* ── Connected banks ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontFamily: "var(--font-sora)", fontSize: "15px", fontWeight: 700, color: "#F9FAFB", marginBottom: "12px" }}>
          Bancos conectados
        </h2>

        {belvoLinks.length === 0 ? (
          <div style={{
            ...cardStyle,
            textAlign: "center",
            padding: "36px 24px",
            border: "1px dashed rgba(255,255,255,0.08)",
          }}>
            <p style={{ fontSize: "32px", marginBottom: "10px" }}>🏦</p>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#6B7280", marginBottom: "6px" }}>
              Ningún banco conectado
            </p>
            <p style={{ fontSize: "13px", color: "#4B5563" }}>
              Haz clic en &ldquo;Conectar banco mexicano&rdquo; para empezar
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {belvoLinks.map((link) => {
              const isSyncing = syncingId === link.link_id;
              const isDisconnecting = disconnectingId === link.link_id;
              return (
                <div key={link.id} style={cardStyle}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      {/* Bank logo placeholder */}
                      <div style={{
                        width: 44, height: 44, borderRadius: "12px",
                        background: "rgba(27,79,216,0.15)",
                        border: "1px solid rgba(27,79,216,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "22px", flexShrink: 0,
                      }}>
                        🏦
                      </div>
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "#F9FAFB", margin: 0 }}>
                          {link.institution_name ?? "Banco conectado"}
                        </p>
                        <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0" }}>
                          Última sincronización: {timeAgo(link.last_synced_at)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        onClick={() => handleSync(link.link_id, link.institution_name)}
                        disabled={isSyncing}
                        style={{
                          ...btnBlue,
                          opacity: isSyncing ? 0.6 : 1,
                          cursor: isSyncing ? "not-allowed" : "pointer",
                        }}
                      >
                        {isSyncing ? "⏳ Sincronizando..." : "🔄 Sincronizar"}
                      </button>
                      <button
                        onClick={() => handleDisconnect(link.link_id)}
                        disabled={isDisconnecting}
                        style={{
                          ...btnOutline,
                          color: "#FF4D6D",
                          borderColor: "rgba(255,77,109,0.25)",
                          opacity: isDisconnecting ? 0.6 : 1,
                          cursor: isDisconnecting ? "not-allowed" : "pointer",
                        }}
                      >
                        {isDisconnecting ? "..." : "Desconectar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Manual / all accounts ─────────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontFamily: "var(--font-sora)", fontSize: "15px", fontWeight: 700, color: "#F9FAFB", marginBottom: "12px" }}>
          Todas las cuentas
        </h2>

        {accounts.length === 0 ? (
          <div style={{
            ...cardStyle,
            textAlign: "center",
            padding: "36px 24px",
            border: "1px dashed rgba(255,255,255,0.08)",
          }}>
            <p style={{ fontSize: "32px", marginBottom: "10px" }}>💳</p>
            <p style={{ fontSize: "14px", color: "#6B7280" }}>
              Sin cuentas todavía. Conecta un banco o crea una manualmente en{" "}
              <a href="/dashboard/settings" style={{ color: "#60A5FA" }}>Configuración</a>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div key={acc.id} style={cardStyle}>
                <div className="flex items-center gap-3 mb-3">
                  <div style={{
                    width: 40, height: 40, borderRadius: "12px", flexShrink: 0,
                    background: `${acc.color}20`,
                    border: `1px solid ${acc.color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px",
                  }}>
                    {acc.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#F9FAFB", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {acc.name}
                    </p>
                    <p style={{ fontSize: "12px", color: "#6B7280", margin: "2px 0 0" }}>
                      {ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}
                    </p>
                  </div>
                </div>
                <p style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: acc.balance >= 0 ? "#00C896" : "#FF4D6D",
                  margin: 0,
                }}>
                  {fmtMXN(acc.balance)}
                </p>
                <p style={{ fontSize: "11px", color: "#4B5563", marginTop: "2px" }}>{acc.currency}</p>
              </div>
            ))}
          </div>
        )}

        {accounts.length > 0 && (
          <div style={{
            marginTop: "16px",
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "13px", color: "#6B7280" }}>
              {accounts.length} cuenta{accounts.length !== 1 ? "s" : ""}
            </span>
            <span style={{
              fontFamily: "var(--font-sora)",
              fontSize: "15px",
              fontWeight: 700,
              color: "#F9FAFB",
            }}>
              Total: {fmtMXN(accounts.reduce((s, a) => s + a.balance, 0))}
            </span>
          </div>
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
