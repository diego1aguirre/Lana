import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./Sidebar";
import FAB from "@/components/ui/FAB";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const email = user.email ?? "";
  const fullName = user.user_metadata?.full_name ?? "";

  return (
    <div className="flex min-h-screen" style={{ background: "#0A0F1E" }}>
      <Sidebar email={email} fullName={fullName} />

      {/* Main content — offset by sidebar on desktop, top-padded for mobile header, bottom-padded for tab bar */}
      <main
        className="flex-1 lg:ml-60 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen overflow-y-auto"
        style={{ background: "#0A0F1E" }}
      >
        {children}
      </main>

      {/* Floating action button — mobile only */}
      <FAB />
    </div>
  );
}
