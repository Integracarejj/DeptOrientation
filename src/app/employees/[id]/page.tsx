// src/app/employees/[id]/page.tsx


import Link from "next/link";
import { notFound } from "next/navigation";
import EmployeeTabsClient, { EmployeeTabKey } from "@/components/employees/EmployeeTabsClient";

type EmployeeTabKey = "overview" | "orientation" | "day" | "absence";

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

function SectionCard({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/3 p-4">
            <div className="mb-3">
                <h2 className="text-base font-semibold text-white">{title}</h2>
                {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
            </div>
            {children}
        </section>
    );
}

function ChecklistItem({ label, done }: { label: string; done?: boolean }) {
    return (
        <div className="flex items-start gap-3 py-2">
            <span
                className={[
                    "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded",
                    done
                        ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30"
                        : "bg-white/5 text-slate-400 ring-1 ring-white/10",
                ].join(" ")}
                aria-hidden="true"
            >
                {done ? "✓" : "•"}
            </span>
            <span className={done ? "text-slate-200" : "text-slate-300"}>{label}</span>
        </div>
    );
}

// Next 15: params + searchParams are Promises. Await them. [1](https://react.school/react-table-navigate-on-row-click)
export default async function EmployeeDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}) {
    const { id } = await params; // [1](https://react.school/react-table-navigate-on-row-click)
    const sp = await searchParams; // [1](https://react.school/react-table-navigate-on-row-click)

    const employee = EMPLOYEES.find((e) => e.id === id);
    if (!employee) return notFound();

    const tab = (sp.tab as EmployeeTabKey | undefined) ?? "overview";
    const safeTab: EmployeeTabKey =
        tab === "orientation" || tab === "day" || tab === "absence" ? tab : "overview";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white">{employee.name}</h1>
                        <StatusBadge status={employee.status} />
                    </div>
                    <p className="mt-2 max-w-2xl text-slate-300">
                        {employee.role} · Last updated {employee.lastUpdated}
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
            <EmployeeTabsClient initialTab={safeTab} />

            {/* Tab Content */}
            {safeTab === "overview" && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <SectionCard title="General Orientation" subtitle="Core onboarding items for all employees.">
                        <ChecklistItem label="General Orientation session attended" done />
                        <ChecklistItem label="HR paperwork completed" done />
                        <ChecklistItem label="Fire safety & emergency preparedness reviewed" done />
                        <ChecklistItem label="Policy handbook acknowledged" />
                    </SectionCard>

                    <SectionCard title="Department Orientation" subtitle="Role-specific checklist items.">
                        <ChecklistItem label="Role overview & expectations reviewed" done />
                        <ChecklistItem label="Tools/systems access confirmed" />
                        <ChecklistItem label="Shadowing completed" />
                        <ChecklistItem label="Trainer sign-off recorded" />
                    </SectionCard>

                    <SectionCard title="Day in the Life" subtitle="Routine workflows and cadence guidance.">
                        <ChecklistItem label="Daily responsibilities reviewed" />
                        <ChecklistItem label="Weekly cadence reviewed" />
                        <ChecklistItem label="Monthly deliverables reviewed" />
                    </SectionCard>

                    <SectionCard title="In the Absence Of" subtitle="Coverage steps and escalation contacts.">
                        <ChecklistItem label="Coverage plan reviewed" />
                        <ChecklistItem label="Key contacts confirmed" />
                        <ChecklistItem label="Escalation path understood" />
                    </SectionCard>
                </div>
            )}

            {safeTab === "orientation" && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <SectionCard title="General Orientation" subtitle="Core onboarding items for all employees.">
                        <ChecklistItem label="General Orientation session attended" done />
                        <ChecklistItem label="HR paperwork completed" done />
                        <ChecklistItem label="Fire safety & emergency preparedness reviewed" done />
                        <ChecklistItem label="Policy handbook acknowledged" />
                    </SectionCard>

                    <SectionCard title="Department Orientation" subtitle="Role-specific checklist items.">
                        <ChecklistItem label="Role overview & expectations reviewed" done />
                        <ChecklistItem label="Tools/systems access confirmed" />
                        <ChecklistItem label="Shadowing completed" />
                        <ChecklistItem label="Trainer sign-off recorded" />
                    </SectionCard>
                </div>
            )}

            {safeTab === "day" && (
                <SectionCard title="Day in the Life" subtitle="Routine workflows and cadence guidance.">
                    <ChecklistItem label="Daily responsibilities reviewed" />
                    <ChecklistItem label="Weekly cadence reviewed" />
                    <ChecklistItem label="Monthly deliverables reviewed" />
                </SectionCard>
            )}

            {safeTab === "absence" && (
                <SectionCard title="In the Absence Of" subtitle="Coverage steps and escalation contacts.">
                    <ChecklistItem label="Coverage plan reviewed" />
                    <ChecklistItem label="Key contacts confirmed" />
                    <ChecklistItem label="Escalation path understood" />
                </SectionCard>
            )}
        </div>
    );
}