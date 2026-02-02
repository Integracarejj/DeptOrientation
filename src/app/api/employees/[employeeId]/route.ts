import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API Route: Employee Detail Proxy
 *
 * Purpose:
 * - Fetch ONE EmployeeProfile by SharePoint list item ID via Azure Function (server-side)
 *
 * Route:
 * - GET /api/employees/[employeeId]
 *
 * Notes:
 * - Next.js 15: params is a Promise in route handlers; must await it.
 * - Azure Function name must match exactly (EmployeeProfileGet vs EmployeeProfilesGet).
 */

function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ employeeId: string }> }
) {
    try {
        // ✅ Next.js 15 requires awaiting params before accessing properties
        const { employeeId } = await params;

        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        // ✅ IMPORTANT: use the function name that exists in your Function App
        // If your working portal test was EmployeeProfileGet, keep it singular here.
        const url =
            `${baseUrl}/api/EmployeeProfileGet` +
            `?employeeProfileId=${encodeURIComponent(employeeId)}` +
            `&code=${encodeURIComponent(funcCode)}`;

        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                { error: "Azure Function call failed", status: res.status, details: text },
                { status: 500 }
            );
        }

        return NextResponse.json(JSON.parse(text));
    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}