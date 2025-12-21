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

export default function WeeklyScheduleEditor({ value, onChange, onSave, saving }) {
    const [draft, setDraft] = useState(() => clone(value));

    // если value поменяли снаружи (загрузка), обновим draft один раз
    React.useEffect(() => {
        setDraft(clone(value));
    }, [value]);

    const slotMinutes = draft?.slotMinutes ?? 50;
    const bufferMinutes = draft?.bufferMinutes ?? 10;
    const week = draft?.week || {};

    const update = (next) => {
        setDraft(next);
        if (typeof onChange === "function") onChange(next);
    };

    const addInterval = (dayKey) => {
        const cur = Array.isArray(week[dayKey]) ? week[dayKey] : [];
        update({
            ...draft,
            week: {
                ...week,
                [dayKey]: [...cur, { start: "10:00", end: "18:00" }],
            },
        });
    };

    const removeInterval = (dayKey, idx) => {
        const cur = Array.isArray(week[dayKey]) ? week[dayKey] : [];
        update({
            ...draft,
            week: {
                ...week,
                [dayKey]: cur.filter((_, i) => i !== idx),
            },
        });
    };

    const changeInterval = (dayKey, idx, field, val) => {
        const cur = Array.isArray(week[dayKey]) ? week[dayKey] : [];
        const next = cur.map((it, i) => (i === idx ? { ...it, [field]: val } : it));
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
    };

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
                    <label className="b-field">
                        <div className="b-field__label">Буфер между сессиями (мин)</div>
                        <input
                            className="b-input"
                            type="number"
                            min={0}
                            step={5}
                            value={bufferMinutes}
                            onChange={(e) => update({ ...draft, bufferMinutes: parseInt(e.target.value || "0", 10) || 0 })}
                        />
                    </label>
                </div>

                <div className="b-schedule-editor__days">
                    {DAYS.map((d) => {
                        const intervals = Array.isArray(week[d.key]) ? week[d.key] : [];
                        const enabled = intervals.length > 0;

                        return (
                            <div key={d.key} className="b-schedule-editor__day">
                                <div className="b-schedule-editor__day-head">
                                    <div className="b-schedule-editor__day-name">
                                        <span className="b-chip">{d.short}</span>
                                        {d.label}
                                    </div>

                                    <label className="b-switch">
                                        <input
                                            type="checkbox"
                                            checked={enabled}
                                            onChange={(e) => toggleDay(d.key, e.target.checked)}
                                        />
                                        <span className="b-switch__ui" />
                                    </label>
                                </div>

                                {enabled ? (
                                    <div className="b-schedule-editor__intervals">
                                        {intervals.map((it, idx) => (
                                            <div key={idx} className="b-schedule-editor__interval">
                                                <input
                                                    className="b-input"
                                                    type="time"
                                                    value={it.start}
                                                    onChange={(e) => changeInterval(d.key, idx, "start", e.target.value)}
                                                />
                                                <span className="b-schedule-editor__dash">—</span>
                                                <input
                                                    className="b-input"
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
                                        ))}

                                        <button type="button" className="b-btn b-btn--transparent" onClick={() => addInterval(d.key)}>
                                            + Добавить интервал
                                        </button>
                                    </div>
                                ) : (
                                    <div className="b-schedule-editor__disabled">Выходной день</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="b-schedule-editor__foot">
                    <div className="b-schedule-editor__meta">Активных дней: {enabledDaysCount}/7</div>
                    <button className="b-btn" type="button" onClick={save} disabled={!!saving}>
                        Сохранить график
                    </button>
                </div>

                <div className="b-schedule-editor__note">
                    Подсказка: чтобы добавить отпуск/выходной на конкретную дату — кликните по дню в календаре справа.
                </div>
            </div>
        </div>
    );
}
