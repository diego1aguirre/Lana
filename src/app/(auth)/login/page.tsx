"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function Logo() {
  return (
    <div className="flex items-center justify-center mb-8">
      <span
        className="text-3xl font-bold tracking-tight"
        style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
      >
        lana
      </span>
      <span
        className="w-2 h-2 rounded-full ml-0.5 mb-0.5 inline-block"
        style={{ background: "#00C896" }}
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setLoading(false);
      if (authError.message.includes("Invalid login credentials")) {
        setError("Email o contraseña incorrectos. Intenta de nuevo.");
      } else if (authError.message.includes("Email not confirmed")) {
        setError("Confirma tu email antes de iniciar sesión.");
      } else {
        setError("Ocurrió un error. Por favor intenta de nuevo.");
      }
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const inputStyle = {
    background: "#1F2937",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#F9FAFB",
    borderRadius: "12px",
    fontFamily: "var(--font-dm-sans)",
    outline: "none",
    transition: "border-color 0.2s ease",
  };

  return (
    <div
      className="w-full max-w-md rounded-2xl p-8 md:p-10"
      style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <Logo />

      <h1
        className="text-2xl font-bold text-center mb-2"
        style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
      >
        Bienvenido de nuevo
      </h1>
      <p
        className="text-sm text-center mb-8"
        style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
      >
        Ingresa a tu cuenta para ver tus finanzas
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}
          >
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full px-4 py-3 text-sm placeholder:text-gray-600 focus:border-blue-600"
            style={inputStyle}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}
          >
            Contraseña
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 text-sm placeholder:text-gray-600 focus:border-blue-600"
            style={inputStyle}
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

        <div className="flex justify-end">
          <Link
            href="#"
            className="text-xs transition-colors hover:text-white"
            style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "#1B4FD8",
            color: "#fff",
            fontFamily: "var(--font-dm-sans)",
            boxShadow: "0 0 20px rgba(27,79,216,0.3)",
          }}
        >
          {loading ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>
      </form>

      <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p
          className="text-sm text-center"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          ¿No tienes cuenta?{" "}
          <Link
            href="/signup"
            className="font-semibold transition-colors hover:text-white"
            style={{ color: "#1B4FD8" }}
          >
            Crear cuenta gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
