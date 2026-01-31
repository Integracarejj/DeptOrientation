/**
 * /employees/page.tsx
 * ------------------------------------
 * Displays a list of employees and their orientation roll-up status.
 *
 * IMPORTANT:
 * - The Name column is the primary navigation affordance (real link)
 * - The full row is also clickable + keyboard accessible (reliable drill-down)
 * - Avoids invalid HTML (no <Link> wrapping <tr>) [1](https://teams.microsoft.com/l/meeting/details?eventId=AAMkAGY2YzAzYzcxLTA0N2ItNDhiZC1hNGMxLTVmMjA1NGZmYzViYwFRAAgI3mzuU-iAAEYAAAAAoPtMsx8Nskmm0wH1nWx7VgcAFCVmxWZ3GUaTfnLKBGhsvwAAAAABDQAAFCVmxWZ3GUaTfnLKBGhsvwAAAACQngAAEA%3d%3d)[2](https://teams.microsoft.com/l/meeting/details?eventId=AAMkAGY2YzAzYzcxLTA0N2ItNDhiZC1hNGMxLTVmMjA1NGZmYzViYwFRAAgI3lFth4NAAEYAAAAAoPtMsx8Nskmm0wH1nWx7VgcAFCVmxWZ3GUaTfnLKBGhsvwAAAAABDQAAFCVmxWZ3GUaTfnLKBGhsvwAAAACQngAAEA%3d%3d)
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Employee = {
    id: string;
    name: string;
    role: string;
    status: "Not Started" | "In Progress" | "Completed";
    lastUpdated: string;
};

const EMPLOYEES: Employee[] = [
    {
        id: "1",
        name: "Jane Doe",
        role: "Administrative Services Director",
        status: "In Progress",
        lastUpdated: "2 days ago",
    },
    {
        id: "2",
        name: "Mark Stevens",
        role: "Dining Experience Director",
        status: "Completed",
        lastUpdated: "Jan 22, 2026",
    },
    {
        id: "3",
        name: "Alyssa Brown",
        role: "Resident Wellness Director",
        status: "Not Started",
        lastUpdated: "—",
    },
];

function StatusBadge({ status }: { status: Employee["status"] }) {
    const styles: Record<Employee["status"], string> = {
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

export default function EmployeesPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <section>
                <h1 className="text-3xl font-bold">Employees</h1>
                <p className="mt-2 max-w-2xl text-slate-300">
                    Track department orientation progress and manage employee onboarding.
                </p>
            </section>

            <section className="overflow-hidden rounded-lg border border-white/10">
                <table className="w-full text-sm">
                    <thead className="bg-white/5 text-xs uppercase text-slate-400">
                        <tr>
                            <th className="px-4 py-3 text-left">Name</th>
                            <th className="px-4 py-3 text-left">Role</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Last Updated</th>
                        </tr>
                    </thead>

                    <tbody>
                        {EMPLOYEES.map((emp) => {
                            const href = `/employees/${emp.id}`;

                            return (
                                <tr
                                    key={emp.id}
                                    className="border-t border-white/5 hover:bg-white/5 focus-within:bg-white/5 cursor-pointer"
                                    role="link"
                                    tabIndex={0}
                                    aria-label={`View details for ${emp.name}`}
                                    onClick={(e) => {
                                        // If the click started on an interactive element (like the Link),
                                        // don't double-handle it.
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
                                    {/* Name (primary affordance) */}
                                    <td className="px-4 py-3 font-medium">
                                        <Link
                                            href={href}
                                            className="text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
                                            title="View employee details"
                                            // prefetch is fine for a small list; remove if you prefer.
                                            prefetch
                                        >
                                            {emp.name}
                                        </Link>
                                    </td>

                                    <td className="px-4 py-3 text-slate-300">{emp.role}</td>

                                    <td className="px-4 py-3">
                                        <StatusBadge status={emp.status} />
                                    </td>

                                    <td className="px-4 py-3 text-slate-400">{emp.lastUpdated}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            <p className="text-sm text-slate-400">
                Select an employee name to view detailed orientation progress.
            </p>
        </div>
    );
}
