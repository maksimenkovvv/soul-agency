import { request } from "./http";

// Local fallback (if backend doesn't expose joined group sessions in /api/me/appointments yet)
const LS_GROUP_JOIN_PREFIX = "gs:joined:"; // gs:joined:<sessionId> -> JSON { sessionId, bookingId?, joinedAt }

function safeJsonParse(s) {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

function uniqBy(arr, keyFn) {
    const out = [];
    const seen = new Set();
    for (const x of arr || []) {
        const k = keyFn(x);
        if (k == null) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(x);
    }
    return out;
}

async function tryGetArray(url) {
    try {
        const res = await request(url, { method: "GET" });
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.items)) return res.items;
        if (Array.isArray(res?.data)) return res.data;
        return [];
    } catch (e) {
        // ignore 404/403 etc — fallback only
        return [];
    }
}

export const appointmentsApi = {
    /**
     * Individual appointments (legacy): GET /api/me/appointments
     */
    listMy: () => request("/api/me/appointments", { method: "GET" }),

    /**
     * Best-effort: try to load group session bookings from additional endpoints (if they exist)
     */
    listMyGroup: async () => {
        const candidates = [
            "/api/me/group-appointments",
            "/api/me/group-bookings",
            "/api/me/group-session-bookings",
        ];
        for (const url of candidates) {
            const arr = await tryGetArray(url);
            if (arr && arr.length) return arr;
        }
        return [];
    },

    /**
     * Unified list: individual + group (api + local fallback)
     */
    listMyAll: async () => {
        const [baseRaw, groupRaw] = await Promise.all([
            appointmentsApi.listMy().catch(() => []),
            appointmentsApi.listMyGroup().catch(() => []),
        ]);

        const base = Array.isArray(baseRaw) ? baseRaw : Array.isArray(baseRaw?.items) ? baseRaw.items : [];
        const group = Array.isArray(groupRaw) ? groupRaw : [];

        const localGroup = appointmentsApi.listLocalGroupJoins();

        // Merge by bookingId/type or by groupSessionId
        const merged = uniqBy(
            [...base, ...group, ...localGroup],
            (a) => {
                const id = a?.id ?? a?.bookingId ?? a?.booking_id ?? null;
                const t = String(a?.type || a?.appointmentType || "").toUpperCase();
                const gs = a?.groupSessionId ?? a?.sessionId ?? a?.group_session_id ?? null;
                return id != null ? `${t}:${id}` : gs != null ? `${t || "GROUP"}:gs:${gs}` : null;
            }
        );

        return merged;
    },

    /**
     * Local fallback for joined group sessions (written on join flow)
     */
    rememberLocalGroupJoin: (sessionId, bookingId, meta = {}) => {
        try {
            const sid = String(sessionId ?? "").trim();
            if (!sid) return;
            const payload = {
                sessionId: sid,
                bookingId: bookingId != null ? String(bookingId) : null,
                joinedAt: Date.now(),
                type: "GROUP",
                title: meta?.title || meta?.sessionTitle || null,
                coverUrl: meta?.coverUrl || meta?.coverImg || null,
                status: meta?.status || null,
            };
            localStorage.setItem(LS_GROUP_JOIN_PREFIX + sid, JSON.stringify(payload));
        } catch {}
    },

    listLocalGroupJoins: () => {
        try {
            const out = [];
            for (let i = 0; i < localStorage.length; i += 1) {
                const k = localStorage.key(i);
                if (!k || !k.startsWith(LS_GROUP_JOIN_PREFIX)) continue;
                const raw = safeJsonParse(localStorage.getItem(k) || "");
                if (!raw?.sessionId) continue;

                // pseudo appointment DTO (will be enriched by UI when needed)
                out.push({
                    id: raw.bookingId || `gs_${raw.sessionId}`,
                    type: "GROUP",
                    groupSessionId: raw.sessionId,
                    sessionTitle: raw.title || "Групповая сессия",
                    sessionCoverUrl: raw.coverUrl || null,
                    status: raw.status || "PAID",
                    // timestamps might be unknown here; UI will fetch details
                    _local: true,
                });
            }
            return out;
        } catch {
            return [];
        }
    },

    createPayment: (bookingId) =>
        request("/payments/yookassa/create", {
            method: "POST",
            json: { bookingId },
        }),

    getOne: (id) => {
        const bookingId = String(id ?? "").trim();
        if (!bookingId) throw new Error("bookingId is required");
        return request(`/api/me/appointments/${bookingId}`, { method: "GET" });
    },
};
