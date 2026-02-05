// src/app/day-in-life/[role]/page.tsx
import * as React from "react";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import DayInLifeTabsClient from "@/components/day-in-life/DayInLifeTabsClient";

// Always server-render with fresh data
export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * Raw shape from SharePoint "DayInLifeItems" list.
 * (Keep open; we only rely on a few fields and transform below.)
 */
type SpDailyRow = {
    id?: string | number;
    Title?: string;
    Section?: string;            // "Prior" | "After" | "To Be Scheduled" | "Other"
    Order?: number;              // drag-and-drop order
    Active?: boolean;            // soft delete if false
    Notes?: string | null;
    Url?: string | null;
    [key: string]: unknown;
};

/**
 * Minimal client-shape for a single DIL item that matches what the
 * DayInLifeTabsClient's DilItem requires (structural typing).
 */
type DilItem = {
    id?: string | number;
    text: string;                // <- required by client
    order: number;               // <- required by client
    active: boolean;             // <- required by client
    notes?: string | null;
    url?: string | null;
    section?: string;            // carry original section for reference (optional)
    // allow additional metadata without breaking client
    [key: string]: unknown;
};

type DilCalendar = {
    weekly?: unknown;
    monthly?: unknown;
    discretionary?: unknown;
    version?: number;
    updatedAt?: string;
    [key: string]: unknown;
};

type SectionsBuckets = {
    PriorToStandUp: DilItem[];
    AfterStandUp: DilItem[];
    Calendar: DilItem[];       // calendar tab is JSON-driven; keep as [] here
    ToBeScheduled: DilItem[];
    Other: DilItem[];
};

// Role options used by the picker grid.
const ROLE_OPTIONS: { code: string; name: string }[] = [
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

function getRoleName(role: string): string | undefined {
    return ROLE_OPTIONS.find((r) => r.code === role)?.name;
}

/** Build absolute base URL for SSR fetches. */
async function getBaseUrl(): Promise<string> {
    const envBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
    if (envBase) return envBase;

    const vercelHost = process.env.VERCEL_URL?.replace(/\/+$/, "");
    if (vercelHost) return `https://${vercelHost}`;

    const h = await headers();
    const proto =
        h.get("x-forwarded-proto") ??
        (process.env.NODE_ENV === "production" ? "https" : "http");
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${proto}://${host}`.replace(/\/+$/, "");

    return "http://localhost:3000";
}

function abs(base: string, path: string) {
    const b = base.replace(/\/+$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${b}${p}`;
}

/** Normalize SharePoint section names to the client’s section keys. */
function toSectionKey(spSection?: string): keyof SectionsBuckets {
    const s = (spSection ?? "").trim().toLowerCase();
    if (s === "prior") return "PriorToStandUp";
    if (s === "after") return "AfterStandUp";
    if (s === "to be scheduled") return "ToBeScheduled";
    if (s === "other") return "Other";
    return "Other";
}

/** Transform a SharePoint row into the client’s DilItem shape. */
function toDilItem(row: SpDailyRow): DilItem {
    // Provide robust defaults so lists without Order/Active still render
    const order =
        typeof row.Order === "number" && Number.isFinite(row.Order)
            ? row.Order
            : Number.POSITIVE_INFINITY;

    return {
        id: row.id,
        text: (row.Title ?? "").toString(),
        order,
        active: row.Active !== false, // undefined => true
        notes: row.Notes ?? null,
        url: row.Url ?? null,
        section: row.Section,
        // carry through any other fields as needed:
        // ...row,  // (optional) uncomment if you want to pass-through everything
    };
}

/** Sort by `order`, placing undefined/NaN at the end. */
function sortByOrder(items: DilItem[]): DilItem[] {
    return [...items].sort((a, b) => a.order - b.order);
}

export default async function DayInLifeRolePage(props: {
    // Next.js 15: params are async
    params: Promise<{ role: string }>;
}) {
    const { role } = await props.params;
    const cookieStore = await cookies(); // reserved for gating canEdit, etc.

    const roleName = getRoleName(role);
    if (!roleName) {
        notFound();
    }

    // Build absolute URLs for SSR fetch
    const baseUrl = await getBaseUrl();
    const dailyUrl = abs(baseUrl, `/api/day-in-life/${encodeURIComponent(role)}`);
    const calendarUrl = abs(
        baseUrl,
        `/api/day-in-life/${encodeURIComponent(role)}/calendar`
    );

    // Fetch (no-store) to avoid stale editing views
    const [dailyRes, calendarRes] = await Promise.all([
        fetch(dailyUrl, { method: "GET", cache: "no-store" }),
        fetch(calendarUrl, { method: "GET", cache: "no-store" }),
    ]);

    if (!dailyRes.ok) {
        const body = await dailyRes.text().catch(() => "");
        throw new Error(
            `Failed to load Daily items for "${role}" (${dailyRes.status}). URL: ${dailyUrl}. Body: ${body}`
        );
    }
    if (!calendarRes.ok) {
        const body = await calendarRes.text().catch(() => "");
        throw new Error(
            `Failed to load Calendar JSON for "${role}" (${calendarRes.status}). URL: ${calendarUrl}. Body: ${body}`
        );
    }

    // Daily may be an array or { items: [...] }
    const dailyJson = (await dailyRes.json()) as SpDailyRow[] | { items?: SpDailyRow[] };
    const calendar = (await calendarRes.json()) as DilCalendar;

    const rawDaily: SpDailyRow[] = Array.isArray(dailyJson)
        ? dailyJson
        : Array.isArray((dailyJson as any)?.items)
            ? ((dailyJson as any).items as SpDailyRow[])
            : [];

    // Filter out soft-deleted
    const activeRows = rawDaily.filter((r) => r?.Active !== false);

    // Transform to the canonical client item shape
    const dilItems: DilItem[] = activeRows.map(toDilItem);

    // Group into client-required sections (Calendar stays empty; JSON drives that tab)
    const sections: SectionsBuckets = {
        PriorToStandUp: [],
        AfterStandUp: [],
        Calendar: [],
        ToBeScheduled: [],
        Other: [],
    };

    for (const it of dilItems) {
        sections[toSectionKey(it.section)].push(it);
    }

    // Sort each section by .order
    (Object.keys(sections) as (keyof SectionsBuckets)[]).forEach((key) => {
        sections[key] = sortByOrder(sections[key]);
    });

    // Build payload structurally compatible with the client’s DilPayload
    // (we intentionally do not annotate it as a local DilPayload type here)
    const initialData = {
        role,
        roleName,
        sections,   // sections: { PriorToStandUp: DilItem[], ... }
        daily: dilItems, // if the client also uses `daily`, it gets the normalized shape
        calendar,
    };

    // canEdit gate (dev = true; prod via simple cookie; replace with your auth)
    const canEdit =
        process.env.NODE_ENV !== "production"
            ? true
            : cookieStore.get("dil_can_edit")?.value === "1";

    return (
        <main className="container mx-auto p-6 space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Day in the Life — {roleName}</h1>
                <p className="text-sm text-gray-500">
                    Role code: <span className="font-mono">{role}</span>
                </p>
            </header>

            <DayInLifeTabsClient role={role} initialData={initialData as any} canEdit={canEdit} />
            {/* ^ If TS still complains due to module-bound nominal types, the `as any` here
          is a last-resort to break the cycle while we align exact client types. */}
        </main>
    );
}