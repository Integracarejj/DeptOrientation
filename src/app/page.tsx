/**
 * /page.tsx (Home / Landing Page)
 * ------------------------------------
 * PURPOSE:
 * This is the main landing page when a user opens the app
 * or clicks the "Dept Orientation" home button.
 *
 * DESIGN INTENT:
 * - Feel like a useful dashboard, not a dead end
 * - Provide clear "where do I go next?" entry points
 * - Avoid fake metrics until real data exists
 *
 * FUTURE STATE:
 * - Recent activity
 * - Alerts / overdue items
 * - Quick stats (counts, trends)
 *
 * RIGHT NOW:
 * - Clear navigation cards for the 4 core areas
 */

import Link from "next/link";

type HomeCardProps = {
  title: string;
  description: string;
  href: string;
};

function HomeCard({ title, description, href }: HomeCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-white/10 bg-white/5 p-6 transition hover:border-white/20 hover:bg-white/10"
    >
      <h2 className="text-lg font-semibold text-white group-hover:text-indigo-300">
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Welcome / context */}
      <section>
        <h1 className="text-3xl font-bold">Department Orientation</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Manage employee orientation, role playbooks, and coverage guidance in
          one place.
        </p>
      </section>

      {/* Primary actions */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Get started
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <HomeCard
            title="View Dashboard"
            description="See overall progress, alerts, and upcoming orientation activity."
            href="/dashboard"
          />

          <HomeCard
            title="Manage Employees"
            description="Create, review, and track employee orientations and completion status."
            href="/employees"
          />

          <HomeCard
            title="Day in the Life"
            description="Review or update role-based daily, weekly, and monthly expectations."
            href="/day-in-life"
          />

          <HomeCard
            title="In the Absence Of"
            description="Prepare coverage plans and handoff guidance when a role is out."
            href="/in-the-absence"
          />
        </div>
      </section>

      {/* Placeholder for future expansion */}
      <section className="rounded-lg border border-dashed border-white/10 p-6 text-sm text-slate-400">
        <strong>Coming next:</strong> recent activity, overdue items, and quick
        insights will surface here as real data is connected.
      </section>
    </div>
  );
}