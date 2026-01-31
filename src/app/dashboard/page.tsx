/**
 * /dashboard/page.tsx
 * ------------------------------------
 * PURPOSE:
 * This is the main landing page users will see after login.
 *
 * FUTURE STATE (not built yet):
 * - High-level overview
 * - Orientation progress
 * - Alerts or overdue items
 *
 * RIGHT NOW:
 * - Simple placeholder so navigation is real
 */

export default function DashboardPage() {
    return (
        <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-slate-300">
                High-level overview and alerts will live here.
            </p>
        </div>
    );
}