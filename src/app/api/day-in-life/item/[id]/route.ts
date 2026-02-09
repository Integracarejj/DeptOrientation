// PATCH /api/day-in-life/item/:id → Azure Function: DayInLifeItemUpdate/{itemId}
// DELETE /api/day-in-life/item/:id → Azure Function: DayInLifeItemDelete/{itemId}
import { NextRequest } from "next/server";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const base = process.env.AZURE_FUNCTION_BASE_URL;
    const code = process.env.AZURE_FUNCTION_CODE;

    if (!base || !code) {
        return new Response(
            JSON.stringify({ error: "Missing AZURE_FUNCTION_BASE_URL or AZURE_FUNCTION_CODE" }),
            { status: 500 }
        );
    }

    const body = await req.json();
    const url = `${base}/api/DayInLifeItemUpdate/${encodeURIComponent(
        params.id
    )}?code=${encodeURIComponent(code)}`;

    const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    return new Response(text, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
    });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const base = process.env.AZURE_FUNCTION_BASE_URL;
    const code = process.env.AZURE_FUNCTION_CODE;

    if (!base || !code) {
        return new Response(
            JSON.stringify({ error: "Missing AZURE_FUNCTION_BASE_URL or AZURE_FUNCTION_CODE" }),
            { status: 500 }
        );
    }

    const url = `${base}/api/DayInLifeItemDelete/${encodeURIComponent(
        params.id
    )}?code=${encodeURIComponent(code)}`;

    const res = await fetch(url, { method: "DELETE" });
    return new Response(null, { status: res.status });
}