"use client";

import { useEffect, useRef, useState } from "react";
import { SectionsMap } from "@/lib/dayInLife/types";
import RolePicker from "./components/RolePicker";
import Board from "./components/Board";
import EditToolbar from "./components/EditToolbar";
import { normalizePayload } from "@/lib/dayInLife/normalize";
import { computeChangeSet } from "@/lib/dayInLife/diff";

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

    async function saveChangesAndExit() {
        const snapshot = snapshotRef.current ?? EMPTY_SECTIONS;
        const changes = computeChangeSet(snapshot, sections);

        // Guard: creating items requires a selected role
        if (changes.creates.length > 0 && !role) {
            setBanner("Please select a role before adding new items.");
            return;
        }

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

            // 1) Deletes (soft)
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

            // 2) Updates
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

            // 3) Creates
            for (const c of changes.creates) {
                const body = {
                    role, // required by Function
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

            // Reload canonical state from server
            await load();
            setIsEditing(false);
            setBanner("Saved.");
            // Clear success banner after a short delay
            setTimeout(() => setBanner(null), 1500);
        } catch (e: unknown) {
            console.error("Save failed", e);
            setBanner("We couldn't save your changes. See console for details.");
            // keep edit mode so the user can retry or copy out changes
        } finally {
            setBusy(false);
        }
    }

    function toggleEdit() {
        if (!isEditing) {
            snapshotRef.current = structuredClone(sections);
            setIsEditing(true);
            setBanner(null);
        } else {
            // Leaving edit → save
            void saveChangesAndExit();
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="mb-4 flex items-center justify-between gap-4">
                <RolePicker value={role} onChange={setRole} />
                <EditToolbar isEditing={isEditing} onToggle={toggleEdit} />
            </div>

            {banner && (
                <div
                    role="status"
                    className="mb-4 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                    {banner}
                </div>
            )}

            <Board sections={sections} setSections={setSections} isEditing={isEditing} role={role} />

            {isEditing && busy && (
                <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center">
                    <div className="mt-8 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 shadow-lg dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                        Saving…
                    </div>
                </div>
            )}
        </div>
    );
}