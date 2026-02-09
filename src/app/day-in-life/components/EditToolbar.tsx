"use client";

export default function EditToolbar({
    isEditing,
    onToggle,
}: {
    isEditing: boolean;
    onToggle: () => void; // when leaving edit, this will save
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="px-3 py-1 rounded border border-slate-500 hover:bg-slate-700"
        >
            {isEditing ? "Done" : "Edit"}
        </button>
    );
}