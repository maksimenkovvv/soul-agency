import React from "react";

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8080";

function resolveUrl(u) {
    if (!u) return "";
    const s = String(u);
    if (/^(https?:\/\/|data:|blob:)/i.test(s)) return s;
    return `${API_BASE}${s.startsWith("/") ? s : `/${s}`}`;
}


export default function MessageSenderMeta({ sender, showName = true, compact = false }) {
    if (!sender) return null;

    const name = sender?.fullName || sender?.name || sender?.email || "Пользователь";
    const avatar = resolveUrl(sender?.avatarUrl || sender?.avatar || null);

    return (
        <div className={`chat__msg-sender ${compact ? "is-compact" : ""}`}>
            <div className="chat__msg-sender-ava">
                {avatar ? <img src={avatar} alt={name} /> : <span>{String(name).slice(0, 1).toUpperCase()}</span>}
            </div>

            {showName && <div className="chat__msg-sender-name">{name}</div>}
        </div>
    );
}
