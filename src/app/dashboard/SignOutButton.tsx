"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:bg-white/5"
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#9CA3AF",
        fontFamily: "var(--font-dm-sans)",
      }}
    >
      Cerrar sesión
    </button>
  );
}
