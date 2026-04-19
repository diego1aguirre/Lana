import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Account,
  Category,
  Transaction,
  Budget,
  BudgetWithSpent,
  CategoryExpense,
  WeeklyExpense,
} from "@/lib/types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data as Profile | null;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function getAccounts(userId: string): Promise<Account[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return (data as Account[]) ?? [];
}

export async function getTotalBalance(userId: string): Promise<number> {
  const accounts = await getAccounts(userId);
  return accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
}

export async function createAccount(
  data: Omit<Account, "id" | "created_at">
): Promise<{ data: Account | null; error: string | null }> {
  const supabase = createClient();

  // Ensure profile row exists before inserting account (FK constraint)
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: data.user_id,
        full_name: null,
        monthly_income: 0,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    console.log("Profile upsert error (createAccount):", profileError);
    // Non-fatal — attempt account insert anyway
  }

  const { data: account, error } = await supabase
    .from("accounts")
    .insert(data)
    .select()
    .single();

  if (error) console.log("Account insert error (createAccount):", error);

  return { data: account as Account | null, error: error?.message ?? null };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(userId?: string): Promise<Category[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .or(
      userId
        ? `is_default.eq.true,user_id.eq.${userId}`
        : `is_default.eq.true`
    )
    .order("name");
  return (data as Category[]) ?? [];
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function getTransactions(
  userId: string,
  limit = 50
): Promise<Transaction[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("transactions")
    .select("*, category:categories(*), account:accounts(*)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);
  return (data as unknown as Transaction[]) ?? [];
}

export async function getTransactionsByMonth(
  userId: string,
  month: number,
  year: number
): Promise<Transaction[]> {
  const supabase = createClient();
  const { start, end } = monthRange(month, year);
  const { data } = await supabase
    .from("transactions")
    .select("*, category:categories(*), account:accounts(*)")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false });
  return (data as unknown as Transaction[]) ?? [];
}

export async function getMonthlyExpenses(
  userId: string,
  month: number,
  year: number
): Promise<number> {
  const txs = await getTransactionsByMonth(userId, month, year);
  return txs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}

export async function getMonthlyIncome(
  userId: string,
  month: number,
  year: number
): Promise<number> {
  const txs = await getTransactionsByMonth(userId, month, year);
  return txs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
}

export async function getExpensesByCategory(
  userId: string,
  month: number,
  year: number
): Promise<CategoryExpense[]> {
  const txs = await getTransactionsByMonth(userId, month, year);
  const expenses = txs.filter((t) => t.type === "expense");
  const total = expenses.reduce((sum, t) => sum + t.amount, 0);

  const grouped: Record<string, CategoryExpense> = {};

  for (const tx of expenses) {
    const key = tx.category_id ?? "__none__";
    if (!grouped[key]) {
      grouped[key] = {
        name: tx.category?.name ?? "Otros",
        icon: tx.category?.icon ?? "📦",
        color: tx.category?.color ?? "#6B7280",
        amount: 0,
        percentage: 0,
      };
    }
    grouped[key].amount += tx.amount;
  }

  return Object.values(grouped).map((g) => ({
    ...g,
    percentage: total > 0 ? Math.round((g.amount / total) * 100) : 0,
  }));
}

export async function getWeeklyExpenses(
  userId: string,
  month: number,
  year: number
): Promise<WeeklyExpense[]> {
  const txs = await getTransactionsByMonth(userId, month, year);
  const expenses = txs.filter((t) => t.type === "expense");

  const weeks: WeeklyExpense[] = [
    { week: "Sem. 1", amount: 0 },
    { week: "Sem. 2", amount: 0 },
    { week: "Sem. 3", amount: 0 },
    { week: "Sem. 4", amount: 0 },
  ];

  for (const tx of expenses) {
    // Parse date as local to avoid timezone shifts
    const day = parseInt(tx.date.split("-")[2], 10);
    const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    weeks[idx].amount += tx.amount;
  }

  return weeks;
}

export async function createTransaction(
  data: Omit<Transaction, "id" | "created_at" | "category" | "account">
): Promise<{ data: Transaction | null; error: string | null }> {
  const supabase = createClient();
  const { data: tx, error } = await supabase
    .from("transactions")
    .insert(data)
    .select()
    .single();
  return { data: tx as Transaction | null, error: error?.message ?? null };
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

export async function getBudgets(
  userId: string,
  month: number,
  year: number
): Promise<BudgetWithSpent[]> {
  const supabase = createClient();
  const { data: budgets } = await supabase
    .from("budgets")
    .select("*, category:categories(*)")
    .eq("user_id", userId)
    .eq("month", month)
    .eq("year", year);

  if (!budgets?.length) return [];

  const txs = await getTransactionsByMonth(userId, month, year);
  const expenses = txs.filter((t) => t.type === "expense");

  return (budgets as unknown as Budget[]).map((budget) => {
    const spent = expenses
      .filter((t) => t.category_id === budget.category_id)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...budget, spent };
  });
}

export async function createBudget(
  data: Omit<Budget, "id" | "created_at" | "category">
): Promise<{ data: Budget | null; error: string | null }> {
  const supabase = createClient();
  const { data: budget, error } = await supabase
    .from("budgets")
    .insert(data)
    .select()
    .single();
  return { data: budget as Budget | null, error: error?.message ?? null };
}
