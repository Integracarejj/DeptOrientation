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
            const list = copy[item.section];
            const target = list.find((i: DayInLifeItem) => i.id === item.id);
            if (target) target.text = val;
            return copy;
        });
    };

    return (
        <div className="flex items-start gap-2 py-1">
            {isEditing ? (
                <>
                    <input
                        value={item.text}
                        onChange={(e) => updateText(e.target.value)}
                        className="w-full border rounded px-2 py-1
                       border-slate-300 bg-white text-slate-900
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
                        placeholder="Type item…"
                    />
                    <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="text-xs px-2 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50
                       dark:text-red-300 dark:hover:bg-red-900"
                        aria-label="Delete"
                        title="Delete"
                    >
                        Delete
                    </button>
                </>
            ) : (
                <div className="w-full">{item.text}</div>
            )}
        </div>
    );
}