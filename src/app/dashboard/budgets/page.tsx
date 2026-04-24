import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBudgets, getCategories, getExpensesByCategory } from "@/lib/db/queries";
import BudgetsView from "./BudgetsView";
import PageTransition from "@/components/ui/PageTransition";

interface PageProps {
  searchParams: { new?: string };
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [budgets, categories, expensesByCategory] = await Promise.all([
    getBudgets(user.id, month, year),
    getCategories(user.id),
    getExpensesByCategory(user.id, month, year),
  ]);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <PageTransition>
      <BudgetsView
        userId={user.id}
        initialBudgets={budgets}
        categories={expenseCategories}
        initialExpensesByCategory={expensesByCategory}
        initialMonth={month}
        initialYear={year}
        initialShowNew={searchParams.new === "true"}
      />
    </PageTransition>
  );
}
