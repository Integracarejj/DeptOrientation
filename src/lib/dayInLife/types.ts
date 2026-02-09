// src/lib/dayInLife/types.ts

export type SectionKey =
    | "PriorToStandUp"
    | "AfterStandUp"
    | "Calendar"
    | "ToBeScheduled"
    | "Other";

export type DayInLifeItem = {
    id: string;
    text: string;
    order: number;
    active: boolean;
    role?: string;
    section: SectionKey;
    isNew?: boolean;
    isDeleted?: boolean;
};

export type SectionsMap = Record<SectionKey, DayInLifeItem[]>;
