// src/app/api/day-in-life/[role]/items/route.ts
import { NextResponse } from 'next/server';

const BASE = process.env.AZURE_FUNCTIONS_BASE_URL!;
const CODE = process.env.AZURE_FUNCTIONS_CODE || '';

function fnUrl(name: string) {
    const codeQS = CODE ? `?code=${encodeURIComponent(CODE)}` : '';
    return `${BASE}/${name}${codeQS}`;
}

export async function POST(
    req: Request,
    ctx: { params: { role: string } }
) {
    const role = (ctx.params?.role || '').trim();
    if (!role) {
        return NextResponse.json({ error: 'Missing role in route' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const payload = {
            role,
            section: body?.section,
            text: body?.text,
            order: body?.order,
            active: body?.active ?? true,
        };

        const url = fnUrl('DayInLifeItemCreate');
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });
        const text = await res.text();

        if (!res.ok) {
            return new NextResponse(text || JSON.stringify({ error: 'Function error' }), {
                status: res.status,
                headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
            });
        }

        return new NextResponse(text, {
            status: 201,
            headers: { 'content-type': 'application/json' },
        });
    } catch (err: any) {
        return NextResponse.json({ error: 'Upstream call failed', details: String(err) }, { status: 502 });
    }
}