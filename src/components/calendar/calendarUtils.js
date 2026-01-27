// Утилиты для FullCalendar: генерация слотов из недельного графика + маппинг сущностей

export function dayKeyFromDate(d) {
    // 1=Mon ... 7=Sun
    const js = d.getDay(); // 0=Sun
    return js === 0 ? 7 : js;
}

export function addMinutes(date, minutes) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
}

const STATUS_META = {
    PENDING_PAYMENT: { label: "Ожидает оплату", cls: "pending_payment" },
    PAID:            { label: "Оплачено",       cls: "paid" },
    CONFIRMED:       { label: "Подтверждено",   cls: "confirmed" }, // на будущее
    CANCELLED:       { label: "Отменено",       cls: "cancelled" },
    COMPLETED:       { label: "Завершено",      cls: "completed" },
    NO_SHOW:         { label: "Неявка",         cls: "no_show" },
};

function statusMeta(statusRaw) {
    const key = String(statusRaw || "PENDING_PAYMENT").toUpperCase();
    return STATUS_META[key] || { label: key, cls: "unknown" };
}


export function dateToYmd(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
}

export function timeToDate(baseDayDate, hhmm) {
    const [hRaw, mRaw] = String(hhmm || '00:00').split(':');
    const h = parseInt(hRaw, 10);
    const m = parseInt(mRaw, 10);
    const d = new Date(baseDayDate);
    d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return d;
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
    const aS = new Date(aStart).getTime();
    const aE = new Date(aEnd).getTime();
    const bS = new Date(bStart).getTime();
    const bE = new Date(bEnd).getTime();
    return aS < bE && bS < aE;
}

const DOW_TO_KEY = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
};

function hhmm(t) {
    if (!t) return "00:00";
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
}

export function normalizeBookingToEvent(booking, { role } = {}) {
    const start = booking.startDateTime || booking.start;
    const end = booking.endDateTime || booking.end;
    const st = statusMeta(booking.status);

    let title = "Сессия";

    if (role === "PSYCHOLOGIST" || role === "ADMIN") {
        if (booking.type === "GROUP") {
            const paid = booking.paidCount ?? null;
            const total = booking.clientsCount ?? null;
            const suffix = (paid != null && total != null) ? ` · ${paid}/${total} оплачено` : "";
            title = (booking.title || "Групповая сессия") + suffix;
        } else {
            title = booking.clientName || "Клиент";
        }
    } else {
        // клиенту не надо показывать внутреннюю кухню психолога
        title = st.label === "Отменено" ? "Отменено" : "Занято";
    }

    return {
        id: `booking_${booking.id}`,
        title,
        start,
        end,
        classNames: ["fc-booking", `fc-booking--${st.cls}`],
        extendedProps: {
            kind: "BOOKING",
            bookingId: booking.id,
            status: booking.status,
        },
    };
}

function addDaysYmd(ymd, days = 1) {
    const d = new Date(`${ymd}T00:00:00`);
    d.setDate(d.getDate() + days);
    return dateToYmd(d);
}

export function normalizeDayOffToEvent(dayOff) {
    const start = String(dayOff.date);          // "YYYY-MM-DD"
    const end = addDaysYmd(start, 1);           // endExclusive для allDay

    return {
        // ✅ важно: если dayOff.id нет/undefined — используем дату, иначе будут коллизии
        id: `dayoff_${dayOff.id ?? start}`,
        title: dayOff.reason ? `Выходной: ${dayOff.reason}` : "Выходной",

        start,
        end,
        allDay: true,
        display: "background",
        classNames: ["fc-dayoff"],

        extendedProps: { kind: "DAYOFF", raw: dayOff },
    };
}


export function normalizeBreakToEvent(br, baseDateYmd) {
    // фон на интервал внутри дня
    const base = new Date(`${baseDateYmd}T00:00:00`);
    const start = timeToDate(base, hhmm(br.startTime));
    const end = timeToDate(base, hhmm(br.endTime));
    return {
        id: `break_${br.id || "new"}_${baseDateYmd}`,
        title: "Перерыв",
        start: start.toISOString(),
        end: end.toISOString(),
        display: "background",
        classNames: ["fc-break"],
        extendedProps: { kind: "BREAK", raw: br },
    };
}

