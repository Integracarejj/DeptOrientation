"use client";

/**
 * Page: Employee Detail (Employees / [id])
 *
 * Purpose:
 * - Displays per-employee onboarding/orientation progress.
 * - Uses real EmployeeProfiles + OrientationTracker data from SharePoint.
 *
 * Data flow:
 * - GET /api/employees/[id]           (employee header info)
 * - GET /api/orientation-tracker/[id] (orientation tasks)
 * - POST /api/orientation-tracker/release/[id] (generate tasks)
 * - POST /api/orientation-tracker/item/[itemId] (status updates)
 *
 * Behavior:
 * - If OrientationTracker has no rows:
 *     Supervisor/Admin sees "Release Orientation Items"
 *     Employee sees read-only message
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import * as React from "react";

/* =========================
   TEMP ROLE FLAG (UI-first)
========================= */
type Role = "employee" | "supervisor" | "admin";
const CURRENT_ROLE: Role = "supervisor";
const CURRENT_USER = "Jeremy Joyner";

/* =========================
   Types
========================= */

type EmployeeVM = {
    id: string;
    name: string;
    role: string;
    lastUpdated: string;
};

type TabKey = "overview" | "orientation" | "day" | "absence";
type ItemStatus = "not_started" | "in_progress" | "completed";
type SectionStatus = "Not Started" | "In Progress" | "Completed";

type ChecklistItemT = {
    id: string;
    label: string;
    status: ItemStatus;
    hoverText?: string;
    startedBy?: string;
    startedAt?: string;
    completedBy?: string;
    completedAt?: string;
    updatedBy?: string;
    updatedAt?: string;
};

type TrackerRow = {
    id: string;
    fields: Record<string, unknown>;
};

/* =========================
   Helpers (unchanged from your version)
========================= */

function asString(v: unknown): string | undefined {
    if (typeof v === "string") return v;
    if (v === null || v === undefined) return undefined;
    return String(v);
}

function asItemStatus(v: unknown): ItemStatus {
    const s = (asString(v) ?? "").trim().toLowerCase();
    if (s === "not started") return "not_started";
    if (s === "in progress") return "in_progress";
    if (s === "completed") return "completed";
    if (s === "not_started" || s === "in_progress" || s === "completed") return s;
    return "not_started";
}

function trackerRowToChecklistItem(row: TrackerRow): ChecklistItemT {
    const f = row.fields;
    return {
        id: row.id,
        label:
            asString(f["Title"]) ??
            asString(f["ItemName"]) ??
            asString(f["ChecklistItem"]) ??
            "Untitled",
        status: asItemStatus(f["Status"]),
        hoverText: asString(f["HoverText"]) ?? asString(f["HelpText"]),
        startedBy: asString(f["StartedBy"]),
        startedAt: asString(f["StartedAt"]),
        completedBy: asString(f["CompletedBy"]),
        completedAt: asString(f["CompletedAt"]),
        updatedBy: asString(f["UpdatedBy"]),
        updatedAt: asString(f["UpdatedAt"]),
    };
}

function splitIntoSections(rows: TrackerRow[]) {
    const general: ChecklistItemT[] = [];
    const department: ChecklistItemT[] = [];

    for (const r of rows) {
        const section =
            asString(r.fields["Section"]) ??
            asString(r.fields["SectionName"]) ??
            asString(r.fields["Category"]) ??
            "";

        const item = trackerRowToChecklistItem(r);

        section.toLowerCase().includes("general")
            ? general.push(item)
            : department.push(item);
    }

    return { general, department };
}

/* =========================
   Status helpers
========================= */

function getSectionStatus(items: ChecklistItemT[]): SectionStatus {
    const total = items.length;
    const completed = items.filter((i) => i.status === "completed").length;
    const started = items.filter((i) => i.status !== "not_started").length;

    if (started === 0) return "Not Started";
    if (completed === total) return "Completed";
    return "In Progress";
}

/* =========================
   Tabs
========================= */

function Tabs({
    active,
    onChange,
}: {
    active: TabKey;
    onChange: (tab: TabKey) => void;
}) {
    const tabs: Array<{ key: TabKey; label: string }> = [
        { key: "overview", label: "Overview" },
        { key: "orientation", label: "Orientation" },
        { key: "day", label: "Day in the Life" },
        { key: "absence", label: "In the Absence Of" },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
            {tabs.map((t) => {
                const isActive = t.key === active;
                return (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => onChange(t.key)}
                        className={[
                            "rounded-md px-3 py-2 text-sm transition",
                            isActive
                                ? "bg-gray-100 text-gray-900 ring-1 ring-gray-300"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        ].join(" ")}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {t.label}
                    </button>
                );
            })}
        </div>
    );
}

/* =========================
   Section card
========================= */

function SectionCard({
    title,
    subtitle,
    status,
    items,
    canEdit,
    onToggleItem,
    savingIds,
}: {
    title: string;
    subtitle: string;
    status: SectionStatus;
    items: ChecklistItemT[];
    canEdit: boolean;
    onToggleItem: (itemId: string) => void;
    savingIds: Set<string>;
}) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-600">{subtitle}</p>
                </div>
                <StatusBadge status={status} />
            </div>

            <div className="space-y-1">
                {items.map((item) => (
                    <ChecklistItem
                        key={item.id}
                        item={item}
                        canEdit={canEdit}
                        onToggle={onToggleItem}
                        saving={savingIds.has(item.id)}
                    />
                ))}

                {!items.length ? (
                    <p className="text-sm text-gray-500">No items yet.</p>
                ) : null}
            </div>
        </section>
    );
}

/* =========================
   Status badge
========================= */

