import React from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "../api/notificationsApi";
import { useNotifications } from "../notifications/notificationsStore";
import { useToast } from "../ui/toast/ToastProvider";
import NotificationModal from "../components/ui/NotificationModal";

function nowIso() {
  return new Date().toISOString();
}

function asDate(iso) {
  try {
    return iso ? new Date(iso) : null;
  } catch {
    return null;
  }
}

function formatTime(iso) {
  const d = asDate(iso);
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayTitle(iso) {
  const d = asDate(iso);
  if (!d) return "";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday - startOfDay) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function kindLabel(type) {
  const t = String(type || "").toUpperCase();
  if (t.includes("CHAT") || t.includes("MESSAGE")) return "Сообщение";
  if (t.includes("SESSION") || t.includes("APPOINT") || t.includes("BOOK")) return "Сессия";
  if (t.includes("FAV")) return "Избранное";
  return "Системное";
}

function kindClass(type) {
  const t = String(type || "").toUpperCase();
  if (t.includes("CHAT") || t.includes("MESSAGE")) return "MESSAGE";
  if (t.includes("SESSION") || t.includes("APPOINT") || t.includes("BOOK")) return "SESSION";
  if (t.includes("FAV")) return "FAV";
  return "SYSTEM";
}

function iconFor(type) {
  const t = String(type || "").toUpperCase();
  if (t.includes("SESSION") || t.includes("APPOINT") || t.includes("BOOK")) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 3V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M17 3V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M6 5H18C19.1046 5 20 5.89543 20 7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V7C4 5.89543 4.89543 5 6 5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M8 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (t.includes("CHAT") || t.includes("MESSAGE")) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 14C21 15.1046 20.1046 16 19 16H8L3 21V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V14Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 11H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (t.includes("FAV")) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 21s-6.716-4.35-9.428-7.063C.859 12.225.5 11.166.5 10.1.5 7.37 2.61 5.5 5.2 5.5c1.49 0 2.91.73 3.8 1.9.89-1.17 2.31-1.9 3.8-1.9 2.59 0 4.7 1.87 4.7 4.6 0 1.065-.36 2.125-2.072 3.837C18.716 16.65 12 21 12 21z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 16V11C18 7.68629 15.3137 5 12 5C8.68629 5 6 7.68629 6 11V16L4 18V19H20V18L18 16Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 20H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function groupByDay(items) {
  const map = new Map();
  (items || []).forEach((n) => {
    const key = formatDayTitle(n.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  });
  return Array.from(map.entries()).map(([title, list]) => ({ title, list }));
}

function Skeleton() {
  return (
    <div className="notif-skel" aria-hidden="true">
      <div className="notif-skel__row" />
      <div className="notif-skel__row" />
      <div className="notif-skel__row" />
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { unreadNotificationsCount, markAllRead, refreshPreview } = useNotifications();

  const [onlyUnread, setOnlyUnread] = React.useState(true);
  const [selectedNotif, setSelectedNotif] = React.useState(null);
  const [notifModalOpen, setNotifModalOpen] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [cursor, setCursor] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(
    async ({ reset = false } = {}) => {
      try {
        if (reset) {
          setLoading(true);
          setError("");
          setCursor(null);
        } else {
          setLoadingMore(true);
        }

        const res = await notificationsApi.list({ onlyUnread, limit: 20, cursor: reset ? null : cursor });
        const list = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];

        setItems((prev) => {
          const base = reset ? [] : (prev || []);
          // de-dup by id
          const seen = new Set(base.map((x) => x.id));
          const merged = [...base];
          for (const n of list) {
            if (!seen.has(n.id)) {
              merged.push(n);
              seen.add(n.id);
            }
          }
          return merged;
        });
        setCursor(res?.nextCursor || null);
      } catch (e) {
        setError(e?.message || "Не удалось загрузить уведомления");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [onlyUnread, cursor]
  );

  React.useEffect(() => {
    load({ reset: true });
    // also refresh bell preview/counts
    refreshPreview?.();
  }, [onlyUnread]);

  const onOpen = async (n) => {
    if (!n) return;

    // mark as read locally + on server
    if (!n.readAt) {
      setItems((prev) => (prev || []).map((x) => (x.id === n.id ? { ...x, readAt: nowIso() } : x)));
      try {
        await notificationsApi.markRead(n.id);
      } catch {}
    }

    // ✅ open modal to read (instead of immediate redirect)
    setSelectedNotif(n);
    setNotifModalOpen(true);
  };

  const onReadAll = async () => {
    try {
      await markAllRead();
      setItems((prev) => (prev || []).map((x) => ({ ...x, readAt: x.readAt || nowIso() })));
      toast.success("Все уведомления помечены как прочитанные");
    } catch (e) {
      toast.error(e?.message || "Не удалось прочитать всё");
    }
  };

  const onArchive = async (id) => {
    try {
      // optimistic
      setItems((prev) => (prev || []).filter((x) => x.id !== id));
      await notificationsApi.archive(id);
      refreshPreview?.();
      toast.success("Уведомление убрано");
    } catch (e) {
      toast.error(e?.message || "Не удалось убрать уведомление");
      load({ reset: true });
    }
  };

  const groups = React.useMemo(() => groupByDay(items), [items]);

  return (
    <div className="notif-page">
      <div className="notif-page__head">
        <div className="notif-page__headLeft">
          <h1 className="notif-page__title">Уведомления</h1>
          {unreadNotificationsCount > 0 ? (
            <span className="notif-page__badge">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>
          ) : null}
        </div>
        <div className="notif-page__actions">
          <button type="button" className="b-btn b-btn--transparent" onClick={onReadAll}>
            Прочитать всё
          </button>
        </div>
      </div>

      <div className="notif-tabs">
        <div className="tabs__nav">
          <button
            type="button"
            className={`tabs__nav-button ${onlyUnread ? "active" : ""}`}
            onClick={() => setOnlyUnread(true)}
          >
            Новые
          </button>
          <button
            type="button"
            className={`tabs__nav-button ${!onlyUnread ? "active" : ""}`}
            onClick={() => setOnlyUnread(false)}
          >
            Все
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="notif-empty">{error}</div>
      ) : items.length === 0 ? (
        <div className="notif-empty">{onlyUnread ? "Новых уведомлений нет" : "Нет уведомлений"}</div>
      ) : (
        <div className="notif-groups">
          {groups.map((g) => (
            <div key={g.title} className="notif-group">
              <div className="notif-group__title">{g.title}</div>
              <div className="notif-list">
                {g.list.map((n) => (
                  <div key={n.id} className={`notif-row ${n.readAt ? "" : "unread"}`}>
                    <button type="button" className="notif-row__main" onClick={() => onOpen(n)}>
                      <div className="notif-row__left">
                        <div className={`notif-row__type ${kindClass(n.type)}`}>{kindLabel(n.type)}</div>
                      </div>
                      <div className="notif-row__body">
                        <div className="notif-row__top">
                          <div className="notif-row__title">
                            <span className="notif-row__icon" aria-hidden="true">{iconFor(n.type)}</span>
                            {n.title}
                          </div>
                          <div className="notif-row__time">{formatTime(n.createdAt)}</div>
                        </div>
                        {n.message ? <div className="notif-row__text">{n.message}</div> : null}
                      </div>
                      {!n.readAt && <span className="notif-row__dot" />}
                    </button>

                    <div className="notif-row__actions">
                      <button
                        type="button"
                        className="notif-row__arch"
                        onClick={() => onArchive(n.id)}
                        aria-label="Убрать уведомление"
                        title="Убрать"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M6 6l1 16h10l1-16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {cursor && (
            <div className="notif-more">
              <button
                type="button"
                className="b-btn b-btn--transparent"
                onClick={() => load({ reset: false })}
                disabled={loadingMore}
              >
                {loadingMore ? "Загрузка…" : "Показать ещё"}
              </button>
            </div>
          )}
        </div>
      )}
      <NotificationModal
              open={notifModalOpen}
              notification={selectedNotif}
              onClose={() => {
                setNotifModalOpen(false);
                setSelectedNotif(null);
              }}
              onGo={(href) => {
                if (!href) return;
                setNotifModalOpen(false);
                setSelectedNotif(null);
                if (/^https?:\/\//i.test(String(href))) {
                  window.open(href, "_blank", "noopener,noreferrer");
                } else {
                  navigate(href);
                }
              }}
            />
    </div>
  );
}