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
        category_id: tx.category_id,
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

  // Check if a budget already exists for this user + category + month + year
  const { data: existing } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", data.user_id)
    .eq("month", data.month ?? 0)
    .eq("year", data.year ?? 0)
    .eq("category_id", data.category_id ?? "")
    .maybeSingle();

  if (existing?.id) {
    // Update the existing row
    const { data: updated, error } = await supabase
      .from("budgets")
      .update({ amount: data.amount, period: data.period })
      .eq("id", existing.id)
      .select()
      .single();
    return { data: updated as Budget | null, error: error?.message ?? null };
  }

  // Insert a new row
  const { data: budget, error } = await supabase
    .from("budgets")
    .insert(data)
    .select()
    .single();
  return { data: budget as Budget | null, error: error?.message ?? null };
}

export async function deleteBudget(
  budgetId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId);
  return { error: error?.message ?? null };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

/** Fetch all transactions for the last N calendar months (including current). */
export async function getTransactionsForPeriod(
  userId: string,
  months: number
): Promise<Transaction[]> {
  const supabase = createClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("transactions")
    .select("*, category:categories(*), account:accounts(*)")
    .eq("user_id", userId)
    .gte("date", startStr)
    .order("date", { ascending: true });

  return (data as unknown as Transaction[]) ?? [];
}

export type MonthlyTotal = {
  month: number;
  year: number;
  label: string; // "Ene 2024"
  income: number;
  expenses: number;
  count: number;
};

const SHORT_MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

/** Aggregate income/expense totals per calendar month for the last N months. */
export async function getMonthlyTotals(
  userId: string,
  months: number
): Promise<MonthlyTotal[]> {
  const txs = await getTransactionsForPeriod(userId, months);

  // Build ordered list of month buckets
  const now = new Date();
  const result: MonthlyTotal[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      income: 0,
      expenses: 0,
      count: 0,
    });
  }

  for (const tx of txs) {
    const [y, m] = tx.date.split("-").map(Number);
    const bucket = result.find((r) => r.year === y && r.month === m);
    if (!bucket) continue;
    if (tx.type === "income") bucket.income += tx.amount;
    else if (tx.type === "expense") bucket.expenses += tx.amount;
    bucket.count++;
  }

  return result;
}

export type CategoryTotal = {
  category_id: string | null;
  name: string;
  icon: string;
  color: string;
  total: number;
  percentage: number;
  count: number;
};

/** Top spending categories over the last N months, sorted by total descending. */
export async function getCategoryTotalsForPeriod(
  userId: string,
  months: number
): Promise<CategoryTotal[]> {
  const txs = await getTransactionsForPeriod(userId, months);
  const expenses = txs.filter((t) => t.type === "expense");
  const grandTotal = expenses.reduce((s, t) => s + t.amount, 0);

  const map: Record<string, CategoryTotal> = {};
  for (const tx of expenses) {
    const key = tx.category_id ?? "__none__";
    if (!map[key]) {
      map[key] = {
        category_id: tx.category_id,
        name: tx.category?.name ?? "Otros",
        icon: tx.category?.icon ?? "📦",
        color: tx.category?.color ?? "#6B7280",
        total: 0,
        percentage: 0,
        count: 0,
      };
    }
    map[key].total += tx.amount;
    map[key].count++;
  }

  return Object.values(map)
    .map((c) => ({
      ...c,
      percentage: grandTotal > 0 ? Math.round((c.total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
