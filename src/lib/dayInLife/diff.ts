import { DayInLifeItem, SectionsMap } from "./types";

export type ChangeSet = {
    creates: DayInLifeItem[];
    updates: { id: string; before: DayInLifeItem; after: DayInLifeItem }[];
    deletes: DayInLifeItem[];
};

function flatten(map: SectionsMap): Record<string, DayInLifeItem> {
    const byId: Record<string, DayInLifeItem> = {};
    Object.values(map).forEach((arr) => {
        (arr ?? []).forEach((it) => {
            byId[it.id] = it;
        });
    });
    return byId;
}

function equal(a: DayInLifeItem, b: DayInLifeItem): boolean {
    return (
        a.text === b.text &&
        a.section === b.section &&
        a.order === b.order &&
        a.active === b.active
    );
}

export function computeChangeSet(prev: SectionsMap, next: SectionsMap): ChangeSet {
    const before = flatten(prev);
    const after = flatten(next);

    const creates: DayInLifeItem[] = [];
    const updates: { id: string; before: DayInLifeItem; after: DayInLifeItem }[] = [];
    const deletes: DayInLifeItem[] = [];

    // Deletions & updates
    Object.keys(before).forEach((id) => {
        const b = before[id];
        const a = after[id];
        if (!a) {
            // existed before, missing now => delete
            deletes.push(b);
        } else if (!equal(a, b)) {
            updates.push({ id, before: b, after: a });
        }
    });

    // Creations
    Object.keys(after).forEach((id) => {
        if (!before[id]) {
            creates.push(after[id]);
        }
    });

    return { creates, updates, deletes };
}