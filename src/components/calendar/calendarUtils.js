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

export function normalizeBookingToEvent(booking, { role } = {}) {
    const start = booking.startDateTime || booking.start || booking.start_datetime;
    const end = booking.endDateTime || booking.end || booking.end_datetime;
    const status = booking.status || 'PENDING_PAYMENT';

    let title = 'Сессия';
    if (role === 'PSYCHOLOGIST' || role === 'ADMIN') {
        title = booking.clientName || booking.client?.name || 'Клиент';
    } else {
        title = status === 'CONFIRMED' ? 'Сессия' : 'Занято';
    }

    return {
        id: `booking_${booking.id}`,
        title,
        start,
        end,
        classNames: ['fc-booking', `fc-booking--${status.toLowerCase()}`],
        extendedProps: {
            kind: 'BOOKING',
            status,
            raw: booking,
        },
    };
}

export function normalizeDayOffToEvent(dayOff) {
    // фон на весь день
    const start = new Date(`${dayOff.date}T00:00:00`);
    const end = addMinutes(start, 24 * 60);
    return {
        id: `dayoff_${dayOff.id}`,
        title: dayOff.reason ? `Выходной: ${dayOff.reason}` : 'Выходной',
        start: start.toISOString(),
        end: end.toISOString(),
        display: 'background',
        classNames: ['fc-dayoff'],
        extendedProps: { kind: 'DAYOFF', raw: dayOff },
    };
}

export function buildSlotEvents({ rangeStart, rangeEnd, schedule, dayOffs = [], bookings = [], now = new Date() }) {
    const slotMinutes = schedule?.slotMinutes ?? 50;
    const bufferMinutes = schedule?.bufferMinutes ?? 10;
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
                const collides = bookingRanges.some((br) => overlaps(slotStart, slotEnd, br.start, br.end));
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
