import React, { useCallback, useEffect, useMemo, useState } from "react";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import ruLocale from "@fullcalendar/core/locales/ru";

import { useAuth } from "../../auth/authStore";
import { useWs } from "../../ws/wsStore";
import { sessionsApi } from "../../api/sessionsApi";
import Modal from "../ui/Modal";
import {
    addMinutes,
    buildSlotEvents,
    dateToYmd,
    normalizeBookingToEvent,
    normalizeDayOffToEvent,
} from "./calendarUtils";

// FullCalendar v6+ сам инжектит базовые стили (без ручных импортов CSS).
// Если понадобится явное подключение CSS — лучше подключить через public (CDN/локально),
// потому что deep-import вида "@fullcalendar/*/index.css" может быть заблокирован exports-политикой пакетов.

export default function BookingCalendar({
                                            psychologist,
                                            mode = "CLIENT", // CLIENT | PSYCHO
                                            schedule: scheduleOverride,
                                            allowDayOff = false,
                                            onBooked,
                                        }) {
    const { me, role } = useAuth();
    const { connected: wsConnected, subscribe: wsSubscribe } = useWs();
    const effectiveRole = mode === "PSYCHO" ? "PSYCHOLOGIST" : role;

    const psyId = psychologist?.id;

    const [viewType, setViewType] = useState("timeGridWeek");
    const [range, setRange] = useState(null); // {from,to} YYYY-MM-DD

    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState(null);
    const [dayOffs, setDayOffs] = useState([]);
    const [bookings, setBookings] = useState([]);

    const [slotModal, setSlotModal] = useState(null); // {start,end}
    const [bookingModal, setBookingModal] = useState(null); // booking
    const [dayOffModal, setDayOffModal] = useState(null); // {date, reason, existing?}
    const [saving, setSaving] = useState(false);

    const canBook = effectiveRole === "CLIENT" || effectiveRole === "ADMIN";
    const canManage = effectiveRole === "PSYCHOLOGIST" || effectiveRole === "ADMIN";

    // загрузка данных по текущему диапазону
    const load = useCallback(async () => {
        if (!psyId || !range) return;
        setLoading(true);
        try {
            const [sc, offs, bks] = await Promise.all([
                scheduleOverride ? Promise.resolve(scheduleOverride) : sessionsApi.getSchedule(psyId),
                sessionsApi.listDayOffs(psyId, range),
                sessionsApi.listBookings(psyId, range),
            ]);
            if (!scheduleOverride) setSchedule(sc);
            setDayOffs(Array.isArray(offs) ? offs : []);
            setBookings(Array.isArray(bks) ? bks : []);
        } finally {
            setLoading(false);
        }
    }, [psyId, range, scheduleOverride]);

    useEffect(() => {
        load();
    }, [load]);

    // WS: live updates for current psychologist calendar
    // Backend should broadcast any changes (bookings/day-offs/schedule) to:
    // /topic/booking/psychologist/{psyId}
    useEffect(() => {
        if (!wsConnected || !psyId) return;
        const topic = `/topic/booking/psychologist/${psyId}`;
        return wsSubscribe(topic, (evt) => {
            // simplest & safest: reload for current range
            // (you can micro-optimize later by patching local state based on evt.type)
            if (range) load();
        });
    }, [wsConnected, wsSubscribe, psyId, range, load]);

    useEffect(() => {
        if (scheduleOverride) setSchedule(scheduleOverride);
    }, [scheduleOverride]);

    const events = useMemo(() => {
        if (!psyId) return [];
        const sc = scheduleOverride || schedule;

        const bookingEvents = (bookings || []).map((b) => normalizeBookingToEvent(b, { role: effectiveRole }));
        const dayOffEvents = (dayOffs || []).map((d) => normalizeDayOffToEvent(d));

        // слоты показываем только в timeGrid (иначе на месяце будет слишком шумно)
        const slotEvents =
            sc && range && String(viewType).startsWith("timeGrid")
                ? buildSlotEvents({
                    rangeStart: new Date(`${range.from}T00:00:00`),
                    rangeEnd: new Date(new Date(`${range.to}T00:00:00`).getTime() + 24 * 60 * 60 * 1000),
                    schedule: sc,
                    dayOffs,
                    bookings,
                })
                : [];

        return [...dayOffEvents, ...slotEvents, ...bookingEvents];
    }, [psyId, schedule, scheduleOverride, dayOffs, bookings, range, viewType, effectiveRole]);

    const onDatesSet = (arg) => {
        setViewType(arg.view.type);
        const from = dateToYmd(arg.start);
        // FullCalendar отдаёт endExclusive
        const endInclusive = new Date(arg.end);
        endInclusive.setDate(endInclusive.getDate() - 1);
        const to = dateToYmd(endInclusive);
        setRange({ from, to });
    };

    const onEventClick = (info) => {
        const kind = info.event.extendedProps?.kind;
        if (kind === "SLOT") {
            if (!canBook) return;
            setSlotModal({ start: info.event.start, end: info.event.end });
            return;
        }
        if (kind === "DAYOFF") {
            if (!canManage) return;
            const raw = info.event.extendedProps?.raw;
            const date = raw?.date;
            const reason = raw?.reason || "";
            const id = raw?.id;
            setDayOffModal({ date, reason, existingId: id });
            return;
        }
        if (kind === "BOOKING") {
            setBookingModal(info.event.extendedProps?.booking || null);
        }
    };

    const onDateClick = (arg) => {
        if (!allowDayOff || !canManage) return;
        // удобнее добавлять day-off в месячном/дневном представлении
        const date = dateToYmd(arg.date);
        const existing = (dayOffs || []).find((x) => x.date === date);
        setDayOffModal({ date, reason: existing?.reason || "", existingId: existing?.id || null });
    };

    const doBook = async () => {
        if (!slotModal || !psyId) return;
        if (!me?.id && effectiveRole !== "ADMIN") return;

        setSaving(true);
        try {
            const created = await sessionsApi.createBooking(psyId, {
                clientId: me?.id || null,
                startDateTime: slotModal.start,
                endDateTime: slotModal.end,
                priceAtTime: psychologist?.priceAtTime ?? null,
            });

            // обновим локально, чтобы не ждать перезагрузки
            setBookings((prev) => [...(prev || []), created]);
            setSlotModal(null);
            if (typeof onBooked === "function") onBooked(created);
        } finally {
            setSaving(false);
        }
    };

    const saveDayOff = async () => {
        if (!dayOffModal || !psyId) return;
        setSaving(true);
        try {
            if (dayOffModal.existingId) {
                // если день уже есть — просто перезапишем через createDayOff (fallback делает merge по date)
                await sessionsApi.createDayOff(psyId, { date: dayOffModal.date, reason: dayOffModal.reason });
            } else {
                await sessionsApi.createDayOff(psyId, { date: dayOffModal.date, reason: dayOffModal.reason });
            }
            setDayOffModal(null);
            await load();
        } finally {
            setSaving(false);
        }
    };

    const deleteDayOff = async () => {
        if (!dayOffModal?.existingId || !psyId) return;
        setSaving(true);
        try {
            await sessionsApi.deleteDayOff(psyId, dayOffModal.existingId);
            setDayOffModal(null);
            await load();
        } finally {
            setSaving(false);
        }
    };

    const pretty = (d) => {
        const dt = new Date(d);
        return dt.toLocaleString("ru-RU", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (!psyId) {
        return (
            <div className="b-calendar__empty">
                <h3>Выберите психолога</h3>
                <p>Чтобы показать свободные слоты, сначала выберите специалиста слева.</p>
            </div>
        );
    }

    return (
        <div className={`b-calendar ${loading ? "is-loading" : ""}`}>
            <div className="b-calendar__head">
                <div>
                    <div className="b-calendar__title">Календарь сессий</div>
                    <div className="b-calendar__subtitle">
                        {psychologist?.name ? psychologist.name : `Психолог #${psyId}`}
                        {mode === "PSYCHO" ? " — настройка графика" : " — запись"}
                    </div>
                </div>

                <div className="b-calendar__legend">
                    <span className="b-badge b-badge--slot">Свободно</span>
                    <span className="b-badge b-badge--booking">Занято</span>
                    <span className="b-badge b-badge--dayoff">Выходной</span>
                </div>
            </div>

            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                locale={ruLocale}
                firstDay={1}
                height="auto"
                nowIndicator
                selectable={false}
                slotMinTime="07:00:00"
                slotMaxTime="23:00:00"
                allDaySlot={false}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "timeGridDay,timeGridWeek,dayGridMonth,listWeek",
                }}
                buttonText={{
                    today: "Сегодня",
                    month: "Месяц",
                    week: "Неделя",
                    day: "День",
                    list: "Список",
                }}
                datesSet={onDatesSet}
                events={events}
                eventClick={onEventClick}
                dateClick={onDateClick}
                eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
                displayEventEnd
            />

            <Modal
                open={!!slotModal}
                title="Запись на сессию"
                onClose={() => (saving ? null : setSlotModal(null))}
                actions={
                    <>
                        <button className="b-btn b-btn--transparent" onClick={() => setSlotModal(null)} disabled={saving}>
                            Отмена
                        </button>
                        <button className="b-btn" onClick={doBook} disabled={saving}>
                            Подтвердить
                        </button>
                    </>
                }
            >
                {slotModal ? (
                    <div className="b-modal__grid">
                        <div className="b-modal__row">
                            <div className="b-modal__label">Слот</div>
                            <div className="b-modal__value">
                                {pretty(slotModal.start)} — {new Date(slotModal.end).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        </div>
                        <div className="b-modal__row">
                            <div className="b-modal__label">Статус</div>
                            <div className="b-modal__value">PENDING_PAYMENT</div>
                        </div>
                        <div className="b-modal__hint">
                            После подтверждения будет создана бронь. Дальше можно подключить оплату и переводить статус в CONFIRMED.
                        </div>
                    </div>
                ) : null}
            </Modal>

            <Modal
                open={!!bookingModal}
                title="Детали сессии"
                onClose={() => setBookingModal(null)}
                actions={<button className="b-btn b-btn--transparent" onClick={() => setBookingModal(null)}>Закрыть</button>}
            >
                {bookingModal ? (
                    <div className="b-modal__grid">
                        <div className="b-modal__row">
                            <div className="b-modal__label">Время</div>
                            <div className="b-modal__value">
                                {pretty(bookingModal.startDateTime)} — {new Date(bookingModal.endDateTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        </div>
                        <div className="b-modal__row">
                            <div className="b-modal__label">Статус</div>
                            <div className="b-modal__value">{bookingModal.status}</div>
                        </div>
                        {bookingModal.priceAtTime != null ? (
                            <div className="b-modal__row">
                                <div className="b-modal__label">Цена</div>
                                <div className="b-modal__value">{bookingModal.priceAtTime} ₽</div>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </Modal>

            <Modal
                open={!!dayOffModal}
                title={dayOffModal?.existingId ? "Выходной (редактирование)" : "Добавить выходной"}
                onClose={() => (saving ? null : setDayOffModal(null))}
                actions={
                    <>
                        {dayOffModal?.existingId ? (
                            <button className="b-btn b-btn--transparent" onClick={deleteDayOff} disabled={saving}>
                                Удалить
                            </button>
                        ) : null}
                        <button className="b-btn" onClick={saveDayOff} disabled={saving}>
                            Сохранить
                        </button>
                    </>
                }
            >
                {dayOffModal ? (
                    <div className="b-modal__grid">
                        <div className="b-modal__row">
                            <div className="b-modal__label">Дата</div>
                            <div className="b-modal__value">{dayOffModal.date}</div>
                        </div>
                        <div className="b-modal__row">
                            <div className="b-modal__label">Причина</div>
                            <div className="b-modal__value">
                                <input
                                    className="b-input"
                                    value={dayOffModal.reason}
                                    placeholder="Например: отпуск / болезнь / конференция"
                                    onChange={(e) => setDayOffModal((s) => ({ ...s, reason: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="b-modal__hint">Кликните по дню в календаре, чтобы добавить/изменить выходной.</div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
