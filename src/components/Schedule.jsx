import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/authStore";
import { sessionsApi } from "../api/sessionsApi";

import WeeklyScheduleEditor from "./calendar/WeeklyScheduleEditor";
import BookingCalendar from "./calendar/BookingCalendar";
import Modal from "./ui/Modal";

const DOW = [
    { key: "MONDAY", label: "Понедельник", short: "Пн" },
    { key: "TUESDAY", label: "Вторник", short: "Вт" },
    { key: "WEDNESDAY", label: "Среда", short: "Ср" },
    { key: "THURSDAY", label: "Четверг", short: "Чт" },
    { key: "FRIDAY", label: "Пятница", short: "Пт" },
    { key: "SATURDAY", label: "Суббота", short: "Сб" },
    { key: "SUNDAY", label: "Воскресенье", short: "Вс" },
];

const DOW_ORDER = Object.fromEntries(DOW.map((d, idx) => [d.key, idx + 1]));

function hhmm(t) {
    if (!t) return "00:00";
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
}

function breakLabel(br) {
    const start = hhmm(br.startTime);
    const end = hhmm(br.endTime);
    if (br.date) return `${br.date} • ${start}–${end}`;
    const dow = DOW.find((d) => d.key === String(br.dayOfWeek || "").toUpperCase());
    return `${dow?.short || br.dayOfWeek} • ${start}–${end}`;
}

