import { request } from "./http";

// --- Fallback storage (пока бэкенд-эндпоинты не подключены) ---
const LS = {
    schedule: (psyId) => `bs:schedule:${psyId}`,
    breaks: (psyId) => `bs:breaks:${psyId}`,
    dayoffs: (psyId) => `bs:dayoffs:${psyId}`,
    bookings: (psyId) => `bs:bookings:${psyId}`,
};

function uid(prefix = "id") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function safeJsonParse(raw, fallback) {
    try {
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function lsGet(key, fallback) {
    try {
        return safeJsonParse(localStorage.getItem(key), fallback);
    } catch {
        return fallback;
    }
}

function lsSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {}
}

// ISO strings для OffsetDateTime на бэке
function toIso(dt) {
    if (!dt) return null;
    if (typeof dt === "string") return dt;
    return new Date(dt).toISOString();
}

const DEFAULT_SCHEDULE = {
    slotMinutes: 50,
    // bufferMinutes — legacy (в текущем бэке его нет). Можно поставить 0,
    // а паузы делать через WorkBreak.
    bufferMinutes: 0,
    week: {
        // 1=Mon ... 7=Sun
        1: [{ start: "10:00", end: "18:00" }],
        2: [{ start: "10:00", end: "18:00" }],
        3: [{ start: "10:00", end: "18:00" }],
        4: [{ start: "10:00", end: "18:00" }],
        5: [{ start: "10:00", end: "16:00" }],
        6: [],
        7: [],
    },
};

const DAY_TO_KEY = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
};

const KEY_TO_DAY = {
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
    7: "SUNDAY",
};

function hhmm(t) {
    if (!t) return "00:00";
    const s = String(t);
    // LocalTime может прийти как "10:00:00" — обрежем
    return s.length >= 5 ? s.slice(0, 5) : s;
}

function scheduleFromWorkingRows(rows) {
    const week = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    const slotMinutes = rows?.find((x) => x?.slotDurationMinutes)?.slotDurationMinutes ?? DEFAULT_SCHEDULE.slotMinutes;
    for (const r of rows || []) {
        const key = DAY_TO_KEY[String(r?.dayOfWeek || "").toUpperCase()] || null;
        if (!key) continue;
        week[key] = [...(week[key] || []), { start: hhmm(r?.startTime), end: hhmm(r?.endTime) }];
    }
    // сортировка интервалов по start
    for (const k of Object.keys(week)) {
        week[k] = (week[k] || []).slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
    }
    return { slotMinutes, bufferMinutes: 0, week };
}

function workingRowsFromSchedule(schedule) {
    const slotMinutes = schedule?.slotMinutes ?? DEFAULT_SCHEDULE.slotMinutes;
    const week = schedule?.week || {};
    const out = [];
    for (const [k, intervals] of Object.entries(week)) {
        const day = KEY_TO_DAY[Number(k)];
        if (!day) continue;
        for (const it of Array.isArray(intervals) ? intervals : []) {
            out.push({
                dayOfWeek: day,
                startTime: hhmm(it.start),
                endTime: hhmm(it.end),
                slotDurationMinutes: slotMinutes,
            });
        }
    }
    return out;
}

function shouldFallback(err) {
    // пока эндпоинты не готовы — удобно не ломать UI
    return !err || err.status === 404 || err.status === 405 || err.status === 501;
}

