import React, { useMemo, useState } from "react";

const DAYS = [
    { key: 1, label: "Понедельник", short: "Пн" },
    { key: 2, label: "Вторник", short: "Вт" },
    { key: 3, label: "Среда", short: "Ср" },
    { key: 4, label: "Четверг", short: "Чт" },
    { key: 5, label: "Пятница", short: "Пт" },
    { key: 6, label: "Суббота", short: "Сб" },
    { key: 7, label: "Воскресенье", short: "Вс" },
];

function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
}

function parseTimeToMinutes(t) {
    if (!t || typeof t !== "string" || !t.includes(":")) return 0;
    const [hRaw, mRaw] = t.split(":");
    const h = Number.isFinite(parseInt(hRaw, 10)) ? parseInt(hRaw, 10) : 0;
    const m = Number.isFinite(parseInt(mRaw, 10)) ? parseInt(mRaw, 10) : 0;
    return Math.max(0, h) * 60 + Math.max(0, m);
}

function minutesToTime(mins) {
    const m = Math.max(0, mins | 0);
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

function addMinutes(t, delta) {
    const base = parseTimeToMinutes(t);
    return minutesToTime(base + (delta | 0));
}

function sortIntervals(intervals) {
    return [...(intervals || [])].sort((a, b) => parseTimeToMinutes(a?.start) - parseTimeToMinutes(b?.start));
}

export default function WeeklyScheduleEditor({ value, onChange, onSave, saving, showBuffer = false }) {
    const [draft, setDraft] = useState(() => clone(value));
    const [expandedDay, setExpandedDay] = useState(1);
    const [clipboard, setClipboard] = useState(null); // intervals[]
    const [justCopiedDay, setJustCopiedDay] = useState(null);

    // если value поменяли снаружи (загрузка), обновим draft один раз
    React.useEffect(() => {
        setDraft(clone(value));
    }, [value]);

    // раскрываем первый активный день после загрузки
    React.useEffect(() => {
        const w = (value || {})?.week || {};
        const firstEnabled = DAYS.find((d) => (Array.isArray(w[d.key]) ? w[d.key].length : 0) > 0)?.key;
        setExpandedDay(firstEnabled || 1);
    }, [value]);

    const slotMinutes = draft?.slotMinutes ?? 50;
    const bufferMinutes = showBuffer ? (draft?.bufferMinutes ?? 0) : 0;
    const week = draft?.week || {};

    const update = (next) => {
        const safeNext = showBuffer ? next : { ...next, bufferMinutes: 0 };
        setDraft(safeNext);
        if (typeof onChange === "function") onChange(safeNext);
    };

    const normalizeDay = (dayKey, intervals) => {
        const sorted = sortIntervals(intervals);
        // убираем пустые/битые интервалы
        return sorted.filter((x) => x && x.start && x.end);
    };

    const addInterval = (dayKey) => {
        const cur = Array.isArray(week[dayKey]) ? week[dayKey] : [];
        const norm = normalizeDay(dayKey, cur);
        let start = "10:00";
        let end = "18:00";

        if (norm.length > 0) {
            const last = norm[norm.length - 1];
            start = last?.end || start;
            // по умолчанию +2 часа
            const endMins = Math.min(24 * 60 - 1, parseTimeToMinutes(start) + 120);
            end = minutesToTime(endMins);
            if (parseTimeToMinutes(start) >= parseTimeToMinutes(end)) {
                start = "10:00";
                end = "18:00";
            }
        }

        update({
            ...draft,
            week: {
                ...week,
                [dayKey]: normalizeDay(dayKey, [...norm, { start, end }]),
            },
        });
        setExpandedDay(dayKey);
    };

    const removeInterval = (dayKey, idx) => {
        const cur = Array.isArray(week[dayKey]) ? week[dayKey] : [];
        update({
            ...draft,
            week: {
                ...week,
                [dayKey]: normalizeDay(dayKey, cur.filter((_, i) => i !== idx)),
            },
        });
    };

    const changeInterval = (dayKey, idx, field, val) => {
        const cur = Array.isArray(week[dayKey]) ? week[dayKey] : [];
        const next = normalizeDay(
            dayKey,
            cur.map((it, i) => (i === idx ? { ...it, [field]: val } : it))
        );
        update({
            ...draft,
            week: {
                ...week,
                [dayKey]: next,
            },
        });
    };

    const toggleDay = (dayKey, enabled) => {
        update({
            ...draft,
            week: {
                ...week,
                [dayKey]: enabled ? [{ start: "10:00", end: "18:00" }] : [],
            },
        });
        if (enabled) setExpandedDay(dayKey);
    };

    const copyDay = (dayKey) => {
        const cur = Array.isArray(week[dayKey]) ? week[dayKey] : [];
        const norm = normalizeDay(dayKey, cur);
        setClipboard(clone(norm));
        setJustCopiedDay(dayKey);
        window.clearTimeout(copyDay._t);
        copyDay._t = window.setTimeout(() => setJustCopiedDay(null), 1100);
    };

    const pasteDay = (dayKey) => {
        if (!clipboard || !Array.isArray(clipboard) || clipboard.length === 0) return;
        update({
            ...draft,
            week: {
                ...week,
                [dayKey]: normalizeDay(dayKey, clone(clipboard)),
            },
        });
        setExpandedDay(dayKey);
    };

    const daySummary = (intervals) => {
        const norm = normalizeDay("_", intervals);
        if (!norm.length) return "Выходной";
        return norm.map((x) => `${x.start}–${x.end}`).join(", ");
    };

    const diagnostics = useMemo(() => {
        const byDay = {};
        let hasErrors = false;

        for (const d of DAYS) {
            const intervals = normalizeDay(d.key, Array.isArray(week[d.key]) ? week[d.key] : []);

            const issues = [];
            for (const it of intervals) {
                if (parseTimeToMinutes(it.start) >= parseTimeToMinutes(it.end)) {
                    issues.push("Время окончания должно быть позже начала");
                    break;
                }
            }

            for (let i = 0; i < intervals.length - 1; i++) {
                const a = intervals[i];
                const b = intervals[i + 1];
                if (parseTimeToMinutes(a.end) > parseTimeToMinutes(b.start)) {
                    issues.push("Интервалы пересекаются");
                    break;
                }
            }

            const dayHasErrors = issues.length > 0;
            if (dayHasErrors) hasErrors = true;

            byDay[d.key] = {
                intervals,
                summary: daySummary(intervals),
                issues,
                hasErrors: dayHasErrors,
            };
        }

        return { byDay, hasErrors };
    }, [week]);

    const save = async () => {
        if (typeof onSave === "function") await onSave(draft);
    };

    const enabledDaysCount = useMemo(() => {
        return DAYS.filter((d) => (Array.isArray(week[d.key]) ? week[d.key].length : 0) > 0).length;
    }, [week]);

    return (
        <div className="b-schedule-editor">
            <div className="b-schedule-editor__card">
                <div className="b-schedule-editor__title">График работы</div>
                <div className="b-schedule-editor__subtitle">
                    Настройте недельный шаблон — из него автоматически формируются свободные слоты.
                </div>

                <div className="b-schedule-editor__row">
                    <label className="b-field">
                        <div className="b-field__label">Длительность сессии (мин)</div>
                        <input
                            className="b-input"
                            type="number"
                            min={15}
                            step={5}
                            value={slotMinutes}
                            onChange={(e) => update({ ...draft, slotMinutes: parseInt(e.target.value || "0", 10) || 50 })}
                        />
                    </label>
                    {showBuffer ? (
                        <label className="b-field">
                            <div className="b-field__label">Буфер между сессиями (мин)</div>
                            <input
                                className="b-input"
                                type="number"
                                min={0}
                                step={5}
                                value={bufferMinutes}
                                onChange={(e) =>
                                    update({ ...draft, bufferMinutes: parseInt(e.target.value || "0", 10) || 0 })
                                }
                            />
                        </label>
                    ) : null}
                </div>

                <div className="b-schedule-editor__days">
                    {DAYS.map((d) => {
                        const day = diagnostics.byDay[d.key];
                        const intervals = day?.intervals || [];
                        const enabled = intervals.length > 0;
                        const open = expandedDay === d.key && enabled;
                        const issues = day?.issues || [];
                        const hasErrors = !!day?.hasErrors;

                        return (
                            <div
                                key={d.key}
                                className={`b-schedule-editor__day ${enabled ? "is-enabled" : "is-disabled"} ${open ? "is-open" : ""} ${
                                    hasErrors ? "has-errors" : ""
                                }`}
                            >
                                <button
                                    type="button"
                                    className="b-schedule-editor__day-head"
                                    onClick={() => {
                                        if (!enabled) return;
                                        setExpandedDay(open ? null : d.key);
                                    }}
                                >
                                    <div className="b-schedule-editor__day-left">
                                        <div className="b-schedule-editor__day-name">
                                            <span className="b-chip">{d.short}</span>
                                            {d.label}
                                            {hasErrors ? <span className="b-schedule-editor__warn" title={issues[0] || "Ошибка"} /> : null}
                                        </div>
                                        <div className="b-schedule-editor__summary">
                                            {enabled ? day?.summary : "Выходной"}
                                        </div>
                                    </div>

                                    <div className="b-schedule-editor__day-actions" onClick={(e) => e.stopPropagation()}>
                                        {enabled ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="b-schedule-editor__mini-btn"
                                                    onClick={() => addInterval(d.key)}
                                                    title="Добавить интервал"
                                                >
                                                    +
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`b-schedule-editor__mini-btn ${justCopiedDay === d.key ? "is-ok" : ""}`}
                                                    onClick={() => copyDay(d.key)}
                                                    title="Копировать интервалы"
                                                >
                                                    {justCopiedDay === d.key ? "✓" : "⎘"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`b-schedule-editor__mini-btn ${clipboard?.length ? "" : "is-disabled"}`}
                                                    onClick={() => pasteDay(d.key)}
                                                    title={clipboard?.length ? "Вставить интервалы" : "Сначала скопируйте любой день"}
                                                    disabled={!clipboard?.length}
                                                >
                                                    ⎀
                                                </button>
                                            </>
                                        ) : null}

                                        <label className="b-switch" title={enabled ? "Сделать выходным" : "Включить день"}>
                                            <input
                                                type="checkbox"
                                                checked={enabled}
                                                onChange={(e) => toggleDay(d.key, e.target.checked)}
                                            />
                                            <span className="b-switch__ui" />
                                        </label>

                                        <span className="b-schedule-editor__caret" aria-hidden="true">
                                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 1L5 5L9 1" stroke="#313235" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    </div>
                                </button>

                                <div className="b-schedule-editor__day-body">
                                    <div className="b-schedule-editor__day-body-inner">
                                        {enabled ? (
                                            <>
                                                {issues.length > 0 ? (
                                                    <div className="b-schedule-editor__issues">
                                                        {issues.map((t, i) => (
                                                            <div key={i} className="b-schedule-editor__issue">
                                                                {t}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null}

                                                <div className="b-schedule-editor__intervals">
                                                    {intervals.map((it, idx) => {
                                                        const startM = parseTimeToMinutes(it.start);
                                                        const endM = parseTimeToMinutes(it.end);
                                                        const invalid = startM >= endM;
                                                        return (
                                                            <div key={idx} className="b-schedule-editor__interval">
                                                                <input
                                                                    className={`b-input ${invalid ? "is-error" : ""}`}
                                                                    type="time"
                                                                    value={it.start}
                                                                    onChange={(e) => changeInterval(d.key, idx, "start", e.target.value)}
                                                                />
                                                                <span className="b-schedule-editor__dash">—</span>
                                                                <input
                                                                    className={`b-input ${invalid ? "is-error" : ""}`}
                                                                    type="time"
                                                                    value={it.end}
                                                                    onChange={(e) => changeInterval(d.key, idx, "end", e.target.value)}
                                                                />

                                                                <button
                                                                    type="button"
                                                                    className="b-icon-btn"
                                                                    onClick={() => removeInterval(d.key, idx)}
                                                                    title="Удалить интервал"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        );
                                                    })}

                                                    <button
                                                        type="button"
                                                        className="b-btn b-btn--transparent"
                                                        onClick={() => addInterval(d.key)}
                                                    >
                                                        + Добавить интервал
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="b-schedule-editor__disabled">Выходной день</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="b-schedule-editor__foot">
                    <div className="b-schedule-editor__meta">Активных дней: {enabledDaysCount}/7</div>
                    <button
                        className={`b-btn ${saving ? "is-loading" : ""}`}
                        type="button"
                        onClick={save}
                        disabled={!!saving || diagnostics.hasErrors}
                        aria-busy={!!saving}
                    >
                        {saving ? <span className="b-btn__spinner" aria-hidden="true" /> : null}
                        {diagnostics.hasErrors ? "Исправьте ошибки" : saving ? "Сохранение…" : "Сохранить график"}
                    </button>
                </div>

                <div className="b-schedule-editor__note">
                    Подсказка: чтобы добавить отпуск/выходной на конкретную дату — кликните по дню в календаре справа.
                </div>
            </div>
        </div>
    );
}
