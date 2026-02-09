import { SectionsMap, SectionKey, DayInLifeItem } from "./types";

const EMPTY: SectionsMap = {
    PriorToStandUp: [],
    AfterStandUp: [],
    ToBeScheduled: [],
    Other: [],
};

const KNOWN_SECTIONS = new Set<SectionKey>([
    "PriorToStandUp",
    "AfterStandUp",
    "ToBeScheduled",
    "Other",
]);

export function normalizePayload(payload: any): SectionsMap {
    const copy: SectionsMap = structuredClone(EMPTY);
    const sections = payload?.sections ?? {};

    (Object.entries(sections) as [string, any[]][])
        .forEach(([key, items]) => {
            // Ignore any "Calendar" bucket coming from the API
            if (!KNOWN_SECTIONS.has(key as SectionKey)) return;

            copy[key as SectionKey] = (items ?? []).map((i): DayInLifeItem => ({
                id: String(i.id),
                text: String(i.text ?? ""),
                order: Number(i.order ?? 0),
                active: Boolean(i.active),
                role: String(i.role ?? ""),
                section: key as SectionKey,
            }));
        });

    return copy;
}