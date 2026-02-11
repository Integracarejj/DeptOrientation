"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DaysOfWeekJson, WeekOfMonth, Weekday } from "@/lib/daysOfWeek/types";
import { useSearchParams } from "next/navigation";
import MatrixEditor from "./components/MatrixEditor"; // ✅ default import to match default export
import RolePicker from "@/app/day-in-life/components/RolePicker";

const WEEKS: WeekOfMonth[] = ["FirstWeek", "SecondWeek", "ThirdWeek", "FourthWeek"];
const DAYS: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function DaysOfWeekPageClient() {
    const qs = useSearchParams();

    // role from query string, editable via RolePicker
    const [role, setRole] = useState(qs.get("role") ?? "");
    const [data, setData] = useState<DaysOfWeekJson | null>(null);

    // page editing lifecycle
    const [isEditing, setIsEditing] = useState(false);
    const snapshotRef = useRef<DaysOfWeekJson | null>(null);

    const [busy, setBusy] = useState(false);
    const [banner, setBanner] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!role) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/day-in-life/days-of-week/${encodeURIComponent(role)}`, {
                cache: "no-store",
            });
            if (!res.ok) {
                const t = await res.text();
                throw new Error(t || "Failed to load Days of Week");
            }
            const json = (await res.json()) as DaysOfWeekJson;
            setData(json);
        } catch (e: any) {
            setError(`Could not load Days of Week: ${String(e?.message ?? e)}`);
        } finally {
            setBusy(false);
        }
    }, [role]);

    useEffect(() => {
        void load();
    }, [load]);

    // Save current model then refetch canonical
    async function exitEditAndSave() {
        if (!data || !role) {
            setIsEditing(false);
            return;
        }
        setBusy(true);
        setBanner("Saving…");
        setError(null);
        try {
            const res = await fetch(`/api/day-in-life/days-of-week/${encodeURIComponent(role)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    updatedAt: new Date().toISOString(),
                    version: typeof data.version === "number" ? data.version : 1,
                } as DaysOfWeekJson),
            });
            if (!res.ok) {
                const t = await res.text();
                throw new Error(t || "Save failed");
            }
            // After successful save, refetch canonical
            await load();
            setBanner("Saved.");
            setTimeout(() => setBanner(null), 1200);
        } catch (e: any) {
            console.error(e);
            setBanner(null);
            setError(`Save failed: ${String(e?.message ?? e)}`);
        } finally {
            setBusy(false);
            setIsEditing(false);
        }
    }

    function toggleEdit() {
        if (!isEditing) {
            snapshotRef.current = data ? structuredClone(data) : null;
            setBanner(null);
            setIsEditing(true);
        } else {
            void exitEditAndSave();
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 bg-white text-slate-900">
            {/* Top toolbar: RolePicker (left) and TEAL Edit/Done (right) */}
            <div className="mb-4 flex items-center justify-between gap-4">
                <RolePicker value={role} onChange={setRole} />

                <button
                    onClick={toggleEdit}
                    className={`rounded px-3 py-1.5 text-sm font-medium shadow focus:outline-none focus-visible:ring-2
            ${isEditing ? "bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-700"
                            : "bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-600"}`}
                    aria-pressed={isEditing}
                >
                    {isEditing ? "Done" : "Edit"}
                </button>
            </div>

            {/* Status banners */}
            {banner && (
                <div
                    role="status"
                    className="mb-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm"
                >
                    {banner}
                </div>
            )}
            {error && (
                <div
                    role="alert"
                    className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            {/* Editor */}
            {role ? (
                data ? (
                    <MatrixEditor
                        role={role}
                        days={DAYS}
                        weeks={WEEKS}
                        model={data}
                        isEditing={isEditing}
                        onChange={setData}
                        defaultMonthlyCollapsed={true}
                    />
                ) : busy ? (
                    <div className="text-sm text-slate-500">Loading…</div>
                ) : (
                    <div className="text-sm text-slate-500">No data.</div>
                )
            ) : (
                <div className="text-sm text-slate-500">Select a role to begin.</div>
            )}

            {/* Non-blocking saving overlay while editing */}
            {isEditing && busy && (
                <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center">
                    <div className="mt-8 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 shadow-lg">
                        Saving…
                    </div>
                </div>
            )}
        </div>
    );
}