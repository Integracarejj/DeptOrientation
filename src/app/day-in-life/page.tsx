/**
 * /day-in-life/page.tsx
 * ------------------------------------
 * PURPOSE:
 * Displays the "Day in the Life" living document by role.
 *
 * FUTURE STATE:
 * - Role selector
 * - Editable sections for supervisors
 * - Read-only view for employees
 * - Embedded calendar / schedule
 *
 * RIGHT NOW:
 * - Placeholder so we can build layout and navigation first
 */

export default function DayInLifePage() {
    return (
        <div>
            <h1 className="text-3xl font-bold">Day in the Life</h1>
            <p className="mt-2 text-slate-300">
                Role-based daily, weekly, and monthly guidance will live here.
            </p>
        </div>
    );
}