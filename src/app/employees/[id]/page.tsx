"use client";

/**
 * Page: Employee Detail (Employees / [id])
 *
 * Data:
 * - GET /api/employees/[id]
 * - GET /api/orientation-tracker/[id]
 * - POST /api/orientation-tracker/release/[id]
 * - POST /api/orientation-tracker/item/[itemId]
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import * as React from "react";

/* =========================
   TEMP ROLE FLAG (UI-first)
========================= */
type Role = "employee" | "supervisor" | "admin";
const CURRENT_ROLE: Role = "supervisor";

/* =========================
   Types
========================= */

type EmployeeVM = {
    id: string;
    name: string;
    role: string; // friendly name if available; falls back gracefully
    lastUpdated: string;
};

type TabKey = "overview" | "orientation" | "day" | "absence";
type ItemStatus = "not_started" | "in_progress" | "completed";

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
   Helpers
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

function toServerStatus(s: ItemStatus): "Not Started" | "In Progress" | "Completed" {
    if (s === "completed") return "Completed";
    if (s === "in_progress") return "In Progress";
    return "Not Started";
}

function nextStatus(s: ItemStatus): ItemStatus {
    if (s === "not_started") return "in_progress";
    if (s === "in_progress") return "completed";
    return "not_started";
}

/**
 * Role derivation:
 * 1) Try Employee fields first (RoleName, RoleNameText, Role (lookup text), RoleCodeText)
 * 2) If empty, infer from OrientationTracker rows (RoleNameText, Role, RoleCodeText)
 * Ensures header always shows a role even if only RoleLookupId exists in EmployeeProfiles.
 */
function getRoleFromEmployeeFields(f: Record<string, unknown>): string | undefined {
    return (
        asString(f["RoleName"]) ??
        asString(f["RoleNameText"]) ??
        asString(f["Role"]) ?? // some APIs surface the lookup text here
        asString(f["RoleCodeText"]) ??
        undefined
    );
}

function getRoleFromTrackerRows(rows: TrackerRow[]): string | undefined {
    for (const r of rows) {
        const rf = r.fields;
        const role =
            asString(rf["RoleNameText"]) ??
            asString(rf["Role"]) ??
            asString(rf["RoleCodeText"]);
        if (role && role.trim()) return role;
    }
    return undefined;
}

/** Strip a leading bullet or hyphen and whitespace from labels coming from SharePoint. */
function cleanLabel(label: string): string {
    return label.replace(/^\s*[•\-]\s*/, "");
}

function trackerRowToChecklistItem(row: TrackerRow): ChecklistItemT {
    const f = row.fields;
    const rawLabel =
        asString(f["Title"]) ??
        asString(f["ItemName"]) ??
        asString(f["ChecklistItem"]) ??
        "Untitled";
    return {
        id: row.id,
        label: cleanLabel(rawLabel),
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
        const rawCat = asString(r.fields["OrientationCategory"]) ?? "";
        const category = rawCat.trim() === "General" ? "General" : "Department"; // fallback
        const item = trackerRowToChecklistItem(r);
        if (category === "General") general.push(item);
        else department.push(item);
    }

    const sortFn = (a: ChecklistItemT, b: ChecklistItemT) => {
        const order = (s: ItemStatus) => (s === "completed" ? 2 : s === "in_progress" ? 1 : 0);
        const d = order(a.status) - order(b.status);
        return d !== 0 ? d : a.label.localeCompare(b.label);
    };
    general.sort(sortFn);
    department.sort(sortFn);

    return { general, department };
}

function summarize(items: ChecklistItemT[]) {
    let notStarted = 0;
    let inProgress = 0;
    let completed = 0;
    for (const i of items) {
        if (i.status === "completed") completed++;
        else if (i.status === "in_progress") inProgress++;
        else notStarted++;
    }
    return { notStarted, inProgress, completed };
}

/* =========================
   UI Bits
========================= */

function SummaryCounts({ items }: { items: ChecklistItemT[] }) {
    const s = summarize(items);
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                Not Started — {s.notStarted}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                In Progress — {s.inProgress}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
                Completed — {s.completed}
            </span>
        </div>
    );
}

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

