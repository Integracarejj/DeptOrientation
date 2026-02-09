"use client";

type RoleOption = { code: string; name: string };

const ROLE_OPTIONS: RoleOption[] = [
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

export default function RolePicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (role: string) => void;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            // Closed control styling (Tailwind)
            className="
        border border-slate-400 rounded px-2 py-1
        bg-slate-900 text-slate-100
        dark:bg-slate-900 dark:text-slate-100
        focus:outline-none focus:ring-2 focus:ring-blue-500
      "
        >
            <option value="">Select role…</option>
            {ROLE_OPTIONS.map((r) => (
                <option key={r.code} value={r.code}>
                    {r.name}
                </option>
            ))}
        </select>
    );
}