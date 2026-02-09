"use client";

import { useEffect, useRef, useState } from "react";
import { SectionsMap } from "@/lib/dayInLife/types";
import RolePicker from "./components/RolePicker";
import Board from "./components/Board";
import EditToolbar from "./components/EditToolbar";
import { normalizePayload } from "@/lib/dayInLife/normalize";
import { computeChangeSet } from "@/lib/dayInLife/diff";

// empty starter shape — no Calendar bucket
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
    const snapshotRef = useRef<SectionsMap | null>(null);

    async function load() {
        const res = await fetch(`/api/day-in-life/summary`, { cache: "no-store" });
        const json = await res.json();
        setSections(normalizePayload(json));
    }

    useEffect(() => {
        load();
    }, []);

    async function saveChangesAndExit() {
        const snapshot = snapshotRef.current ?? EMPTY_SECTIONS;
        const changes = computeChangeSet(snapshot, sections);

        // Guard: creating items requires a selected role
        if (changes.creates.length > 0 && !role) {
            alert("Select a role before adding new items.");
            return;
        }

        if (
            changes.creates.length === 0 &&
            changes.updates.length === 0 &&
            changes.deletes.length === 0
        ) {
            setIsEditing(false);
            return;
        }

        try {
            setBusy(true);

            // Deletes (soft)
            for (const d of changes.deletes) {
                const res = await fetch(`/api/day-in-life/item/${encodeURIComponent(d.id)}`, {
                    method: "DELETE",
                });
                if (!res.ok) {
                    const t = await res.text();
                    console.error("Delete failed:", res.status, t);
                    throw new Error(`Delete failed (${res.status})`);
                }
            }

            // Updates
            for (const u of changes.updates) {
                const body: any = {};
                if (u.before.text !== u.after.text) body.text = u.after.text;
                if (u.before.section !== u.after.section) body.section = u.after.section;
                if (u.before.order !== u.after.order) body.order = u.after.order;
                if (u.before.active !== u.after.active) body.active = u.after.active;

                if (Object.keys(body).length > 0) {
                    const res = await fetch(`/api/day-in-life/item/${encodeURIComponent(u.id)}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                    });
                    if (!res.ok) {
                        const t = await res.text();
                        console.error("Update failed:", res.status, t);
                        throw new Error(`Update failed (${res.status})`);
                    }
                }
            }

            // Creates
            for (const c of changes.creates) {
                const body = {
                    role: role,              // required by Function
                    section: c.section,
                    text: c.text,
                    order: c.order,
                    active: true,
                };
                const res = await fetch(`/api/day-in-life/item`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    const t = await res.text();
                    console.error("Create failed:", res.status, t);
                    throw new Error(`Create failed (${res.status})`);
                }
            }

            // Reload canonical state from server
            await load();
            setIsEditing(false);
        } catch (e) {
            console.error("Save failed", e);
            alert("We couldn't save your changes. Open the console for details and share the error body if needed.");
        } finally {
            setBusy(false);
        }
    }

    function toggleEdit() {
        if (!isEditing) {
            snapshotRef.current = structuredClone(sections);
            setIsEditing(true);
        } else {
            // Leaving edit → save
            void saveChangesAndExit();
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <RolePicker value={role} onChange={setRole} />
                <div className="flex items-center gap-2">
                    {isEditing && busy && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">Saving…</span>
                    )}
                    <EditToolbar isEditing={isEditing} onToggle={toggleEdit} />
                </div>
            </div>

            <Board
                sections={sections}
                setSections={setSections}
                isEditing={isEditing}
                role={role}
            />
        </div>
    );
}