function SectionCard({
    title,
    subtitle,
    items,
    canEdit,
    onToggleItem,
    savingIds,
}: {
    title: string;
    subtitle: string;
    items: ChecklistItemT[];
    canEdit: boolean;
    onToggleItem: (itemId: string) => void;
    savingIds: Set<string>;
}) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2">
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-600">{subtitle}</p>
            </div>

            {/* Summary row */}
            <div className="mb-3">
                <SummaryCounts items={items} />
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
                {!items.length ? <p className="text-sm text-gray-500">No items yet.</p> : null}
            </div>
        </section>
    );
}

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
    const icon = item.status === "completed" ? "✓" : item.status === "in_progress" ? "◐" : "•";

    // Not Started → light gray, In Progress → yellow, Completed → green
    const tone =
        item.status === "completed"
            ? "text-emerald-700 bg-emerald-100 ring-emerald-200"
            : item.status === "in_progress"
                ? "text-amber-700 bg-amber-100 ring-amber-200"
                : "text-gray-700 bg-gray-100 ring-gray-200";

    const clickable = canEdit ? "cursor-pointer hover:bg-white/70" : "cursor-default opacity-95";

    return (
        <div className="py-1">
            <button
                type="button"
                title={item.hoverText ?? item.label}
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
                aria-label={`Toggle status for ${item.label}`}
            >
                <span className="inline-flex h-5 w-5 items-center justify-center font-semibold leading-none">
                    {icon}
                </span>
                <span className="text-gray-900">{item.label}</span>
            </button>
        </div>
    );
}

/* =========================
   Page
========================= */

