import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getTransactionsForPeriod,
  getMonthlyTotals,
  getCategoryTotalsForPeriod,
} from "@/lib/db/queries";
import ReportsView from "./ReportsView";

export default async function ReportsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch 6 months up front; the client will slice for 3-month view
  const [transactions, monthlyTotals, categoryTotals] = await Promise.all([
    getTransactionsForPeriod(user.id, 6),
    getMonthlyTotals(user.id, 6),
    getCategoryTotalsForPeriod(user.id, 6),
  ]);

  return (
    <ReportsView
      userId={user.id}
      initialTransactions={transactions}
      initialMonthlyTotals={monthlyTotals}
      initialCategoryTotals={categoryTotals}
    />
  );
}
