"use client";

/**
 * Page: Employee Detail (Employees / [id])
 *
 * Data:
 * - GET  /api/employees/[id]
 * - GET  /api/orientation-tracker/[id]
 * - POST /api/orientation-tracker/release/[id]
 * - POST /api/orientation-tracker/item/[itemId]
 * - POST /api/audit/reviewed                 (audit: supervisor reviewed page)
 * - POST /api/employees/reviewed/[id]        (best-effort: flip EmployeeProfiles Reviewed=Yes; optional backend)
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import * as React from "react";

/* =========================
   TEMP ROLE FLAG (UI-first)
========================= */
type Role = "employee" | "supervisor" | "admin";
const CURRENT_ROLE: Role = "supervisor";
/** Used for audit “reviewedBy”; replace with real identity when SSO lands */
const CURRENT_USER = "Jeremy Joyner";

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

    /** stable ordering key (TemplateTaskId or similar) */
    orderKey?: number;
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
function asNumber(v: unknown): number | undefined {
    if (typeof v === "number") return v;
    const s = asString(v);
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
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

/** We no longer change order when status changes. */
function nextStatus(_s: ItemStatus): ItemStatus {
    return _s; // no-op; kept for reference
}

/**
 * Role derivation:
 * 1) Try Employee fields first (RoleName, RoleNameText, Role (lookup text), RoleCodeText)
 * 2) If empty, infer from OrientationTracker rows (RoleNameText, Role, RoleCodeText)
 * 3) Persist to sessionStorage to survive navigation
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

function readRoleCache(empId: string): string | undefined {
    try {
        const k = `employeeRole:${empId}`;
        const v = sessionStorage.getItem(k);
        return v ?? undefined;
    } catch {
        return undefined;
    }
}
function writeRoleCache(empId: string, role: string) {
    try {
        const k = `employeeRole:${empId}`;
        sessionStorage.setItem(k, role);
    } catch {
        // ignore
    }
}

/** Strip a leading bullet/hyphen + whitespace from some imported labels (display only). */
function cleanLabel(label: string): string {
    return label.replace(/^\s*[•\-]\s*/, "");
}

function trackerRowToChecklistItem(row: TrackerRow, originalIndex: number): ChecklistItemT {
    const f = row.fields;
    const rawLabel =
        asString(f["Title"]) ??
        asString(f["ItemName"]) ??
        asString(f["ChecklistItem"]) ??
        "Untitled";
    const orderKey =
        asNumber(f["TemplateTaskId"]) ??
        asNumber(f["templateTaskId"]) ??
        originalIndex; // stable fallback

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
        orderKey,
    };
}

