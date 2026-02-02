import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API Route: Employees List + Create Proxy
 *
 * GET  /api/employees
 *  -> Azure Function: EmployeeProfileGet
 *
 * POST /api/employees
 *  -> Azure Function: EmployeeProfileCreate   (NEW - now deployed)
 *
 * Notes:
 * - Keeps secrets server-side (AZURE_FUNCTION_BASE_URL, AZURE_FUNCTION_CODE)
 * - POST returns { id } (new EmployeeProfiles list item id)
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

        // Accept either:
        // - roleLookupId (number) OR
        // - roleCode (string like "ASD")  <-- recommended for dropdown
        const title = String(body?.title ?? "").trim();
        const startDate = String(body?.startDate ?? "").trim();
        const supervisorLookupId = body?.supervisorLookupId ?? null;

        const roleLookupId = body?.roleLookupId ?? null;
        const roleCode = String(body?.roleCode ?? "").trim();

        if (!title) return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
        if (!startDate) return NextResponse.json({ error: "Missing required field: startDate" }, { status: 400 });

        if ((roleLookupId === null || roleLookupId === undefined || String(roleLookupId).trim() === "") && !roleCode) {
            return NextResponse.json({ error: "Provide roleLookupId (number) OR roleCode (string)" }, { status: 400 });
        }

        // IMPORTANT: This must match the Azure Function route you deployed
        const url = `${baseUrl}/api/EmployeeProfileCreate?code=${encodeURIComponent(funcCode)}`;

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
                title,
                startDate,
                supervisorLookupId,
                roleLookupId,
                roleCode,
            }),
        });

        const text = await res.text();

        if (!res.ok) {
            // preserve Azure status/details for debugging
            return NextResponse.json(
                { error: "Azure Function call failed", status: res.status, details: text },
                { status: 500 }
            );
        }

        const json = text ? (JSON.parse(text) as any) : {};
        const id = String(json?.id ?? json?.employeeProfileId ?? json?.employeeId ?? "").trim();

        if (id) return NextResponse.json({ id });
        return NextResponse.json(json);
    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}