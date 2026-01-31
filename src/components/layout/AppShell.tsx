/**
 * AppShell.tsx
 * ------------------------------------
 * PURPOSE:
 * Global layout wrapper for the entire app (sidebar + header + content).
 *
 * WHY IT EXISTS:
 * - Keeps UI consistent across pages
 * - Central place for layout state (sidebar collapsed/expanded)
 *
 * WHAT IT IMPORTS (AND WHY):
 * - useState: stores sidebar collapsed state
 * - Sidebar: left nav (collapsible)
 * - Header: top bar (page title + future controls)
 *
 * WHAT IT RENDERS:
 * - Left: Sidebar
 * - Right: Header + page content
 */

"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: React.ReactNode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-900 text-slate-100">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((prev) => !prev)}
            />

            <div className="flex flex-1 flex-col">
                <Header />

                {/* Main page content */}
                <main className="flex-1 px-8 py-6">{children}</main>
            </div>
        </div>
    );
}