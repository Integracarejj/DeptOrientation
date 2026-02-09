import React from "react";
import SectionColumn from "./SectionColumn";
import { SectionsMap, SectionKey } from "@/lib/dayInLife/types";

type BoardProps = {
    sections: SectionsMap;
    setSections: React.Dispatch<React.SetStateAction<SectionsMap>>;
    isEditing: boolean;
    role: string; // ✅ add role to props
};

export default function Board({
    sections,
    setSections,
    isEditing,
    role, // ✅ destructure role
}: BoardProps) {
    return (
        <div className="flex flex-col gap-6">
            {(Object.keys(sections) as SectionKey[]).map((key) => (
                <SectionColumn
                    key={key}                  // React key
                    section={key}              // SectionKey
                    items={sections[key]}      // array of items
                    setSections={setSections}
                    isEditing={isEditing}
                />
            ))}
        </div>
    );
}
