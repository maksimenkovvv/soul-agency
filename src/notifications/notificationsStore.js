import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/authStore";
import { useWs } from "../ws/wsStore";
import { notificationsApi } from "../api/notificationsApi";
import { useToast } from "../ui/toast/ToastProvider";
import { primeNotificationSound, playNotificationSound } from "./notificationSound";
import { restoreFavicon, setFaviconBadge } from "./faviconBadge";

// Notifications store backed by the server (persistent notifications).
// Provides:
// - Bell dropdown preview (latest items)
// - unread count for badge
// - markRead / markAllRead / archive actions
// Still supports WS pushes (optional): server may push fresh notifications to /user/queue/notifications.

const Ctx = createContext(null);

function nowIso() {
  return new Date().toISOString();
}

function normalizeIncoming(n) {
  // backend DTO: {id,type,title,message,linkUrl,createdAt,readAt}
  return {
    id: n?.id,
    type: String(n?.type || "SYSTEM"),
    title: n?.title || "Уведомление",
    message: n?.message ?? n?.text ?? "",
    linkUrl: n?.linkUrl ?? n?.meta?.href ?? null,
    createdAt: n?.createdAt || nowIso(),
    readAt: n?.readAt ?? null,
  };
}

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { connected, subscribe } = useWs();
  const toast = useToast();

  const [notifications, setNotifications] = useState([]); // preview (latest)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [messageUnreadTotal, setMessageUnreadTotal] = useState(0);
  const [nextSession, setNextSession] = useState(null);

  const refreshInFlight = useRef(false);
  const blinkTimerRef = useRef(null);
  const lastSoundAtRef = useRef(0);

  const [pageHidden, setPageHidden] = useState(() => {
    try {
      return document.hidden;
    } catch {
      return false;
    }
  });

  // Prime notification sound after first user gesture (required by browser autoplay policies).
  useEffect(() => {
    const prime = () => {
      primeNotificationSound();
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
    window.addEventListener("pointerdown", prime, { passive: true });
    window.addEventListener("keydown", prime);
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  // Track tab visibility (used for favicon blinking).
  useEffect(() => {
    const onVis = () => {
      try {
        setPageHidden(document.hidden);
      } catch {
        setPageHidden(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const refreshPreview = useCallback(async () => {
    if (!isAuthenticated) return;
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const res = await notificationsApi.list({ onlyUnread: false, limit: 6 });
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      const unread = res?.unreadCount != null ? Number(res.unreadCount) : null;
      setNotifications(items.map(normalizeIncoming));
      if (unread != null && Number.isFinite(unread)) setUnreadNotificationsCount(Math.max(0, unread));
      else {
        // fallback (if backend didn't include unreadCount)
        try {
          const c = await notificationsApi.unreadCount();
          const n = Number(c?.count ?? 0);
          setUnreadNotificationsCount(Number.isFinite(n) ? Math.max(0, n) : 0);
        } catch {}
      }
    } catch {
      // ignore
    } finally {
      refreshInFlight.current = false;
    }
  }, [isAuthenticated]);

  // Bootstrap / reset on auth changes
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      setMessageUnreadTotal(0);
      setNextSession(null);

      // cleanup side-effects
      if (blinkTimerRef.current) {
        clearInterval(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
      try {
        restoreFavicon();
      } catch {}
      return;
    }
    refreshPreview();
  }, [isAuthenticated, refreshPreview]);

  // Favicon badge + optional blinking when tab is hidden
  useEffect(() => {
    if (!isAuthenticated) return;

    const total = Math.max(0, Number(unreadNotificationsCount || 0)) + Math.max(0, Number(messageUnreadTotal || 0));

    // stop previous blink
    if (blinkTimerRef.current) {
      clearInterval(blinkTimerRef.current);
      blinkTimerRef.current = null;
    }


    // apply current badge (favicon only)
    setFaviconBadge(total, { withTitle: false }).catch(() => {});

    // blink only when user is away and something is unread
    if (pageHidden && total > 0) {
      let show = true;
      blinkTimerRef.current = setInterval(() => {
        show = !show;
        if (show) setFaviconBadge(total, { withTitle: false }).catch(() => {});
        else restoreFavicon();
      }, 1200);
    }

    return () => {
      if (blinkTimerRef.current) {
        clearInterval(blinkTimerRef.current);
        blinkTimerRef.current = null;
      }
    };
  }, [isAuthenticated, unreadNotificationsCount, messageUnreadTotal, pageHidden]);

  // Light polling for unread count (in case WS isn't connected)
  useEffect(() => {
    if (!isAuthenticated) return;
    const t = setInterval(async () => {
      try {
        const c = await notificationsApi.unreadCount();
        const n = Number(c?.count ?? 0);
        setUnreadNotificationsCount(Number.isFinite(n) ? Math.max(0, n) : 0);
      } catch {}
    }, 60000);
    return () => clearInterval(t);
  }, [isAuthenticated]);

  const markRead = useCallback(
    async (id) => {
      if (!id) return;
      // optimistic
      setNotifications((prev) =>
        (prev || []).map((x) => (x.id === id ? { ...x, readAt: x.readAt || nowIso() } : x))
      );
      setUnreadNotificationsCount((c) => Math.max(0, c - 1));
      try {
        await notificationsApi.markRead(id);
      } catch {
        // resync if failed
        refreshPreview();
      }
    },
    [refreshPreview]
  );

  const markAllRead = useCallback(async () => {
    // optimistic
    setNotifications((prev) => (prev || []).map((x) => ({ ...x, readAt: x.readAt || nowIso() })));
    setUnreadNotificationsCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch (e) {
      refreshPreview();
      throw e;
    }
  }, [refreshPreview]);

  const archive = useCallback(
    async (id) => {
      if (!id) return;
      // optimistic
      setNotifications((prev) => (prev || []).filter((x) => x.id !== id));
      try {
        await notificationsApi.archive(id);
      } catch {
        refreshPreview();
      }
    },
    [refreshPreview]
  );

  // --- WS bridge (optional) ---
  // Recommended server payload:
  // { kind: "NOTIFICATION", notification: {id,type,title,message,linkUrl,createdAt,readAt} }
  // Or send DTO directly.
  useEffect(() => {
    if (!isAuthenticated || !connected) return;

    return subscribe("/user/queue/notifications", (payload) => {
      if (!payload) return;

      // Optional: unread chat count
      if (payload.type === "CHAT_UNREAD_TOTAL" && payload.unreadTotal != null) {
        const n = Number(payload.unreadTotal);
        setMessageUnreadTotal(Number.isFinite(n) ? Math.max(0, n) : 0);
        return;
      }

      // Optional: next session card
      if (payload.type === "NEXT_SESSION") {
        setNextSession(payload.session || payload.nextSession || null);
        return;
      }

      const dto = payload.notification || payload;
      if (!dto?.id) {
        // if server doesn't provide DTO, safest approach: refresh
        refreshPreview();
        return;
      }

      const item = normalizeIncoming(dto);

      let isNew = false;
      setNotifications((prev) => {
        const exists = (prev || []).some((x) => x.id === item.id);
        isNew = !exists;
        const next = exists ? prev : [item, ...(prev || [])];
        return next.slice(0, 12);
      });

      if (isNew && !item.readAt) {
        setUnreadNotificationsCount((c) => c + 1);

        // toast + sound (best-effort)
        try {
          const t = String(item.type || "").toUpperCase();
          const toastType = t.includes("CANCEL") || t.includes("FAIL") || t.includes("ERROR") ? "error"
            : t.includes("CREATED") || t.includes("CONFIRM") || t.includes("SUCCESS") ? "success"
            : "info";
          toast.push({
            type: toastType,
            title: item.title || "Новое уведомление",
            message: item.message || "",
            duration: 5200,
          });
        } catch {}


        try {
          const now = Date.now();
          if (now - (lastSoundAtRef.current || 0) > 1200) {
            lastSoundAtRef.current = now;
            playNotificationSound();
          }
        } catch {}
      }
    });

  }, [isAuthenticated, connected, subscribe, refreshPreview, toast]);

  const value = useMemo(
    () => ({
      notifications,
      unreadNotificationsCount,
      messageUnreadTotal,
      nextSession,
      refreshPreview,
      setMessageUnreadTotal,
      setNextSession,
      markRead,
      markAllRead,
      archive,
    }),
    [
      notifications,
      unreadNotificationsCount,
      messageUnreadTotal,
      nextSession,
      refreshPreview,
      markRead,
      markAllRead,
      archive,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNotifications must be used inside NotificationsProvider");
  return v;
}
