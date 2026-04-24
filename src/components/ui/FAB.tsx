"use client";

import Link from "next/link";

export default function FAB() {
  return (
    <Link
      href="/dashboard/transactions/new"
      className="fab-btn lg:hidden"
      title="Nueva transacción"
      aria-label="Nueva transacción"
      style={{
        position: "fixed",
        bottom: "76px", // above mobile bottom tab bar
        right: "20px",
        zIndex: 50,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "#1B4FD8",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        fontWeight: 300,
        lineHeight: 1,
        boxShadow: "0 4px 24px rgba(27,79,216,0.5)",
        textDecoration: "none",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
        e.currentTarget.style.boxShadow = "0 6px 28px rgba(27,79,216,0.65)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(27,79,216,0.5)";
      }}
    >
      +
    </Link>
  );
}
