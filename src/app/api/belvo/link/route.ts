import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { link_id, institution_name } = body as {
      link_id: string;
      institution_name?: string;
    };

    if (!link_id) {
      return NextResponse.json(
        { error: "link_id requerido." },
        { status: 400 }
      );
    }

    // Ensure profile row exists (FK constraint)
    await supabase
      .from("profiles")
      .upsert(
        { id: user.id, full_name: null, monthly_income: 0 },
        { onConflict: "id" }
      );

    // Upsert the link (avoid duplicates)
    const { error: linkError } = await supabase.from("belvo_links").upsert(
      {
        user_id: user.id,
        link_id,
        institution_name: institution_name ?? null,
      },
      { onConflict: "link_id" }
    );

    if (linkError) {
      console.log("belvo_links insert error:", linkError);
      return NextResponse.json(
        { error: "Error al guardar el link." },
        { status: 500 }
      );
    }

    // Trigger initial sync via internal fetch
    const baseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL
        ? `${req.nextUrl.origin}`
        : "http://localhost:3000";

    const syncRes = await fetch(`${baseUrl}/api/belvo/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward cookies for auth
        Cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ link_id }),
    });

    const syncData = syncRes.ok ? await syncRes.json() : null;

    return NextResponse.json({
      success: true,
      link_id,
      sync: syncData,
    });
  } catch (err) {
    console.log("Belvo link exception:", err);
    return NextResponse.json(
      { error: "Error al registrar el banco." },
      { status: 500 }
    );
  }
}
