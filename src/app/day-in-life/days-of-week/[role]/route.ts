import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getEnvOrThrow(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: { role: string } }
) {
    const { role } = params;

    const baseUrl = getEnvOrThrow("AZURE_FUNCTION_BASE_URL");
    const funcKey = getEnvOrThrow("AZURE_FUNCTION_CODE");

    const url = `${baseUrl}/api/DaysOfWeekGet/${encodeURIComponent(
        role
    )}?code=${encodeURIComponent(funcKey)}`;

    const up = await fetch(url, {
        cache: "no-store",
        headers: { "x-functions-key": funcKey },
    });

    const text = await up.text();
    return new Response(text, {
        status: up.status,
        headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
        },
    });
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { role: string } }
) {
    const { role } = params;

    const baseUrl = getEnvOrThrow("AZURE_FUNCTION_BASE_URL");
    const funcKey = getEnvOrThrow("AZURE_FUNCTION_CODE");

    const url = `${baseUrl}/api/DaysOfWeekPut/${encodeURIComponent(
        role
    )}?code=${encodeURIComponent(funcKey)}`;

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
            "content-type": "application/json",
            "cache-control": "no-store",
        },
    });
}
