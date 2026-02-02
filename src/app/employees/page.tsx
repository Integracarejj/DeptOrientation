/**
 * /employees/page.tsx
 * ------------------------------------
 * Employees list + PRIMARY FLOW:
 *   "+ New Employee" modal → "Release Orientation Items"
 *     1) POST /api/employees (creates EmployeeProfiles item via Azure Function EmployeeProfileCreate)
 *     2) POST /api/orientation-tracker/release/[employeeId] (OrientationUpdater)
 *
 * Notes:
 * - Role is a SharePoint lookup on EmployeeProfiles.
 * - UI uses a Role dropdown (roleCode like "ASD") and sends roleCode to server.
 * - Azure Function resolves roleCode -> Roles list item id -> stores RoleLookupId.
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type EmployeeStatus = "Not Started" | "In Progress" | "Completed" | "Not Released";

type EmployeeRow = {
    id: string;
    fields: Record<string, unknown>;
};

type EmployeeVM = {
    id: string;
    name: string;
    role: string;
    status: EmployeeStatus;
    lastUpdated: string;
};

function asString(v: unknown): string {
    if (typeof v === "string") return v;
    if (v === null || v === undefined) return "";
    return String(v);
}

function toIdString(v: unknown): string {
    return asString(v).trim();
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
    const styles: Record<EmployeeStatus, string> = {
        "Not Released": "bg-gray-100 text-gray-700 ring-1 ring-gray-200",
        "Not Started": "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
        "In Progress": "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
        Completed: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
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

export default function EmployeesPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<EmployeeRow[]>([]);

    // Session-only: mark ids we released during this session
    const [releasedIds, setReleasedIds] = useState<Record<string, true>>({});

    // Modal state + form fields
    const [modalOpen, setModalOpen] = useState(false);
    const [employeeName, setEmployeeName] = useState("");
    const [roleCode, setRoleCode] = useState(""); // <-- dropdown value like "ASD"
    const [supervisorLookupId, setSupervisorLookupId] = useState("");
    const [startDate, setStartDate] = useState(""); // yyyy-mm-dd

    // Modal action state
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const createdEmployeeIdRef = useRef<string | null>(null);

    async function fetchEmployees() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/employees", { cache: "no-store" });
            const text = await res.text();

            if (!res.ok) {
                setError(text || `Failed to load employees (${res.status})`);
                setLoading(false);
                return;
            }

            const json = JSON.parse(text) as { items?: EmployeeRow[] };
            const rows = Array.isArray(json.items) ? json.items : [];

            setItems(rows);
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
            await fetchEmployees();
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const employees: EmployeeVM[] = useMemo(() => {
        return items.map((r) => {
            const f = r.fields || {};

            const name =
                asString(f["Title"]) ||
                asString(f["EmployeeName"]) ||
                asString(f["FullName"]) ||
                `Employee ${r.id}`;

            const role =
                asString(f["RoleName"]) ||
                asString(f["RoleCode"]) ||
                asString(f["Role"]) ||
                asString(f["RoleLookupId"]) ||
                "—";

            const lastUpdated = asString(f["Modified"]) || asString(f["LastUpdated"]) || "—";

            const status: EmployeeStatus = releasedIds[r.id] ? "Not Started" : "Not Released";
            return { id: r.id, name, role, status, lastUpdated };
        });
    }, [items, releasedIds]);

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
        fetchEmployees();
    }

    const canSubmit =
        employeeName.trim().length > 0 && roleCode.trim().length > 0 && startDate.trim().length > 0;

    async function createEmployeeProfile(): Promise<string> {
        const supervisorRaw = supervisorLookupId.trim();

        // Only pass SupervisorLookupId if it's already a numeric SharePoint lookup id.
        // If the user types a name/email (common), we omit it for now to avoid Azure Function int() errors.
        const supervisorLookupIdSafe =
            supervisorRaw && /^\d+$/.test(supervisorRaw) ? supervisorRaw : null;

        const payload = {
            title: employeeName.trim(),
            roleCode: roleCode.trim(), // <-- send roleCode, server resolves to lookup id
            supervisorLookupId: supervisorLookupIdSafe,
            startDate: startDate.trim(),
        };

        const res = await fetch("/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const text = await res.text().catch(() => "");
        if (!res.ok) {
            throw new Error(`Create failed (${res.status}): ${text || "No details"}`);
        }

        const json = text ? JSON.parse(text) : {};
        const id =
            toIdString(json?.id) ||
            toIdString(json?.employeeProfileId) ||
            toIdString(json?.employeeId);

        if (!id)
            throw new Error(
                "Create succeeded but no employee id was returned from POST /api/employees."
            );
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

            // Optimistic row so it appears immediately
            const optimisticRow: EmployeeRow = {
                id: newEmployeeId,
                fields: {
                    Title: employeeName.trim(),
                    RoleCode: roleCode.trim(), // display-friendly until SharePoint refresh
                    SupervisorLookupId: supervisorLookupId.trim() || null,
                    Date: startDate.trim(),
                },
            };
            setItems((prev) => [optimisticRow, ...prev]);

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
                            <th className="px-4 py-3 text-left">Status</th>
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
                                        <StatusBadge status={emp.status} />
                                    </td>

                                    <td className="px-4 py-3 text-gray-500">{emp.lastUpdated}</td>
                                </tr>
                            );
                        })}

                        {!loading && !employees.length && !error ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-gray-500">
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