// src/app/api/day-in-life/item/[itemId]/route.ts
import { NextResponse } from 'next/server';

const BASE = process.env.AZURE_FUNCTIONS_BASE_URL!;
const CODE = process.env.AZURE_FUNCTIONS_CODE || '';

function fnUrl(name: string, itemId: string) {
    const codeQS = CODE ? `?code=${encodeURIComponent(CODE)}` : '';
    return `${BASE}/${name}/${encodeURIComponent(itemId)}${codeQS}`;
}

export async function PATCH(
    req: Request,
    ctx: { params: { itemId: string } }
) {
    const itemId = (ctx.params?.itemId || '').trim();
    if (!itemId) {
        return NextResponse.json({ error: 'Missing itemId in route' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const url = fnUrl('DayInLifeItemUpdate', itemId);
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
            cache: 'no-store',
        });

        const text = await res.text();
        if (!res.ok) {
            return new NextResponse(text || JSON.stringify({ error: 'Function error' }), {
                status: res.status,
                headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
            });
        }

        return new NextResponse(text, { status: 200, headers: { 'content-type': 'application/json' } });
    } catch (err: any) {
        return NextResponse.json({ error: 'Upstream call failed', details: String(err) }, { status: 502 });
    }
}

export async function DELETE(
    _req: Request,
    ctx: { params: { itemId: string } }
) {
    const itemId = (ctx.params?.itemId || '').trim();
    if (!itemId) {
        return NextResponse.json({ error: 'Missing itemId in route' }, { status: 400 });
    }

    try {
        const url = fnUrl('DayInLifeItemDelete', itemId);
        const res = await fetch(url, { method: 'DELETE', cache: 'no-store' });

        if (!res.ok && res.status !== 204) {
            const text = await res.text();
            return new NextResponse(text || JSON.stringify({ error: 'Function error' }), {
                status: res.status,
                headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
            });
        }

        return new NextResponse(null, { status: 204 });
    } catch (err: any) {
        return NextResponse.json({ error: 'Upstream call failed', details: String(err) }, { status: 502 });
    }
}
