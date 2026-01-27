import React, { useEffect, useMemo, useRef, useState } from "react";

function fmtLastSeen(dt) {
    if (!dt) return "давно";
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "давно";
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });
}

function useOutsideClose(open, onClose, refs = []) {
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            const inside = refs.some((r) => r?.current && r.current.contains(e.target));
            if (!inside) onClose?.();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open, onClose, refs]);
}

function normStr(v) {
    return String(v ?? "").trim();
}

export default function ChatMembersPopover({
                                               open,
                                               anchorRef,
                                               members = [],
                                               onClose,
                                               meId,
                                               myRole,
                                               searchUsers, // async (q) => [{id,userId,fullName,name,email,avatarUrl,isOnline,lastSeenAt}]
                                               onAddUser,   // async (user) => void
                                               onRemoveUser // async (member) => void
                                           }) {
    const popRef = useRef(null);
    useOutsideClose(open, onClose, [popRef, anchorRef]);

    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [results, setResults] = useState([]);

    // права: ADMIN или owner
    const isOwner = useMemo(() => {
        if (!meId) return false;
        return (Array.isArray(members) ? members : []).some(
            (m) => Boolean(m?.isOwner) && String(m?.userId ?? m?.id) === String(meId)
        );
    }, [members, meId]);

    const canManage = myRole === "ADMIN" || isOwner;

    const membersIds = useMemo(() => {
        const set = new Set();
        for (const m of members || []) {
            const id = m?.userId ?? m?.id ?? null;
            if (id != null) set.add(String(id));
        }
        return set;
    }, [members]);

    const sorted = useMemo(() => {
        return [...(members || [])].sort((a, b) => {
            const ao = a?.isOnline ? 0 : 1;
            const bo = b?.isOnline ? 0 : 1;
            if (ao !== bo) return ao - bo;

            // owner выше
            const aOwn = a?.isOwner ? 0 : 1;
            const bOwn = b?.isOwner ? 0 : 1;
            if (aOwn !== bOwn) return aOwn - bOwn;

            return String(a?.fullName || a?.name || "").localeCompare(String(b?.fullName || b?.name || ""), "ru");
        });
    }, [members]);

    // debounce search
    useEffect(() => {
        if (!open) return;
        if (!canManage) return;

        const query = normStr(q);
        setErr("");

        if (query.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        let alive = true;
        setLoading(true);

        const t = setTimeout(() => {
            Promise.resolve()
                .then(() => searchUsers?.(query))
                .then((list) => {
                    if (!alive) return;
                    const arr = Array.isArray(list) ? list : [];

                    // выкинуть тех, кто уже в чате
                    const filtered = arr.filter((u) => {
                        const uid = u?.userId ?? u?.id ?? null;
                        if (uid == null) return false;
                        return !membersIds.has(String(uid));
                    });

                    setResults(filtered);
                })
                .catch((e) => {
                    if (!alive) return;
                    setErr(e?.message ? String(e.message) : "Ошибка поиска");
                    setResults([]);
                })
                .finally(() => {
                    if (!alive) return;
                    setLoading(false);
                });
        }, 350);

        return () => {
            alive = false;
            clearTimeout(t);
        };
    }, [q, open, canManage, searchUsers, membersIds]);

    useEffect(() => {
        if (!open) {
            setQ("");
            setResults([]);
            setErr("");
            setLoading(false);
        }
    }, [open]);

    if (!open) return null;

    return (
        <div ref={popRef} className="chat__popover chat__popover--members">
            <div className="chat__popover-head">
                <div className="chat__popover-title">Участники</div>
                <button type="button" className="chat__popover-x" onClick={onClose} aria-label="Закрыть">
                    ✕
                </button>
            </div>

            {canManage ? (
                <div className="chat__members-manage">
                    <div className="chat__members-search">
                        <input
                            className="chat__members-searchInput"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Добавить: ФИО / логин / почта…"
                        />
                        {loading ? <div className="chat__members-searchHint">Поиск…</div> : null}
                        {err ? <div className="chat__members-searchErr">{err}</div> : null}
                    </div>

                    {results.length > 0 ? (
                        <div className="chat__members-results">
                            {results.slice(0, 8).map((u) => {
                                const uid = u?.userId ?? u?.id ?? null;
                                const name = u?.fullName || u?.name || u?.email || "Пользователь";
                                const avatar = u?.avatarUrl || null;

                                return (
                                    <div key={String(uid)} className="chat__member-item chat__member-item--result">
                                        <div className="chat__member-ava">
                                            {avatar ? (
                                                <img src={avatar} alt={name} />
                                            ) : (
                                                <span>{String(name).slice(0, 1).toUpperCase()}</span>
                                            )}
                                        </div>

                                        <div className="chat__member-meta">
                                            <div className="chat__member-name">{name}</div>
                                            <div className="chat__member-status">{u?.email || " "}</div>
                                        </div>

                                        <button
                                            type="button"
                                            className="chat__member-action chat__member-action--add"
                                            onClick={async () => {
                                                await onAddUser?.(u);
                                                setQ("");
                                                setResults([]);
                                            }}
                                        >
                                            Добавить
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="chat__members-list">
                {sorted.map((m) => {
                    const uid = m?.userId ?? m?.id ?? null;
                    const name = m?.fullName || m?.name || m?.email || "Пользователь";
                    const avatar = m?.avatarUrl || null;

                    const status = m?.isOnline
                        ? "онлайн"
                        : m?.lastSeenAt
                            ? `был(а) ${fmtLastSeen(m.lastSeenAt)}`
                            : "не в сети";

                    const isThisOwner = Boolean(m?.isOwner);
                    const canRemove = canManage && !isThisOwner && uid != null;

                    return (
                        <div key={String(uid || name)} className="chat__member-item">
                            <div className="chat__member-ava">
                                {avatar ? (
                                    <img src={avatar} alt={name} />
                                ) : (
                                    <span>{String(name).slice(0, 1).toUpperCase()}</span>
                                )}
                            </div>

                            <div className="chat__member-meta">
                                <div className="chat__member-name">
                                    {name}
                                    {isThisOwner ? <span className="chat__member-badge">владелец</span> : null}
                                </div>
                                <div className={`chat__member-status ${m?.isOnline ? "is-online" : ""}`}>{status}</div>
                            </div>

                            {canRemove ? (
                                <button
                                    type="button"
                                    className="chat__member-action chat__member-action--remove"
                                    onClick={() => onRemoveUser?.(m)}
                                >
                                    Удалить
                                </button>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            <button type="button" className="chat__popover-close" onClick={onClose}>
                Закрыть
            </button>
        </div>
    );
}
