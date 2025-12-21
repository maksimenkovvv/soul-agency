import { request } from "./http";

// --- Fallback storage (пока бэкенд-эндпоинты не подключены) ---
const LS = {
    schedule: (psyId) => `bs:schedule:${psyId}`,
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
    bufferMinutes: 10,
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

function shouldFallback(err) {
    // пока эндпоинты не готовы — удобно не ломать UI
    return !err || err.status === 404 || err.status === 405 || err.status === 501;
}

export const sessionsApi = {
    // --- Schedule (недельный шаблон) ---
    async getSchedule(psychologistId) {
        try {
            // Предложенный эндпоинт (можешь поменять под свой Spring)
            // GET /api/psychologists/{id}/schedule
            return await request(`/api/psychologists/${psychologistId}/schedule`);
        } catch (e) {
            if (!shouldFallback(e)) throw e;
            return lsGet(LS.schedule(psychologistId), DEFAULT_SCHEDULE);
        }
    },

    async upsertSchedule(psychologistId, schedule) {
        try {
            // PUT /api/psychologists/{id}/schedule
            return await request(`/api/psychologists/${psychologistId}/schedule`, {
                method: "PUT",
                json: schedule,
            });
        } catch (e) {
            if (!shouldFallback(e)) throw e;
            lsSet(LS.schedule(psychologistId), schedule);
            return schedule;
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
