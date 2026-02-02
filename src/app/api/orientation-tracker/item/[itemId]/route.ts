/**
 * API Route: Orientation Tracker Status Update Proxy
 *
 * Purpose:
 * - server side endpoint that the UI can call when you click something
 * - Acts as a secure proxy between the Next.js UI and an Azure Function
 * - Forwards validated status updates for a single OrientationTracker item
 *
 * Route:
 * - POST / PATCH /api/orientation/[itemId]
 *
 * Input:
 * - Route param: itemId (number)
 * - Body:
 *   - status: not_started | in_progress | completed
 *   - actor: string (optional)
 *
 * Behavior:
 * - Validates input and normalizes status values
 * - Calls Azure Function with itemId + status + actor
 * - Returns Azure Function response to the client
 *
 * Errors:
 * - 400: Invalid route params or request body
 * - 500: Azure Function failure or unhandled error
 *
 * Notes:
 * - Runs on Node.js runtime
 * - Dynamic (no caching)
 * - Secrets are read from environment variables
 */


import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required env var: ${name}`);
    return v;
}

type UpdateBody = {
    status: "not_started" | "in_progress" | "completed";
    actor?: string;
};

function normalizeStatus(input: unknown): UpdateBody["status"] | null {
    if (typeof input !== "string") return null;
    const s = input.trim().toLowerCase();
    if (s === "not_started" || s === "in_progress" || s === "completed") return s;
    return null;
}

async function forwardUpdate(itemId: string, body: UpdateBody) {
    const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
    const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

    const url =
        `${baseUrl}/api/OrientationTrackerUpdate` +
        `?code=${encodeURIComponent(funcCode)}`;

    const res = await fetch(url, {
        method: "POST", // your Azure Function supports POST/PATCH per your design notes [1](https://integracare-my.sharepoint.com/personal/jjoyner_integracare_com/_layouts/15/Doc.aspx?action=edit&mobileredirect=true&wdorigin=Sharepoint&DefaultItemOpen=1&sourcedoc={3303c334-7138-465a-a63a-607871216895}&wd=target%28/Other%20Work.one/%29&wdpartid={1ae06b70-313e-429a-a21a-f983d0455271}{1}&wdsectionfileid={55a30960-f53b-4b49-a159-058dcf397f63})
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
            itemId: Number(itemId),
            status: body.status,
            actor: body.actor ?? "unknown",
        }),
    });

    const text = await res.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        // keep json null, fall back to text
    }

    return { res, text, json };
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    return handle(req, params);
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    return handle(req, params);
}

async function handle(req: Request, paramsPromise: Promise<{ itemId: string }>) {
    try {
        const { itemId } = await paramsPromise;

        if (!itemId || Number.isNaN(Number(itemId))) {
            return NextResponse.json(
                { error: "Invalid itemId in route." },
                { status: 400 }
            );
        }

        let payload: any;
        try {
            payload = await req.json();
        } catch {
            return NextResponse.json(
                { error: "Request body must be valid JSON." },
                { status: 400 }
            );
        }

        const status = normalizeStatus(payload?.status);
        if (!status) {
            return NextResponse.json(
                {
                    error:
                        "Invalid status. Expected: not_started | in_progress | completed",
                },
                { status: 400 }
            );
        }

        const actor =
            typeof payload?.actor === "string" && payload.actor.trim()
                ? payload.actor.trim()
                : "unknown";

        const { res, text, json } = await forwardUpdate(itemId, { status, actor });

        if (!res.ok) {
            // Mirror your read-proxy style: respond 500 with details
            return NextResponse.json(
                {
                    error: "Azure Function call failed",
                    status: res.status,
                    details: json ?? text,
                },
                { status: 500 }
            );
        }

        return NextResponse.json(json ?? { ok: true });
    } catch (e) {
        return NextResponse.json(
            { error: "Unhandled error", message: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
