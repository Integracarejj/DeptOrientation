import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json().catch(() => ({}));

        const baseUrl = getRequiredEnv("AZURE_FUNCTION_BASE_URL");
        const funcCode = getRequiredEnv("AZURE_FUNCTION_CODE");

        const url = `${baseUrl}/api/EmployeeProfileReviewed?code=${encodeURIComponent(funcCode)}`;

        const payload = {
            employeeId: id,
            reviewed: body.reviewed ?? true,
            reviewedAt: body.reviewedAt,
            reviewedBy: body.reviewedBy
        };

        console.log("EmployeeProfileReviewed →", url, payload);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify(payload)
        });

        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                {
                    error: "Azure Function call failed",
                    status: res.status,
                    details: text
                },
                { status: 500 }
            );
        }

        return NextResponse.json(JSON.parse(text), { status: 200 });

    } catch (e) {
        return NextResponse.json(
            {
                error: "Unhandled error",
                message: e instanceof Error ? e.message : String(e)
            },
            { status: 500 }
        );
    }
}