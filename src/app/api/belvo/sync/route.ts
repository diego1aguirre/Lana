import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BELVO_BASE_URL = process.env.BELVO_BASE_URL!;
const BELVO_SECRET_ID = process.env.BELVO_SECRET_ID!;
const BELVO_SECRET_PASSWORD = process.env.BELVO_SECRET_PASSWORD!;

function belvoAuth(): string {
  const creds = `${BELVO_SECRET_ID}:${BELVO_SECRET_PASSWORD}`;
  return "Basic " + Buffer.from(creds).toString("base64");
}

// ─── Belvo type → our type ────────────────────────────────────────────────────

function mapAccountType(
  belvoType: string
): "checking" | "savings" | "credit" | "cash" {
  const t = belvoType?.toUpperCase() ?? "";
  if (t.includes("SAVING")) return "savings";
  if (t.includes("CREDIT")) return "credit";
  if (t.includes("CASH")) return "cash";
  return "checking";
}

function mapAccountIcon(belvoType: string): string {
  const t = belvoType?.toUpperCase() ?? "";
  if (t.includes("SAVING")) return "🏦";
  if (t.includes("CREDIT")) return "💳";
  if (t.includes("CASH")) return "💵";
  return "🏧";
}

// Category name → our category name lookup (best-effort)
const CATEGORY_MAP: Record<string, string> = {
  "Food & Groceries": "Comida",
  "Restaurants & Cafes": "Restaurantes",
  "Transport & Car": "Transporte",
  "Online Platforms & Leisure": "Entretenimiento",
  "Entertainment & Sports": "Entretenimiento",
  "Home & Life": "Hogar",
  "Health": "Salud",
  "Shopping": "Compras",
  "Personal Finance": "Finanzas",
  "Transfers": "Transferencias",
  "Bills & Utilities": "Servicios",
  "Taxes": "Impuestos",
  "Education": "Educación",
  "Travel": "Viajes",
};

function mapCategory(belvoCategory: string | null): string {
  if (!belvoCategory) return "Otros";
  return CATEGORY_MAP[belvoCategory] ?? belvoCategory;
}

// ─── Belvo API helpers ────────────────────────────────────────────────────────

async function fetchBelvoAccounts(linkId: string) {
  const url = `${BELVO_BASE_URL}/api/accounts/?link=${linkId}`;
  const res = await fetch(url, {
    headers: { Authorization: belvoAuth() },
  });
  if (!res.ok) {
    console.log("Belvo accounts fetch error:", res.status, await res.text());
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

async function fetchBelvoTransactions(linkId: string) {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 90); // last 90 days
  const dateFromStr = dateFrom.toISOString().split("T")[0];

  const url = `${BELVO_BASE_URL}/api/transactions/?link=${linkId}&date_from=${dateFromStr}`;
  const res = await fetch(url, {
    headers: { Authorization: belvoAuth() },
  });
  if (!res.ok) {
    console.log("Belvo transactions fetch error:", res.status, await res.text());
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const linkId: string = body.link_id;

    if (!linkId) {
      return NextResponse.json(
        { error: "link_id requerido." },
        { status: 400 }
      );
    }

    // Verify this link belongs to the user
    const { data: belvoLink } = await supabase
      .from("belvo_links")
      .select("id")
      .eq("user_id", user.id)
      .eq("link_id", linkId)
      .maybeSingle();

    if (!belvoLink) {
      return NextResponse.json(
        { error: "Link no encontrado." },
        { status: 404 }
      );
    }

    // ── 1. Fetch & sync accounts ──────────────────────────────────────────────

    const belvoAccounts = await fetchBelvoAccounts(linkId);
    const accountIdMap: Record<string, string> = {}; // belvo account id → our account id

    let accountsSynced = 0;

    for (const ba of belvoAccounts) {
      const accountName = ba.name ?? ba.internal_identification ?? "Cuenta Belvo";
      const balance = ba.balance?.current ?? ba.balance?.available ?? 0;
      const currency = ba.currency ?? "MXN";
      const type = mapAccountType(ba.type ?? "");
      const icon = mapAccountIcon(ba.type ?? "");

      // Find existing account by belvo account id stored in notes, or by name
      const { data: existing } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .ilike("name", accountName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("accounts")
          .update({ balance, icon })
          .eq("id", existing.id);
        accountIdMap[ba.id] = existing.id;
      } else {
        const { data: created } = await supabase
          .from("accounts")
          .insert({
            user_id: user.id,
            name: accountName,
            type,
            balance,
            currency,
            color: "#1B4FD8",
            icon,
            is_active: true,
          })
          .select("id")
          .single();

        if (created) {
          accountIdMap[ba.id] = created.id;
          accountsSynced++;
        }
      }
    }

    // ── 2. Fetch & sync transactions ──────────────────────────────────────────

    const belvoTransactions = await fetchBelvoTransactions(linkId);
    let transactionsSynced = 0;

    // Fetch our existing categories to map by name
    const { data: ourCategories } = await supabase
      .from("categories")
      .select("id, name")
      .or(`is_default.eq.true,user_id.eq.${user.id}`);

    const findCategoryId = (belvoCategory: string | null): string | null => {
      const mapped = mapCategory(belvoCategory);
      const found = (ourCategories ?? []).find(
        (c) => c.name.toLowerCase() === mapped.toLowerCase()
      );
      return found?.id ?? null;
    };

    for (const bt of belvoTransactions) {
      const amount = Math.abs(bt.amount ?? 0);
      if (amount === 0) continue;

      const txType = bt.type === "INFLOW" ? "income" : "expense";
      const date: string = bt.value_date ?? bt.accounting_date ?? new Date().toISOString().split("T")[0];
      const description = bt.description ?? bt.reference ?? "Transacción Belvo";
      const categoryId = findCategoryId(bt.category ?? null);

      // Find the account we synced for this transaction
      const belvoAccountId = bt.account?.id ?? bt.account;
      const accountId = accountIdMap[belvoAccountId] ?? null;

      // Deduplicate: check if a transaction with same amount + date + description exists
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("amount", amount)
        .eq("date", date)
        .eq("description", description)
        .maybeSingle();

      if (!existing) {
        await supabase.from("transactions").insert({
          user_id: user.id,
          account_id: accountId,
          category_id: categoryId,
          amount,
          type: txType,
          description,
          date,
          notes: `Importado de Belvo · ${bt.category ?? "Sin categoría"}`,
        });
        transactionsSynced++;
      }
    }

    // Update last_synced_at
    await supabase
      .from("belvo_links")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("link_id", linkId)
      .eq("user_id", user.id);

    return NextResponse.json({
      accounts_synced: accountsSynced,
      transactions_synced: transactionsSynced,
    });
  } catch (err) {
    console.log("Belvo sync exception:", err);
    return NextResponse.json(
      { error: "Error durante la sincronización." },
      { status: 500 }
    );
  }
}
