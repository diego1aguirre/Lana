import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTransactions, getCategories, getAccounts } from "@/lib/db/queries";
import TransactionsList from "./TransactionsList";

export default async function TransactionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [transactions, categories, accounts] = await Promise.all([
    getTransactions(user.id, 500), // generous limit
    getCategories(user.id),
    getAccounts(user.id),
  ]);

  return (
    <TransactionsList
      transactions={transactions}
      categories={categories}
      accounts={accounts}
    />
  );
}
