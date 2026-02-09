"use client";
import React from "react";
import ItemRow from "./ItemRow";
import { DayInLifeItem, SectionKey, SectionsMap } from "@/lib/dayInLife/types";

type Props = {
    section: SectionKey;
    items: DayInLifeItem[];
    setSections: React.Dispatch<React.SetStateAction<SectionsMap>>;
    isEditing: boolean;
    role: string;
};

export default function SectionColumn({ section, items, setSections, isEditing, role }: Props) {
    const addItem = () => {
        const nextOrder = (items.reduce((m, i) => Math.max(m, i.order), 0) || 0) + 1;
        const newItem: DayInLifeItem = {
            id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            text: "",
            order: nextOrder,
            active: true,
            role,
            section,
            isNew: true,
        };
        setSections((prev) => {
            const copy: SectionsMap = structuredClone(prev);
            copy[section] = [...(copy[section] ?? []), newItem];
            return copy;
        });
    };

    const removeItem = (id: string) => {
        setSections((prev) => {
            const copy: SectionsMap = structuredClone(prev);
            copy[section] = (copy[section] ?? []).filter((i) => i.id !== id);
            return copy;
        });
    };

    return (
        <div className="rounded-md border bg-white text-slate-900 border-slate-300 p-3 space-y-2
                    dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">{section}</h3>
                {isEditing && (
                    <button
                        type="button"
                        onClick={addItem}
                        className="text-sm px-2 py-1 rounded border border-slate-300 hover:bg-slate-100
                       dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                        + Add item
                    </button>
                )}
            </div>

            {/* Rows */}
            <div>
                {items.length === 0 && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 italic py-2">No items</div>
                )}

                {items.map((item) => (
                    <ItemRow
                        key={item.id}
                        item={item}
                        isEditing={isEditing}
                        setSections={setSections}
                        onDelete={removeItem}
                    />
                ))}
            </div>
        </div>
    );
}