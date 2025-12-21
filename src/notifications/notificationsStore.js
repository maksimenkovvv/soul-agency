import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/authStore";
import { useWs } from "../ws/wsStore";

// Lightweight notifications store (no external deps)
// - Bell dropdown shows latest notifications + session info + unread messages summary
// - List page /notifications shows full history
// - Persisted in localStorage

const STORAGE_KEY = "bs:notifications";

function nowIso() {
    return new Date().toISOString();
}

function uid() {
    // simple enough for UI ids
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readStored() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeStored(v) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {}
}

/**
 * Notification shape:
 * {
 *   id: string,
 *   type: 'SESSION' | 'MESSAGE' | 'SYSTEM',
 *   title: string,
 *   text?: string,
 *   createdAt: iso,
 *   readAt?: iso|null,
 *   meta?: { href?: string, dialogId?: string, sessionId?: string }
 * }
 */

const Ctx = createContext(null);

export function NotificationsProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const { connected, subscribe } = useWs();

    const [state, setState] = useState(() => {
        const stored = readStored();
        return (
            stored || {
                notifications: [],
                messageUnreadTotal: 0,
                nextSession: null,
            }
        );
    });

    // Persist (debounced a bit)
    const persistTimer = useRef(null);
    useEffect(() => {
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(() => writeStored(state), 150);
        return () => {
            if (persistTimer.current) clearTimeout(persistTimer.current);
        };
    }, [state]);

    // Optional demo seed for dev builds
    useEffect(() => {
        if (process.env.NODE_ENV !== "development") return;
        if (state.notifications?.length) return;
        setState((s) => ({
            ...s,
            nextSession: s.nextSession || {
                id: "demo",
                startAt: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
                status: "CONFIRMED",
                withName: "Демо-психолог",
            },
            notifications: [
                {
                    id: uid(),
                    type: "SESSION",
                    title: "Сессия подтверждена",
                    text: "Ваша сессия успешно подтверждена.",
                    createdAt: nowIso(),
                    readAt: null,
                    meta: { href: "/sessions" },
                },
            ],
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- WS bridge ---
    // Server sends to: /user/queue/notifications
    // Payload example:
    //   { type: "NEW_BOOKING", title: "...", text: "...", href: "/sessions" }
    useEffect(() => {
        if (!isAuthenticated || !connected) return;

        const unsub = subscribe("/user/queue/notifications", (payload) => {
            if (!payload) return;

            // Special payloads (optional)
            if (payload.type === "CHAT_UNREAD_TOTAL") {
                if (payload.unreadTotal != null) setMessageUnreadTotal(payload.unreadTotal);
                return;
            }
            if (payload.type === "NEXT_SESSION") {
                // { id, startAt, status, withName, href? }
                setNextSession(payload.session || payload.nextSession || null);
                return;
            }

            const rawType = String(payload.type || "").toUpperCase();
            const mappedType =
                rawType.includes("CHAT") || rawType.includes("MESSAGE")
                    ? "MESSAGE"
                    : rawType.includes("SESSION") || rawType.includes("BOOKING")
                      ? "SESSION"
                      : "SYSTEM";

            addNotification({
                type: mappedType,
                title: payload.title || "Уведомление",
                text: payload.text || "",
                createdAt: payload.createdAt || nowIso(),
                meta: {
                    ...(payload.href ? { href: payload.href } : {}),
                    ...(payload.meta || {}),
                },
            });
        });

        return () => {
            try {
                unsub?.();
            } catch {}
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, connected, subscribe]);

    const addNotification = useCallback((n) => {
        const notif = {
            id: n?.id || uid(),
            type: n?.type || "SYSTEM",
            title: n?.title || "Уведомление",
            text: n?.text || "",
            createdAt: n?.createdAt || nowIso(),
            readAt: n?.readAt ?? null,
            meta: n?.meta || {},
        };

        setState((s) => {
            const next = [notif, ...(s.notifications || [])].slice(0, 200);
            return { ...s, notifications: next };
        });

        return notif.id;
    }, []);

    const markRead = useCallback((id) => {
        if (!id) return;
        setState((s) => ({
            ...s,
            notifications: (s.notifications || []).map((x) => (x.id === id ? { ...x, readAt: x.readAt || nowIso() } : x)),
        }));
    }, []);

    const markAllRead = useCallback(() => {
        setState((s) => ({
            ...s,
            notifications: (s.notifications || []).map((x) => ({ ...x, readAt: x.readAt || nowIso() })),
        }));
    }, []);

    const clearRead = useCallback(() => {
        setState((s) => ({
            ...s,
            notifications: (s.notifications || []).filter((x) => !x.readAt),
        }));
    }, []);

    const setMessageUnreadTotal = useCallback((n) => {
        const safe = Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
        setState((s) => ({ ...s, messageUnreadTotal: safe }));
    }, []);

    const setNextSession = useCallback((session) => {
        // { id, startAt, status, withName, href? }
        setState((s) => ({ ...s, nextSession: session || null }));
    }, []);

    // --- WS integration ---
    // Server sends user notifications to: /user/queue/notifications
    useEffect(() => {
        if (!isAuthenticated || !connected) return;

        return subscribe("/user/queue/notifications", (payload) => {
            if (!payload) return;

            // Optional: server can push unread chat count
            if (payload.type === "CHAT_UNREAD_TOTAL" && payload.unreadTotal != null) {
                setMessageUnreadTotal(payload.unreadTotal);
                return;
            }

            // Optional: server can push next session card data
            if (payload.type === "NEXT_SESSION" && payload.nextSession) {
                setNextSession(payload.nextSession);
                return;
            }

            const kind = String(payload.type || "").toUpperCase();
            const mappedType =
                kind.includes("CHAT") || kind.includes("MESSAGE")
                    ? "MESSAGE"
                    : kind.includes("SESSION") || kind.includes("BOOKING")
                      ? "SESSION"
                      : "SYSTEM";

            addNotification({
                type: mappedType,
                title: payload.title || "Уведомление",
                text: payload.text || "",
                createdAt: payload.createdAt || nowIso(),
                readAt: null,
                meta: { href: payload.href || payload.meta?.href || "/notifications" },
            });
        });
    }, [isAuthenticated, connected, subscribe, addNotification, setMessageUnreadTotal, setNextSession]);

    const unreadNotificationsCount = useMemo(
        () => (state.notifications || []).reduce((acc, x) => acc + (x.readAt ? 0 : 1), 0),
        [state.notifications]
    );

    const value = useMemo(
        () => ({
            notifications: state.notifications || [],
            unreadNotificationsCount,
            messageUnreadTotal: state.messageUnreadTotal || 0,
            nextSession: state.nextSession || null,
            addNotification,
            markRead,
            markAllRead,
            clearRead,
            setMessageUnreadTotal,
            setNextSession,
        }),
        [
            state.notifications,
            state.messageUnreadTotal,
            state.nextSession,
            unreadNotificationsCount,
            addNotification,
            markRead,
            markAllRead,
            clearRead,
            setMessageUnreadTotal,
            setNextSession,
        ]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
    const v = useContext(Ctx);
    if (!v) throw new Error("useNotifications must be used inside NotificationsProvider");
    return v;
}
