"use client";

import { useMemo, useState } from "react";
import type {
    DaysOfWeekJson,
    Weekday,
    WeekOfMonth,
    DoWEntry,
} from "@/lib/daysOfWeek/types"; // plural path per your repo

type Props = {
    role: string;
    days: Weekday[];
    weeks: WeekOfMonth[];
    /** Controlled model from parent */
    model: DaysOfWeekJson;
    /** Parent-driven edit mode (Option A) */
    isEditing: boolean;
    /** Parent-provided setter */
    onChange: (next: DaysOfWeekJson) => void;
    /** Optional: default collapsed state for top-level Monthly */
    defaultMonthlyCollapsed?: boolean;
};

// ✅ Default export is critical for your import style
export default function MatrixEditor({
    role,
    days,
    weeks,
    model,
    isEditing,
    onChange,
    defaultMonthlyCollapsed = true,
}: Props) {
    // UI state: top-level "Monthly" collapsed; inner weeks expanded by default
    const [monthlyOpen, setMonthlyOpen] = useState(!defaultMonthlyCollapsed);
    const [openWeeks, setOpenWeeks] = useState<Record<WeekOfMonth, boolean>>(
        () =>
            weeks.reduce((acc, w) => {
                acc[w] = true; // inner weeks expanded by default
                return acc;
            }, {} as Record<WeekOfMonth, boolean>)
    );

    const safeModel = useMemo<DaysOfWeekJson>(() => {
        // normalize missing buckets (non-destructive clone)
        const next: DaysOfWeekJson = structuredClone(model ?? { version: 1 });
        next.weekly ??= {};
        next.monthly ??= {};
        for (const d of days) {
            next.weekly[d] ??= [];
        }
        for (const w of weeks) {
            next.monthly[w] ??= {};
            for (const d of days) {
                (next.monthly[w] as Record<Weekday, DoWEntry[]>)[d] ??= [];
            }
        }
        return next;
    }, [model, days, weeks]);

    function update(mutator: (draft: DaysOfWeekJson) => void) {
        const clone = structuredClone(safeModel);
        mutator(clone);
        onChange(clone);
    }

    function addItem(scope: "weekly" | "monthly", day: Weekday, wk?: WeekOfMonth) {
        update((draft) => {
            if (scope === "weekly") {
                draft.weekly![day]!.push({ id: crypto.randomUUID(), text: "" });
            } else {
                draft.monthly![wk!]![day]!.push({ id: crypto.randomUUID(), text: "" });
            }
            draft.updatedAt = new Date().toISOString();
            draft.version = draft.version ?? 1;
        });
    }

    function updateEntry(
        scope: "weekly" | "monthly",
        day: Weekday,
        index: number,
        value: Partial<DoWEntry>,
        wk?: WeekOfMonth
    ) {
        update((draft) => {
            if (scope === "weekly") {
                draft.weekly![day]![index] = {
                    ...draft.weekly![day]![index],
                    ...value,
                };
            } else {
                draft.monthly![wk!]![day]![index] = {
                    ...draft.monthly![wk!]![day]![index],
                    ...value,
                };
            }
        });
    }

    function removeEntry(
        scope: "weekly" | "monthly",
        day: Weekday,
        index: number,
        wk?: WeekOfMonth
    ) {
        update((draft) => {
            if (scope === "weekly") {
                draft.weekly![day]!.splice(index, 1);
            } else {
                draft.monthly![wk!]![day]!.splice(index, 1);
            }
        });
    }

    // Render only the cell content (div), not a <td>, to avoid nested <td> hydration issues
    function renderCellContent(
        scope: "weekly" | "monthly",
        day: Weekday,
        wk?: WeekOfMonth
    ) {
        const items: DoWEntry[] =
            scope === "weekly"
                ? safeModel.weekly?.[day] ?? []
                : safeModel.monthly?.[wk!]?.[day] ?? [];

        return (
            <div className="p-2 min-w-50">
                {items.length === 0 && (
                    <div className="text-xs text-slate-400 italic">No items</div>
                )}

                {items.map((entry: DoWEntry, i: number) => (
                    <div
                        key={entry.id ?? `${day}-${wk ?? "weekly"}-${i}`}
                        className="mb-2 space-y-1"
                    >
                        {isEditing ? (
                            <>
                                <input
                                    value={entry.text ?? ""}
                                    onChange={(e) =>
                                        updateEntry(scope, day, i, { text: e.target.value }, wk)
                                    }
                                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm bg-white text-slate-900"
                                    placeholder="Task…"
                                    aria-label="Task text"
                                />
                                <input
                                    value={entry.href ?? ""}
                                    onChange={(e) =>
                                        updateEntry(scope, day, i, { href: e.target.value }, wk)
                                    }
                                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs bg-white text-slate-900"
                                    placeholder="Link (optional)"
                                    aria-label="Task link"
                                />
                                <button
                                    onClick={() => removeEntry(scope, day, i, wk)}
                                    className="rounded border border-red-500 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                                    aria-label="Delete task"
                                >
                                    Delete
                                </button>
                            </>
                        ) : (
                            <div className="text-sm">
                                {entry.href ? (
                                    <a
                                        className="text-indigo-600 underline"
                                        href={entry.href}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {entry.text}
                                    </a>
                                ) : (
                                    entry.text
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {isEditing && (
                    <button
                        onClick={() => addItem(scope, day, wk)}
                        className="mt-1 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                        + Add
                    </button>
                )}
            </div>
        );
    }

    const weeklyTable = (
        <section>
            <h2 className="text-lg font-semibold mb-2">Weekly</h2>
            <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-sm table-fixed">
                    <thead className="sticky top-0 bg-slate-100">
                        <tr>
                            {days.map((d) => (
                                <th key={d} className="border border-slate-300 px-2 py-1 font-medium">
                                    {d}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {days.map((d) => (
                                <td key={`weekly-${d}`} className="align-top border border-slate-300 p-0">
                                    {renderCellContent("weekly", d)}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    );

    const monthlyTables = (
        <section>
            <div className="flex items-center justify-between mt-6 mb-2">
                <h2 className="text-lg font-semibold">Monthly</h2>
                <button
                    onClick={() => setMonthlyOpen((v) => !v)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    aria-expanded={monthlyOpen}
                    aria-controls="monthly-section"
                >
                    {monthlyOpen ? "Collapse" : "Expand"}
                </button>
            </div>

            <div id="monthly-section" className="space-y-6" hidden={!monthlyOpen}>
                {weeks.map((wk) => (
                    <div key={wk} className="border rounded-md">
                        <div className="flex items-center justify-between bg-slate-100 px-2 py-1">
                            <div className="font-medium">{wk}</div>
                            <button
                                onClick={() =>
                                    setOpenWeeks((prev) => ({ ...prev, [wk]: !prev[wk] }))
                                }
                                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs hover:bg-slate-50"
                                aria-expanded={openWeeks[wk]}
                                aria-controls={`week-${wk}`}
                            >
                                {openWeeks[wk] ? "Hide" : "Show"}
                            </button>
                        </div>

                        <div id={`week-${wk}`} hidden={!openWeeks[wk]}>
                            <div className="w-full overflow-x-auto">
                                <table className="w-full border-collapse text-sm table-fixed">
                                    <thead className="sticky top-0 bg-slate-100">
                                        <tr>
                                            {days.map((d) => (
                                                <th
                                                    key={`${wk}-${d}`}
                                                    className="border border-slate-300 px-2 py-1 font-medium"
                                                >
                                                    {d}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {days.map((d) => (
                                                <td
                                                    key={`monthly-${wk}-${d}`}
                                                    className="align-top border border-slate-300 p-0"
                                                >
                                                    {renderCellContent("monthly", d, wk)}
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );

    return (
        <div className="space-y-8">
            {/* Role context note (view-only) */}
            <div className="text-xs text-slate-500">
                {role ? `Role: ${role}` : "Select a role to begin."}
            </div>
            {weeklyTable}
            {monthlyTables}
        </div>
    );
}