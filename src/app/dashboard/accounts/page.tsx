import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccounts } from "@/lib/db/queries";
import AccountsView from "./AccountsView";
import PageTransition from "@/components/ui/PageTransition";

export type BelvoLink = {
  id: string;
  user_id: string;
  link_id: string;
  institution_name: string | null;
  last_synced_at: string | null;
  created_at: string;
};

export default async function AccountsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [accounts, { data: belvoLinks }] = await Promise.all([
    getAccounts(user.id),
    supabase
      .from("belvo_links")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <PageTransition>
      <AccountsView
        userId={user.id}
        initialAccounts={accounts}
        initialBelvoLinks={(belvoLinks as BelvoLink[]) ?? []}
      />
    </PageTransition>
  );
}
