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
    role?: string;       // RoleCode from SharePoint
    section: SectionKey;
    isNew?: boolean;
    isDeleted?: boolean;
};

// Corrected mapping type
export type SectionsMap = Record<SectionKey, DayInLifeItem[]>;