"use client";

export default function EditToolbar({
    isEditing,
    onToggle,
}: {
    isEditing: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className="ml-auto px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
            {isEditing ? "Done" : "Edit"}
        </button>
    );
}
