"use client";

import { DayInLifeItem, SectionsMap } from "@/lib/dayInLife/types";

type Props = {
    item: DayInLifeItem;
    isEditing: boolean;
    setSections: React.Dispatch<React.SetStateAction<SectionsMap>>;
    onDelete: (id: string) => void;
};

export default function ItemRow({ item, isEditing, setSections, onDelete }: Props) {
    const updateText = (val: string) => {
        setSections((prev: SectionsMap) => {
            const copy = structuredClone(prev);
            const list = copy[item.section] ?? [];
            const target = list.find((i: DayInLifeItem) => i.id === item.id);
            if (target) target.text = val;
            return copy;
        });
    };

    return (
        <div className="group flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
            {isEditing ? (
                <>
                    <input
                        value={item.text}
                        onChange={(e) => updateText(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="Type item…"
                        aria-label="Item text"
                    />
                    <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="rounded border border-red-500 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-400 dark:text-red-300 dark:hover:bg-red-900/30"
                        aria-label="Delete"
                        title="Delete"
                    >
                        Delete
                    </button>
                </>
            ) : (
                <div className="w-full whitespace-pre-wrap wrap-break-word text-sm text-slate-800 dark:text-slate-100">
                    {item.text}
                </div>
            )}
        </div>
    );
}