function StatusBadge({ status }: { status: SectionStatus }) {
    const styles: Record<SectionStatus, string> = {
        "Not Started": "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
        "In Progress": "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
        Completed: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    };

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${styles[status]}`}>
            {status}
        </span>
    );
}

/* =========================
   Checklist item
========================= */

function ChecklistItem({
    item,
    canEdit,
    onToggle,
    saving,
}: {
    item: ChecklistItemT;
    canEdit: boolean;
    onToggle: (itemId: string) => void;
    saving?: boolean;
}) {
    const icon =
        item.status === "completed"
            ? "✓"
            : item.status === "in_progress"
                ? "◐"
                : "•";

    const tone =
        item.status === "completed"
            ? "text-emerald-700 bg-emerald-100 ring-emerald-200"
            : item.status === "in_progress"
                ? "text-amber-700 bg-amber-100 ring-amber-200"
                : "text-gray-500 bg-gray-100 ring-gray-200";

    const clickable = canEdit
        ? "cursor-pointer hover:bg-gray-50"
        : "cursor-default opacity-90";

    return (
        <div className="py-1">
            <button
                type="button"
                className={[
                    "w-full text-left rounded-md px-2 py-1 -mx-2",
                    "flex items-start gap-3 ring-1",
                    tone,
                    clickable,
                    saving ? "opacity-60" : "",
                ].join(" ")}
                onClick={() => {
                    if (!canEdit || saving) return;
                    onToggle(item.id);
                }}
                disabled={!canEdit || saving}
                aria-disabled={!canEdit || saving}
            >
                <span className="inline-flex h-5 w-5 items-center justify-center">
                    {icon}
                </span>
                <span className="text-gray-900">{item.label}</span>
            </button>
        </div>
    );
}

export default function EmployeeDetailPage() {
    const { id } = useParams() as { id: string };
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const tab = (searchParams.get("tab") as TabKey) ?? "overview";
    const setTab = (t: TabKey) =>
        router.replace(`${pathname}?tab=${t}`, { scroll: false });

    const canEdit = CURRENT_ROLE === "supervisor" || CURRENT_ROLE === "admin";
    const nowIso = () => new Date().toISOString();
    const isSPId = (v: string) => /^\d+$/.test(v);

    /* =========================
       Employee header (REAL)
    ========================= */
    const [employee, setEmployee] = React.useState<EmployeeVM | null>(null);
    const [empError, setEmpError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const res = await fetch(`/api/employees/${id}`, { cache: "no-store" });
                if (!res.ok) throw new Error(await res.text());
                const json = await res.json();
                const f = json.item.fields;

                setEmployee({
                    id,
                    name: asString(f["Title"]) ?? `Employee ${id}`,
                    role: asString(f["RoleName"]) ?? "—",
                    lastUpdated: asString(f["Modified"]) ?? "—",
                });
            } catch (e) {
                setEmpError(String(e));
            }
        })();
    }, [id]);

    /* =========================
       Orientation Tracker (READ)
    ========================= */
    const [general, setGeneral] = React.useState<ChecklistItemT[]>([]);
    const [department, setDepartment] = React.useState<ChecklistItemT[]>([]);
    const [trackerLoaded, setTrackerLoaded] = React.useState(false);

    React.useEffect(() => {
        if (!id) return;
        setTrackerLoaded(false);

        (async () => {
            const res = await fetch(`/api/orientation-tracker/${id}`, {
                cache: "no-store",
            });
            if (!res.ok) {
                setTrackerLoaded(true);
                return;
            }

            const json = await res.json();
            const rows = Array.isArray(json.items) ? json.items : [];
            if (rows.length) {
                const s = splitIntoSections(rows);
                setGeneral(s.general);
                setDepartment(s.department);
            }
            setTrackerLoaded(true);
        })();
    }, [id]);
    /* =========================
       Release Orientation
    ========================= */
    async function releaseOrientation() {
        await fetch(`/api/orientation-tracker/release/${id}`, {
            method: "POST",
        });
        router.refresh();
    }

    if (!employee) {
        return <p className="text-sm text-red-500">Error: {empError ?? "Loading…"}</p>;
    }

    const empty = trackerLoaded && !general.length && !department.length;

    return (
        <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="relative z-10 flex justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{employee.name}</h1>
                    <p className="text-sm text-gray-600">
                        {employee.role} · Last updated {employee.lastUpdated}
                    </p>
                </div>
                <Link href="/employees">← Back</Link>
            </div>

            <Tabs active={tab} onChange={setTab} />

            {empty && (
                <div className="relative z-20 rounded-lg border border-gray-200 bg-gray-50 p-6">
                    {canEdit ? (
                        <>
                            <p className="mb-4 text-gray-700">
                                Orientation tasks have not been released for this employee.
                            </p>

                            {/* ✅ FORCE INTERACTION HERE */}
                            <button
                                onClick={releaseOrientation}
                                style={{ pointerEvents: "auto", zIndex: 50 }}
                                className="relative z-50 cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                Release Orientation Items
                            </button>
                        </>
                    ) : (
                        <p className="text-gray-600">
                            Orientation tasks have not been released yet.
                        </p>
                    )}
                </div>
            )}

            {!empty && (
                <div className="relative z-10 grid gap-4 lg:grid-cols-2">
                    <SectionCard
                        title="General Orientation"
                        subtitle="Core onboarding items"
                        status={getSectionStatus(general)}
                        items={general}
                        canEdit={canEdit}
                        onToggleItem={() => { }}
                        savingIds={new Set()}
                    />

                    <SectionCard
                        title="Department Orientation"
                        subtitle="Role-specific items"
                        status={getSectionStatus(department)}
                        items={department}
                        canEdit={canEdit}
                        onToggleItem={() => { }}
                        savingIds={new Set()}
                    />
                </div>
            )}
        </div>
    );
}