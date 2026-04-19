"use client";

import { useState, useEffect, useCallback } from "react";

export interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

export default function Toast({ message, type, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 300); // wait for slide-out before unmounting
  }, [onDismiss]);

  useEffect(() => {
    // Slide in on next frame
    const frame = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(dismiss, 3000);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [dismiss]);

  const borderColor = type === "success" ? "#00C896" : "#FF4D6D";
  const icon = type === "success" ? "✓" : "✕";
  const iconColor = borderColor;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        transform: visible ? "translateY(0)" : "translateY(80px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
        background: "#1F2937",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: "14px",
        padding: "14px 18px",
        minWidth: 240,
        maxWidth: 360,
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: `${borderColor}20`,
          border: `1px solid ${borderColor}50`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <p
        style={{
          color: "#F9FAFB",
          fontFamily: "var(--font-dm-sans)",
          fontSize: 13,
          fontWeight: 500,
          flex: 1,
        }}
      >
        {message}
      </p>
      <button
        onClick={dismiss}
        style={{
          color: "#6B7280",
          fontSize: 16,
          lineHeight: 1,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 2px",
        }}
      >
        ×
      </button>
    </div>
  );
}
