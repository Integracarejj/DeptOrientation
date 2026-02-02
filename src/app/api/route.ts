import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API Route: Release Orientation (Generate Tasks) Proxy
 *
 * Purpose:
 * - Supervisor action: generate OrientationTracker tasks for an employee
 * - Proxies to Azure Function OrientationUpdater (Graph boundary)
 *
 * Route:
 * - POST /api/orientation-tracker/release/[employeeId]
 *
 * Behavior:
 * - Calls OrientationUpdater with employeeProfileId
 * - Returns function response
 */

function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ employeeId: string }> }
) {
    try {
        const { employeeId } = await params;

        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        const url =
            `${baseUrl}/api/OrientationUpdater` +
            `?employeeProfileId=${encodeURIComponent(employeeId)}` +
            `&code=${encodeURIComponent(funcCode)}`;

        const res = await fetch(url, { method: "POST", cache: "no-store" });
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