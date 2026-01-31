"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type EmployeeTabKey = "overview" | "orientation" | "day" | "absence";

const TABS: Array<{ key: EmployeeTabKey; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "orientation", label: "Orientation" },
    { key: "day", label: "Day in the Life" },
    { key: "absence", label: "In the Absence Of" },
];

export default function EmployeeTabsClient({
    initialTab = "overview",
}: {
    initialTab?: EmployeeTabKey;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [active, setActive] = React.useState<EmployeeTabKey>(initialTab);

    // Keep local state in sync if user navigates back/forward
    React.useEffect(() => {
        const tab = (searchParams.get("tab") as EmployeeTabKey | null) ?? "overview";
        if (tab !== active && TABS.some((t) => t.key === tab)) setActive(tab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const setTab = (tab: EmployeeTabKey) => {
        setActive(tab);

        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);

        // Replace so back button doesn’t feel “spammy”
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/3 p-2">
            {TABS.map((t) => {
                const isActive = t.key === active;
                return (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={[
                            "rounded-md px-3 py-2 text-sm transition",
                            isActive
                                ? "bg-white/10 text-white ring-1 ring-white/15"
                                : "text-slate-300 hover:bg-white/5 hover:text-white",
                        ].join(" ")}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {t.label}
                    </button>
                );
            })}
        </div>
    );
}