export function buildBreakEvents({ rangeStart, rangeEnd, breaks = [] }) {
    const events = [];
    const cur = new Date(rangeStart);
    cur.setHours(0, 0, 0, 0);
    const endDay = new Date(rangeEnd);
    endDay.setHours(0, 0, 0, 0);

    while (cur < endDay) {
        const ymd = dateToYmd(cur);
        const dayKey = dayKeyFromDate(cur);
        const daily = (breaks || []).filter((b) => {
            if (b?.date) return b.date === ymd;
            if (b?.dayOfWeek) return DOW_TO_KEY[String(b.dayOfWeek).toUpperCase()] === dayKey;
            return false;
        });

        for (const br of daily) {
            events.push(normalizeBreakToEvent(br, ymd));
        }

        cur.setDate(cur.getDate() + 1);
    }

    return events;
}

export function buildSlotEvents({ rangeStart, rangeEnd, schedule, dayOffs = [], bookings = [], breaks = [], now = new Date() }) {
    const slotMinutes = schedule?.slotMinutes ?? 50;
    const bufferMinutes = schedule?.bufferMinutes ?? 0;
    const week = schedule?.week || {};

    const dayOffSet = new Set(dayOffs.map((d) => d.date));

    const bookingRanges = bookings.map((b) => {
        const s = b.startDateTime || b.start || b.start_datetime;
        const e = b.endDateTime || b.end || b.end_datetime;
        return { start: s, end: e, raw: b };
    });

    const events = [];

    const cur = new Date(rangeStart);
    cur.setHours(0, 0, 0, 0);
    const endDay = new Date(rangeEnd);
    endDay.setHours(0, 0, 0, 0);

    while (cur < endDay) {
        const ymd = dateToYmd(cur);
        if (dayOffSet.has(ymd)) {
            cur.setDate(cur.getDate() + 1);
            continue;
        }

        const dayKey = dayKeyFromDate(cur);
        const breakRanges = (breaks || [])
            .filter((b) => {
                if (b?.date) return b.date === ymd;
                if (b?.dayOfWeek) return DOW_TO_KEY[String(b.dayOfWeek).toUpperCase()] === dayKey;
                return false;
            })
            .map((b) => {
                const s = timeToDate(cur, hhmm(b.startTime));
                const e = timeToDate(cur, hhmm(b.endTime));
                return { start: s, end: e, raw: b };
            });
        const intervals = Array.isArray(week[dayKey]) ? week[dayKey] : [];

        for (const it of intervals) {
            const start = timeToDate(cur, it.start);
            const end = timeToDate(cur, it.end);

            let cursor = new Date(start);
            while (addMinutes(cursor, slotMinutes) <= end) {
                const slotStart = new Date(cursor);
                const slotEnd = addMinutes(cursor, slotMinutes);

                // не показываем прошлое
                if (slotEnd <= now) {
                    cursor = addMinutes(cursor, slotMinutes + bufferMinutes);
                    continue;
                }

                // не показываем слоты, которые пересекаются с бронями
                const collidesBooking = bookingRanges.some((br) => overlaps(slotStart, slotEnd, br.start, br.end));
                const collidesBreak = breakRanges.some((br) => overlaps(slotStart, slotEnd, br.start, br.end));
                const collides = collidesBooking || collidesBreak;
                if (!collides) {
                    const id = `slot_${ymd}_${slotStart.getHours()}_${slotStart.getMinutes()}`;
                    events.push({
                        id,
                        title: 'Свободно',
                        start: slotStart.toISOString(),
                        end: slotEnd.toISOString(),
                        classNames: ['fc-slot'],
                        extendedProps: { kind: 'SLOT', ymd },
                    });
                }

                cursor = addMinutes(cursor, slotMinutes + bufferMinutes);
            }
        }

        cur.setDate(cur.getDate() + 1);
    }

    return events;
}
