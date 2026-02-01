"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import * as React from "react";

/* =========================
   TEMP ROLE FLAG (UI-first)
   Replace later with real auth
========================= */
type Role = "employee" | "supervisor" | "admin";

// TEMP: flip this to "employee" to verify read-only behavior
const CURRENT_ROLE: Role = "supervisor";

// TEMP: who is making the change (later comes from auth)
const CURRENT_USER = "Jeremy Joyner";

/* =========================
   Types
========================= */

type Employee = {
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

    /**
     * Optional workflow note shown on hover for in_progress (and can be reused later)
     */
    hoverText?: string;

    /**
     * Audit fields (UI-first now, SharePoint later)
     */
    startedBy?: string;
    startedAt?: string; // ISO string
    completedBy?: string;
    completedAt?: string; // ISO string
    updatedBy?: string;
    updatedAt?: string; // ISO string
};

/* =========================
   SharePoint tracker types
========================= */

type TrackerRow = {
    id: string;
    fields: Record<string, unknown>;
};

/* =========================
   Mock employee data
========================= */

const EMPLOYEES: Employee[] = [
    {
        id: "1",
        name: "Jane Doe",
        role: "Administrative Services Director",
        lastUpdated: "2 days ago",
    },
    {
        id: "2",
        name: "Mark Stevens",
        role: "Dining Experience Director",
        lastUpdated: "Jan 22, 2026",
    },
];

/* =========================
   Helpers
========================= */

function getSectionStatus(items: ChecklistItemT[]): SectionStatus {
    const total = items.length;
    const completed = items.filter((i) => i.status === "completed").length;
    const started = items.filter((i) => i.status !== "not_started").length;

    if (started === 0) return "Not Started";
    if (completed === total) return "Completed";
    return "In Progress";
}

function deriveOverallStatus(required: SectionStatus[]): SectionStatus {
    if (required.some((s) => s === "Not Started")) return "Not Started";
    if (required.every((s) => s === "Completed")) return "Completed";
    return "In Progress";
}

function nextStatus(current: ItemStatus): ItemStatus {
    // cycle: not_started → in_progress → completed → not_started
    if (current === "not_started") return "in_progress";
    if (current === "in_progress") return "completed";
    return "not_started";
}

function formatWhen(iso?: string) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function buildHoverAuditText(item: ChecklistItemT): string | undefined {
    // Only show hover if we actually have something useful
    const parts: string[] = [];

    if (item.status === "in_progress") {
        if (item.startedBy || item.startedAt) {
            parts.push(
                `Started${item.startedBy ? ` by ${item.startedBy}` : ""}${item.startedAt ? ` on ${formatWhen(item.startedAt)}` : ""
                }.`
            );
        }
        if (item.hoverText) parts.push(item.hoverText);
    }

    if (item.status === "completed") {
        if (item.completedBy || item.completedAt) {
            parts.push(
                `Completed${item.completedBy ? ` by ${item.completedBy}` : ""}${item.completedAt ? ` on ${formatWhen(item.completedAt)}` : ""
                }.`
            );
        }
    }

    // Always helpful as a final line once you start using it:
    if (item.updatedBy || item.updatedAt) {
        parts.push(
            `Last updated${item.updatedBy ? ` by ${item.updatedBy}` : ""}${item.updatedAt ? ` on ${formatWhen(item.updatedAt)}` : ""
            }.`
        );
    }

    const text = parts.join(" ");
    return text.trim().length ? text : undefined;
}

/* =========================
   Safe coercion + SharePoint mapping helpers
   (Only place you should tweak field names later)
========================= */

function asString(v: unknown): string | undefined {
    if (typeof v === "string") return v;
    if (v === null || v === undefined) return undefined;
    return String(v);
}

function asItemStatus(v: unknown): ItemStatus {
    const s = (asString(v) ?? "").trim();

    // Accept SharePoint-friendly values written by your function
    if (s.toLowerCase() === "not started") return "not_started";
    if (s.toLowerCase() === "in progress") return "in_progress";
    if (s.toLowerCase() === "completed") return "completed";

    // Also accept underscore format (future-proof)
    if (s === "not_started" || s === "in_progress" || s === "completed") return s;

    return "not_started";
}

