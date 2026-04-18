import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    user.user_metadata?.full_name || user.email || "Usuario";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0A0F1E" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-10 text-center"
        style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <span
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
          >
            lana
          </span>
          <span
            className="w-2 h-2 rounded-full ml-0.5 mb-0.5 inline-block"
            style={{ background: "#00C896" }}
          />
        </div>

        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6"
          style={{ background: "rgba(27,79,216,0.12)", border: "1px solid rgba(27,79,216,0.2)" }}
        >
          🚧
        </div>

        <h1
          className="text-xl font-bold mb-2"
          style={{ fontFamily: "var(--font-sora)", color: "#F9FAFB" }}
        >
          Hola, {displayName}
        </h1>

        <p
          className="text-sm mb-8"
          style={{ color: "#9CA3AF", fontFamily: "var(--font-dm-sans)" }}
        >
          Dashboard en construcción 🚧
          <br />
          Pronto podrás ver todas tus finanzas aquí.
        </p>

        <SignOutButton />
      </div>
    </div>
  );
}
