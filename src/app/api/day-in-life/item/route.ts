import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getEnvOrThrow(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

export async function POST(req: NextRequest) {
    const baseUrl = getEnvOrThrow("AZURE_FUNCTION_BASE_URL");
    const funcKey = getEnvOrThrow("AZURE_FUNCTION_CODE");

    const url = `${baseUrl}/api/DayInLifeItemCreate`;
    const body = await req.text(); // pass through exactly

    let upstream: Response;
    try {
        upstream = await fetch(`${url}?code=${encodeURIComponent(funcKey)}`, {
            method: "POST",
            headers: {
                "Content-Type": req.headers.get("content-type") ?? "application/json",
                "x-functions-key": funcKey, // belt & suspenders
            },
            body,
            cache: "no-store",
        });
    } catch (err: any) {
        console.error("Proxy POST /item failed:", err);
        return new Response(
            JSON.stringify({ error: "Function unreachable", detail: String(err?.message ?? err) }),
            {
                status: 502,
                headers: { "content-type": "application/json", "cache-control": "no-store" },
            }
        );
    }

    // Pass-through body + status
    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    return new Response(text, {
        status: upstream.status,
        headers: { "content-type": contentType, "cache-control": "no-store" },
    });
}