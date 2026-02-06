// src/app/api/day-in-life/summary/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
    const base = process.env.AZURE_FUNCTION_BASE_URL;
    const code = process.env.AZURE_FUNCTION_CODE;

    if (!base || !code) {
        return NextResponse.json(
            { error: "Missing AZURE_FUNCTION_BASE_URL or AZURE_FUNCTION_CODE" },
            { status: 500 }
        );
    }

    const url = `${base}/api/DayInLifeGet?code=${encodeURIComponent(code)}`;
    console.log("[DIL summary] →", url);

    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    return new Response(text, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
    });
}
