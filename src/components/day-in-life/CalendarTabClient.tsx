'use client';

import { useEffect, useMemo, useState } from 'react';

type LinkItem = { text: string; href?: string };
type Weekly = Record<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'General', LinkItem[]>;
type MonthlyWeek = Record<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday', LinkItem[]>;
type Monthly = {
    FirstWeek?: MonthlyWeek;
    SecondWeek?: MonthlyWeek;
    ThirdWeek?: MonthlyWeek;
    FourthWeek?: MonthlyWeek;
    General?: LinkItem[];
};
type CalendarModel = {
    version: number;
    updatedAt: string | null;
    weekly: Partial<Weekly>;
    monthly: Partial<Monthly>;
    discretionary: LinkItem[];
};

const WEEKDAYS: Array<keyof MonthlyWeek> = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MONTH_WEEKS: Array<keyof Omit<Monthly, 'General'>> = ['FirstWeek', 'SecondWeek', 'ThirdWeek', 'FourthWeek'];

export default function CalendarTabClient({ role, canEdit }: { role: string; canEdit: boolean }) {
    const [data, setData] = useState<CalendarModel | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    async function load() {
        setBusy(true);
        try {
            const res = await fetch(`/api/day-in-life/${encodeURIComponent(role)}/calendar`, { cache: 'no-store' });
            if (!res.ok) throw new Error(await res.text());
            const json = await res.json();
            setData(json);
            setDirty(false);
        } catch (e: any) {
            setError(e?.message || 'Failed to load calendar');
        } finally {
            setBusy(false);
        }
    }

    async function save(next: CalendarModel) {
        setBusy(true); setError(null);
        try {
            const res = await fetch(`/api/day-in-life/${encodeURIComponent(role)}/calendar`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    weekly: next.weekly ?? {},
                    monthly: next.monthly ?? {},
                    discretionary: next.discretionary ?? []
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const fresh = await res.json();
            setData(fresh);
            setDirty(false);
        } catch (e: any) {
            setError(e?.message || 'Save failed');
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [role]);

    function parseLinesToItems(text: string): LinkItem[] {
        // support lines as "Label" or "[Label](url)"
        return text.split('\n')
            .map(l => l.trim())
            .filter(Boolean)
            .map(line => {
                const m = line.match(/^\[(.+?)\]\((https?:\/\/[^\s)]+)\)$/i);
                if (m) return { text: m[1], href: m[2] };
                return { text: line };
            });
    }
    function itemsToLines(items: LinkItem[]): string {
        return (items || []).map(i => i.href ? `[${i.text}](${i.href})` : i.text).join('\n');
    }
    function ensureWeek(): MonthlyWeek {
        return { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
    }

    if (!data) {
        return <div className="text-gray-400 text-sm">{busy ? 'Loading…' : (error || 'No data')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                    Version <span className="font-semibold text-gray-300">{data.version}</span>
                    {data.updatedAt && <> · Last updated {new Date(data.updatedAt).toLocaleString()}</>}
                </div>
                {canEdit && (
                    <div className="flex gap-2">
                        {dirty && <span className="text-amber-400 text-sm">Unsaved changes</span>}
                        <button
                            disabled={!dirty || busy}
                            onClick={() => save(data)}
                            className="rounded bg-sky-600 px-3 py-1 text-white text-sm disabled:opacity-50"
                        >
                            Save changes
                        </button>
                        <button
                            disabled={busy}
                            onClick={() => load()}
                            className="rounded bg-gray-800 px-3 py-1 text-sm"
                        >
                            Reload
                        </button>
                    </div>
                )}
            </div>

            {/* Weekly */}
            <section>
                <h3 className="text-lg font-semibold text-white mb-3">Weekly</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* General (optional) */}
                    {'General' in (data.weekly || {}) && (
                        <WeeklyColumn
                            title="General"
                            editable={canEdit}
                            value={itemsToLines((data.weekly as any).General || [])}
                            onChange={(val) => {
                                const next: CalendarModel = { ...data, weekly: { ...data.weekly, General: parseLinesToItems(val) } };
                                setData(next); setDirty(true);
                            }}
                        />
                    )}
                    {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const).map(day => (
                        <WeeklyColumn
                            key={day}
                            title={day}
                            editable={canEdit}
                            value={itemsToLines((data.weekly as any)[day] || [])}
                            onChange={(val) => {
                                const next: CalendarModel = { ...data, weekly: { ...data.weekly, [day]: parseLinesToItems(val) } };
                                setData(next); setDirty(true);
                            }}
                        />
                    ))}
                </div>
            </section>

            {/* Monthly */}
            <section>
                <h3 className="text-lg font-semibold text-white mb-3">Monthly</h3>
                {/* General (optional) */}
                {'General' in (data.monthly || {}) && (
                    <div className="mb-4">
                        <h4 className="text-md font-semibold text-gray-200 mb-2">General</h4>
                        <WeeklyColumn
                            title=""
                            editable={canEdit}
                            value={itemsToLines((data.monthly as any).General || [])}
                            onChange={(val) => {
                                const next: CalendarModel = { ...data, monthly: { ...data.monthly, General: parseLinesToItems(val) } };
                                setData(next); setDirty(true);
                            }}
                        />
                    </div>
                )}
                <div className="space-y-6">
                    {MONTH_WEEKS.map(weekKey => {
                        const week = (data.monthly?.[weekKey] as MonthlyWeek) || ensureWeek();
                        return (
                            <div key={weekKey}>
                                <h4 className="text-md font-semibold text-gray-200 mb-2">
                                    {weekKey.replace('Week', ' Week')}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    {WEEKDAYS.map(day => (
                                        <WeeklyColumn
                                            key={`${weekKey}-${day}`}
                                            title={day}
                                            editable={canEdit}
                                            value={itemsToLines(week[day] || [])}
                                            onChange={(val) => {
                                                const nextWeek: MonthlyWeek = { ...(week || ensureWeek()), [day]: parseLinesToItems(val) };
                                                const nextMonthly: Monthly = { ...(data.monthly || {}), [weekKey]: nextWeek };
                                                const next: CalendarModel = { ...data, monthly: nextMonthly };
                                                setData(next); setDirty(true);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Discretionary */}
            <section>
                <h3 className="text-lg font-semibold text-white mb-3">To Be Scheduled (Discretionary)</h3>
                <WeeklyColumn
                    title=""
                    editable={canEdit}
                    value={itemsToLines(data.discretionary || [])}
                    onChange={(val) => {
                        const next: CalendarModel = { ...data, discretionary: parseLinesToItems(val) };
                        setData(next); setDirty(true);
                    }}
                />
            </section>

            {error && <div className="text-red-400 text-sm">{error}</div>}
            {busy && <div className="text-gray-400 text-sm">Saving…</div>}
        </div>
    );
}

function WeeklyColumn({
    title, value, editable, onChange
}: {
    title: string; value: string; editable: boolean; onChange: (v: string) => void;
}) {
    return (
        <div className="rounded-md border border-gray-800 p-3">
            {title && <div className="mb-2 text-sm font-medium text-gray-200">{title}</div>}
            {editable ? (
                <textarea
                    className="w-full h-40 rounded-md bg-gray-900 text-gray-100 px-3 py-2 outline-none border border-gray-700 focus:border-sky-500"
                    placeholder="One item per line. Use [Label](https://link) to make a link."
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            ) : (
                <ul className="space-y-1">
                    {value.trim() === '' ? <li className="text-gray-500 text-sm">—</li> :
                        value.split('\n').map((line, idx) => {
                            const m = line.match(/^\[(.+?)\]\((https?:\/\/[^\s)]+)\)$/i);
                            return (
                                <li key={idx} className="text-gray-100 text-sm">
                                    {m ? <a className="text-sky-400 hover:underline" href={m[2]} target="_blank" rel="noreferrer">{m[1]}</a>
                                        : line}
                                </li>
                            );
                        })}
                </ul>
            )}
        </div>
    );
}