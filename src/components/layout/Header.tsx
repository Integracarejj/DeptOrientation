/**
 * Header.tsx
 * ------------------------------------
 * PURPOSE:
 * This is the top header bar that stays above page content.
 *
 * WHY IT EXISTS:
 * - Gives users stable context (page title + quick controls)
 * - Holds future items: role switcher (Supervisor/Employee), search, profile menu
 *
 * WHAT IT IMPORTS (AND WHY):
 * - usePathname: lets us infer which page the user is on so we can show a title
 *
 * WHAT IT RENDERS:
 * - A compact top bar with:
 *   - Page title + short description (based on route)
 *   - A placeholder "Mode" pill (to be wired into real auth later)
 */

"use client";

import { usePathname } from "next/navigation";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
    "/": { title: "Home", subtitle: "Quick entry points and recent activity." },
    "/dashboard": {
        title: "Dashboard",
        subtitle: "Overview, alerts, and progress at a glance.",
    },
    "/employees": {
        title: "Employees",
        subtitle: "Manage employees and orientation status.",
    },
    "/day-in-life": {
        title: "Day in the Life",
        subtitle: "Living role playbooks + calendars (editable by supervisors).",
    },
    "/in-the-absence": {
        title: "In the Absence Of",
        subtitle: "Coverage plans and handoff guidance by role.",
    },
};

function getMeta(pathname: string | null) {
    if (!pathname) return PAGE_META["/"];
    // exact match first
    if (PAGE_META[pathname]) return PAGE_META[pathname];
    // fallback for future nested routes (e.g., /employees/123)
    const firstSegment = "/" + pathname.split("/").filter(Boolean)[0];
    return PAGE_META[firstSegment] ?? PAGE_META["/"];
}

export function Header() {
    const pathname = usePathname();
    const meta = getMeta(pathname);

    return (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/80 backdrop-blur">
            <div className="flex items-center justify-between px-8 py-4">
                {/* Left: Page title + subtitle */}
                <div>
                    <h1 className="text-xl font-semibold text-white">{meta.title}</h1>
                    <p className="mt-0.5 text-sm text-slate-300">{meta.subtitle}</p>
                </div>

                {/* Right: Placeholder controls (we’ll wire later) */}
                <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                        Mode: Supervisor (placeholder)
                    </span>
                </div>
            </div>
        </header>
    );
}