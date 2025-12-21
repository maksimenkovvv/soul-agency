import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../notifications/notificationsStore";

function formatTimeLong(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toLocaleString();
    } catch {
        return "";
    }
}

const FILTERS = [
    { key: "all", label: "Все" },
    { key: "unread", label: "Непрочитанные" },
    { key: "SESSION", label: "Сессии" },
    { key: "MESSAGE", label: "Сообщения" },
    { key: "SYSTEM", label: "Системные" },
];

export default function Notifications() {
    const navigate = useNavigate();
    const {
        notifications,
        nextSession,
        markRead,
        markAllRead,
        clearRead,
    } = useNotifications();

    const [filter, setFilter] = useState("all");

    const list = useMemo(() => {
        const src = notifications || [];
        if (filter === "all") return src;
        if (filter === "unread") return src.filter((x) => !x.readAt);
        return src.filter((x) => x.type === filter);
    }, [notifications, filter]);

    const openItem = (n) => {
        markRead(n.id);
        const href = n?.meta?.href;
        if (href) navigate(href);
        else if (n?.type === "MESSAGE") navigate("/chat");
        else if (n?.type === "SESSION") navigate("/sessions");
    };

    return (
        <div className="notif-page">
            <div className="notif-page__head">
                <h1 className="notif-page__title">Уведомления</h1>
                <div className="notif-page__actions">
                    <button type="button" className="b-btn b-btn--transparent" onClick={markAllRead}>
                        Прочитать всё
                    </button>
                    <button type="button" className="b-btn b-btn--transparent" onClick={clearRead}>
                        Удалить прочитанные
                    </button>
                </div>
            </div>

            {nextSession && (
                <div className="notif-page__session">
                    <div className="notif-card">
                        <div className="notif-card__top">
                            <span className="notif-card__badge">Ближайшая сессия</span>
                            <span className="notif-card__time">{formatTimeLong(nextSession.startAt)}</span>
                        </div>
                        <div className="notif-card__title">
                            {nextSession.withName ? `С ${nextSession.withName}` : "Сессия"}
                        </div>
                        {nextSession.status ? <div className="notif-card__text">Статус: {nextSession.status}</div> : null}
                        <div className="notif-card__row">
                            <button
                                type="button"
                                className="b-btn"
                                onClick={() => navigate(nextSession?.href || "/sessions")}
                            >
                                Открыть
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="b-tabs notif-tabs">
                <div className="tabs__nav">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            className={`tabs__nav-button ${filter === f.key ? "active" : ""}`}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="notif-list">
                {list.length === 0 ? (
                    <div className="notif-empty">Нет уведомлений</div>
                ) : (
                    list.map((n) => (
                        <button
                            key={n.id}
                            type="button"
                            className={`notif-row ${n.readAt ? "" : "unread"}`}
                            onClick={() => openItem(n)}
                        >
                            <div className="notif-row__left">
                                <div className={`notif-row__type ${n.type}`}>{n.type}</div>
                            </div>
                            <div className="notif-row__body">
                                <div className="notif-row__top">
                                    <div className="notif-row__title">{n.title}</div>
                                    <div className="notif-row__time">{formatTimeLong(n.createdAt)}</div>
                                </div>
                                {n.text ? <div className="notif-row__text">{n.text}</div> : null}
                            </div>
                            {!n.readAt && <span className="notif-row__dot" />}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
