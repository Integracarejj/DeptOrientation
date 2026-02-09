// src/lib/dayInLife/types.ts

export type SectionKey =
    | "PriorToStandUp"
    | "AfterStandUp"
    | "ToBeScheduled"
    | "Other"; // Removed "Calendar"

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

// Canonical sections map
export type SectionsMap = Record<SectionKey, DayInLifeItem[]>;