/**
 * Sidebar.tsx
 * ------------------------------------
 * PURPOSE:
 * Left navigation sidebar with:
 * - Expanded mode: icon + label
 * - Collapsed mode: icon only (still clickable, accessible)
 *
 * UX NOTES:
 * - Home (Dept Orientation) is clearly clickable via icon + hover
 * - No extra instructional text; iconography and placement do the work
 * - Toggle button remains fixed and predictable
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarProps = {
    collapsed: boolean;
    onToggle: () => void;
};

/* ---------- Inline Icons (no deps) ---------- */
function IconHome({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 11.5L12 4l9 7.5" />
            <path d="M5.5 10.5V20h13V10.5" />
        </svg>
    );
}

function IconGrid({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M4 4h7v7H4z" />
            <path d="M13 4h7v7h-7z" />
            <path d="M4 13h7v7H4z" />
            <path d="M13 13h7v7h-7z" />
        </svg>
    );
}

function IconUsers({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M16 11a4 4 0 1 0-8 0" />
            <path d="M4 20c1.5-4 14.5-4 16 0" />
            <path d="M17.5 8.5a3 3 0 1 0-2.2-5.1" />
        </svg>
    );
}

function IconBook({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M4 5.5c2-1 6-1 8 0v15c-2-1-6-1-8 0v-15z" />
            <path d="M12 5.5c2-1 6-1 8 0v15c-2-1-6-1-8 0v-15z" />
        </svg>
    );
}

function IconAlert({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 4.9a2 2 0 0 1 3.4 0l7.2 12.5A2 2 0 0 1 19.2 20H4.8a2 2 0 0 1-1.7-2.6l7.2-12.5z" />
        </svg>
    );
}

/* ---------- Navigation Config ---------- */
const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: IconGrid },
    { label: "Employees", href: "/employees", icon: IconUsers },
    { label: "Day in the Life", href: "/day-in-life", icon: IconBook },
    { label: "In the Absence Of", href: "/in-the-absence", icon: IconAlert },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside
            className={`relative flex h-screen flex-col border-r border-white/10 bg-slate-950 transition-all duration-300 ${collapsed ? "w-16" : "w-64"
                }`}
        >
            {/* Fixed toggle button */}
            <button
                onClick={onToggle}
                aria-label="Toggle sidebar"
                className="fixed left-2 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-md bg-slate-900/90 text-slate-200 ring-1 ring-white/10 shadow hover:bg-slate-800 hover:text-white transition"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                ☰
            </button>

            {/* Home link (Dept Orientation) */}
            <div className={`px-3 pb-4 pt-14 ${collapsed ? "text-center" : ""}`}>
                <Link
                    href="/"
                    title="Go to Home"
                    className={`group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-white/5 ${collapsed ? "justify-center" : ""
                        }`}
                >
                    <IconHome className="h-5 w-5 text-slate-300 group-hover:text-white" />
                    {!collapsed && (
                        <span className="text-lg font-bold tracking-tight text-white">
                            Dept Orientation
                        </span>
                    )}
                    {collapsed && <span className="sr-only">Home</span>}
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 px-2">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname?.startsWith(item.href));

                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className={`group flex items-center gap-2 rounded-md px-2 py-2 transition ${isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                                } ${collapsed ? "justify-center" : ""}`}
                        >
                            <Icon className="h-5 w-5 text-slate-300 group-hover:text-white" />
                            {!collapsed && (
                                <span className="truncate font-medium">{item.label}</span>
                            )}
                            {collapsed && <span className="sr-only">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>
        </aside >
    );
}