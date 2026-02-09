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
        const res = await fetch(`/api/day-in-life/summary?role=${role}`, {
            cache: "no-store",
        });
        const json = await res.json();
        setSections(normalizePayload(json));
    }

    useEffect(() => {
        load();
    }, [role]);

    function toggleEdit() {
        if (!isEditing) {
            snapshotRef.current = structuredClone(sections);
            setIsEditing(true);
        } else {
            setIsEditing(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
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
