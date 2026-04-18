"use client";

import { useState } from "react";
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

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("Este email ya está registrado. Intenta iniciar sesión.");
      } else {
        setError("Ocurrió un error al crear tu cuenta. Intenta de nuevo.");
      }
      return;
    }

    setSuccess(true);
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

  if (success) {
    return (
      <div
        className="w-full max-w-md rounded-2xl p-8 md:p-10 text-center"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Logo />
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6"
          style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.25)" }}
        >
          ✉️
        </div>
        <h2
          className="text-xl font-bold mb-3"
          style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
        >
          ¡Revisa tu email!
        </h2>
        <p
          className="text-sm leading-relaxed mb-6"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          Te enviamos un enlace de confirmación a{" "}
          <span style={{ color: "#F9FAFB" }}>{email}</span>. Haz clic en el
          enlace para activar tu cuenta.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-semibold transition-colors hover:text-white"
          style={{ color: "#1B4FD8", fontFamily: "var(--font-dm-sans)" }}
        >
          Ir a iniciar sesión →
        </Link>
      </div>
    );
  }

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
        Crea tu cuenta
      </h1>
      <p
        className="text-sm text-center mb-8"
        style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
      >
        Empieza gratis, sin tarjeta de crédito
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}
          >
            Nombre completo
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full px-4 py-3 text-sm placeholder:text-gray-600 focus:border-blue-600"
            style={inputStyle}
          />
        </div>

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
            placeholder="Mínimo 6 caracteres"
            className="w-full px-4 py-3 text-sm placeholder:text-gray-600 focus:border-blue-600"
            style={inputStyle}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1.5"
            style={{ color: "#D1D5DB", fontFamily: "var(--font-dm-sans)" }}
          >
            Confirmar contraseña
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
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
          {loading ? "Creando cuenta..." : "Crear mi cuenta"}
        </button>
      </form>

      <p
        className="mt-4 text-xs text-center leading-relaxed"
        style={{ color: "#6B7280", fontFamily: "var(--font-dm-sans)" }}
      >
        Al registrarte aceptas nuestros{" "}
        <Link href="#" className="underline hover:text-gray-400">
          Términos de servicio
        </Link>{" "}
        y{" "}
        <Link href="#" className="underline hover:text-gray-400">
          Política de privacidad
        </Link>
      </p>

      <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p
          className="text-sm text-center"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold transition-colors hover:text-white"
            style={{ color: "#1B4FD8" }}
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
