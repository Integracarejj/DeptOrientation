export type Weekday = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
export type WeekOfMonth = 'FirstWeek' | 'SecondWeek' | 'ThirdWeek' | 'FourthWeek';

export type DoWEntry = {
    id?: string; // client-only
    text: string;
    href?: string;
};

export type DaysOfWeekJson = {
    version: number;
    updatedAt?: string;
    weekly?: Partial<Record<Weekday, DoWEntry[]>>;
    monthly?: Partial<Record<WeekOfMonth, Partial<Record<Weekday, DoWEntry[]>>>>;
    general?: DoWEntry[];
    discretionary?: DoWEntry[];
};