/**
 * /employees/page.tsx
 * ------------------------------------
 * Employees list + PRIMARY FLOW:
 *   "+ New Employee" modal → "Release Orientation Items"
 *     1) POST /api/employees (creates EmployeeProfiles item via Azure Function EmployeeProfileCreate)
 *     2) POST /api/orientation-tracker/release/[employeeId] (OrientationUpdater)
 *
 * This page now consumes:
 *   - GET /api/employees/summary  (proxy → EmployeeListSummary function)
 * And augments each row with:
 *   - Released / Status via GET /api/orientation-tracker/[id]
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type EmployeeStatus = "Not Released" | "Not Started" | "In Progress" | "Completed";

type SummaryRow = {
    id: string;
    name: string;
    roleCode: string;       // e.g., ASD
    reviewed: string;       // "Yes" | "No" | "Pending"
    reviewAudit: string;    // ISO or ""
    modified: string;
};

type EmployeeVM = {
    id: string;
    name: string;
    role: string;           // "ASD — Administrative Services Director"
    released: "Yes" | "No";
    status: EmployeeStatus;
    reviewed: string;
    reviewAudit: string;
    lastUpdated: string;
};

function asString(v: unknown): string {
    if (typeof v === "string") return v;
    if (v === null || v === undefined) return "";
    return String(v);
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
    const styles: Record<EmployeeStatus, string> = {
        "Not Released": "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
        "Not Started": "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
        "In Progress": "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
        "Completed": "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    };

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${styles[status]}`}>
            {status}
        </span>
    );
}

function FieldLabel({ children }: { children: string }) {
    return <div className="text-sm font-semibold text-gray-900">{children}</div>;
}

function TextHint({ children }: { children: string }) {
    return <div className="mt-1 text-xs text-gray-600">{children}</div>;
}

function Modal({
    open,
    title,
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            aria-modal="true"
            role="dialog"
            className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6"
            onMouseDown={onClose}
            style={{ background: "rgba(17, 24, 39, 0.18)" }}
        >
            <div
                className="w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow-lg"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        aria-label="Close modal"
                    >
                        Close
                    </button>
                </div>

                <div className="px-5 py-4">{children}</div>
            </div>
        </div>
    );
}

// Role dropdown options (UI-friendly)
const ROLE_OPTIONS: Array<{ code: string; name: string }> = [
    { code: "ASD", name: "Administrative Services Director" },
    { code: "CRA", name: "Community Relations Associate" },
    { code: "CRD", name: "Community Relations Director" },
    { code: "DED", name: "Dining Experience Director" },
    { code: "EOO", name: "Executive Operations Officer" },
    { code: "HA", name: "Hospitality Associate" },
    { code: "HEA", name: "Hospitality Executive Associate" },
    { code: "LSLS", name: "Dual role - LifeStages/LifeStories" },
    { code: "LStaD", name: "LifeStages Director" },
    { code: "LStoD", name: "LifeStories Director" },
    { code: "MA", name: "Maintenance Assistant" },
    { code: "RWD", name: "Resident Wellness Director" },
    { code: "SME", name: "Safety & Maintenance Engineering" },
];
const ROLE_NAME_BY_CODE = Object.fromEntries(ROLE_OPTIONS.map(r => [r.code, r.name]));

export default function EmployeesPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<SummaryRow[]>([]);

    // Session-only: mark ids we released during this session (optimistic)
    const [releasedIds, setReleasedIds] = useState<Record<string, true>>({});

    // Modal state + form fields
    const [modalOpen, setModalOpen] = useState(false);
    const [employeeName, setEmployeeName] = useState("");
    const [roleCode, setRoleCode] = useState(""); // dropdown value like "ASD"
    const [supervisorLookupId, setSupervisorLookupId] = useState("");
    const [startDate, setStartDate] = useState(""); // yyyy-mm-dd

    // Modal action state
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const createdEmployeeIdRef = useRef<string | null>(null);

    async function fetchSummary() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/employees/summary", { cache: "no-store" });
            const text = await res.text();
            if (!res.ok) {
                setError(text || `Failed to load summary (${res.status})`);
                setLoading(false);
                return;
            }
            const json = JSON.parse(text) as { items?: SummaryRow[] };
            const items = Array.isArray(json.items) ? json.items : [];
            setRows(items);
            setLoading(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (cancelled) return;
            await fetchSummary();
        })();
        return () => { cancelled = true; };
    }, []);

    /** Helper to compute Released/Status by calling your existing tracker endpoint. */
    async function getReleasedAndStatus(employeeId: string): Promise<{ released: "Yes" | "No"; status: EmployeeStatus }> {
        try {
            const res = await fetch(`/api/orientation-tracker/${encodeURIComponent(employeeId)}`, { cache: "no-store" });
            if (!res.ok) {
                return { released: releasedIds[employeeId] ? "Yes" : "No", status: releasedIds[employeeId] ? "Not Started" as const : "Not Released" as const };
            }
            const json = await res.json();
            const items = Array.isArray(json.items) ? json.items : [];

            if (!items.length) {
                return { released: releasedIds[employeeId] ? "Yes" : "No", status: releasedIds[employeeId] ? "Not Started" as const : "Not Released" as const };
            }

            // Compute aggregate status from fields.Status
            let anyInProgress = false;
            let allCompleted = true;
            let anyStarted = false;

            for (const it of items) {
                const f = it.fields || {};
                const raw = asString(f["Status"]).toLowerCase();
                const s = raw === "completed" ? "completed" : raw === "in progress" ? "in_progress" : raw === "not started" ? "not_started" : "not_started";
                if (s !== "completed") allCompleted = false;
                if (s !== "not_started") anyStarted = true;
                if (s === "in_progress") anyInProgress = true;
            }

            if (allCompleted) return { released: "Yes", status: "Completed" };
            if (anyInProgress) return { released: "Yes", status: "In Progress" };
            if (anyStarted) return { released: "Yes", status: "In Progress" }; // started but not strictly "in_progress"
            return { released: "Yes", status: "Not Started" };
        } catch {
            return { released: releasedIds[employeeId] ? "Yes" : "No", status: releasedIds[employeeId] ? "Not Started" as const : "Not Released" as const };
        }
    }

    /** Compose UI rows (memoized) with role mapping; Released/Status are fetched on render. */
    const baseEmployees = useMemo<EmployeeVM[]>(() => {
        return rows.map((r) => {
            const roleName = ROLE_NAME_BY_CODE[r.roleCode] ? `${r.roleCode} — ${ROLE_NAME_BY_CODE[r.roleCode]}` : (r.roleCode || "—");
            const reviewed = r.reviewed || "Pending";
            const reviewAudit = r.reviewAudit || "";
            return {
                id: r.id,
                name: r.name,
                role: roleName,
                // temp defaults until we compute per-row below
                released: releasedIds[r.id] ? "Yes" : "No",
                status: releasedIds[r.id] ? "Not Started" : "Not Released",
                reviewed,
                reviewAudit,
                lastUpdated: r.modified || "—",
            };
        });
    }, [rows, releasedIds]);

    // Per-row Released/Status fetching (parallel, lightweight)
    const [computed, setComputed] = useState<Record<string, { released: "Yes" | "No"; status: EmployeeStatus }>>({});
    useEffect(() => {
        let cancelled = false;
        (async () => {
            // limit concurrent fetches if you expect a large list; simple batch here
            const tasks = baseEmployees.map(async (emp) => {
                const rs = await getReleasedAndStatus(emp.id);
                return { id: emp.id, ...rs };
            });
            const results = await Promise.all(tasks);
            if (cancelled) return;
            const map: Record<string, { released: "Yes" | "No"; status: EmployeeStatus }> = {};
            for (const r of results) {
                map[r.id] = { released: r.released, status: r.status };
            }
            setComputed(map);
        })();
        return () => { cancelled = true; };
    }, [baseEmployees.length]); // re-run when the list length changes

    const employees: EmployeeVM[] = useMemo(() => {
        return baseEmployees.map((emp) => {
            const rs = computed[emp.id];
            return rs ? { ...emp, released: rs.released, status: rs.status } : emp;
        });
    }, [baseEmployees, computed]);

    function resetModal() {
        setEmployeeName("");
        setRoleCode("");
        setSupervisorLookupId("");
        setStartDate("");
        setSubmitting(false);
        setActionError(null);
        setSuccessMsg(null);
        createdEmployeeIdRef.current = null;
    }

    function closeModalAndRefresh() {
        setModalOpen(false);
        fetchSummary();
    }

    const canSubmit =
        employeeName.trim().length > 0 && roleCode.trim().length > 0 && startDate.trim().length > 0;

    async function createEmployeeProfile(): Promise<string> {
        const supervisorRaw = supervisorLookupId.trim();
        const supervisorLookupIdSafe =
            supervisorRaw && /^\d+$/.test(supervisorRaw) ? supervisorRaw : null;

        const payload = {
            title: employeeName.trim(),
            roleCode: roleCode.trim(),
            supervisorLookupId: supervisorLookupIdSafe,
            startDate: startDate.trim(),
        };

        const res = await fetch("/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const text = await res.text().catch(() => "");
        if (!res.ok) throw new Error(`Create failed (${res.status}): ${text || "No details"}`);

        const json = text ? JSON.parse(text) : {};
        const id =
            asString(json?.id).trim() ||
            asString(json?.employeeProfileId).trim() ||
            asString(json?.employeeId).trim();

        if (!id) throw new Error("Create succeeded but no employee id was returned.");
        return id;
    }

    async function releaseOrientationItems(employeeId: string) {
        const res = await fetch(`/api/orientation-tracker/release/${encodeURIComponent(employeeId)}`, {
            method: "POST",
        });
        const text = await res.text().catch(() => "");
        if (!res.ok) {
            throw new Error(`Release failed (${res.status}): ${text || "No details"}`);
        }
    }

    async function handleRelease() {
        setSubmitting(true);
        setActionError(null);
        setSuccessMsg(null);

        try {
            const newEmployeeId = await createEmployeeProfile();
            createdEmployeeIdRef.current = newEmployeeId;

            // Optimistic row in UI
            const optimistic: SummaryRow = {
                id: newEmployeeId,
                name: employeeName.trim(),
                roleCode: roleCode.trim(),
                reviewed: "Pending",
                reviewAudit: "",
                modified: new Date().toISOString(),
            };
            setRows((prev) => [optimistic, ...prev]);

            await releaseOrientationItems(newEmployeeId);
            setReleasedIds((prev) => ({ ...prev, [newEmployeeId]: true }));

            setSuccessMsg("✅ Orientation tasks released successfully.");
        } catch (e) {
            setActionError(e instanceof Error ? e.message : String(e));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <section>
                <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                    Track department orientation progress and manage employee onboarding.
                </p>

                {/* Top-left button */}
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => {
                            resetModal();
                            setModalOpen(true);
                        }}
                        className="inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                    >
                        + New Employee
                    </button>
                </div>

                {loading ? <p className="mt-3 text-sm text-gray-500">Loading employees…</p> : null}

                {error ? (
                    <p className="mt-3 text-sm text-red-600">
                        Error loading employees: <span className="font-mono">{error}</span>
                    </p>
                ) : null}
            </section>

            {/* Table */}
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3 text-left">Name</th>
                            <th className="px-4 py-3 text-left">Role</th>
                            <th className="px-4 py-3 text-left">Released</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Reviewed</th>
                            <th className="px-4 py-3 text-left">Review Audit</th>
                            <th className="px-4 py-3 text-left">Last Updated</th>
                        </tr>
                    </thead>

                    <tbody>
                        {employees.map((emp) => {
                            const href = `/employees/${emp.id}?tab=orientation`;
                            return (
                                <tr
                                    key={emp.id}
                                    className="border-t border-gray-100 hover:bg-gray-50 focus-within:bg-gray-50 cursor-pointer"
                                    role="link"
                                    tabIndex={0}
                                    aria-label={`View details for ${emp.name}`}
                                    onClick={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.closest("a,button,input,select,textarea")) return;
                                        router.push(href);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            router.push(href);
                                        }
                                    }}
                                >
                                    <td className="px-4 py-3 font-medium">
                                        <Link
                                            href={href}
                                            className="text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 rounded"
                                            title="View employee details"
                                            prefetch
                                        >
                                            {emp.name}
                                        </Link>
                                    </td>

                                    <td className="px-4 py-3 text-gray-700">{emp.role}</td>

                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs ${emp.released === "Yes"
                                                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                                    : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                                                }`}
                                        >
                                            {emp.released}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3">
                                        <StatusBadge status={emp.status} />
                                    </td>

                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs ${emp.reviewed === "Yes"
                                                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                                    : "bg-gray-100 text-gray-700 ring-1 ring-gray-200"
                                                }`}
                                        >
                                            {emp.reviewed || "Pending"}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-gray-700">
                                        {emp.reviewAudit ? new Date(emp.reviewAudit).toLocaleString() : "—"}
                                    </td>

                                    <td className="px-4 py-3 text-gray-500">
                                        {emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleString() : "—"}
                                    </td>
                                </tr>
                            );
                        })}

                        {!loading && !employees.length && !error ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-gray-500">
                                    No employees found in EmployeeProfiles.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </section>

            <p className="text-sm text-gray-500">
                Select an employee name to view detailed orientation progress.
            </p>

            {/* Modal */}
            <Modal
                open={modalOpen}
                title="New Employee"
                onClose={() => {
                    if (submitting) return;
                    closeModalAndRefresh();
                }}
            >
                <div className="space-y-4">
                    {successMsg ? (
                        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-900">
                            {successMsg}
                            <div className="mt-2 text-xs font-normal text-green-900">
                                You can close this modal. The employee should appear in the list immediately.
                            </div>
                        </div>
                    ) : null}

                    {actionError ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
                            {actionError}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                            <FieldLabel>Employee Name</FieldLabel>
                            <input
                                value={employeeName}
                                onChange={(e) => setEmployeeName(e.target.value)}
                                placeholder="e.g. Jane Doe"
                                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-300"
                            />
                        </label>

                        <label className="block">
                            <FieldLabel>Role</FieldLabel>
                            <select
                                value={roleCode}
                                onChange={(e) => setRoleCode(e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-gray-300"
                            >
                                <option value="">Select a role…</option>
                                {ROLE_OPTIONS.map((r) => (
                                    <option key={r.code} value={r.code}>
                                        {r.code} — {r.name}
                                    </option>
                                ))}
                            </select>
                            <TextHint>We store the SharePoint lookup id server-side based on this code.</TextHint>
                        </label>

                        <label className="block">
                            <FieldLabel>Supervisor</FieldLabel>
                            <input
                                value={supervisorLookupId}
                                onChange={(e) => setSupervisorLookupId(e.target.value)}
                                placeholder="freewrite - lookup to be added later"
                                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-300"
                            />
                            <TextHint>Optional for now. Can default server-side later.</TextHint>
                        </label>

                        <label className="block sm:col-span-2">
                            <FieldLabel>Start Date</FieldLabel>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-gray-300"
                            />
                        </label>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="text-xs text-gray-600">
                            This will create the employee and immediately generate orientation tasks.
                        </div>

                        <button
                            type="button"
                            onClick={handleRelease}
                            disabled={submitting || !canSubmit || !!successMsg}
                            className={
                                submitting || !canSubmit || !!successMsg
                                    ? "rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-500"
                                    : "rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            }
                        >
                            {submitting ? "Releasing…" : "Release Orientation Items"}
                        </button>
                    </div>

                    {successMsg ? (
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={closeModalAndRefresh}
                                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                            >
                                Done
                            </button>
                        </div>
                    ) : null}
                </div>
            </Modal>
        </div>
    );
}