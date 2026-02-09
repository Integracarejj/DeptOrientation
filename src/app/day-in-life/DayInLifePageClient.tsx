"use client";

import { useEffect, useRef, useState } from "react";
import { SectionsMap } from "@/lib/dayInLife/types";
import RolePicker from "./components/RolePicker";
import Board from "./components/Board";
import EditToolbar from "./components/EditToolbar";
import { normalizePayload } from "@/lib/dayInLife/normalize";

// empty starter shape — avoids null everywhere
const EMPTY_SECTIONS: SectionsMap = {
    PriorToStandUp: [],
    AfterStandUp: [],
    Calendar: [],
    ToBeScheduled: [],
    Other: [],
};

export default function DayInLifePageClient() {
    const [role, setRole] = useState("");
    const [sections, setSections] = useState<SectionsMap>(EMPTY_SECTIONS);
    const [isEditing, setIsEditing] = useState(false);
    const snapshotRef = useRef<SectionsMap | null>(null);

    async function load() {
        // Fetch ALL once; role filtering happens on the client
        const res = await fetch(`/api/day-in-life/summary`, { cache: "no-store" });
        const json = await res.json();
        setSections(normalizePayload(json));
    }

    // Mount-only load (do not refetch on role change)
    useEffect(() => {
        load();
    }, []);

    function toggleEdit() {
        if (!isEditing) {
            snapshotRef.current = structuredClone(sections);
            setIsEditing(true);
        } else {
            setIsEditing(false);
            // (Optional) rollback logic could go here if needed
            // setSections(snapshotRef.current ?? sections);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <RolePicker value={role} onChange={setRole} />
                <EditToolbar isEditing={isEditing} onToggle={toggleEdit} />
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