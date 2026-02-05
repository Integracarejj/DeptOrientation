// src/components/day-in-life/DayInLifeTabsClient.tsx
'use client';

import { useMemo, useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CalendarTabClient from '@/components/day-in-life/CalendarTabClient';

type DilItem = { id: string; text: string; order: number; active: boolean };
type Sections = {
    PriorToStandUp: DilItem[];
    AfterStandUp: DilItem[];
    Calendar: DilItem[];       // kept in the type; Calendar tab renders JSON-based UI instead
    ToBeScheduled: DilItem[];
    Other: DilItem[];
};
type DilPayload = { role: string; sections: Sections; modified?: string };

const SECTION_LABELS: Record<keyof Sections, string> = {
    PriorToStandUp: 'Prior to Stand Up',
    AfterStandUp: 'After Stand Up',
    Calendar: 'Calendar',
    ToBeScheduled: 'To Be Scheduled',
    Other: 'Other',
};

const ORDER_DEFAULT = 1;

// --- API helpers ---
async function getRoleData(role: string): Promise<DilPayload> {
    const res = await fetch(`/api/day-in-life/${encodeURIComponent(role)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to refresh data');
    return res.json();
}

async function patchOrder(itemId: string, newOrder: number) {
    const res = await fetch(`/api/day-in-life/item/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
    });
    if (!res.ok) throw new Error(await res.text());
}

