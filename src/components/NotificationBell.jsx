import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "../notifications/notificationsStore";

function formatTime(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        // compact: dd.mm hh:mm
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${dd}.${mm} ${hh}:${mi}`;
    } catch {
        return "";
    }
}

function typeLabel(type) {
    if (type === "SESSION") return "Сессия";
    if (type === "MESSAGE") return "Сообщение";
    return "Системное";
}

function iconFor(type) {
    // Minimal inline icons to keep project dependency-free
    if (type === "SESSION") {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 3V5" stroke="#313235" strokeWidth="2" strokeLinecap="round" />
                <path d="M17 3V5" stroke="#313235" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 9H20" stroke="#313235" strokeWidth="2" strokeLinecap="round" />
                <path
                    d="M6 5H18C19.1046 5 20 5.89543 20 7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V7C4 5.89543 4.89543 5 6 5Z"
                    stroke="#313235"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
                <path d="M8 13H12" stroke="#313235" strokeWidth="2" strokeLinecap="round" />
            </svg>
        );
    }
    if (type === "MESSAGE") {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M21 14C21 15.1046 20.1046 16 19 16H8L3 21V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V14Z"
                    stroke="#313235"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
                <path d="M7 7H17" stroke="#313235" strokeWidth="2" strokeLinecap="round" />
                <path d="M7 11H13" stroke="#313235" strokeWidth="2" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M12 22C13.1046 22 14 21.1046 14 20H10C10 21.1046 10.8954 22 12 22Z"
                fill="#313235"
            />
            <path
                d="M18 16V11C18 7.68629 15.3137 5 12 5C8.68629 5 6 7.68629 6 11V16L4 18V19H20V18L18 16Z"
                stroke="#313235"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function NotificationBell() {
    const {
        notifications,
        unreadNotificationsCount,
        messageUnreadTotal,
        nextSession,
        markRead,
        markAllRead,
    } = useNotifications();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    const isChat = location.pathname === "/chat";
    const messageBadge = !isChat ? messageUnreadTotal : 0;
    const totalBadge = unreadNotificationsCount + messageBadge;

    const latest = useMemo(() => notifications.slice(0, 6), [notifications]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("pointerdown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const openNotif = (n) => {
        markRead(n.id);
        setOpen(false);
        const href = n?.meta?.href;
        if (href) navigate(href);
        else if (n?.type === "MESSAGE") navigate("/chat");
        else if (n?.type === "SESSION") navigate("/sessions");
    };

    return (
        <div className="notify" ref={wrapRef}>
            <button
                type="button"
                className="notify__bell"
                onClick={() => setOpen((v) => !v)}
                aria-label="Уведомления"
                title="Уведомления"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M18 16V11C18 7.68629 15.3137 5 12 5C8.68629 5 6 7.68629 6 11V16L4 18V19H20V18L18 16Z"
                        stroke="#313235"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    <path d="M10 20H14" stroke="#313235" strokeWidth="2" strokeLinecap="round" />
                </svg>

                {totalBadge > 0 && <span className="notify__badge">{totalBadge > 99 ? "99+" : totalBadge}</span>}
            </button>

            {open && (
                <div className="notify__dropdown">
                    <div className="notify__head">
                        <div className="notify__title">Уведомления</div>
                        <div className="notify__actions">
                            <button
                                type="button"
                                className="notify__link"
                                onClick={() => {
                                    markAllRead();
                                }}
                            >
                                Прочитать всё
                            </button>
                            <Link className="notify__link" to="/notifications" onClick={() => setOpen(false)}>
                                Все
                            </Link>
                        </div>
                    </div>

                    {/* Session info */}
                    {nextSession && (
                        <button
                            type="button"
                            className="notify__session"
                            onClick={() => {
                                setOpen(false);
                                navigate(nextSession?.href || "/sessions");
                            }}
                        >
                            <div className="notify__session-top">
                                <span className="notify__session-badge">Сессия</span>
                                <span className="notify__session-time">{formatTime(nextSession.startAt)}</span>
                            </div>
                            <div className="notify__session-title">
                                {nextSession.withName ? `С ${nextSession.withName}` : "Ближайшая сессия"}
                            </div>
                            {nextSession.status && <div className="notify__session-sub">Статус: {nextSession.status}</div>}
                        </button>
                    )}

                    {/* Unread messages summary (only when user is not on /chat) */}
                    {!isChat && messageUnreadTotal > 0 && (
                        <button
                            type="button"
                            className="notify__summary"
                            onClick={() => {
                                setOpen(false);
                                navigate("/chat");
                            }}
                        >
                            <div className="notify__summary-left">{iconFor("MESSAGE")}</div>
                            <div className="notify__summary-body">
                                <div className="notify__summary-title">Непрочитанные сообщения</div>
                                <div className="notify__summary-text">
                                    У вас {messageUnreadTotal} непрочитанных {messageUnreadTotal === 1 ? "сообщение" : "сообщ."}
                                </div>
                            </div>
                        </button>
                    )}

                    <div className="notify__list">
                        {latest.length === 0 ? (
                            <div className="notify__empty">Пока нет уведомлений</div>
                        ) : (
                            latest.map((n) => (
                                <button
                                    key={n.id}
                                    type="button"
                                    className={`notify__item ${n.readAt ? "" : "unread"}`}
                                    onClick={() => openNotif(n)}
                                >
                                    <div className="notify__item-ic">{iconFor(n.type)}</div>
                                    <div className="notify__item-body">
                                        <div className="notify__item-top">
                                            <span className="notify__item-type">{typeLabel(n.type)}</span>
                                            <span className="notify__item-time">{formatTime(n.createdAt)}</span>
                                        </div>
                                        <div className="notify__item-title">{n.title}</div>
                                        {n.text ? <div className="notify__item-text">{n.text}</div> : null}
                                    </div>
                                    {!n.readAt && <span className="notify__dot" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
