"use client";

import { useEffect, useState } from "react";

export default function LandingPolish() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    // ── Scroll-reveal via IntersectionObserver ──────────────────────────────
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    // ── Back-to-top visibility ──────────────────────────────────────────────
    const handleScroll = () => {
      setShowTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!showTop) return null;

  return (
    <button
      onClick={scrollTop}
      aria-label="Volver arriba"
      style={{
        position: "fixed",
        bottom: "28px",
        right: "24px",
        zIndex: 50,
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "rgba(27,79,216,0.85)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(27,79,216,0.5)",
        color: "#fff",
        fontSize: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 20px rgba(27,79,216,0.4)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
        e.currentTarget.style.boxShadow = "0 6px 28px rgba(27,79,216,0.6)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(27,79,216,0.4)";
      }}
    >
      ↑
    </button>
  );
}
