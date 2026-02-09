"use client";

import React from "react";
import ItemRow from "./ItemRow";
import {
    DayInLifeItem,
    SectionKey,
    SectionsMap,
} from "@/lib/dayInLife/types";

type Props = {
    section: SectionKey;
    items: DayInLifeItem[];
    setSections: React.Dispatch<React.SetStateAction<SectionsMap>>;
    isEditing: boolean;
};

export default function SectionColumn({
    section,
    items,
    setSections,
    isEditing,
}: Props) {
    return (
        <div className="border border-slate-300 rounded-md bg-slate-50">
            {/* Section header */}
            <div className="px-4 py-2 bg-[#d2d8e0] text-[#191b25] font-semibold border-b border-[#40e0d0]">
                {section}
            </div>

            {/* Rows container:
          Set a readable default text color for everything inside.
          ItemRow will inherit this unless it overrides text color. */}
            <div className="divide-y divide-slate-300 text-slate-800">
                {items.length === 0 && (
                    <div className="px-4 py-3 italic text-slate-700">
                        No items
                    </div>
                )}

                {items.map((item) => (
                    <ItemRow
                        key={item.id}
                        item={item}
                        setSections={setSections}
                        isEditing={isEditing}
                    />

                ))}
            </div>
        </div>
    );
}
