// src/app/day-in-life/page.tsx
"use client";

import { useRouter } from "next/navigation";

// SAME ROLE OPTIONS YOU SHARED
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

export default function DayInLifeLandingPage() {
    const router = useRouter();

    return (
        <div className="px-6 py-10">
            <h1 className="text-3xl font-semibold text-white mb-2">
                Day in the Life
            </h1>

            <p className="text-gray-300 mb-8">
                Choose a role below to view the Daily, Weekly, Monthly, and Calendar guidance.
            </p>

            {/* Grid of Role Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {ROLE_OPTIONS.map((role) => (
                    <button
                        key={role.code}
                        onClick={() => router.push(`/day-in-life/${role.code}`)}
                        className="
              bg-gray-800 border border-gray-700 hover:border-sky-500
              hover:bg-gray-750 transition p-5 rounded-lg 
              text-left shadow-md hover:shadow-sky-600/20
            "
                    >
                        <div className="text-xl font-semibold text-sky-300">
                            {role.code}
                        </div>
                        <div className="mt-1 text-gray-300 text-sm">{role.name}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}