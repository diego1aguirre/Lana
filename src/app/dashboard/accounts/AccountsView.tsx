"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Account } from "@/lib/types/database";
import type { BelvoLink } from "./page";
import Toast from "@/components/ui/Toast";

// ─── Belvo widget global type ─────────────────────────────────────────────────

declare global {
  interface Window {
    belvoSDK?: {
      createWidget: (
        token: string,
        config: {
          locale?: string;
          country_codes?: string[];
          callback: (link: string, institution: { name: string }) => void;
          onExit?: (data: unknown) => void;
          onEvent?: (data: unknown) => void;
        }
      ) => { build: () => void };
    };
  }
}

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

const SUPPORTED_BANKS = [
  { name: "BBVA", emoji: "🔵" },
  { name: "Santander", emoji: "🔴" },
  { name: "Citibanamex", emoji: "🌐" },
  { name: "Banorte", emoji: "🟢" },
  { name: "HSBC", emoji: "🔶" },
];

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
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Script is loaded on-demand inside handleConnectBank

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

  // ── Open Belvo Connect Widget ─────────────────────────────────────────────

  async function handleConnectBank() {
    setWidgetLoading(true);
    try {
      // Step 1 — get access token
      console.log("[Belvo] Step 1: fetching token...");
      const tokenRes = await fetch("/api/belvo/token", { method: "POST" });
      const tokenData = await tokenRes.json();
      console.log("[Belvo] Token response:", tokenRes.status, tokenData.access ? "token received" : tokenData);
      if (!tokenRes.ok || !tokenData.access) {
        setToast({ message: tokenData.error ?? "Error al obtener token de Belvo.", type: "error" });
        setWidgetLoading(false);
        return;
      }
      const token: string = tokenData.access;

      // Step 2 — load script on-demand if not already present
      console.log("[Belvo] Step 2: loading SDK script...");
      if (!document.getElementById("belvo-script")) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.id = "belvo-script";
          script.src = "https://cdn.belvo.io/belvo-widget-1-stable.js";
          script.onload = () => {
            console.log("[Belvo] Script loaded ✓");
            resolve();
          };
          script.onerror = () => reject(new Error("Failed to load Belvo script"));
          document.head.appendChild(script);
        });
      } else {
        console.log("[Belvo] Script already present, skipping load.");
      }

      // Step 3 — wait for window.belvoSDK to be defined
      console.log("[Belvo] Step 3: waiting for belvoSDK...");
      await new Promise<void>((resolve) => {
        const check = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).belvoSDK) {
            console.log("[Belvo] belvoSDK is ready ✓");
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });

      setWidgetLoading(false);

      // Step 4 — make the Belvo mount div visible, then build the widget
      const belvoDiv = document.getElementById("belvo");
      if (belvoDiv) belvoDiv.style.display = "block";
      console.log("[Belvo] Step 4: belvo div visible:", !!belvoDiv, "— creating widget with token:", token.slice(0, 20) + "...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).belvoSDK.createWidget(token, {
        locale: "es",
        country_codes: ["MX"],
        access_token: token,
        callback: async (link: string, institution: string) => {
          console.log("[Belvo] Callback — link:", link, "institution:", institution);
          const institutionName = typeof institution === "string" ? institution : (institution as { name?: string })?.name ?? "Banco";
          setToast({ message: `Conectando ${institutionName}...`, type: "success" });
          try {
            const res = await fetch("/api/belvo/link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ link_id: link, institution_name: institutionName }),
            });
            const data = await res.json();
            console.log("[Belvo] Link save response:", res.status, data);
            if (res.ok) {
              const txCount = data.sync?.transactions_synced ?? 0;
              setToast({
                message: `¡${institutionName} conectado! ${txCount > 0 ? `${txCount} transacciones importadas.` : ""}`,
                type: "success",
              });
              await Promise.all([refreshLinks(), refreshAccounts()]);
              setTimeout(() => router.push("/dashboard"), 2000);
            } else {
              setToast({ message: data.error ?? "Error al conectar el banco.", type: "error" });
            }
          } catch (e) {
            console.error("[Belvo] Link save error:", e);
            setToast({ message: "Error de red al conectar.", type: "error" });
          }
        },
        onExit: (data: unknown) => {
          console.log("[Belvo] Widget exited:", data);
          const belvoDiv = document.getElementById("belvo");
          if (belvoDiv) belvoDiv.style.display = "none";
          setWidgetLoading(false);
        },
        onEvent: (data: unknown) => {
          console.log("[Belvo] Widget event:", data);
        },
      }).build();

      console.log("[Belvo] Widget .build() called ✓");
    } catch (err) {
      console.error("[Belvo] Widget error:", err);
      setToast({ message: "Error al abrir el widget. Intenta de nuevo.", type: "error" });
      setWidgetLoading(false);
    }
  }

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
          onClick={handleConnectBank}
          disabled={widgetLoading}
          style={{
            background: "#1B4FD8",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: widgetLoading ? "not-allowed" : "pointer",
            opacity: widgetLoading ? 0.7 : 1,
            fontFamily: "var(--font-dm-sans)",
            boxShadow: "0 0 24px rgba(27,79,216,0.35)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            whiteSpace: "nowrap",
          }}
        >
          {widgetLoading ? (
            <>⏳ Cargando widget...</>
          ) : (
            <>🏦 Conectar banco mexicano</>
          )}
        </button>
      </div>

      {/* Sandbox info banner */}
      <div style={{
        background: "rgba(27,79,216,0.08)",
        border: "1px solid rgba(27,79,216,0.2)",
        borderRadius: "14px",
        padding: "14px 18px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
      }}>
        <span style={{ fontSize: "20px", flexShrink: 0 }}>🧪</span>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#93BBFF", margin: "0 0 2px" }}>
            Modo sandbox activo
          </p>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>
            Usa credenciales de prueba para conectar bancos ficticios.{" "}
            <a
              href="https://developers.belvo.com/docs/test-in-sandbox"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#60A5FA", textDecoration: "underline" }}
            >
              Ver credenciales de prueba →
            </a>
          </p>
        </div>
      </div>

      {/* Bancos soportados */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
          Bancos disponibles
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SUPPORTED_BANKS.map((bank) => (
            <div
              key={bank.name}
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                padding: "6px 14px",
                fontSize: "13px",
                color: "#D1D5DB",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 500,
              }}
            >
              <span>{bank.emoji}</span> {bank.name}
            </div>
          ))}
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

      {/* Required Belvo mount point — hidden until widget opens */}
      <div id="belvo" style={{ display: "none" }} />

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
