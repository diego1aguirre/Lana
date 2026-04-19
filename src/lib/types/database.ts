export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  monthly_income: number;
  created_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "cash";
  balance: number;
  currency: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income";
  is_default: boolean;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  amount: number;
  type: "expense" | "income" | "transfer";
  description: string;
  date: string;
  notes: string | null;
  created_at: string;
  category?: Category;
  account?: Account;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  month: number | null;
  year: number | null;
  created_at: string;
  category?: Category;
};

// Enriched types returned by query helpers
export type BudgetWithSpent = Budget & { spent: number };

export type CategoryExpense = {
  name: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
};

export type WeeklyExpense = {
  week: string;
  amount: number;
};