export const sessionsApi = {
    // --- Schedule (недельный шаблон) ---
    async getSchedule(psychologistId) {
        try {
            // Новый бэк: WorkingSchedule (список строк)
            // GET /api/psychologists/{id}/working-schedule
            const rows = await request(`/api/psychologists/${psychologistId}/working-schedule`);
            if (Array.isArray(rows)) return scheduleFromWorkingRows(rows);
            // если бэк вдруг вернул уже "старый" формат
            if (rows && rows.week) return rows;
            return DEFAULT_SCHEDULE;
        } catch (e) {
            // старый эндпоинт
            try {
                const legacy = await request(`/api/psychologists/${psychologistId}/schedule`);
                if (legacy && legacy.week) return legacy;
            } catch (e2) {
                if (!shouldFallback(e2) && !shouldFallback(e)) throw e2;
            }

            if (!shouldFallback(e)) throw e;
            return lsGet(LS.schedule(psychologistId), DEFAULT_SCHEDULE);
        }
    },

    async upsertSchedule(psychologistId, schedule) {
        try {
            // Новый бэк: заменяем график целиком
            // PUT /api/psychologists/{id}/working-schedule
            const payload = workingRowsFromSchedule(schedule);
            const r = await request(`/api/psychologists/${psychologistId}/working-schedule`, {
                method: "PUT",
                json: payload,
            });
            // сервер может вернуть либо строки, либо уже VM — нормализуем
            if (Array.isArray(r)) return scheduleFromWorkingRows(r);
            return r?.week ? r : schedule;
        } catch (e) {
            // fallback: старый эндпоинт (schedule VM)
            try {
                const r = await request(`/api/psychologists/${psychologistId}/schedule`, {
                    method: "PUT",
                    json: schedule,
                });
                return r?.week ? r : schedule;
            } catch (e2) {
                if (!shouldFallback(e2) && !shouldFallback(e)) throw e2;
            }

            if (!shouldFallback(e)) throw e;
            lsSet(LS.schedule(psychologistId), schedule);
            return schedule;
        }
    },

    // --- WorkBreaks ---
    async listWorkBreaks(psychologistId, { from, to } = {}) {
        try {
            // GET /api/psychologists/{id}/work-breaks?from=YYYY-MM-DD&to=YYYY-MM-DD
            const qs = new URLSearchParams();
            if (from) qs.set("from", from);
            if (to) qs.set("to", to);
            const tail = qs.toString() ? `?${qs.toString()}` : "";
            const r = await request(`/api/psychologists/${psychologistId}/work-breaks${tail}`);
            return Array.isArray(r) ? r : [];
        } catch (e) {
            if (!shouldFallback(e)) throw e;
            const all = lsGet(LS.breaks(psychologistId), []);
            // фильтруем только разовые (date) по диапазону; регулярные всегда возвращаем
            return (all || []).filter((x) => {
                if (!x?.date) return true;
                return (!from || x.date >= from) && (!to || x.date <= to);
            });
        }
    },

    async upsertWorkBreak(psychologistId, b) {
        const payload = {
            id: b?.id ?? null,
            date: b?.date ?? null,
            dayOfWeek: b?.dayOfWeek ?? null,
            startTime: hhmm(b?.startTime),
            endTime: hhmm(b?.endTime),
        };

        try {
            if (payload.id) {
                // PUT /api/work-breaks/{id}
                return await request(`/api/work-breaks/${payload.id}`, {
                    method: "PUT",
                    json: payload,
                });
            }
            // POST /api/psychologists/{id}/work-breaks
            return await request(`/api/psychologists/${psychologistId}/work-breaks`, {
                method: "POST",
                json: payload,
            });
        } catch (e) {
            if (!shouldFallback(e)) throw e;

            const all = lsGet(LS.breaks(psychologistId), []);
            if (payload.id) {
                const merged = (all || []).map((x) => (x.id === payload.id ? { ...x, ...payload } : x));
                lsSet(LS.breaks(psychologistId), merged);
                return payload;
            }
            const next = { ...payload, id: uid("break"), psychologistId };
            lsSet(LS.breaks(psychologistId), [...(all || []), next]);
            return next;
        }
    },

    async deleteWorkBreak(psychologistId, breakId) {
        try {
            return await request(`/api/work-breaks/${breakId}`, { method: "DELETE" });
        } catch (e) {
            if (!shouldFallback(e)) throw e;
            const all = lsGet(LS.breaks(psychologistId), []);
            const merged = (all || []).filter((x) => x.id !== breakId);
            lsSet(LS.breaks(psychologistId), merged);
            return { ok: true };
        }
    },

    // --- DayOffs ---
    async listDayOffs(psychologistId, { from, to } = {}) {
        try {
            // GET /api/psychologists/{id}/day-offs?from=YYYY-MM-DD&to=YYYY-MM-DD
            const qs = new URLSearchParams();
            if (from) qs.set("from", from);
            if (to) qs.set("to", to);
            const tail = qs.toString() ? `?${qs.toString()}` : "";
            return await request(`/api/psychologists/${psychologistId}/day-offs${tail}`);
        } catch (e) {
            if (!shouldFallback(e)) throw e;
            const all = lsGet(LS.dayoffs(psychologistId), []);
            // простая фильтрация по YYYY-MM-DD
            return all.filter((x) => (!from || x.date >= from) && (!to || x.date <= to));
        }
    },

    async createDayOff(psychologistId, { date, reason } = {}) {
        try {
            // POST /api/psychologists/{id}/day-offs
            return await request(`/api/psychologists/${psychologistId}/day-offs`, {
                method: "POST",
                json: { date, reason },
            });
        } catch (e) {
            if (!shouldFallback(e)) throw e;
            const next = { id: uid("dayoff"), psychologistId, date, reason: reason || "" };
            const all = lsGet(LS.dayoffs(psychologistId), []);
            const merged = [...all.filter((x) => x.date !== date), next];
            lsSet(LS.dayoffs(psychologistId), merged);
            return next;
        }
    },

    async deleteDayOff(psychologistId, dayOffId) {
        try {
            // DELETE /api/day-offs/{id}
            return await request(`/api/day-offs/${dayOffId}`, { method: "DELETE" });
        } catch (e) {
            if (!shouldFallback(e)) throw e;
            const all = lsGet(LS.dayoffs(psychologistId), []);
            const merged = all.filter((x) => x.id !== dayOffId);
            lsSet(LS.dayoffs(psychologistId), merged);
            return { ok: true };
        }
    },

    // --- Bookings ---
    async listBookings(psychologistId, { from, to } = {}) {
        try {
            // GET /api/psychologists/{id}/bookings?from=...&to=...
            const qs = new URLSearchParams();
            if (from) qs.set("from", from);
            if (to) qs.set("to", to);
            const tail = qs.toString() ? `?${qs.toString()}` : "";
            return await request(`/api/psychologists/${psychologistId}/bookings${tail}`);
        } catch (e) {
            if (!shouldFallback(e)) throw e;
            const all = lsGet(LS.bookings(psychologistId), []);
            return all.filter((x) => {
                const s = (x.startDateTime || x.start || "").slice(0, 10);
                return (!from || s >= from) && (!to || s <= to);
            });
        }
    },

    async createBooking(psychologistId, { clientId, startDateTime, endDateTime, priceAtTime } = {}) {
        const payload = {
            clientId,
            startDateTime: toIso(startDateTime),
            endDateTime: toIso(endDateTime),
            priceAtTime: priceAtTime ?? null,
        };

        try {
            // POST /api/psychologists/{id}/bookings
            return await request(`/api/psychologists/${psychologistId}/bookings`, {
                method: "POST",
                json: payload,
            });
        } catch (e) {
            if (!shouldFallback(e)) throw e;
            const next = {
                id: uid("booking"),
                psychologistId,
                clientId,
                startDateTime: payload.startDateTime,
                endDateTime: payload.endDateTime,
                status: "PENDING_PAYMENT",
                priceAtTime: payload.priceAtTime,
            };
            const all = lsGet(LS.bookings(psychologistId), []);
            lsSet(LS.bookings(psychologistId), [...all, next]);
            return next;
        }
    },
};
