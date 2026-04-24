"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/dashboard", icon: "🏠", label: "Inicio" },
  { href: "/dashboard/accounts", icon: "🏦", label: "Cuentas" },
  { href: "/dashboard/transactions", icon: "💳", label: "Transacciones" },
  { href: "/dashboard/budgets", icon: "🎯", label: "Presupuestos" },
  { href: "/dashboard/reports", icon: "📊", label: "Reportes" },
  { href: "/dashboard/settings", icon: "⚙️", label: "Configuración" },
];

interface SidebarProps {
  email: string;
  fullName: string;
}

export default function Sidebar({ email, fullName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = fullName || email.split("@")[0];

  const NavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: isActive ? "rgba(27,79,216,0.15)" : "transparent",
              color: isActive ? "#F9FAFB" : "#9CA3AF",
              borderLeft: isActive ? "2px solid #1B4FD8" : "2px solid transparent",
              fontFamily: "var(--font-dm-sans)",
            }}
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-60 z-40"
        style={{
          background: "#0D1117",
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <div className="px-6 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center">
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
            >
              lana
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full ml-0.5 mb-0.5 inline-block"
              style={{ background: "#00C896" }}
            />
          </div>
        </div>

        <NavLinks />

        {/* User + Sign out */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="px-3 mb-3">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
            >
              {displayName}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}
            >
              {email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 hover:bg-white/5"
            style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile top header bar ── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{
          height: "56px",
          background: "#0D1117",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center" style={{ textDecoration: "none" }}>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
          >
            lana
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full ml-0.5 mb-0.5 inline-block"
            style={{ background: "#00C896" }}
          />
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          className="flex items-center justify-center rounded-xl transition-all duration-150 hover:bg-white/5"
          style={{ width: 40, height: 40, color: "#F9FAFB", fontSize: "20px" }}
        >
          ☰
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 overlay-enter"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile slide-in drawer ── */}
      <div
        className="lg:hidden fixed top-0 left-0 h-full z-[60] flex flex-col"
        style={{
          width: "260px",
          background: "#0D1117",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.22s ease-out",
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", height: "56px" }}
        >
          <div className="flex items-center">
            <span
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
            >
              lana
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full ml-0.5 mb-0.5 inline-block"
              style={{ background: "#00C896" }}
            />
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="flex items-center justify-center rounded-xl hover:bg-white/5 transition-all duration-150"
            style={{ width: 36, height: 36, color: "#9CA3AF", fontSize: "18px" }}
          >
            ✕
          </button>
        </div>

        {/* Drawer nav */}
        <NavLinks onLinkClick={() => setDrawerOpen(false)} />

        {/* Drawer user + sign out */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="px-3 mb-3">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: "#F9FAFB", fontFamily: "var(--font-dm-sans)" }}
            >
              {displayName}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}
            >
              {email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 hover:bg-white/5"
            style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2"
        style={{
          background: "#0D1117",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150"
              style={{ color: isActive ? "#F9FAFB" : "#6B7280" }}
            >
              <span className="text-xl">{link.icon}</span>
              <span
                className="text-[10px] font-medium"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {link.label}
              </span>
              {isActive && (
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: "#1B4FD8" }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
