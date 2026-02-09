import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getEnvOrThrow(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

async function proxy(req: NextRequest, method: "PATCH" | "DELETE") {
    const baseUrl = getEnvOrThrow("AZURE_FUNCTION_BASE_URL");
    const funcKey = getEnvOrThrow("AZURE_FUNCTION_CODE");

    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) {
        return new Response(JSON.stringify({ error: "Missing item id" }), {
            status: 400,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
    }

    const endpoint =
        method === "PATCH"
            ? `${baseUrl}/api/DayInLifeItemUpdate/${encodeURIComponent(id)}`
            : `${baseUrl}/api/DayInLifeItemDelete/${encodeURIComponent(id)}`;

    const body = method === "PATCH" ? await req.text() : undefined;

    let upstream: Response;
    try {
        upstream = await fetch(`${endpoint}?code=${encodeURIComponent(funcKey)}`, {
            method,
            headers:
                method === "PATCH"
                    ? {
                        "Content-Type": req.headers.get("content-type") ?? "application/json",
                        "x-functions-key": funcKey,
                    }
                    : { "x-functions-key": funcKey },
            body,
            cache: "no-store",
        });
    } catch (err: any) {
        console.error(`Proxy ${method} /item/${id} failed:`, err);
        return new Response(
            JSON.stringify({ error: "Function unreachable", detail: String(err?.message ?? err) }),
            {
                status: 502,
                headers: { "content-type": "application/json", "cache-control": "no-store" },
            }
        );
    }

    // 204 / 205 / 304 must NOT include a body
    if (upstream.status === 204 || upstream.status === 205 || upstream.status === 304) {
        return new Response(null, {
            status: upstream.status,
            headers: { "cache-control": "no-store" },
        });
    }

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";

    return new Response(text, {
        status: upstream.status,
        headers: {
            "content-type": contentType,
            "cache-control": "no-store",
        },
    });

}

export async function PATCH(req: NextRequest) {
    return proxy(req, "PATCH");
}

export async function DELETE(req: NextRequest) {
    return proxy(req, "DELETE");
}