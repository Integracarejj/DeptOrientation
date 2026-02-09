// POST /api/day-in-life/item  →  Azure Function: DayInLifeItemCreate
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const base = process.env.AZURE_FUNCTION_BASE_URL;
    const code = process.env.AZURE_FUNCTION_CODE;

    if (!base || !code) {
        return NextResponse.json(
            { error: "Missing AZURE_FUNCTION_BASE_URL or AZURE_FUNCTION_CODE" },
            { status: 500 }
        );
    }

    const body = await req.json();
    const url = `${base}/api/DayInLifeItemCreate?code=${encodeURIComponent(code)}`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const text = await res.text();

        // Pass through status + body so we can see the real function error in dev tools
        return new Response(text, {
            status: res.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e: any) {
        console.error("Create proxy failed", e);
        return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
    }
}
