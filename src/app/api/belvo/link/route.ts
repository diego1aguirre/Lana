import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { link_id, institution_name } = await request.json();
    console.log("Belvo link received:", { link_id, institution_name });

    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("Auth user:", user?.id, "Auth error:", authError);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!link_id) {
      return NextResponse.json({ error: "link_id requerido." }, { status: 400 });
    }

    // Upsert profile first (FK constraint)
    await supabase
      .from("profiles")
      .upsert(
        { id: user.id, full_name: null, monthly_income: 0 },
        { onConflict: "id" }
      );

    // Save belvo link
    const { data: linkData, error: linkError } = await supabase
      .from("belvo_links")
      .insert({
        user_id: user.id,
        link_id,
        institution_name: institution_name || "Banco",
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    console.log("Link insert result:", linkData, "Error:", linkError);

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    // Trigger sync — pass user_id directly so sync doesn't need cookie auth
    let syncData = null;
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
      console.log("Triggering sync at:", `${baseUrl}/api/belvo/sync`);
      const syncRes = await fetch(`${baseUrl}/api/belvo/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_id, user_id: user.id }),
      });
      syncData = await syncRes.json();
      console.log("Sync result:", syncData);
    } catch (syncError) {
      console.error("Sync error (non-fatal):", syncError);
    }

    return NextResponse.json({ success: true, sync: syncData });
  } catch (err) {
    console.error("Link route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
