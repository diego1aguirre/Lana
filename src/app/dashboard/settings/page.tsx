import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getAccounts } from "@/lib/db/queries";
import SettingsView from "./SettingsView";
import PageTransition from "@/components/ui/PageTransition";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, accounts] = await Promise.all([
    getProfile(user.id),
    getAccounts(user.id),
  ]);

  return (
    <PageTransition>
      <SettingsView
        userId={user.id}
        email={user.email ?? ""}
        initialProfile={profile}
        initialAccounts={accounts}
      />
    </PageTransition>
  );
}
