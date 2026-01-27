import React, { useEffect, useRef, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8080";

function resolveUrl(u) {
    if (!u) return "";
    const s = String(u);
    if (/^(https?:\/\/|data:|blob:)/i.test(s)) return s;
    return `${API_BASE}${s.startsWith("/") ? s : `/${s}`}`;
}


function fmtReadAt(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d);
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

export default function ReadByPopover({
                                          open,
                                          anchorRef,
                                          chatId,
                                          messageId,
                                          loadReaders, // async (chatId, messageId) => readers[]
                                          onClose,
                                      }) {
    const popRef = useRef(null);
    useOutsideClose(open, onClose, [popRef, anchorRef]);

    const [loading, setLoading] = useState(false);
    const [readers, setReaders] = useState([]);
    const [err, setErr] = useState("");
    const [posStyle, setPosStyle] = useState(null);

    useEffect(() => {
        if (!open) return;
        let mounted = true;

        setLoading(true);
        setErr("");

        Promise.resolve()
            .then(() => loadReaders?.(chatId, messageId))
            .then((list) => {
                if (!mounted) return;
                setReaders(Array.isArray(list) ? list : []);
            })
            .catch((e) => {
                if (!mounted) return;
                setErr(e?.message || "Ошибка загрузки");
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [open, chatId, messageId, loadReaders]);

    useEffect(() => {
        if (!open) return;

        const calc = () => {
            const el = anchorRef?.current;
            if (!el || typeof el.getBoundingClientRect !== "function") {
                setPosStyle(null);
                return;
            }

            const r = el.getBoundingClientRect();
            const W = 340;          // как в css (min(340px,...))
            const margin = 12;

            // ставим справа от кнопки, но не вываливаемся за экран
            const left = Math.min(window.innerWidth - margin - W, Math.max(margin, r.right - W));
            // ставим ниже кнопки
            const top = Math.min(window.innerHeight - margin - 260, Math.max(margin, r.bottom + 8));

            setPosStyle({ position: "fixed", left, top, right: "auto", width: W });
        };

        calc();
        window.addEventListener("resize", calc);
        window.addEventListener("scroll", calc, true);

        return () => {
            window.removeEventListener("resize", calc);
            window.removeEventListener("scroll", calc, true);
        };
    }, [open, anchorRef, messageId]);

    if (!open) return null;

    return (
        <div ref={popRef} className="chat__popover chat__popover--readby" style={posStyle || undefined}>
        <div className="chat__popover-title">Прочитали</div>

            {loading && <div className="chat__popover-muted">Загрузка…</div>}
            {!!err && <div className="chat__popover-error">{err}</div>}

            {!loading && !err && (
                <div className="chat__readby-list">
                    {readers.length === 0 && <div className="chat__popover-muted">Пока никто</div>}

                    {readers.map((u) => {
                        const name = u?.fullName || u?.name || "Пользователь";
                        const avatar = resolveUrl(u?.avatarUrl || u?.avatar || null);

                        return (
                            <div key={u.userId || name} className="chat__readby-item">
                                <div className="chat__readby-ava">
                                    {avatar ? <img src={avatar} alt={name} /> : <span>{String(name).slice(0, 1).toUpperCase()}</span>}
                                </div>

                                <div className="chat__readby-meta">
                                    <div className="chat__readby-name">{name}</div>
                                    <div className="chat__readby-time">{fmtReadAt(u.readAt)}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <button type="button" className="chat__popover-close" onClick={onClose}>
                Закрыть
            </button>
        </div>
    );
}
