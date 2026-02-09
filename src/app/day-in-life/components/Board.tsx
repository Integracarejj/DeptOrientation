import React from "react";
import SectionColumn from "./SectionColumn";
import { SectionsMap, SectionKey, DayInLifeItem } from "@/lib/dayInLife/types";

type BoardProps = {
    sections: SectionsMap;
    setSections: React.Dispatch<React.SetStateAction<SectionsMap>>;
    isEditing: boolean;
    role: string; // selected role code ("" means no filter)
};

export default function Board({ sections, setSections, isEditing, role }: BoardProps) {
    const filterByRole = (items: DayInLifeItem[]) => {
        if (!role) return items;
        return items.filter((i) => i.role === role);
    };

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(sections) as SectionKey[]).map((key) => {
                const original = sections[key] ?? [];
                const filtered = filterByRole(original);
                return (
                    <SectionColumn
                        key={key}
                        section={key}
                        items={filtered}
                        setSections={setSections}
                        isEditing={isEditing}
                        role={role}
                    />
                );
            })}
        </div>
    );
}