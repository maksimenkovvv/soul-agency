import React from "react";
import {IconSearch} from "./chatIcons";

const fmtListTime = (d) => {
    const dd = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dd.getTime())) return "";
    const now = new Date();
    const isToday =
        dd.getFullYear() === now.getFullYear() &&
        dd.getMonth() === now.getMonth() &&
        dd.getDate() === now.getDate();

    if (isToday) {
        return new Intl.DateTimeFormat("ru-RU", {hour: "2-digit", minute: "2-digit"}).format(dd);
    }
    return new Intl.DateTimeFormat("ru-RU", {day: "2-digit", month: "2-digit"}).format(dd);
};

function TypingBubble({text = "Печатает…"}) {
    return (
        <div className="chat__bubble-row">
            <div className="chat__bubble typing" aria-live="polite">
                <span className="typingDots" aria-hidden="true">
                    <i/>
                    <i/>
                    <i/>
                </span>
                <span className="typingText">{text}</span>
            </div>
        </div>
    );
}

function SkeletonRow() {
    return (
        <div className="chat__dialog chat__skeleton" style={{cursor: "default"}}>
            <div className="chat__avatar chat__skeleton-box"/>
            <div className="chat__dialog-mid">
                <div className="chat__skeleton-line w-60"/>
                <div className="chat__skeleton-line w-90"/>
            </div>
            <div className="chat__dialog-right">
                <div className="chat__skeleton-line w-30"/>
            </div>
        </div>
    );
}

export default function ChatSidebar({dialogs = [], loading, error, activeDialogId, onOpen}) {
    const [q, setQ] = React.useState("");

    const filtered = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return dialogs;
        return (dialogs || []).filter((d) => {
            const t = `${d.title || ""} ${d.lastMessage || ""}`.toLowerCase();
            return t.includes(s);
        });
    }, [dialogs, q]);

    return (
        <div className="chat__panel chat__sidebar">
            <div className="chat__sidebar-head">
                <div className="chat__sidebar-title">
                    <h2>Чаты</h2>
                    <span className="chat__pill">
            <IconSearch style={{width: 16, height: 16, stroke: "currentColor"}}/>
                        {loading ? "Загрузка" : `${dialogs.length}`}
          </span>
                </div>

                <div className="b-search">
                    <div className="search__wrapper" style={{width: '100%'}}>
                        <input
                            className="b-search__input"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Поиск диалогов"
                        />
                    </div>
                </div>
            </div>

            <div className="chat__sidebar-body">
                {loading ? (
                    <>
                        <SkeletonRow/>
                        <SkeletonRow/>
                        <SkeletonRow/>
                        <SkeletonRow/>
                    </>
                ) : error ? (
                    <div style={{padding: 12, opacity: 0.85}}>{error}</div>
                ) : filtered.length === 0 ? (
                    <div style={{padding: 12, opacity: 0.75}}>Диалогов нет</div>
                ) : (
                    filtered.map((d) => {
                        const active = String(activeDialogId) === String(d.id);
                        return (
                            <button
                                key={d.id}
                                type="button"
                                className={`chat__dialog ${active ? "active" : ""}`}
                                onClick={() => onOpen?.(d.id)}
                            >
                                <div className="chat__avatar chat__avatar--presence">
                                    {d.avatarUrl ? <img src={d.avatarUrl} alt=""/> :
                                        <div className="chat__avatar-fallback"/>}
                                    {d.type !== 'GROUP' ?
                                        <span className={`chat__presence ${d.online ? "online" : ""}`}/> : null}
                                </div>

                                <div className="chat__dialog-mid">
                                    <div className="chat__dialog-top">
                                        <div className="chat__name">{d.title}</div>
                                        <div className="chat__time">{fmtListTime(d.updatedAt)}</div>
                                    </div>

                                    <div className={`chat__last ${d.typing ? "is-typing" : ""}`}>
                                        {d.typing ? 'Печатает...' : (d.lastMessage || "")}
                                    </div>
                                </div>

                                <div className="chat__dialog-right">
                                    {d.unreadCount > 0 ? <div className="chat__badge">{d.unreadCount}</div> : null}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
