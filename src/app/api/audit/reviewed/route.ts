import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Audit Reviewed Proxy (No‑Op Version)
 *
 * This route exists ONLY so the front‑end can POST an audit event
 * before calling /api/employees/reviewed/[id].
 *
 * Since no Azure function exists for audits yet, this endpoint
 * simply logs the event server-side and returns success.
 */

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        console.log("AUDIT EVENT (local no-op):", body);

        return NextResponse.json(
            { ok: true, message: "Audit logged (local no-op)" },
            { status: 200 }
        );
    } catch (e) {
        return NextResponse.json(
            {
                error: "Audit no-op failed",
                message: e instanceof Error ? e.message : String(e),
            },
            { status: 500 }
        );
    }
}