export default function Schedule() {
    const { booting, me, role } = useAuth();
    const isPsy = role === "PSYCHOLOGIST" || role === "ADMIN";
    const psyId = me?.id;

    const [loading, setLoading] = useState(true);
    const [savingSchedule, setSavingSchedule] = useState(false);

    const [schedule, setSchedule] = useState(null);
    const [scheduleDraft, setScheduleDraft] = useState(null);

    const [breaks, setBreaks] = useState([]);
    const [breakModal, setBreakModal] = useState(null);
    const [savingBreak, setSavingBreak] = useState(false);

    const [reloadToken, setReloadToken] = useState(0);
    const bumpReload = useCallback(() => setReloadToken((x) => x + 1), []);

    const loadAll = useCallback(async () => {
        if (!psyId || !isPsy) return;
        setLoading(true);
        try {
            const [sc, brs] = await Promise.all([
                sessionsApi.getSchedule(psyId),
                sessionsApi.listWorkBreaks(psyId),
            ]);
            setSchedule(sc);
            setScheduleDraft(sc);
            setBreaks(Array.isArray(brs) ? brs : []);
        } finally {
            setLoading(false);
        }
    }, [psyId, isPsy]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const groupedBreaks = useMemo(() => {
        const repeating = [];
        const dated = [];
        for (const b of breaks || []) {
            if (b?.date) dated.push(b);
            else repeating.push(b);
        }
        repeating.sort((a, b) => {
            const ao = DOW_ORDER[String(a?.dayOfWeek || "").toUpperCase()] || 99;
            const bo = DOW_ORDER[String(b?.dayOfWeek || "").toUpperCase()] || 99;
            if (ao !== bo) return ao - bo;
            return hhmm(a?.startTime).localeCompare(hhmm(b?.startTime));
        });
        dated.sort((a, b) => {
            const ad = String(a?.date || "");
            const bd = String(b?.date || "");
            if (ad !== bd) return ad.localeCompare(bd);
            return hhmm(a?.startTime).localeCompare(hhmm(b?.startTime));
        });
        return { repeating, dated };
    }, [breaks]);

    const openNewBreak = () => {
        setBreakModal({
            id: null,
            kind: "WEEK", // WEEK | DATE
            dayOfWeek: "MONDAY",
            date: "",
            startTime: "13:00",
            endTime: "14:00",
        });
    };

    const openEditBreak = (br) => {
        setBreakModal({
            id: br?.id ?? null,
            kind: br?.date ? "DATE" : "WEEK",
            dayOfWeek: String(br?.dayOfWeek || "MONDAY").toUpperCase(),
            date: br?.date || "",
            startTime: hhmm(br?.startTime),
            endTime: hhmm(br?.endTime),
        });
    };

    const breakIsValid = useMemo(() => {
        if (!breakModal) return false;
        const start = hhmm(breakModal.startTime);
        const end = hhmm(breakModal.endTime);
        if (!start || !end) return false;
        if (start >= end) return false;
        if (breakModal.kind === "DATE") return Boolean(breakModal.date);
        return Boolean(breakModal.dayOfWeek);
    }, [breakModal]);

    const saveBreak = async () => {
        if (!breakModal || !psyId || !breakIsValid) return;
        setSavingBreak(true);
        try {
            const payload = {
                id: breakModal.id,
                date: breakModal.kind === "DATE" ? breakModal.date : null,
                dayOfWeek: breakModal.kind === "WEEK" ? breakModal.dayOfWeek : null,
                startTime: breakModal.startTime,
                endTime: breakModal.endTime,
            };
            await sessionsApi.upsertWorkBreak(psyId, payload);
            const brs = await sessionsApi.listWorkBreaks(psyId);
            setBreaks(Array.isArray(brs) ? brs : []);
            setBreakModal(null);
            bumpReload();
        } finally {
            setSavingBreak(false);
        }
    };

    const deleteBreak = async (br) => {
        if (!psyId || !br?.id) return;
        // eslint-disable-next-line no-restricted-globals
        const ok = confirm(`Удалить перерыв\n${breakLabel(br)}?`);
        if (!ok) return;

        setSavingBreak(true);
        try {
            await sessionsApi.deleteWorkBreak(psyId, br.id);
            const brs = await sessionsApi.listWorkBreaks(psyId);
            setBreaks(Array.isArray(brs) ? brs : []);
            bumpReload();
        } finally {
            setSavingBreak(false);
        }
    };

    const saveSchedule = async (next) => {
        if (!psyId) return;
        setSavingSchedule(true);
        try {
            const saved = await sessionsApi.upsertSchedule(psyId, {
                ...next,
                // буфер пока через WorkBreak
                bufferMinutes: 0,
            });
            setSchedule(saved);
            setScheduleDraft(saved);
            bumpReload();
        } finally {
            setSavingSchedule(false);
        }
    };

    if (booting) return null;
    if (!isPsy) {
        return (
            <div className="b-card" style={{ background: "#fff", borderRadius: 18, padding: 20, border: "1px solid rgba(210,215,219,.55)" }}>
                Эта вкладка доступна только психологу.
            </div>
        );
    }

    const psychologist = { id: psyId, name: me?.name || me?.email || "Психолог" };

    return (
        <div className="b-psy-schedule">
            <div className="b-psy-schedule__left">
                <WeeklyScheduleEditor
                    value={schedule}
                    onChange={setScheduleDraft}
                    onSave={saveSchedule}
                    saving={savingSchedule}
                    showBuffer={false}
                />

                <div className="b-breaks__card">
                    <div className="b-breaks__head">
                        <div>
                            <div className="b-breaks__title">Перерывы</div>
                            <div className="b-breaks__subtitle">
                                Перерывы блокируют запись внутри рабочего дня (например, обед, супервизия).
                            </div>
                        </div>
                        <button type="button" className="b-btn" onClick={openNewBreak} disabled={savingBreak}>
                            + Перерыв
                        </button>
                    </div>

                    {loading ? (
                        <div className="b-breaks__empty">Загрузка…</div>
                    ) : (
                        <div className="b-breaks__lists">
                            <div className="b-breaks__block">
                                <div className="b-breaks__block-title">Регулярные</div>
                                {groupedBreaks.repeating.length ? (
                                    <div className="b-breaks__list">
                                        {groupedBreaks.repeating.map((b) => (
                                            <div key={b.id} className="b-breaks__item">
                                                <div className="b-breaks__item-label">{breakLabel(b)}</div>
                                                <div className="b-breaks__item-actions">
                                                    <button type="button" className="b-icon-btn" onClick={() => openEditBreak(b)} title="Редактировать">
                                                        ✎
                                                    </button>
                                                    <button type="button" className="b-icon-btn" onClick={() => deleteBreak(b)} title="Удалить">
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="b-breaks__empty">Нет</div>
                                )}
                            </div>

                            <div className="b-breaks__block">
                                <div className="b-breaks__block-title">Разовые (по датам)</div>
                                {groupedBreaks.dated.length ? (
                                    <div className="b-breaks__list">
                                        {groupedBreaks.dated.map((b) => (
                                            <div key={b.id} className="b-breaks__item">
                                                <div className="b-breaks__item-label">{breakLabel(b)}</div>
                                                <div className="b-breaks__item-actions">
                                                    <button type="button" className="b-icon-btn" onClick={() => openEditBreak(b)} title="Редактировать">
                                                        ✎
                                                    </button>
                                                    <button type="button" className="b-icon-btn" onClick={() => deleteBreak(b)} title="Удалить">
                                                        ×
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="b-breaks__empty">Нет</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="b-psy-schedule__right">
                <BookingCalendar
                    psychologist={psychologist}
                    mode="PSYCHO"
                    schedule={scheduleDraft}
                    allowDayOff
                    reloadToken={reloadToken}
                />
            </div>

            <Modal
                open={!!breakModal}
                title={breakModal?.id ? "Редактировать перерыв" : "Добавить перерыв"}
                onClose={() => (savingBreak ? null : setBreakModal(null))}
                actions={
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <button type="button" className="b-btn b-btn--transparent" onClick={() => setBreakModal(null)} disabled={savingBreak}>
                            Отмена
                        </button>
                        <button type="button" className="b-btn" onClick={saveBreak} disabled={!breakIsValid || savingBreak}>
                            Сохранить
                        </button>
                    </div>
                }
            >
                {breakModal ? (
                    <div className="b-breaks__form">
                        <label className="b-field">
                            <div className="b-field__label">Тип перерыва</div>
                            <select
                                className="b-input"
                                value={breakModal.kind}
                                onChange={(e) => setBreakModal((prev) => ({ ...prev, kind: e.target.value }))}
                                disabled={savingBreak}
                            >
                                <option value="WEEK">Регулярный (по дню недели)</option>
                                <option value="DATE">Разовый (по дате)</option>
                            </select>
                        </label>

                        {breakModal.kind === "DATE" ? (
                            <label className="b-field">
                                <div className="b-field__label">Дата</div>
                                <input
                                    className="b-input"
                                    type="date"
                                    value={breakModal.date}
                                    onChange={(e) => setBreakModal((prev) => ({ ...prev, date: e.target.value }))}
                                    disabled={savingBreak}
                                />
                            </label>
                        ) : (
                            <label className="b-field">
                                <div className="b-field__label">День недели</div>
                                <select
                                    className="b-input"
                                    value={breakModal.dayOfWeek}
                                    onChange={(e) => setBreakModal((prev) => ({ ...prev, dayOfWeek: e.target.value }))}
                                    disabled={savingBreak}
                                >
                                    {DOW.map((d) => (
                                        <option key={d.key} value={d.key}>
                                            {d.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <div className="b-breaks__form-row">
                            <label className="b-field">
                                <div className="b-field__label">Начало</div>
                                <input
                                    className="b-input"
                                    type="time"
                                    value={breakModal.startTime}
                                    onChange={(e) => setBreakModal((prev) => ({ ...prev, startTime: e.target.value }))}
                                    disabled={savingBreak}
                                />
                            </label>
                            <label className="b-field">
                                <div className="b-field__label">Конец</div>
                                <input
                                    className="b-input"
                                    type="time"
                                    value={breakModal.endTime}
                                    onChange={(e) => setBreakModal((prev) => ({ ...prev, endTime: e.target.value }))}
                                    disabled={savingBreak}
                                />
                            </label>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
