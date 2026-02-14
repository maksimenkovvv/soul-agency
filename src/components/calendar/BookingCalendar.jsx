import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import ruLocale from "@fullcalendar/core/locales/ru";

import { useAuth } from "../../auth/authStore";
import { useWs } from "../../ws/wsStore";
import { sessionsApi } from "../../api/sessionsApi";
import { paymentsApi } from "../../api/paymentsApi";
import Modal from "../ui/Modal";
import { useToast } from "../../ui/toast/ToastProvider";
import {
    buildBreakEvents,
    buildSlotEvents,
    dateToYmd,
    normalizeBookingToEvent,
    normalizeDayOffToEvent,
} from "./calendarUtils";

// ✅ правило: записываться можно только если до старта >= 30 минут
const MIN_BOOK_AHEAD_MIN = 600;
const MIN_BOOK_AHEAD_MS = MIN_BOOK_AHEAD_MIN * 60 * 1000;

// ✅ таймер удержания брони до оплаты
const HOLD_PAYMENT_MIN = 15;
const HOLD_PAYMENT_MS = HOLD_PAYMENT_MIN * 60 * 1000;

/* -------------------- helpers -------------------- */

function pad2(n) {
    return String(n).padStart(2, "0");
}
function formatMMSS(ms) {
    const safeMs = Math.max(0, Number(ms) || 0);
    const totalSec = Math.ceil(safeMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${pad2(m)}:${pad2(s)}`;
}

function isBlockingBookingStatus(status) {
    const s = String(status || "");
    // ✅ OPEN и CANCELLED НЕ блокируют доступность
    return s !== "OPEN" && s !== "CANCELLED";
}

function isVisibleBookingStatusInCalendar(status) {
    const s = String(status || "");
    // ✅ чтобы OPEN/CANCELLED не перекрывали слоты (и не создавали дубль-ивенты)
    return s !== "OPEN" && s !== "CANCELLED";
}

function slotBookable(startDate, nowDate = new Date()) {
    if (!startDate) return false;
    const diff = startDate.getTime() - nowDate.getTime();
    return diff >= MIN_BOOK_AHEAD_MS;
}

function getClientIdFromBooking(b) {
    return (
        b?.clientId ??
        b?.client_id ??
        b?.client?.id ??
        b?.client?.userId ??
        b?.client?.user_id ??
        null
    );
}

// статус брони — красиво
const BOOKING_STATUS_LABELS = {
    PENDING_PAYMENT: "Ожидает оплаты",
    PAID: "Оплачено",
    CANCELLED: "Отменено",
    COMPLETED: "Завершено",
    NO_SHOW: "Неявка",
    OPEN: "Открыто",
};

function prettyBookingStatus(status) {
    const key = String(status || "").toUpperCase();
    return BOOKING_STATUS_LABELS[key] || key || "—";
}

// какие статусы считаем "ожидание оплаты"
function isAwaitingPaymentStatus(status) {
    const s = String(status || "").toUpperCase();
    return s === "PENDING_PAYMENT" || s === "PENDING";
}

function isPaidBookingStatus(status) {
    const s = String(status || "").toUpperCase();
    return s === "PAID" || s === "CONFIRMED" || s === "SUCCEEDED";
}

// ---- remember own bookings / hold / payment-started ----
const OWN_BOOKING_KEY = (bookingId) => `bs:ownBooking:${String(bookingId)}`;
const HOLD_KEY = (bookingId) => `bs:bookingHoldExpiresAt:${String(bookingId)}`;
const PAYMENT_STARTED_KEY = (bookingId) => `bs:bookingPaymentStarted:${String(bookingId)}`;

function rememberOwnBooking(bookingId, userId) {
    try {
        if (!bookingId || !userId) return;
        localStorage.setItem(OWN_BOOKING_KEY(bookingId), String(userId));
    } catch {}
}

function isRememberedOwnBooking(bookingId, userId) {
    try {
        if (!bookingId || !userId) return false;
        return localStorage.getItem(OWN_BOOKING_KEY(bookingId)) === String(userId);
    } catch {
        return false;
    }
}

function rememberHoldExpiresAt(bookingId, expiresAt) {
    try {
        if (!bookingId || !expiresAt) return;
        localStorage.setItem(HOLD_KEY(bookingId), String(expiresAt));
    } catch {}
}

function getRememberedHoldExpiresAt(bookingId) {
    try {
        const raw = localStorage.getItem(HOLD_KEY(bookingId));
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    } catch {
        return null;
    }
}

function clearRememberedHoldExpiresAt(bookingId) {
    try {
        localStorage.removeItem(HOLD_KEY(bookingId));
    } catch {}
}

function rememberPaymentStarted(bookingId) {
    try {
        if (!bookingId) return;
        localStorage.setItem(PAYMENT_STARTED_KEY(bookingId), "1");
    } catch {}
}

function isRememberedPaymentStarted(bookingId) {
    try {
        if (!bookingId) return false;
        return localStorage.getItem(PAYMENT_STARTED_KEY(bookingId)) === "1";
    } catch {
        return false;
    }
}

function clearRememberedPaymentStarted(bookingId) {
    try {
        localStorage.removeItem(PAYMENT_STARTED_KEY(bookingId));
    } catch {}
}

// чистим query после возврата
function clearPaymentQueryParams() {
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete("payment");
        url.searchParams.delete("bookingId");
        url.searchParams.delete("mock");
        url.searchParams.delete("paid");
        window.history.replaceState({}, "", url.pathname + url.search);
    } catch {}
}

function normalizePaymentStatusResponse(res) {
    // ожидаем { bookingId, paymentStatus, bookingStatus }
    // но делаем максимально устойчиво
    const paymentStatus =
        res?.paymentStatus || res?.payment_status || res?.status || null;

    const bookingStatus =
        res?.bookingStatus || res?.booking_status || res?.bookingState || res?.booking_state || null;

    return {
        paymentStatus: paymentStatus ? String(paymentStatus).toUpperCase() : null,
        bookingStatus: bookingStatus ? String(bookingStatus).toUpperCase() : null,
    };
}

export default function BookingCalendar({
                                            psychologist,
                                            mode = "CLIENT", // CLIENT | PSYCHO
                                            schedule: scheduleOverride,
                                            allowDayOff = false,
                                            onBooked,
                                            reloadToken,
                                        }) {
    const { me, role } = useAuth();
    const toast = useToast();
    const { connected: wsConnected, subscribe: wsSubscribe } = useWs();

    const effectiveRole =
        mode === "PSYCHO" ? (role === "ADMIN" ? "ADMIN" : "PSYCHOLOGIST") : role;

    const psyId = psychologist?.id;

    const [viewType, setViewType] = useState("timeGridWeek");
    const [range, setRange] = useState(null); // {from,to} YYYY-MM-DD

    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState(null);
    const [dayOffs, setDayOffs] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [breaks, setBreaks] = useState([]);

    const [bookingModal, setBookingModal] = useState(null); // booking | null
    const [dayOffModal, setDayOffModal] = useState(null);
    const [saving, setSaving] = useState(false);
    const [refunding, setRefunding] = useState(false);

    // ✅ таймер (видимый) для pending брони
    const [holdLeftMs, setHoldLeftMs] = useState(0);
    const paymentStartedRef = useRef(false);
    const autoCancelOnceRef = useRef(false);

    // ✅ платежная UI-информация
    const [paymentUI, setPaymentUI] = useState({
        loading: false,
        checkedOnce: false,
        message: "",
        kind: null, // "info" | "success" | "error"
    });

    // ✅ возврат с оплаты (bookingId из query)
    const [pendingOpenBookingId, setPendingOpenBookingId] = useState(null);
    const paymentReturnShownRef = useRef(false);

    // ✅ тик “текущее время”, чтобы слоты сами становились недоступными по мере времени
    const [nowTick, setNowTick] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNowTick(Date.now()), 30_000);
        return () => clearInterval(id);
    }, []);

    const canBook = effectiveRole === "CLIENT" || effectiveRole === "ADMIN";
    const canManage =
        mode === "PSYCHO" &&
        (effectiveRole === "PSYCHOLOGIST" || effectiveRole === "ADMIN");
    const canManageDayOff = allowDayOff && canManage;

    // загрузка данных
    const load = useCallback(async () => {
        if (!psyId || !range) return;
        setLoading(true);
        try {
            const [sc, offs, bks, brs] = await Promise.all([
                scheduleOverride
                    ? Promise.resolve(scheduleOverride)
                    : sessionsApi.getSchedule(psyId),
                sessionsApi.listDayOffs(psyId, range),
                mode === "CLIENT"
                    ? sessionsApi.listCalendar(psyId, range)
                    : sessionsApi.listBookings(psyId, range),
                sessionsApi.listWorkBreaks(psyId, range),
            ]);

            if (!scheduleOverride) setSchedule(sc);
            setDayOffs(Array.isArray(offs) ? offs : []);
            setBookings(Array.isArray(bks) ? bks : []);
            setBreaks(Array.isArray(brs) ? brs : []);
        } catch (err) {
            console.error("Ошибка загрузки календаря", err);
            toast.error("Не удалось загрузить расписание");
        } finally {
            setLoading(false);
        }
    }, [psyId, range, scheduleOverride, mode, toast]);

    useEffect(() => {
        load();
    }, [load, reloadToken]);

    // WebSocket подписка
    useEffect(() => {
        if (!wsConnected || !psyId) return;
        const topic = `/topic/booking/psychologist/${psyId}`;
        return wsSubscribe(topic, () => {
            if (range) load();
        });
    }, [wsConnected, wsSubscribe, psyId, range, load]);

    useEffect(() => {
        if (scheduleOverride) setSchedule(scheduleOverride);
    }, [scheduleOverride]);

    // ✅ читаем query возврата с оплаты один раз
    useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search);
            const payment = sp.get("payment");
            const bookingId = sp.get("bookingId");
            if (payment === "return" && bookingId) {
                setPendingOpenBookingId(String(bookingId));
            }
        } catch {}
    }, []);

    // ✅ если мы вернулись с оплаты — покажем toast и обновим календарь
    useEffect(() => {
        if (!pendingOpenBookingId) return;

        if (!paymentReturnShownRef.current) {
            paymentReturnShownRef.current = true;
            toast.info("Возврат с оплаты. Проверяем статус брони…");
        }

        if (psyId && range) load();
    }, [pendingOpenBookingId, psyId, range, load, toast]);

    // ✅ открыть модалку ПОСЛЕ загрузки брони (после возврата)
    useEffect(() => {
        if (!pendingOpenBookingId) return;
        if (loading) return;

        const found = (bookings || []).find(
            (b) => String(b?.id) === String(pendingOpenBookingId)
        );
        if (!found) return;

        const rememberedHold = getRememberedHoldExpiresAt(found.id);

        setBookingModal({
            ...found,
            holdExpiresAt: rememberedHold || null,
            fromReturn: true,
        });

        setPaymentUI({
            loading: false,
            checkedOnce: false,
            message: "Оплата проверяется…",
            kind: "info",
        });

        clearPaymentQueryParams();
        setPendingOpenBookingId(null);
    }, [pendingOpenBookingId, loading, bookings]);

    // ✅ брони, которые реально блокируют доступность слота
    const blockingBookings = useMemo(() => {
        return (bookings || []).filter((b) => isBlockingBookingStatus(b?.status));
    }, [bookings]);

    // ✅ определение "моя ли бронь" (строго: только брони текущего пользователя)
    // ВАЖНО: роль ADMIN не означает "моя бронь" — иначе появятся кнопки отмены/возврата на чужих записях.
    const isMineBooking = useCallback(
        (b) => {
            if (!b) return false;

            const cid = getClientIdFromBooking(b);
            if (cid && me?.id && String(cid) === String(me.id)) return true;

            // backend-флаг mine доверяем ТОЛЬКО для клиента (на админке он иногда означает "доступно")
            if (effectiveRole === "CLIENT" && b?.mine != null) return Boolean(b.mine);

            // fallback: если мы сами создавали бронь на этом устройстве
            if (b?.id && me?.id && isRememberedOwnBooking(b.id, me.id)) return true;

            return false;
        },
        [effectiveRole, me?.id]
    );

    const events = useMemo(() => {
        if (!psyId) return [];
        const sc = scheduleOverride || schedule;
        const now = new Date(nowTick);

        // ✅ booking events — ВСЕ интерактивны
        const bookingEvents = (bookings || [])
            .filter((b) => isVisibleBookingStatusInCalendar(b?.status))
            .map((b) => {
                const base = normalizeBookingToEvent(b, { role: effectiveRole }) || {};
                const status = String(b?.status || "");
                const awaiting = isAwaitingPaymentStatus(status);
                const mine = isMineBooking(b);

                // ✅ подпись для "моей" записи
                // - для pending: «Ожидает оплаты»
                // - для остальных: «Ваша запись» (понятно, что это именно вы)
                const title =
                    awaiting && mine
                        ? "Ожидает оплаты"
                        : mine
                            ? "Ваша запись"
                            : base.title || "Занято";

                const classNames = Array.isArray(base.classNames)
                    ? [...base.classNames]
                    : base.className
                        ? [base.className]
                        : [];

                if (awaiting && mine) classNames.push("b-event--booking-pending-mine");

                return {
                    ...base,
                    title,
                    classNames,
                    display: "auto",
                    interactive: true,
                    extendedProps: {
                        ...(base.extendedProps || {}),
                        kind: "BOOKING",
                        raw: b,
                        mine,
                    },
                };
            });

        const dayOffEvents = (dayOffs || []).map(normalizeDayOffToEvent);

        const breakEvents = range
            ? buildBreakEvents({
                rangeStart: new Date(`${range.from}T00:00:00`),
                rangeEnd: new Date(
                    new Date(`${range.to}T00:00:00`).getTime() + 86400000
                ),
                breaks,
            })
            : [];

        const slotEventsRaw =
            sc && range && viewType.startsWith("timeGrid")
                ? buildSlotEvents({
                    rangeStart: new Date(`${range.from}T00:00:00`),
                    rangeEnd: new Date(
                        new Date(`${range.to}T00:00:00`).getTime() + 86400000
                    ),
                    schedule: sc,
                    dayOffs,
                    bookings: blockingBookings,
                    breaks,
                })
                : [];

        const slotEvents = (slotEventsRaw || []).map((ev) => {
            const start = ev?.start ? new Date(ev.start) : null;
            const bookable = start ? slotBookable(start, now) : false;

            if (bookable) {
                return {
                    ...ev,
                    extendedProps: { ...(ev.extendedProps || {}), bookable: true },
                };
            }

            const classNames = Array.isArray(ev.classNames)
                ? [...ev.classNames, "b-event--slot-locked"]
                : ev.className
                    ? [ev.className, "b-event--slot-locked"]
                    : ["b-event--slot-locked"];

            return {
                ...ev,
                title: "Запись закрыта",
                classNames,
                extendedProps: { ...(ev.extendedProps || {}), bookable: false },
            };
        });

        return [...dayOffEvents, ...breakEvents, ...slotEvents, ...bookingEvents];
    }, [
        psyId,
        schedule,
        scheduleOverride,
        dayOffs,
        bookings,
        blockingBookings,
        breaks,
        range,
        viewType,
        effectiveRole,
        nowTick,
        isMineBooking,
    ]);

    const onDatesSet = (arg) => {
        setViewType(arg.view.type);
        const from = dateToYmd(arg.start);
        const endInclusive = new Date(arg.end);
        endInclusive.setDate(endInclusive.getDate() - 1);
        const to = dateToYmd(endInclusive);
        setRange({ from, to });
    };

    const cancelBookingById = useCallback(
        async (bookingId, { silent = false, toastMsg = "Бронь отменена" } = {}) => {
            if (!bookingId) return;
            setSaving(true);
            try {
                await sessionsApi.cancelBooking(bookingId);
                setBookings((prev) => prev.filter((b) => b.id !== bookingId));
                clearRememberedHoldExpiresAt(bookingId);
                clearRememberedPaymentStarted(bookingId);
                if (!silent) toast.info(toastMsg);
            } catch (err) {
                console.error(err);
                toast.error("Не удалось отменить бронь");
            } finally {
                setSaving(false);
            }
        },
        [toast]
    );

    // ✅ сброс флагов при открытии новой брони
    useEffect(() => {
        paymentStartedRef.current = false;
        autoCancelOnceRef.current = false;

        // сбрасываем UI оплаты при смене bookingModal
        setPaymentUI((prev) => ({
            ...prev,
            loading: false,
            checkedOnce: false,
            message: "",
            kind: null,
        }));
    }, [bookingModal?.id]);

    const awaitingPayment = useMemo(() => {
        if (!bookingModal) return false;
        if (bookingModal?.justCreated === true) return true;
        return isAwaitingPaymentStatus(bookingModal?.status);
    }, [bookingModal]);

    const isOwnBooking = useMemo(() => {
        if (!bookingModal) return false;
        return isMineBooking(bookingModal);
    }, [bookingModal, isMineBooking]);

    const canPayThisBooking = canBook && awaitingPayment && isOwnBooking;

    const paidBooking = useMemo(() => {
        if (!bookingModal) return false;
        if (bookingModal?.paid === true) return true;
        if (bookingModal?.telemostUrl || bookingModal?.joinUrl) return true;
        return isPaidBookingStatus(bookingModal?.status);
    }, [bookingModal]);

    const bookingStartMs = useMemo(() => {
        const s = bookingModal?.startDateTime ? new Date(bookingModal.startDateTime).getTime() : null;
        return Number.isFinite(s) ? s : null;
    }, [bookingModal?.startDateTime]);

    const isFutureBooking = useMemo(() => {
        if (!bookingStartMs) return false;
        return bookingStartMs > Date.now();
    }, [bookingStartMs]);

    // ✅ возврат обычно возможен, если до старта больше 24 часов
    const canRefundThisBooking = useMemo(() => {
        if (!paidBooking || !isOwnBooking || !isFutureBooking) return false;
        if (!bookingStartMs) return false;
        return bookingStartMs - Date.now() >= 24 * 60 * 60 * 1000;
    }, [paidBooking, isOwnBooking, isFutureBooking, bookingStartMs]);

    const canCancelPaidBooking = useMemo(() => {
        return paidBooking && isOwnBooking && isFutureBooking;
    }, [paidBooking, isOwnBooking, isFutureBooking]);


    // ✅ восстановим holdExpiresAt из localStorage если есть
    useEffect(() => {
        if (!bookingModal?.id) return;
        if (!awaitingPayment) return;
        if (bookingModal.holdExpiresAt) return;

        const remembered = getRememberedHoldExpiresAt(bookingModal.id);
        if (!remembered) return;

        setBookingModal((prev) =>
            prev?.id === bookingModal.id ? { ...prev, holdExpiresAt: remembered } : prev
        );
    }, [bookingModal?.id, bookingModal?.holdExpiresAt, awaitingPayment]);

    // ✅ обратный отсчёт + автоснятие по истечению HOLD (front fallback)
    useEffect(() => {
        if (!bookingModal?.id) {
            setHoldLeftMs(0);
            return;
        }
        if (!awaitingPayment) {
            setHoldLeftMs(0);
            return;
        }
        if (!bookingModal?.holdExpiresAt) {
            setHoldLeftMs(0);
            return;
        }

        let alive = true;

        const tick = () => {
            if (!alive) return;

            const left = bookingModal.holdExpiresAt - Date.now();
            const safe = Math.max(0, left);
            setHoldLeftMs(safe);

            if (safe <= 0) {
                if (paymentStartedRef.current) return;
                if (autoCancelOnceRef.current) return;
                autoCancelOnceRef.current = true;

                const id = bookingModal.id;
                setBookingModal(null);
                void cancelBookingById(id, { silent: true });
                toast.info("Время ожидания оплаты истекло — бронь отменена.", {
                    title: "Бронь снята",
                });
            }
        };

        tick();
        const intervalId = setInterval(tick, 1000);

        return () => {
            alive = false;
            clearInterval(intervalId);
        };
    }, [bookingModal?.id, bookingModal?.holdExpiresAt, awaitingPayment, cancelBookingById, toast]);

    // ✅ показывать кнопку "Проверить статус" только если пользователь реально уходил на оплату
    const showCheckStatusBtn = useMemo(() => {
        if (!bookingModal?.id) return false;
        if (!awaitingPayment) return false;
        if (!isOwnBooking) return false;

        // ✅ если вернулся с оплаты — точно показываем
        if (bookingModal?.fromReturn) return true;

        // ✅ если ранее нажимал оплатить (уходил на платеж)
        return isRememberedPaymentStarted(bookingModal.id);
    }, [bookingModal?.id, bookingModal?.fromReturn, awaitingPayment, isOwnBooking]);

    const onEventClick = (info) => {
        const kind =
            info.event.extendedProps?.kind ||
            info.event.extendedProps?.type ||
            (info.event.extendedProps?.raw ? "BOOKING" : null);

        if (kind === "SLOT") {
            if (!canBook) return;

            const start = info.event.start;
            const end = info.event.end;

            const bookable = info.event.extendedProps?.bookable;
            if (!start || !end || bookable === false) {
                toast.info(
                    `Запись закрыта: нужно минимум ${MIN_BOOK_AHEAD_MIN} минут до начала.`,
                    { title: "Недоступно" }
                );
                return;
            }

            handleCreateBooking(start, end);
            return;
        }

        if (kind === "DAYOFF") {
            if (!canManageDayOff) {
                toast.info("Выходные можно менять только в вашем графике.", {
                    title: "Недоступно",
                });
                return;
            }
            const raw = info.event.extendedProps?.raw;
            setDayOffModal({
                date: raw?.date,
                reason: raw?.reason || "",
                existingId: raw?.id,
            });
            return;
        }

        if (kind === "BOOKING") {
            const raw = info.event.extendedProps?.raw || null;
            if (!raw) return;

            const rememberedHold = raw?.id
                ? getRememberedHoldExpiresAt(raw.id)
                : null;

            setBookingModal({
                ...raw,
                holdExpiresAt: rememberedHold || raw?.holdExpiresAt || null,
                justCreated: false,
                fromReturn: false,
            });
        }
    };

    const handleCreateBooking = async (start, end) => {
        if (!psyId) return;
        if (!me?.id && effectiveRole !== "ADMIN") return;

        const now = new Date();
        if (!slotBookable(start, now)) {
            toast.info(
                `Запись закрыта: нужно минимум ${MIN_BOOK_AHEAD_MIN} минут до начала.`,
                { title: "Недоступно" }
            );
            return;
        }

        setSaving(true);
        try {
            const created = await sessionsApi.createBooking(psyId, {
                startDateTime: start.toISOString(),
                endDateTime: end.toISOString(),
                price: psychologist?.priceAtTime ?? null,
            });

            setBookings((prev) => [...prev, created]);

            // ✅ старт таймера удержания
            const holdExpiresAt = Date.now() + HOLD_PAYMENT_MS;

            if (me?.id && created?.id) {
                rememberOwnBooking(created.id, me.id);
                rememberHoldExpiresAt(created.id, holdExpiresAt);
                clearRememberedPaymentStarted(created.id); // ✅ на старте оплаты НЕ было
            }

            setBookingModal({ ...created, justCreated: true, holdExpiresAt, fromReturn: false });

            if (typeof onBooked === "function") onBooked(created);

            toast.success("Слот забронирован, ожидает оплаты");
        } catch (err) {
            console.error(err);
            toast.error(
                err?.message || "Не удалось забронировать слот. Возможно, он уже занят."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!bookingModal?.id) return;
        if (!isOwnBooking) {
            toast.info("Отменить можно только свою запись");
            return;
        }
        autoCancelOnceRef.current = true;
        const id = bookingModal.id;
        await cancelBookingById(id);
        setBookingModal(null);
    };

    // ✅ отменить уже оплаченную консультацию (если доступно на бэке)
    const handleCancelPaidBooking = async () => {
        if (!bookingModal?.id) return;
        if (!isOwnBooking) {
            toast.info("Отменить можно только свою сессию");
            return;
        }
        autoCancelOnceRef.current = true;
        const id = bookingModal.id;

        try {
            await cancelBookingById(id, { toastMsg: "Сессия отменена" });
            setBookingModal(null);
        } catch (e) {
            // cancelBookingById уже покажет toast
        }
    };

    function extractPaymentId(b) {
        return (
            b?.paymentId ??
            b?.payment_id ??
            b?.payment?.id ??
            b?.lastPaymentId ??
            b?.last_payment_id ??
            null
        );
    }

    // ✅ запрос возврата денег по paymentId (если до сессии > 24ч)
    const handleRefundBooking = async () => {
        if (!bookingModal?.id) return;
        if (!isOwnBooking) {
            toast.info("Вернуть деньги можно только по своей записи");
            return;
        }
        if (!canRefundThisBooking) {
            toast.info("Возврат доступен, если до начала сессии больше 24 часов.");
            return;
        }

        setRefunding(true);
        try {
            let paymentId = extractPaymentId(bookingModal);

            // если в модалке не было paymentId — попробуем получить детали брони
            if (!paymentId) {
                try {
                    const full = await sessionsApi.getBooking(bookingModal.id);
                    paymentId = extractPaymentId(full);
                } catch (e) {
                    // ignore
                }
            }

            if (!paymentId) {
                toast.error("Не удалось определить paymentId для возврата (нужно добавить в DTO брони)");
                return;
            }

            await paymentsApi.refund(paymentId);

            toast.success("Запрос на возврат отправлен ✅");
            setBookingModal(null);

            // обновим календарь, чтобы слот освободился, если бэк так делает
            await load();
        } catch (e) {
            console.error(e);
            toast.error(e?.message || "Не удалось оформить возврат");
        } finally {
            setRefunding(false);
        }
    };


    // ✅ запрос статуса оплаты
    const handleCheckPaymentStatus = async (bookingId) => {
        if (!bookingId) return;

        setPaymentUI({
            loading: true,
            checkedOnce: true,
            message: "Оплата проверяется…",
            kind: "info",
        });

        try {
            // ✅ ВАЖНО: добавь в sessionsApi метод getPaymentStatus(id)
            // GET /api/bookings/{id}/payment-status
            const res = await sessionsApi.getPaymentStatus(bookingId);

            const norm = normalizePaymentStatusResponse(res);

            // обновляем бронь в списке и модалке, если bookingStatus пришёл
            if (norm?.bookingStatus) {
                setBookings((prev) =>
                    (prev || []).map((b) =>
                        String(b?.id) === String(bookingId)
                            ? { ...b, status: norm.bookingStatus }
                            : b
                    )
                );

                setBookingModal((prev) =>
                    prev?.id && String(prev.id) === String(bookingId)
                        ? { ...prev, status: norm.bookingStatus }
                        : prev
                );
            }

            // UI сообщение
            const paymentStatus = norm?.paymentStatus;
            const bookingStatus = norm?.bookingStatus;

            // 1) успех
            if (paymentStatus === "PAID" || bookingStatus === "PAID") {
                clearRememberedHoldExpiresAt(bookingId);
                clearRememberedPaymentStarted(bookingId);

                setPaymentUI({
                    loading: false,
                    checkedOnce: true,
                    message: "✅ Оплата подтверждена. Бронь успешно оплачена.",
                    kind: "success",
                });

                toast.success("✅ Оплата подтверждена");
                return;
            }

            // 2) ещё ожидаем
            if (paymentStatus === "PENDING" || bookingStatus === "PENDING_PAYMENT") {
                setPaymentUI({
                    loading: false,
                    checkedOnce: true,
                    message:
                        "Оплата проверяется… Если статус не обновился — нажмите «Проверить статус» ещё раз.",
                    kind: "info",
                });
                return;
            }

            // 3) отмена / ошибка
            if (paymentStatus === "CANCELLED" || paymentStatus === "FAILED" || bookingStatus === "CANCELLED") {
                clearRememberedPaymentStarted(bookingId);

                setPaymentUI({
                    loading: false,
                    checkedOnce: true,
                    message:
                        "❌ Оплата не завершена (отменена или не подтверждена). Вы можете попробовать оплатить снова.",
                    kind: "error",
                });
                toast.error("Оплата не подтверждена");
                return;
            }

            // 4) неизвестно — но покажем аккуратно
            setPaymentUI({
                loading: false,
                checkedOnce: true,
                message: `Статус оплаты: ${paymentStatus || "—"}, бронь: ${bookingStatus || "—"}`,
                kind: "info",
            });
        } catch (e) {
            console.error(e);
            setPaymentUI({
                loading: false,
                checkedOnce: true,
                message: "Не удалось проверить статус оплаты. Попробуйте ещё раз.",
                kind: "error",
            });
            toast.error("Не удалось проверить статус оплаты");
        }
    };

    // ✅ если вернулись с оплаты — 1 раз автопроверка
    useEffect(() => {
        if (!bookingModal?.id) return;
        if (!bookingModal?.fromReturn) return;
        if (!awaitingPayment) return;
        if (!isOwnBooking) return;

        // отметим что пользователь уже ходил на оплату (чтобы кнопка появилась даже после закрытия)
        rememberPaymentStarted(bookingModal.id);

        // авто-проверка один раз
        if (!paymentUI.checkedOnce && !paymentUI.loading) {
            void handleCheckPaymentStatus(bookingModal.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingModal?.id, bookingModal?.fromReturn]);

    // ✅ redirect-flow на ЮKassa
    const handleProceedToPayment = async () => {
        if (!bookingModal?.id) return;
        if (!isOwnBooking) {
            toast.info("Оплатить может только владелец брони");
            return;
        }

        paymentStartedRef.current = true;
        autoCancelOnceRef.current = true;

        setSaving(true);
        try {
            const returnUrl = `${window.location.origin}/sessions?payment=return&bookingId=${encodeURIComponent(
                String(bookingModal.id)
            )}`;

            const res = await sessionsApi.startPayment(bookingModal.id, { returnUrl });

            const confirmationUrl =
                res?.confirmationUrl || res?.confirmation_url || res?.url || null;

            if (!confirmationUrl) throw new Error("Не удалось получить ссылку для оплаты");

            // ✅ запоминаем "пользователь реально уходил в оплату"
            rememberPaymentStarted(bookingModal.id);

            window.location.assign(String(confirmationUrl));
        } catch (e) {
            console.error(e);
            paymentStartedRef.current = false;
            autoCancelOnceRef.current = false;
            toast.error(e?.message || "Не удалось начать оплату. Попробуйте снова.");
        } finally {
            setSaving(false);
        }
    };

    const onDateClick = (arg) => {
        if (!canManageDayOff) return;
        const date = dateToYmd(arg.date);
        const existing = dayOffs.find((x) => x.date === date);
        setDayOffModal({
            date,
            reason: existing?.reason || "",
            existingId: existing?.id || null,
        });
    };

    const saveDayOff = async () => {
        if (!dayOffModal || !psyId) return;
        setSaving(true);
        try {
            await sessionsApi.createDayOff(psyId, {
                date: dayOffModal.date,
                reason: dayOffModal.reason,
            });
            await load();
            setDayOffModal(null);
            toast.success("Выходной сохранён");
        } catch (e) {
            toast.error(e?.message || "Не удалось сохранить выходной");
        } finally {
            setSaving(false);
        }
    };

    const deleteDayOff = async () => {
        if (!dayOffModal?.existingId || !psyId) return;
        setSaving(true);
        try {
            await sessionsApi.deleteDayOff(psyId, dayOffModal.existingId);
            await load();
            setDayOffModal(null);
            toast.success("Выходной удалён");
        } catch (e) {
            toast.error(e?.message || "Не удалось удалить выходной");
        } finally {
            setSaving(false);
        }
    };

    const pretty = (d) => {
        if (!d) return "";
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
                <p>Чтобы показать свободные слоты, сначала выберите специалиста.</p>
            </div>
        );
    }

    return (
        <div className={`b-calendar ${loading ? "is-loading" : ""}`}>
            <div className="b-calendar__head">
                <div>
                    <div className="b-calendar__title">Календарь сессий</div>
                    <div className="b-calendar__subtitle">
                        {psychologist?.name || `Психолог #${psyId}`}
                        {mode === "PSYCHO" ? " — настройка графика" : " — запись"}
                    </div>
                </div>

                <div className="b-calendar__legend">
                    <span className="b-badge b-badge--slot">Свободно</span>
                    <span className="b-badge b-badge--slot-locked">Запись закрыта</span>
                    <span className="b-badge b-badge--booking">Занято</span>
                    <span className="b-badge b-badge--break">Перерыв</span>
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

            {/* Модалка оплаты / деталей брони */}
            <Modal
                open={!!bookingModal}
                title={awaitingPayment ? "Ожидает оплаты" : "Детали сессии"}
                onClose={() => {
                    if (saving) return;
                    setBookingModal(null); // ✅ закрытие НЕ отменяет бронь
                }}
                actions={
                    awaitingPayment ? (
                        <>
                            {isOwnBooking ? (
                                <>
                                    <button
                                        className="b-btn b-btn--transparent"
                                        onClick={handleCancelBooking}
                                        disabled={saving}
                                    >
                                        Отменить бронь
                                    </button>

                                    {/* ✅ ВАЖНО: показываем "Проверить статус" ТОЛЬКО если пользователь реально ходил в оплату */}
                                    {showCheckStatusBtn && (
                                        <button
                                            className="b-btn b-btn--transparent"
                                            onClick={() => handleCheckPaymentStatus(bookingModal.id)}
                                            disabled={saving || paymentUI.loading}
                                        >
                                            {paymentUI.loading ? "Проверяем..." : "Проверить статус"}
                                        </button>
                                    )}

                                    <button
                                        className="b-btn b-btn--primary"
                                        onClick={handleProceedToPayment}
                                        disabled={saving || !canPayThisBooking}
                                        title={!canPayThisBooking ? "Оплатить может только владелец брони" : ""}
                                    >
                                        Оплатить
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="b-btn b-btn--transparent"
                                    onClick={() => setBookingModal(null)}
                                    disabled={saving}
                                >
                                    Закрыть
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            {canCancelPaidBooking ? (
                                <button
                                    className="b-btn b-btn--transparent"
                                    onClick={handleCancelPaidBooking}
                                    disabled={saving}
                                    title={!isFutureBooking ? "Нельзя отменить прошедшую сессию" : ""}
                                >
                                    Отменить сессию
                                </button>
                            ) : null}

                            {canRefundThisBooking ? (
                                <button
                                    className="b-btn b-btn--transparent"
                                    onClick={handleRefundBooking}
                                    disabled={saving || refunding}
                                    title={!canRefundThisBooking ? "Возврат доступен, если до начала больше 24 часов" : ""}
                                >
                                    {refunding ? "Оформляем..." : "Вернуть деньги"}
                                </button>
                            ) : null}

                            {!canCancelPaidBooking && !canRefundThisBooking ? (
                                <button
                                    className="b-btn b-btn--transparent"
                                    onClick={() => setBookingModal(null)}
                                    disabled={saving}
                                >
                                    Закрыть
                                </button>
                            ) : (
                                <button
                                    className="b-btn b-btn--transparent"
                                    onClick={() => setBookingModal(null)}
                                    disabled={saving || refunding}
                                >
                                    Закрыть
                                </button>
                            )}
                        </>
                    )
                }
            >
                {bookingModal && (
                    <div className="b-modal__grid">
                        <div className="b-modal__row">
                            <div className="b-modal__label">Время</div>
                            <div className="b-modal__value">
                                {pretty(bookingModal.startDateTime)} —{" "}
                                {new Date(bookingModal.endDateTime).toLocaleTimeString("ru-RU", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </div>
                        </div>

                        <div className="b-modal__row">
                            <div className="b-modal__label">Статус</div>
                            <div className="b-modal__value">
                                {awaitingPayment ? "Ожидает оплаты" : prettyBookingStatus(bookingModal.status)}
                            </div>
                        </div>

                        {bookingModal.priceAtTime != null && (
                            <div className="b-modal__row">
                                <div className="b-modal__label">Сумма</div>
                                <div className="b-modal__value">{bookingModal.priceAtTime} ₽</div>
                            </div>
                        )}

                        {awaitingPayment && (
                            <>
                                <div className="b-modal__hint warning">
                                    <b>Перед оплатой:</b> перенос или отмена консультации возможны не позднее чем за 1 день до её проведения.
                                    После оплаты вы вернётесь на сайт, а статус брони обновится автоматически.
                                    Если подтверждение не появилось сразу — подождите несколько секунд и обновите страницу.
                                </div>

                                {bookingModal.holdExpiresAt ? (
                                    <div className="b-modal__hint">
                                        Завершите оплату в течение {HOLD_PAYMENT_MIN} минут, иначе бронь будет отменена.{" "}
                                        <b>Осталось: {formatMMSS(holdLeftMs)}</b>
                                    </div>
                                ) : (
                                    <div className="b-modal__hint">
                                        Бронь удерживается ограниченное время. Если оплата не выполнена — бронь будет снята автоматически.
                                    </div>
                                )}

                                {paymentUI?.message ? (
                                    <div className={`b-modal__hint ${paymentUI.kind || ""}`}>
                                        {paymentUI.message}
                                    </div>
                                ) : null}

                                {!isOwnBooking && (
                                    <div className="b-modal__hint">
                                        Эта бронь принадлежит другому клиенту. Оплата доступна только владельцу.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </Modal>

            {/* Модалка выходного */}
            <Modal
                open={!!dayOffModal}
                title={dayOffModal?.existingId ? "Редактировать выходной" : "Добавить выходной"}
                onClose={() => (saving ? null : setDayOffModal(null))}
                actions={
                    <>
                        {dayOffModal?.existingId && (
                            <button
                                className="b-btn b-btn--transparent"
                                onClick={deleteDayOff}
                                disabled={saving}
                            >
                                Удалить
                            </button>
                        )}
                        <button className="b-btn" onClick={saveDayOff} disabled={saving}>
                            Сохранить
                        </button>
                    </>
                }
            >
                {dayOffModal && (
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
                                    placeholder="Например: отпуск, болезнь, конференция"
                                    onChange={(e) =>
                                        setDayOffModal((s) => ({ ...s, reason: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="b-modal__hint">
                            Кликните по дню в календаре, чтобы добавить или изменить выходной.
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