async function createItemApi(role: string, section: keyof Sections, text: string, order?: number) {
    const res = await fetch(`/api/day-in-life/${encodeURIComponent(role)}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ section, text, order: order ?? ORDER_DEFAULT, active: true }),
    });
    if (!res.ok) throw new Error(await res.text());
}

async function updateItemApi(
    itemId: string,
    patch: Partial<{ text: string; section: keyof Sections; order: number; active: boolean }>
) {
    const res = await fetch(`/api/day-in-life/item/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(await res.text());
}

async function deleteItemApi(itemId: string) {
    const res = await fetch(`/api/day-in-life/item/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error(await res.text());
}

// --- Component ---
export default function DayInLifeTabsClient({
    role,
    initialData,
    canEdit,
}: {
    role: string;
    initialData: DilPayload;
    canEdit: boolean;
}) {
    const [activeKey, setActiveKey] = useState<keyof Sections>('PriorToStandUp');
    const [data, setData] = useState<DilPayload>(initialData);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tabs = useMemo(() => Object.keys(SECTION_LABELS) as (keyof Sections)[], []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        })
    );

    async function refresh() {
        const fresh = await getRoleData(role);
        setData(fresh);
    }

    async function createItem(section: keyof Sections, text: string, order?: number) {
        setBusy(true); setError(null);
        try {
            await createItemApi(role, section, text, order);
            await refresh();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : e?.message || 'Create failed');
        } finally {
            setBusy(false);
        }
    }

    async function updateItem(
        itemId: string,
        patch: Partial<{ text: string; section: keyof Sections; order: number; active: boolean }>
    ) {
        setBusy(true); setError(null);
        try {
            await updateItemApi(itemId, patch);
            await refresh();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : e?.message || 'Update failed');
        } finally {
            setBusy(false);
        }
    }

    async function deleteItem(itemId: string) {
        setBusy(true); setError(null);
        try {
            await deleteItemApi(itemId);
            await refresh();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : e?.message || 'Delete failed');
        } finally {
            setBusy(false);
        }
    }

    // ---- Drag & Drop: reorder within active tab (Daily tabs only) ----
    async function handleDragEnd(evt: DragEndEvent) {
        if (!canEdit) return; // read-only mode; do nothing
        const { active, over } = evt;
        if (!over || active.id === over.id) return;

        // Guard: no DnD handling for Calendar tab (Calendar uses JSON editor)
        if (activeKey === 'Calendar') return;

        // Current list in the active section
        const current = data.sections[activeKey] || [];
        const oldIndex = current.findIndex(i => i.id === String(active.id));
        const newIndex = current.findIndex(i => i.id === String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;

        // Optimistically reorder in UI
        const reordered = arrayMove(current, oldIndex, newIndex);
        const nextData: DilPayload = {
            ...data,
            sections: {
                ...data.sections,
                [activeKey]: reordered.map((it, idx) => ({ ...it, order: idx + 1 })),
            },
        };
        setData(nextData);

        // Persist only changed orders (sequential to avoid Graph throttling)
        setBusy(true); setError(null);
        try {
            const patches: { id: string; newOrder: number; oldOrder: number }[] = [];
            for (let i = 0; i < reordered.length; i++) {
                const it = reordered[i];
                const desired = i + 1;
                if (it.order !== desired) {
                    patches.push({ id: it.id, newOrder: desired, oldOrder: it.order });
                }
            }
            for (const p of patches) {
                await patchOrder(p.id, p.newOrder);
            }
            // Refresh to pick up any server-side modified timestamps
            await refresh();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : e?.message || 'Reorder failed');
            // Revert if failed
            await refresh();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
                {tabs.map((k) => (
                    <button
                        key={k}
                        className={[
                            'px-3 py-2 rounded-t-md text-sm font-medium',
                            activeKey === k ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white'
                        ].join(' ')}
                        onClick={() => setActiveKey(k)}
                        disabled={busy}
                    >
                        {SECTION_LABELS[k]}
                    </button>
                ))}
            </div>

            {/* Error / Busy */}
            {error && <div className="text-red-400 text-sm">{error}</div>}
            {busy && <div className="text-gray-400 text-sm">Saving…</div>}

            {/* Content */}
            {activeKey === 'Calendar' ? (
                // Calendar tab uses JSON file per role with its own editable UI
                <CalendarTabClient role={role} canEdit={canEdit} />
            ) : (
                // Daily tabs use DnD + list-backed CRUD
                <SectionPanel
                    key={activeKey}
                    role={role}
                    sectionKey={activeKey}
                    items={data.sections[activeKey] || []}
                    canEdit={canEdit}
                    onCreate={createItem}
                    onUpdate={updateItem}
                    onDelete={deleteItem}
                    sensors={sensors}
                    onDragEnd={handleDragEnd}
                />
            )}
        </div>
    );
}

function SectionPanel({
    role,
    sectionKey,
    items,
    canEdit,
    onCreate,
    onUpdate,
    onDelete,
    sensors,
    onDragEnd,
}: {
    role: string;
    sectionKey: keyof Sections;
    items: DilItem[];
    canEdit: boolean;
    onCreate: (section: keyof Sections, text: string, order?: number) => Promise<void>;
    onUpdate: (itemId: string, patch: Partial<{ text: string; section: keyof Sections; order: number; active: boolean }>) => Promise<void>;
    onDelete: (itemId: string) => Promise<void>;
    sensors: ReturnType<typeof useSensors>;
    onDragEnd: (evt: DragEndEvent) => void;
}) {
    const [newText, setNewText] = useState('');
    const [newOrder, setNewOrder] = useState<number | ''>('');

    const itemIds = items.map(i => i.id);

    return (
        <div className="space-y-4">
            {/* Add new item (supervisor only) */}
            {canEdit && (
                <div className="rounded-md border border-gray-800 p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                            className="flex-1 rounded-md bg-gray-900 text-gray-100 px-3 py-2 outline-none border border-gray-700 focus:border-sky-500"
                            placeholder={`Add item to “${SECTION_LABELS[sectionKey]}”`}
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                        />
                        <input
                            className="w-28 rounded-md bg-gray-900 text-gray-100 px-3 py-2 outline-none border border-gray-700 focus:border-sky-500"
                            placeholder="Order"
                            type="number"
                            value={newOrder}
                            onChange={(e) => setNewOrder(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <button
                            className="rounded-md bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-white"
                            onClick={() => {
                                if (!newText.trim()) return;
                                onCreate(sectionKey, newText.trim(), newOrder === '' ? undefined : Number(newOrder))
                                    .then(() => { setNewText(''); setNewOrder(''); });
                            }}
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}

            {/* Sortable List */}
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                        {items.length === 0 && (
                            <li className="text-gray-400 text-sm">No items yet.</li>
                        )}
                        {items.map((it) => (
                            <SortableItemRow
                                key={it.id}
                                item={it}
                                canEdit={canEdit}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                            />
                        ))}
                    </ul>
                </SortableContext>
            </DndContext>
        </div>
    );
}

function SortableItemRow({
    item,
    canEdit,
    onUpdate,
    onDelete,
}: {
    item: DilItem;
    canEdit: boolean;
    onUpdate: (itemId: string, patch: Partial<{ text: string; section: keyof Sections; order: number; active: boolean }>) => Promise<void>;
    onDelete: (itemId: string) => Promise<void>;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(item.text);
    const [order, setOrder] = useState<number | ''>(item.order ?? '');

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
    };

    return (
        <li ref={setNodeRef} style={style} className="flex items-start gap-3 rounded-md border border-gray-800 p-3 bg-gray-900/40">
            {/* Drag handle */}
            <button
                className="cursor-grab select-none text-gray-400 hover:text-gray-200 mt-1"
                title="Drag to reorder"
                {...attributes}
                {...listeners}
                disabled={!canEdit}
            >
                ⠿
            </button>

            <div className="flex-1">
                {editing ? (
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                            className="flex-1 rounded-md bg-gray-900 text-gray-100 px-3 py-2 outline-none border border-gray-700 focus:border-sky-500"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <input
                            className="w-28 rounded-md bg-gray-900 text-gray-100 px-3 py-2 outline-none border border-gray-700 focus:border-sky-500"
                            placeholder="Order"
                            type="number"
                            value={order}
                            onChange={(e) => setOrder(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                    </div>
                ) : (
                    <div className="text-gray-100">{item.text}</div>
                )}

                {canEdit && (
                    <div className="mt-2 flex flex-wrap gap-2 text-sm">
                        {!editing ? (
                            <>
                                <button
                                    className="rounded bg-gray-800 px-3 py-1 hover:bg-gray-700"
                                    onClick={() => setEditing(true)}
                                >
                                    Edit
                                </button>
                                <button
                                    className="rounded bg-rose-700 px-3 py-1 text-white hover:bg-rose-600"
                                    onClick={() => onDelete(item.id)}
                                >
                                    Delete
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="rounded bg-sky-600 px-3 py-1 text-white hover:bg-sky-500"
                                    onClick={() => {
                                        const patch: any = {};
                                        if (text.trim() !== item.text) patch.text = text.trim();
                                        if (order !== '' && order !== item.order) patch.order = Number(order);
                                        if (Object.keys(patch).length === 0) { setEditing(false); return; }
                                        onUpdate(item.id, patch).then(() => setEditing(false));
                                    }}
                                >
                                    Save
                                </button>
                                <button
                                    className="rounded bg-gray-800 px-3 py-1 hover:bg-gray-700"
                                    onClick={() => { setText(item.text); setOrder(item.order ?? ''); setEditing(false); }}
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
}