export default function EmployeeDetailPage() {
    const { id } = useParams() as { id: string };
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const tab = (searchParams.get("tab") as TabKey) ?? "overview";
    const setTab = (t: TabKey) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

    const canEdit = CURRENT_ROLE === "supervisor" || CURRENT_ROLE === "admin";

    /* Employee header (REAL) */
    const [employee, setEmployee] = React.useState<EmployeeVM | null>(null);
    const [empError, setEmpError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const res = await fetch(`/api/employees/${id}`, { cache: "no-store" });
                if (!res.ok) throw new Error(await res.text());
                const json = await res.json();
                const f: Record<string, unknown> = json.item?.fields ?? json.fields ?? json;

                const roleFromEmployee = getRoleFromEmployeeFields(f);

                setEmployee({
                    id,
                    name: asString(f["Title"]) ?? `Employee ${id}`,
                    role: roleFromEmployee ?? "—",
                    lastUpdated: asString(f["Modified"]) ?? "—",
                });
            } catch (e) {
                setEmpError(String(e));
            }
        })();
    }, [id]);

    /* Orientation Tracker (READ) */
    const [general, setGeneral] = React.useState<ChecklistItemT[]>([]);
    const [department, setDepartment] = React.useState<ChecklistItemT[]>([]);
    const [trackerLoaded, setTrackerLoaded] = React.useState(false);
    const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
    const [error, setError] = React.useState<string | null>(null);

    const loadTracker = React.useCallback(async () => {
        if (!id) return;
        setTrackerLoaded(false);
        setError(null);
        try {
            const res = await fetch(`/api/orientation-tracker/${id}`, { cache: "no-store" });
            if (!res.ok) throw new Error(await res.text());
            const json = await res.json();
            const rows: TrackerRow[] = Array.isArray(json.items) ? json.items : Array.isArray(json) ? json : [];
            const s = splitIntoSections(rows);
            setGeneral(s.general);
            setDepartment(s.department);

            // If employee.role is empty/placeholder, infer from tracker presentational helpers.
            const inferred = getRoleFromTrackerRows(rows);
            setEmployee((prev) =>
                prev
                    ? {
                        ...prev,
                        role: prev.role && prev.role !== "—" ? prev.role : inferred ?? prev.role,
                    }
                    : prev
            );
        } catch (e) {
            setError(String(e));
        } finally {
            setTrackerLoaded(true);
        }
    }, [id]);

    React.useEffect(() => {
        loadTracker();
    }, [id, loadTracker]);

    /* Release Orientation */
    async function releaseOrientation() {
        try {
            const res = await fetch(`/api/orientation-tracker/release/${id}`, { method: "POST" });
            if (!res.ok) throw new Error(await res.text());
            await loadTracker();
        } catch (e) {
            setError(String(e));
        }
    }

    /* Status cycle (POST + optimistic with 400 fallback) */
    function updateLocal(itemId: string, newStatus: ItemStatus) {
        setGeneral((prev) => prev.map((x) => (x.id === itemId ? { ...x, status: newStatus } : x)));
        setDepartment((prev) => prev.map((x) => (x.id === itemId ? { ...x, status: newStatus } : x)));
    }

    async function handleToggleItem(itemId: string) {
        const findItem = (arr: ChecklistItemT[]) => arr.find((i) => i.id === itemId);
        const item = findItem(general) ?? findItem(department);
        if (!item) return;

        const next = nextStatus(item.status);
        setSavingIds((s) => new Set(s).add(itemId));
        updateLocal(itemId, next);

        try {
            // 1) Attempt with human-readable values
            let res = await fetch(`/api/orientation-tracker/item/${itemId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: toServerStatus(next) }),
            });

            // 2) If 400, retry with snake_case machine codes
            if (res.status === 400) {
                res = await fetch(`/api/orientation-tracker/item/${itemId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: next }), // "not_started" | "in_progress" | "completed"
                });
            }

            if (!res.ok) throw new Error(`Save failed (${res.status})`);
            await loadTracker();
        } catch (e) {
            updateLocal(itemId, item.status); // revert
            setError(String(e));
        } finally {
            setSavingIds((s) => {
                const n = new Set(s);
                n.delete(itemId);
                return n;
            });
        }
    }

    /* Render */
    if (!employee) {
        return <p className="text-sm text-red-500">Error: {empError ?? "Loading…"} </p>;
    }

    const empty = trackerLoaded && !general.length && !department.length;

    return (
        <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="relative z-10 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{employee.name}</h1>
                    <p className="text-sm text-gray-600">
                        {employee.role} · Last updated {employee.lastUpdated}
                    </p>
                </div>
                <Link
                    href="/employees"
                    className="text-sm text-blue-700 hover:underline"
                    aria-label="Back to Employees"
                >
                    ← Back
                </Link>
            </div>

            <Tabs active={tab} onChange={setTab} />

            {/* Orientation tab */}
            {tab === "orientation" && (
                <>
                    {error ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    ) : null}

                    {empty && (
                        <div className="relative z-20 rounded-lg border border-gray-200 bg-gray-50 p-6">
                            {canEdit ? (
                                <>
                                    <p className="mb-4 text-gray-700">
                                        Orientation tasks have not been released for this employee.
                                    </p>
                                    <button
                                        onClick={releaseOrientation}
                                        className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        Release Orientation Items
                                    </button>
                                </>
                            ) : (
                                <p className="text-gray-600">Orientation tasks have not been released yet.</p>
                            )}
                        </div>
                    )}

                    {!empty && (
                        <div className="relative z-10 grid gap-4 lg:grid-cols-2">
                            <SectionCard
                                title="General Orientation"
                                subtitle={`Core onboarding items — ${employee.role}`}
                                items={general}
                                canEdit={canEdit}
                                onToggleItem={handleToggleItem}
                                savingIds={savingIds}
                            />
                            <SectionCard
                                title="Department Orientation"
                                subtitle={`Role-specific items — ${employee.role}`}
                                items={department}
                                canEdit={canEdit}
                                onToggleItem={handleToggleItem}
                                savingIds={savingIds}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Other tabs unchanged (placeholders for now) */}
            {tab === "overview" && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-600">
                        Overview content coming next (kept unchanged in this drop).
                    </p>
                </div>
            )}
            {tab === "day" && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-600">“Day in the Life” content placeholder.</p>
                </div>
            )}
            {tab === "absence" && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-600">“In the Absence Of” content placeholder.</p>
                </div>
            )}
        </div>
    );
}