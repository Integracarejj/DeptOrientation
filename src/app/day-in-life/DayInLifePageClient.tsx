"use client";
import { useEffect, useRef, useState } from "react";
import { SectionsMap } from "@/lib/dayInLife/types";
import RolePicker from "./components/RolePicker";
import Board from "./components/Board";
import EditToolbar from "./components/EditToolbar";
import { normalizePayload } from "@/lib/dayInLife/normalize";
import { computeChangeSet } from "@/lib/dayInLife/diff";
import Link from "next/link";

// Empty starter shape — "Calendar" intentionally removed
const EMPTY_SECTIONS: SectionsMap = {
    PriorToStandUp: [],
    AfterStandUp: [],
    ToBeScheduled: [],
    Other: [],
};

export default function DayInLifePageClient() {
    const [role, setRole] = useState("");
    const [sections, setSections] = useState<SectionsMap>(EMPTY_SECTIONS);
    const [isEditing, setIsEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [banner, setBanner] = useState<string | null>(null);
    const snapshotRef = useRef<SectionsMap | null>(null);

    // -------------------------
    // LOAD SUMMARY
    // -------------------------
    async function load() {
        const res = await fetch(`/api/day-in-life/summary`, { cache: "no-store" });
        if (!res.ok) {
            const body = await res.text();
            console.error("Failed to load DayInLife summary:", res.status, body);
            setBanner("We couldn't load the Day in the Life data. See console for details.");
            return;
        }
        const json = await res.json();
        setSections(normalizePayload(json));
    }
    useEffect(() => {
        void load();
    }, []);

    // -------------------------
    // SAVE CHANGES
    // -------------------------
    async function saveChangesAndExit() {
        const snapshot = snapshotRef.current ?? EMPTY_SECTIONS;
        const changes = computeChangeSet(snapshot, sections);
        // Guard: creating items requires a selected role
        if (changes.creates.length > 0 && !role) {
            setBanner("Please select a role before adding new items.");
            return;
        }
        // If no changes → exit edit mode quietly
        if (
            changes.creates.length === 0 &&
            changes.updates.length === 0 &&
            changes.deletes.length === 0
        ) {
            setIsEditing(false);
            setBanner(null);
            return;
        }
        try {
            setBusy(true);
            setBanner("Saving…");
            // Deletes
            for (const d of changes.deletes) {
                const res = await fetch(`/api/day-in-life/item/${encodeURIComponent(d.id)}`, {
                    method: "DELETE",
                    cache: "no-store",
                });
                if (!res.ok) {
                    const t = await res.text();
                    console.error("Delete failed:", res.status, t);
                    throw new Error(`Delete failed (${res.status}): ${t}`);
                }
            }
            // Updates
            for (const u of changes.updates) {
                const body: Record<string, unknown> = {};
                if (u.before.text !== u.after.text) body.text = u.after.text;
                if (u.before.section !== u.after.section) body.section = u.after.section;
                if (u.before.order !== u.after.order) body.order = u.after.order;
                if (u.before.active !== u.after.active) body.active = u.after.active;
                if (Object.keys(body).length > 0) {
                    const res = await fetch(`/api/day-in-life/item/${encodeURIComponent(u.id)}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                        cache: "no-store",
                    });
                    if (!res.ok) {
                        const t = await res.text();
                        console.error("Update failed:", res.status, t);
                        throw new Error(`Update failed (${res.status}): ${t}`);
                    }
                }
            }
            // Creates
            for (const c of changes.creates) {
                const body = {
                    role,
                    section: c.section,
                    text: c.text,
                    order: c.order,
                    active: true,
                };
                const res = await fetch(`/api/day-in-life/item`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                    cache: "no-store",
                });
                if (!res.ok) {
                    const t = await res.text();
                    console.error("Create failed:", res.status, t);
                    throw new Error(`Create failed (${res.status}): ${t}`);
                }
            }
            await load();
            setIsEditing(false);
            setBanner("Saved.");
            setTimeout(() => setBanner(null), 1500);
        } catch (e: unknown) {
            console.error("Save failed", e);
            setBanner("We couldn't save your changes. See console for details.");
        } finally {
            setBusy(false);
        }
    }

    // -------------------------
    // EDIT TOGGLE
    // -------------------------
    function toggleEdit() {
        if (!isEditing) {
            snapshotRef.current = structuredClone(sections);
            setIsEditing(true);
            setBanner(null);
        } else {
            void saveChangesAndExit();
        }
    }

    // -------------------------
    // RENDER
    // -------------------------
    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            {/* Top Toolbar */}
            <div className="mb-4 flex items-center justify-between gap-4">
                {/* Left: Role Picker */}
                <RolePicker value={role} onChange={setRole} />
                {/* Right: Edit + Days of Week Button */}
                <div className="flex items-center gap-2">
                    <EditToolbar isEditing={isEditing} onToggle={toggleEdit} />
                    <Link
                        href={`/day-in-life/days-of-week${role ? `?role=${encodeURIComponent(role)}` : ""}`}
                        className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label="Open Days of Week matrix"
                        title="Open Days of Week matrix"
                    >
                        Days of Week
                    </Link>
                </div>
            </div>

            {/* Banner */}
            {banner && (
                <div
                    role="status"
                    className="mb-4 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm"
                >
                    {banner}
                </div>
            )}

            {/* Main Board */}
            <Board sections={sections} setSections={setSections} isEditing={isEditing} role={role} />

            {/* Saving overlay */}
            {isEditing && busy && (
                <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center">
                    <div className="mt-8 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 shadow-lg">
                        Saving…
                    </div>
                </div>
            )}
        </div>
    );
}