import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API Route: Employee Detail Proxy
 * GET /api/employees/[employeeId]
 *
 * Proxies to the Azure Function that returns ONE EmployeeProfiles item:
 *   EmployeeProfilesGet?employeeProfileId=<id>
 * (Note the plural function name.)
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
        const { employeeId } = await params;

        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        // IMPORTANT:
        //  - Use the plural function name: EmployeeProfilesGet
        //  - Use '&code=' (NOT '&amp;code=')
        const url =
            `${baseUrl}/api/EmployeeProfilesGet` +
            `?employeeProfileId=${encodeURIComponent(employeeId)}` +
            `&code=${encodeURIComponent(funcCode)}`;

        // One-time debugging to verify the exact host + path being called:
        console.log("EmployeeProfilesGet (single) →", url);

        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                { error: "Azure Function call failed", status: res.status, details: text },
                { status: 500 }
            );
        }

        // Pass through the function’s JSON. It returns:
        // { employeeProfileId: <number>, item: { id, fields: {...} } }
        return NextResponse.json(JSON.parse(text));
    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
