import { SectionsMap, SectionKey, DayInLifeItem } from "./types";

const EMPTY: SectionsMap = {
    PriorToStandUp: [],
    AfterStandUp: [],
    Calendar: [],
    ToBeScheduled: [],
    Other: [],
};

export function normalizePayload(payload: any): SectionsMap {
    const copy: SectionsMap = structuredClone(EMPTY);

    const sections = payload?.sections ?? {};

    (Object.entries(sections) as [SectionKey, any[]][]).forEach(
        ([key, items]) => {
            copy[key] = items.map(
                (i): DayInLifeItem => ({
                    id: String(i.id),
                    text: String(i.text ?? ""),
                    order: Number(i.order ?? 0),
                    active: Boolean(i.active),
                    role: i.role,
                    section: key,
                })
            );
        }
    );

    return copy;
}
