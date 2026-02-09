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

export default function SectionColumn({
    section,
    items,
    setSections,
    isEditing,
    role,
}: Props) {
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
        <div className="flex min-w-64 flex-1 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {section}
                </h4>
                {isEditing && (
                    <button
                        type="button"
                        onClick={addItem}
                        disabled={!role}
                        className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        aria-label="Add item"
                        title={role ? "Add item" : "Select a role to add items"}
                    >
                        + Add item
                    </button>
                )}
            </div>

            {/* Rows */}
            {items.length === 0 && (
                <div className="text-xs italic text-slate-500 dark:text-slate-400">No items</div>
            )}

            <div className="flex flex-col gap-2">
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