/**
 * Maps one OrientationTracker list row → your ChecklistItemT shape.
 * IMPORTANT: We use row.id as ChecklistItemT.id so later Phase B can PATCH by list item id.
 */
function trackerRowToChecklistItem(row: TrackerRow): ChecklistItemT {
    const f = row.fields;

    // Label candidates: adjust when you confirm internal column names
    const label =
        asString(f["Title"]) ??
        asString(f["ItemName"]) ??
        asString(f["ChecklistItem"]) ??
        "Untitled";

    return {
        id: row.id,
        label,
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

/**
 * Splits tracker rows into your two section buckets.
 * This is intentionally simple + conservative.
 * Tune later once you confirm the real Section field internal name and values.
 */
function splitIntoSections(rows: TrackerRow[]): {
    general: ChecklistItemT[];
    department: ChecklistItemT[];
} {
    const general: ChecklistItemT[] = [];
    const department: ChecklistItemT[] = [];

    for (const r of rows) {
        const sectionRaw =
            asString(r.fields["Section"]) ??
            asString(r.fields["SectionName"]) ??
            asString(r.fields["Category"]) ??
            "";

        const section = sectionRaw.toLowerCase();
        const item = trackerRowToChecklistItem(r);

        if (section.includes("general")) {
            general.push(item);
        } else if (section.includes("department")) {
            department.push(item);
        } else {
            // default bucket (keeps UI stable even if section naming differs)
            department.push(item);
        }
    }

    return { general, department };
}

/* =========================
   UI components
========================= */

function StatusBadge({ status }: { status: SectionStatus }) {
    const styles: Record<SectionStatus, string> = {
        "Not Started": "bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30",
        "In Progress": "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30",
        Completed: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30",
    };

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${styles[status]}`}>
            {status}
        </span>
    );
}

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
    return (
        <span className="relative inline-flex group">
            {children}
            <span
                className={[
                    "pointer-events-none absolute left-0 top-full z-50 mt-2 w-max max-w-[320px]",
                    "rounded-md border border-white/10 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg",
                    "opacity-0 translate-y-1 transition",
                    "group-hover:opacity-100 group-hover:translate-y-0",
                ].join(" ")}
                role="tooltip"
            >
                {text}
            </span>
        </span>
    );
}

function ChecklistItem({
    item,
    canEdit,
    onToggle,
}: {
    item: ChecklistItemT;
    canEdit: boolean;
    onToggle: (itemId: string) => void;
}) {
    const icon = item.status === "completed" ? "✓" : item.status === "in_progress" ? "◐" : "•";

    const tone =
        item.status === "completed"
            ? "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20"
            : item.status === "in_progress"
                ? "text-amber-300 bg-amber-500/10 ring-amber-500/20"
                : "text-slate-400 bg-white/5 ring-white/10";

    const clickableClasses = canEdit ? "cursor-pointer hover:bg-white/5" : "cursor-default opacity-95";

    const iconNode = (
        <span
            className={["inline-flex h-5 w-5 items-center justify-center rounded ring-1", tone].join(" ")}
            aria-hidden
        >
            {icon}
        </span>
    );

    const hoverAudit = buildHoverAuditText(item);

    const body = (
        <button
            type="button"
            className={[
                "w-full text-left rounded-md px-2 py-1 -mx-2",
                "flex items-start gap-3",
                clickableClasses,
                canEdit ? "focus:outline-none focus:ring-1 focus:ring-white/20" : "",
            ].join(" ")}
            onClick={() => {
                if (!canEdit) return;
                onToggle(item.id);
            }}
            disabled={!canEdit}
            aria-disabled={!canEdit}
            title={
                canEdit
                    ? "Click to change status"
                    : "Read-only (Supervisor/Admin required to change status)"
            }
        >
            {hoverAudit ? <Tooltip text={hoverAudit}>{iconNode}</Tooltip> : iconNode}
            <span className="text-slate-200">{item.label}</span>
        </button>
    );

    return <div className="py-1">{body}</div>;
}

function SectionCard({
    title,
    subtitle,
    status,
    items,
    canEdit,
    onToggleItem,
}: {
    title: string;
    subtitle: string;
    status: SectionStatus;
    items: ChecklistItemT[];
    canEdit: boolean;
    onToggleItem: (itemId: string) => void;
}) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/3 p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                    <p className="text-sm text-slate-400">{subtitle}</p>
                </div>
                <div className="flex items-center">
                    <StatusBadge status={status} />
                </div>
            </div>

            <div className="space-y-1">
                {items.map((item) => (
                    <ChecklistItem key={item.id} item={item} canEdit={canEdit} onToggle={onToggleItem} />
                ))}
            </div>
        </section>
    );
}

function Tabs({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
    const tabs: Array<{ key: TabKey; label: string }> = [
        { key: "overview", label: "Overview" },
        { key: "orientation", label: "Orientation" },
        { key: "day", label: "Day in the Life" },
        { key: "absence", label: "In the Absence Of" },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/3 p-2">
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
                                ? "bg-white/10 text-white ring-1 ring-white/15"
                                : "text-slate-300 hover:bg-white/6 hover:text-white",
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
   Page
========================= */

export default function EmployeeDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const id = params?.id as string;
    const employee = EMPLOYEES.find((e) => e.id === id);

    const tab = (searchParams.get("tab") as TabKey) ?? "overview";

    const setTab = (tabKey: TabKey) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set("tab", tabKey);
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    };

    if (!employee) return null;

    const canEdit = CURRENT_ROLE === "supervisor" || CURRENT_ROLE === "admin";

    // helper for timestamps
    const nowIso = () => new Date().toISOString();

    /* --- Checklist state --- */
    const [general, setGeneral] = React.useState<ChecklistItemT[]>([
        {
            id: "gen-1",
            label: "General Orientation session attended",
            status: "completed",
            completedBy: "Trainer A",
            completedAt: nowIso(),
            updatedBy: "Trainer A",
            updatedAt: nowIso(),
        },
        {
            id: "gen-2",
            label: "HR paperwork completed",
            status: "in_progress",
            hoverText: "Awaiting Paycor upload / verification.",
            startedBy: CURRENT_USER,
            startedAt: nowIso(),
            updatedBy: CURRENT_USER,
            updatedAt: nowIso(),
        },
        {
            id: "gen-3",
            label: "Fire safety reviewed",
            status: "completed",
            completedBy: "Trainer A",
            completedAt: nowIso(),
            updatedBy: "Trainer A",
            updatedAt: nowIso(),
        },
        { id: "gen-4", label: "Policy handbook acknowledged", status: "not_started" },
    ]);

    const [department, setDepartment] = React.useState<ChecklistItemT[]>([
        {
            id: "dep-1",
            label: "Role overview reviewed",
            status: "completed",
            completedBy: "Trainer B",
            completedAt: nowIso(),
            updatedBy: "Trainer B",
            updatedAt: nowIso(),
        },
        { id: "dep-2", label: "Systems access confirmed", status: "not_started" },
        { id: "dep-3", label: "Shadowing completed", status: "not_started" },
        { id: "dep-4", label: "Trainer sign-off recorded", status: "not_started" },
    ]);

    /* =========================
       SharePoint hydration (READ)
       - keeps mock as fallback
    ========================= */
    const [trackerLoading, setTrackerLoading] = React.useState(false);
    const [trackerError, setTrackerError] = React.useState<string | null>(null);
    const [trackerSource, setTrackerSource] = React.useState<"mock" | "sharepoint">("mock");

    React.useEffect(() => {
        if (!id) return;

        let cancelled = false;
        setTrackerLoading(true);
        setTrackerError(null);

        (async () => {
            try {
                const res = await fetch(`/api/orientation-tracker/${encodeURIComponent(id)}`, {
                    cache: "no-store",
                });

                if (!res.ok) {
                    const text = await res.text();
                    if (!cancelled) {
                        setTrackerError(text || `Failed to load tracker rows (${res.status})`);
                        setTrackerLoading(false);
                    }
                    return;
                }

                const json = (await res.json()) as { items?: TrackerRow[]; value?: TrackerRow[] };

                const rows = Array.isArray(json.items)
                    ? json.items
                    : Array.isArray(json.value)
                        ? json.value
                        : [];

                if (!rows.length) {
                    if (!cancelled) setTrackerLoading(false);
                    return;
                }

                const { general: gen, department: dep } = splitIntoSections(rows);

                if (cancelled) return;

                if (gen.length) setGeneral(gen);
                if (dep.length) setDepartment(dep);

                setTrackerSource("sharepoint");
                setTrackerLoading(false);
            } catch (err) {
                if (!cancelled) {
                    setTrackerError(err instanceof Error ? err.message : String(err));
                    setTrackerLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    // Toggle logic (adds who/when)
    const applyToggle = (item: ChecklistItemT): ChecklistItemT => {
        const next = nextStatus(item.status);
        const stamp = nowIso();

        // Base update stamp (every change)
        const updatedBase = {
            updatedBy: CURRENT_USER,
            updatedAt: stamp,
        };

        if (next === "in_progress") {
            return {
                ...item,
                status: next,
                ...updatedBase,
                startedBy: item.startedBy ?? CURRENT_USER,
                startedAt: item.startedAt ?? stamp,
                completedBy: undefined,
                completedAt: undefined,
            };
        }

        if (next === "completed") {
            return {
                ...item,
                status: next,
                ...updatedBase,
                startedBy: item.startedBy ?? CURRENT_USER,
                startedAt: item.startedAt ?? stamp,
                completedBy: CURRENT_USER,
                completedAt: stamp,
            };
        }

        return {
            ...item,
            status: next,
            ...updatedBase,
            startedBy: undefined,
            startedAt: undefined,
            completedBy: undefined,
            completedAt: undefined,
        };
    };

    const toggleGeneral = (itemId: string) => {
        setGeneral((prev) => prev.map((i) => (i.id === itemId ? applyToggle(i) : i)));
    };

    const toggleDepartment = (itemId: string) => {
        setDepartment((prev) => prev.map((i) => (i.id === itemId ? applyToggle(i) : i)));
    };

    // Derived statuses
    const generalStatus = getSectionStatus(general);
    const deptStatus = getSectionStatus(department);

    // Overall gating: General + Department (UI-first)
    const overall = deriveOverallStatus([generalStatus, deptStatus]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        {employee.name}
                        <StatusBadge status={overall} />
                    </h1>
                    <p className="text-slate-300">
                        {employee.role} · Last updated {employee.lastUpdated}
                    </p>

                    {/* TEMP role indicator for testing */}
                    <p className="mt-2 text-xs text-slate-400">
                        Mode (temporary):{" "}
                        <span className="font-mono text-slate-200">{CURRENT_ROLE}</span>
                        {canEdit ? " — editing enabled" : " — read-only"}
                    </p>

                    {/* Data source indicator (helpful while plumbing SharePoint) */}
                    <p className="mt-1 text-xs text-slate-500">
                        Data source: <span className="font-mono text-slate-200">{trackerSource}</span>
                        {trackerLoading ? " — loading tracker…" : null}
                        {trackerError ? <span className="ml-2 text-red-400">— {trackerError}</span> : null}
                    </p>
                </div>

                <Link
                    href="/employees"
                    className="rounded-md border border-white/10 bg-white/3 px-3 py-2 text-sm text-slate-200 hover:bg-white/6"
                >
                    ← Back to Employees
                </Link>
            </div>

            {/* Tabs */}
            <Tabs active={tab} onChange={setTab} />

            {/* Content */}
            <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard
                    title="General Orientation"
                    subtitle="Core onboarding items"
                    status={generalStatus}
                    items={general}
                    canEdit={canEdit}
                    onToggleItem={toggleGeneral}
                />

                <SectionCard
                    title="Department Orientation"
                    subtitle="Role-specific checklist items"
                    status={deptStatus}
                    items={department}
                    canEdit={canEdit}
                    onToggleItem={toggleDepartment}
                />
            </div>

            {!canEdit ? (
                <p className="text-sm text-slate-400">
                    This view is read-only. Status changes require Supervisor/Admin access.
                </p>
            ) : null}
        </div>
    );
}