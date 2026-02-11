import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnvOrThrow(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

// Works in both Next <15 (params object) and Next 15 (params Promise)
async function getRole(ctx: any): Promise<string> {
    const p = ctx?.params;
    const resolved = typeof p?.then === "function" ? await p : p;
    return (resolved?.role ?? "").trim();
}

function normalizeBaseUrl(base: string): string {
    // allow either "...azurewebsites.net" OR "...azurewebsites.net/api"
    const b = base.replace(/\/+$/, "");
    return b.endsWith("/api") ? b : `${b}/api`;
}

export async function GET(_req: NextRequest, ctx: any) {
    const role = await getRole(ctx);
    if (!role) return new Response(JSON.stringify({ error: "role required" }), { status: 400 });

    const baseUrl = normalizeBaseUrl(getEnvOrThrow("AZURE_FUNCTION_BASE_URL"));
    const funcKey = getEnvOrThrow("AZURE_FUNCTION_CODE");

    const url = `${baseUrl}/DaysOfWeekGet/${encodeURIComponent(role)}?code=${encodeURIComponent(funcKey)}`;

    const up = await fetch(url, {
        cache: "no-store",
        headers: { "x-functions-key": funcKey },
    });

    const text = await up.text();
    return new Response(text, {
        status: up.status,
        headers: {
            "content-type": up.headers.get("content-type") ?? "application/json",
            "cache-control": "no-store",
        },
    });
}

export async function PUT(req: NextRequest, ctx: any) {
    const role = await getRole(ctx);
    if (!role) return new Response(JSON.stringify({ error: "role required" }), { status: 400 });

    const baseUrl = normalizeBaseUrl(getEnvOrThrow("AZURE_FUNCTION_BASE_URL"));
    const funcKey = getEnvOrThrow("AZURE_FUNCTION_CODE");

    const url = `${baseUrl}/DaysOfWeekPut/${encodeURIComponent(role)}?code=${encodeURIComponent(funcKey)}`;
    const body = await req.text();

    const up = await fetch(url, {
        method: "PUT",
        body,
        cache: "no-store",
        headers: {
            "Content-Type": "application/json",
            "x-functions-key": funcKey,
        },
    });

    const text = await up.text();
    return new Response(text, {
        status: up.status,
        headers: {
            "content-type": up.headers.get("content-type") ?? "application/json",
            "cache-control": "no-store",
        },
    });
}
