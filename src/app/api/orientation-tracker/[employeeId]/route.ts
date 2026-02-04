import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

// Proxy to your Azure Function
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ employeeId: string }> }
) {
    try {
        const { employeeId } = await params;

        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        // IMPORTANT: use "&code=" not "&amp;code="
        const url =
            `${baseUrl}/api/OrientationTrackerGet` +
            `?employeeProfileId=${encodeURIComponent(employeeId)}` +
            `&code=${encodeURIComponent(funcCode)}`;

        console.log("OrientationTrackerGet →", url);

        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                { error: "Azure Function call failed", status: res.status, details: text },
                { status: 500 }
            );
        }

        const json = JSON.parse(text) as { items?: unknown[] };

        return NextResponse.json({
            employeeId,
            items: Array.isArray(json.items) ? json.items : [],
        });

    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}