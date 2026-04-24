import { NextResponse } from "next/server";

const BELVO_BASE_URL = process.env.BELVO_BASE_URL!;
const BELVO_SECRET_ID = process.env.BELVO_SECRET_ID!;
const BELVO_SECRET_PASSWORD = process.env.BELVO_SECRET_PASSWORD!;

function belvoAuth(): string {
  const creds = `${BELVO_SECRET_ID}:${BELVO_SECRET_PASSWORD}`;
  return "Basic " + Buffer.from(creds).toString("base64");
}

export async function POST() {
  try {
    const res = await fetch(`${BELVO_BASE_URL}/api/token/`, {
      method: "POST",
      headers: {
        Authorization: belvoAuth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scopes:
          "read_institutions,read_accounts,read_transactions,write_links",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.log("Belvo token error:", res.status, text);
      return NextResponse.json(
        { error: "No se pudo obtener el token de Belvo." },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ access: data.access });
  } catch (err) {
    console.log("Belvo token exception:", err);
    return NextResponse.json(
      { error: "Error de conexión con Belvo." },
      { status: 500 }
    );
  }
}
