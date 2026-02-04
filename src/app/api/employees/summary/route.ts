import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const base = process.env.AZURE_FUNCTION_BASE_URL;
    const code = process.env.AZURE_FUNCTION_CODE;

    if (!base || !code) {
        return NextResponse.json(
            { error: "Missing AZURE_FUNCTION_BASE_URL or AZURE_FUNCTION_CODE" },
            { status: 500 }
        );
    }

    const urlTop = new URL(req.url).searchParams.get("top") || "500";

    const url = `${base}/api/EmployeeListSummary?code=${encodeURIComponent(
        code
    )}&top=${encodeURIComponent(urlTop)}`;

    console.log("SUMMARY PROXY →", url);

    let res: Response;
    try {
        res = await fetch(url, { cache: "no-store" });
    } catch (err: any) {
        return NextResponse.json(
            { error: "Function network error", details: String(err) },
            { status: 500 }
        );
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        return NextResponse.json(
            { error: "Function error", status: res.status, details: text },
            { status: 500 }
        );
    }

    const json = await res.json().catch(() => null);

    if (!json) {
        return NextResponse.json(
            { error: "Invalid JSON from EmployeeListSummary" },
            { status: 500 }
        );
    }

    return NextResponse.json(json, { status: 200 });
}