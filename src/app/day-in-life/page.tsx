// src/app/day-in-life/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function DayInLifePage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<string>("");

    async function load() {
        setLoading(true);
        setError(null);
        try {
            // Mirror Employees pattern: client fetch to our server API
            const res = await fetch("/api/day-in-life/summary", { cache: "no-store" });
            const text = await res.text();
            if (!res.ok) {
                setError(`HTTP ${res.status}\n${text}`);
                setPayload(text);
            } else {
                setPayload(text); // raw JSON on screen (Step 1 proof)
            }
        } catch (e: any) {
            setError(e?.message || "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    return (
        <main className="p-4 md:p-6">
            <h1 className="mb-4 text-2xl font-semibold">Day in the Life — Debug</h1>
            <p className="mb-2 text-sm text-slate-600">
                Raw JSON returned from <code>/api/day-in-life/summary</code>.
            </p>

            {loading && <p>Loading…</p>}
            {error && (
                <pre className="whitespace-pre-wrap bg-red-900/80 p-3 text-xs text-red-100 rounded">{error}</pre>
            )}
            {!loading && (
                <pre className="whitespace-pre-wrap bg-slate-900 p-3 text-xs text-slate-100 rounded">{payload}</pre>
            )}
        </main>
    );
}