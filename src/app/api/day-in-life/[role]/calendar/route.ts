import { NextResponse } from 'next/server';

const BASE = process.env.AZURE_FUNCTIONS_BASE_URL!;
const CODE = process.env.AZURE_FUNCTIONS_CODE || '';

function fnUrl(name: string, qs = '') {
    const codeQS = CODE ? (qs ? `&code=${encodeURIComponent(CODE)}` : `?code=${encodeURIComponent(CODE)}`) : '';
    return `${BASE}/${name}${qs ? `?${qs}` : ''}${codeQS}`;
}

export async function GET(_req: Request, ctx: { params: { role: string } }) {
    const role = (ctx.params?.role || '').trim();
    if (!role) return NextResponse.json({ error: 'Missing role' }, { status: 400 });

    const url = fnUrl('DayInLifeCalendarGet', `role=${encodeURIComponent(role)}`);
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
}

export async function PATCH(req: Request, ctx: { params: { role: string } }) {
    const role = (ctx.params?.role || '').trim();
    if (!role) return NextResponse.json({ error: 'Missing role' }, { status: 400 });

    const body = await req.json();
    const url = fnUrl('DayInLifeCalendarUpdate');
    const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role, calendar: body }),
        cache: 'no-store',
    });
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } });
}