function splitIntoSections(rows: TrackerRow[]) {
    const general: ChecklistItemT[] = [];
    const department: ChecklistItemT[] = [];

    rows.forEach((r, idx) => {
        const rawCat = asString(r.fields["OrientationCategory"]) ?? "";
        const category = rawCat.trim() === "General" ? "General" : "Department"; // fallback
        const item = trackerRowToChecklistItem(r, idx);
        if (category === "General") general.push(item);
        else department.push(item);
    });

    // Stable order: TemplateTaskId (or original index) then alpha
    const byStableOrder = (a: ChecklistItemT, b: ChecklistItemT) => {
        const ak = a.orderKey ?? 0;
        const bk = b.orderKey ?? 0;
        if (ak !== bk) return ak - bk;
        return a.label.localeCompare(b.label);
    };
    general.sort(byStableOrder);
    department.sort(byStableOrder);

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

/** Three-state status selector shown at the left of each item row. */
function StatusSelector({
    value,
    onSelect,
    disabled,
}: {
    value: ItemStatus;
    onSelect: (s: ItemStatus) => void;
    disabled?: boolean;
}) {
    const btnBase =
        "inline-flex items-center justify-center h-5 w-5 rounded-sm ring-1 text-[10px] font-bold";
    const neutral = "bg-gray-100 ring-gray-300 text-gray-600";
    const activeNS = "bg-gray-700 ring-gray-700 text-white";
    const activeIP = "bg-amber-500 ring-amber-500 text-white";
    const activeCP = "bg-emerald-600 ring-emerald-600 text-white";

    return (
        <div className="flex items-center gap-1" aria-label="Status selector">
            <button
                type="button"
                disabled={disabled}
                className={[
                    btnBase,
                    value === "not_started" ? activeNS : neutral,
                    disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
                title="Not Started"
                onClick={() => onSelect("not_started")}
            >
                •
            </button>
            <button
                type="button"
                disabled={disabled}
                className={[
                    btnBase,
                    value === "in_progress" ? activeIP : neutral,
                    disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
                title="In Progress"
                onClick={() => onSelect("in_progress")}
            >
                ◐
            </button>
            <button
                type="button"
                disabled={disabled}
                className={[
                    btnBase,
                    value === "completed" ? activeCP : neutral,
                    disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
                title="Completed"
                onClick={() => onSelect("completed")}
            >
                ✓
            </button>
        </div>
    );
}

function SectionCard({
    title,
    subtitle,
    items,
    canEdit,
    onSetStatus,
    savingIds,
}: {
    title: string;
    subtitle: string;
    items: ChecklistItemT[];
    canEdit: boolean;
    onSetStatus: (itemId: string, status: ItemStatus) => void;
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
                        onSetStatus={onSetStatus}
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
    onSetStatus,
    saving,
}: {
    item: ChecklistItemT;
    canEdit: boolean;
    onSetStatus: (itemId: string, status: ItemStatus) => void;
    saving?: boolean;
}) {
    // Row tone (kept)
    const tone =
        item.status === "completed"
            ? "text-emerald-700 bg-emerald-100 ring-emerald-200"
            : item.status === "in_progress"
                ? "text-amber-700 bg-amber-100 ring-amber-200"
                : "text-gray-700 bg-gray-100 ring-gray-200";

    return (
        <div className="py-1">
            <div
                className={[
                    "w-full rounded-md px-2 py-1 -mx-2",
                    "flex items-center gap-3 ring-1",
                    tone,
                    saving ? "opacity-60" : "",
                ].join(" ")}
            >
                <StatusSelector
                    value={item.status}
                    onSelect={(s) => onSetStatus(item.id, s)}
                    disabled={!canEdit || !!saving}
                />
                <div className="flex-1">
                    <div className="text-gray-900">{item.label}</div>
                </div>
            </div>
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

                // Prefer API fields, else restore from cache
                const roleFromEmployee = getRoleFromEmployeeFields(f) ?? readRoleCache(id) ?? "—";

                setEmployee({
                    id,
                    name: asString(f["Title"]) ?? `Employee ${id}`,
                    role: roleFromEmployee,
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
    const [allCompleted, setAllCompleted] = React.useState(false);

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

            // compute completion
            const isDone =
                s.general.every((i) => i.status === "completed") &&
                s.department.every((i) => i.status === "completed");
            setAllCompleted(isDone);

            // If employee.role is empty/placeholder, infer from tracker; cache it for future visits.
            const inferred = getRoleFromTrackerRows(rows);
            if (inferred && inferred.trim()) {
                setEmployee((prev) =>
                    prev
                        ? {
                            ...prev,
                            role: prev.role && prev.role !== "—" ? prev.role : inferred,
                        }
                        : prev
                );
                writeRoleCache(id, inferred);
            }
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

    /* Status set (POST + optimistic with 400 fallback) */
    function updateLocal(itemId: string, newStatus: ItemStatus) {
        setGeneral((prev) => prev.map((x) => (x.id === itemId ? { ...x, status: newStatus } : x)));
        setDepartment((prev) => prev.map((x) => (x.id === itemId ? { ...x, status: newStatus } : x)));
    }

    async function handleSetStatus(itemId: string, target: ItemStatus) {
        const findItem = (arr: ChecklistItemT[]) => arr.find((i) => i.id === itemId);
        const item = findItem(general) ?? findItem(department);
        if (!item) return;

        setSavingIds((s) => new Set(s).add(itemId));
        const prevStatus = item.status;
        updateLocal(itemId, target);

        try {
            // 1) Attempt with human-readable values
            let res = await fetch(`/api/orientation-tracker/item/${itemId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: toServerStatus(target) }),
            });

            // 2) If 400, retry with snake_case machine codes
            if (res.status === 400) {
                res = await fetch(`/api/orientation-tracker/item/${itemId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: target }), // "not_started" | "in_progress" | "completed"
                });
            }

            if (!res.ok) throw new Error(`Save failed (${res.status})`);
            await loadTracker();
        } catch (e) {
            updateLocal(itemId, prevStatus); // revert
            setError(String(e));
        } finally {
            setSavingIds((s) => {
                const n = new Set(s);
                n.delete(itemId);
                return n;
            });
        }
    }

    /* ========== Audit: Mark Orientation as Reviewed (supervisor-only) ========== */
    async function markReviewed() {
        // Guard: only allow when all items are completed
        if (!allCompleted) {
            setError("All orientation items must be Completed before marking as Reviewed.");
            return;
        }

        const reviewedAt = new Date().toISOString();

        try {
            // Write audit log (simple endpoint)
            const resAudit = await fetch(`/api/audit/reviewed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: id,
                    page: "Orientation",
                    reviewedBy: CURRENT_USER,
                    reviewedAt,
                }),
            });
            if (!resAudit.ok) throw new Error(`Audit save failed (${resAudit.status})`);

            // Best-effort: flip "Reviewed" on EmployeeProfiles (backend to implement)
            const resReviewed = await fetch(`/api/employees/reviewed/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reviewed: true,
                    reviewedAt,
                    reviewedBy: CURRENT_USER,
                }),
            });
            // ignore non-2xx for now

            setError(null);
            alert("Orientation marked as Reviewed.");
        } catch (e) {
            setError(String(e));
        }
    }

    /* Render */
    if (!employee) {
        return <p className="text-sm text-red-500">Error: {empError ?? "Loading…"} </p>;
    }

    const roleForDisplay = employee?.role ?? "—";
    const empty = trackerLoaded && !general.length && !department.length;

    return (
        <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="relative z-10 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold">
                        {employee.name}
                        {roleForDisplay !== "—" && (
                            <span className="text-xl font-semibold text-gray-400 ml-2">– {roleForDisplay}</span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500">Last updated {employee.lastUpdated}</p>
                </div>

                <Link
                    href="/employees"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-500/40 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700/30"
                    aria-label="Back to Employee List"
                >
                    ← Back to Employee List
                </Link>
            </div>



            {/* Orientation tab */}
            {tab === "orientation" && (
                <>
                    {/* Reviewed button for supervisors/admins */}
                    {canEdit && (
                        <div className="flex justify-end">
                            <button
                                onClick={markReviewed}
                                disabled={!allCompleted}
                                className={[
                                    "mb-2 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2",
                                    allCompleted
                                        ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-400"
                                        : "bg-gray-300 text-gray-600 cursor-not-allowed focus:ring-gray-300",
                                ].join(" ")}
                                title={
                                    allCompleted
                                        ? "Mark Orientation as Reviewed"
                                        : "All items must be Completed before review"
                                }
                            >
                                ✔ Mark Orientation as Reviewed
                            </button>
                        </div>
                    )}

                    {error ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    ) : null}

                    {empty ? (
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
                    ) : (
                        <div className="relative z-10 grid gap-4 lg:grid-cols-2">
                            <SectionCard
                                title="General Orientation"
                                subtitle={`Core onboarding items — ${roleForDisplay}`}
                                items={general}
                                canEdit={canEdit}
                                onSetStatus={handleSetStatus}
                                savingIds={savingIds}
                            />
                            <SectionCard
                                title="Department Orientation"
                                subtitle={`Role-specific items — ${roleForDisplay}`}
                                items={department}
                                canEdit={canEdit}
                                onSetStatus={handleSetStatus}
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