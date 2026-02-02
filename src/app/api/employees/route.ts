import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API Route: Employees List + Create Proxy
 *
 * Purpose:
 * - Secure proxy between the Next.js UI and Azure Functions (Graph boundary)
 * - Keeps secrets server-side
 *
 * Routes:
 * - GET  /api/employees
 *   Proxies to Azure Function EmployeeProfileGet
 *   Returns: { items: [{ id, fields }] }
 *
 * - POST /api/employees
 *   Proxies to Azure Function EmployeeProfileCreate
 *   Body: { title, roleLookupId, supervisorLookupId?, startDate }
 *   Returns: { id } (or passes through function response; UI accepts { id } or { employeeProfileId })
 */

function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

export async function GET() {
    try {
        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        const url = `${baseUrl}/api/EmployeeProfileGet?code=${encodeURIComponent(funcCode)}`;

        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                { error: "Azure Function call failed", status: res.status, details: text },
                { status: 500 }
            );
        }

        const json = JSON.parse(text) as { items?: unknown[] };
        return NextResponse.json({ items: Array.isArray(json.items) ? json.items : [] });
    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        const body = await req.json().catch(() => ({} as any));

        // Minimal validation (UI also validates)
        const title = String(body?.title ?? "").trim();
        const roleLookupId = body?.roleLookupId;
        const startDate = String(body?.startDate ?? "").trim();
        const supervisorLookupId = body?.supervisorLookupId ?? null;

        if (!title) {
            return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
        }
        if (roleLookupId === null || roleLookupId === undefined || String(roleLookupId).trim() === "") {
            return NextResponse.json({ error: "Missing required field: roleLookupId" }, { status: 400 });
        }
        if (!startDate) {
            return NextResponse.json({ error: "Missing required field: startDate" }, { status: 400 });
        }

        // NOTE: Ensure this matches your deployed Azure Function route name
        const url = `${baseUrl}/api/EmployeeProfileCreate?code=${encodeURIComponent(funcCode)}`;

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
                title,
                roleLookupId,
                supervisorLookupId,
                startDate,
            }),
        });

        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                { error: "Azure Function call failed", status: res.status, details: text },
                { status: 500 }
            );
        }

        // Pass through function JSON; but guarantee we return an id-like field
        const json = text ? (JSON.parse(text) as any) : {};
        const id = String(json?.id ?? json?.employeeProfileId ?? json?.employeeId ?? "").trim();

        if (id) return NextResponse.json({ id });

        // If function returns some other structure, still return it (UI will handle common shapes)
        return NextResponse.json(json);
    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}