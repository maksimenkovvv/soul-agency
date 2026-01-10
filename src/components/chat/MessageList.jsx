import React from "react";
import { IconArrowDown, IconDots, IconPlay } from "./chatIcons";
import MediaViewer from "./MediaViewer";

/* -------------------- helpers (универсальные под DTO/нормализованный фронт) -------------------- */

const getId = (m) => m?.id ?? m?.messageId ?? null;
const getClientId = (m) => m?.clientId ?? null;
const getFromUserId = (m) => m?.fromUserId ?? m?.senderId ?? null;

const getCreatedAt = (m) => m?.createdAt ?? m?.createdWhen ?? null;
const getText = (m) => (m?.text ?? m?.content ?? "");

const getDeleted = (m) =>
    Boolean(m?.deletedAt) ||
    Boolean(m?.deletedWhen) ||
    Boolean(m?.deleted) ||
    Boolean(m?.isDeleted);

const getDeletedAt = (m) => m?.deletedAt ?? m?.deletedWhen ?? null;

const getLastModified = (m) => m?.lastModified ?? m?.updatedAt ?? null;

function isEdited(m) {
    const created = getCreatedAt(m);
    const edited = getLastModified(m);
    if (!created || !edited) return false;
    const c = new Date(created).getTime();
    const e = new Date(edited).getTime();
    if (Number.isNaN(c) || Number.isNaN(e)) return false;

    // createdWhen == lastModified на insert — не считаем это редактированием
    return e > c + 1500;
}

function isTmpId(v) {
    if (v == null) return false;
    const s = String(v);
    return s.startsWith("tmp_") || s.startsWith("c:") || s.startsWith("client:");
}

function messageKeyOf(m) {
    // ключ для jump/highlight
    // IMPORTANT: используем createdAt/createdWhen, иначе будет "undefined" и jump сломается
    const created = getCreatedAt(m) || "";
    return getId(m) || getClientId(m) || `${m?.dialogId || m?.chatId || "d"}:${String(created)}`;
}

function isNonEmpty(v) {
    return v != null && String(v).trim() !== "";
}

async function safeCopy(text) {
    try {
        await navigator.clipboard?.writeText?.(text);
    } catch {}
}

const fmtTime = (d) => {
    const dd = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dd.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(dd);
};

const fmtDay = (d) => {
    const dd = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dd.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long" }).format(dd);
};

function dayKey(d) {
    const dd = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dd.getTime())) return "invalid";
    const y = dd.getFullYear();
    const m = String(dd.getMonth() + 1).padStart(2, "0");
    const da = String(dd.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
}

function isSameDay(a, b) {
    if (!a || !b) return false;
    const da = a instanceof Date ? a : new Date(a);
    const db = b instanceof Date ? b : new Date(b);
    if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function normalizeReactions(raw) {
    // 1) [{emoji:"👍", count:2, me:true}, ...]
    // 2) { "👍": {count:2, me:true}, "🔥": 1 }
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw
            .filter(Boolean)
            .map((x) => ({
                emoji: x.emoji,
                count: Number(x.count || 0),
                me: Boolean(x.me),
            }))
            .filter((x) => isNonEmpty(x.emoji) && x.count > 0);
    }
    if (typeof raw === "object") {
        const out = [];
        for (const [emoji, v] of Object.entries(raw)) {
            if (!isNonEmpty(emoji)) continue;
            if (typeof v === "number") out.push({ emoji, count: v, me: false });
            else out.push({ emoji, count: Number(v?.count || 0), me: Boolean(v?.me) });
        }
        return out.filter((x) => x.count > 0);
    }
    return [];
}

function Checks({ read }) {
    if (read) {
        return (
            <svg className="chat__checks double" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 13l3 3 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 13l3 3 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    return (
        <svg className="chat__checks" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 13l4 4 12-12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function TypingBubble({ text = "Печатает…" }) {
    return (
        <div className="chat__bubble-row">
            <div className="chat__bubble typing" aria-live="polite">
                <span className="typingDots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                </span>
                <span className="typingText">{text}</span>
            </div>
        </div>
    );
}

/* -------------------- component -------------------- */

const MessageList = React.forwardRef(function MessageList(
    {
        messages = [],
        meId,
        loading,
        onRequestMore,
        onEdit,
        onDelete,

        typing = false,
        typingText = "Печатает…",

        onReply, // (message) => void
        onReact, // (message, emoji) => void

        onOpenMedia,
        mediaItems: mediaItemsExternal,
        mediaIndexByKey: mediaIndexByKeyExternal,
        messageMap, // Map(messageKey -> message)
    },
    ref
) {
    const listRef = React.useRef(null);

    const [hasNewHiddenMessages, setHasNewHiddenMessages] = React.useState(false);

    // fallback viewer (если не поднят в ChatUI)
    const [viewer, setViewer] = React.useState({ open: false, index: 0 });

    // ctx menu
    const [menu, setMenu] = React.useState(null);

    // quick reacts popover (по "+")
    const [reactPop, setReactPop] = React.useState(null);
    const reactPopWrapRef = React.useRef(null);

    // Sticky day
    const [stickyDay, setStickyDay] = React.useState(null);
    const rafRef = React.useRef(0);

    // Jump highlight
    const [highlightKey, setHighlightKey] = React.useState(null);
    const highlightTimerRef = React.useRef(null);

    const isMedia = React.useCallback((a) => {
        const mime = String(a?.mime || "");
        const kind = String(a?.kind || "");
        if (kind === "image" || mime.startsWith("image/")) return "image";
        if (kind === "video" || mime.startsWith("video/")) return "video";
        return null;
    }, []);

    const mediaKey = React.useCallback((m, a) => {
        const mid = messageKeyOf(m) || "m";
        const aid = a?.id || a?.url || "a";
        return `${mid}::${aid}`;
    }, []);

    // Collect ALL media (fallback)
    const mediaItemsInternal = React.useMemo(() => {
        const out = [];
        for (const m of messages || []) {
            const atts = Array.isArray(m?.attachments) ? m.attachments : [];
            for (const a of atts) {
                const k = isMedia(a);
                if (!k || !a?.url) continue;
                out.push({
                    key: mediaKey(m, a),
                    url: a.url,
                    mime: a.mime,
                    kind: k,
                    name: a.name,
                    caption: getText(m) || "",
                    createdAt: getCreatedAt(m),
                    messageKey: messageKeyOf(m),
                });
            }
        }
        return out;
    }, [messages, isMedia, mediaKey]);

    const mediaItems = mediaItemsExternal || mediaItemsInternal;

    const mediaIndexByKeyInternal = React.useMemo(() => {
        const map = new Map();
        (mediaItems || []).forEach((it, idx) => map.set(it.key, idx));
        return map;
    }, [mediaItems]);

    const mediaIndexByKey = mediaIndexByKeyExternal || mediaIndexByKeyInternal;

    const rows = React.useMemo(() => {
        const out = [];
        let prevDay = null;

        for (const m of messages) {
            const day = getCreatedAt(m);
            if (!prevDay || !isSameDay(prevDay, day)) {
                const k = dayKey(day);
                out.push({ kind: "day", key: `day:${k}`, day, dayKey: k });
                prevDay = day;
            }
            const mk = messageKeyOf(m);
            out.push({ kind: "msg", key: `m:${mk}`, msg: m, messageKey: mk });
        }
        return out;
    }, [messages]);

    const isAtBottomNow = React.useCallback(() => {
        const el = listRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop <= el.clientHeight + 120;
    }, []);

    const scrollToBottom = React.useCallback(
        (force = false) => {
            const el = listRef.current;
            if (!el) return;
            const isAtBottom = isAtBottomNow();
            if (force || isAtBottom) {
                el.scrollTo({ top: el.scrollHeight, behavior: force ? "smooth" : "auto" });
                setHasNewHiddenMessages(false);
            } else {
                setHasNewHiddenMessages(true);
            }
        },
        [isAtBottomNow]
    );

    const jumpToMessage = React.useCallback((key) => {
        const el = listRef.current;
        if (!el || !key) return;

        const node = el.querySelector(`#msg-${CSS.escape(String(key))}`);
        if (node && typeof node.scrollIntoView === "function") {
            node.scrollIntoView({ block: "center", behavior: "smooth" });
            setHighlightKey(String(key));

            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = setTimeout(() => setHighlightKey(null), 1400);
        }
    }, []);

    React.useImperativeHandle(ref, () => ({ jumpToMessage }));

    // Smart scroll on new messages
    const prevLenRef = React.useRef(0);
    React.useEffect(() => {
        const prevLen = prevLenRef.current;
        prevLenRef.current = messages.length;

        if (messages.length === 0) return;
        if (messages.length <= prevLen) return;

        const last = messages[messages.length - 1];
        const fromId = getFromUserId(last);
        const fromMe = meId != null && fromId != null && String(fromId) === String(meId);
        scrollToBottom(fromMe);
    }, [messages.length, meId, scrollToBottom, messages]);

    // Если typing появился и мы внизу — держим низ
    const prevTypingRef = React.useRef(false);
    React.useEffect(() => {
        const was = prevTypingRef.current;
        prevTypingRef.current = Boolean(typing);
        if (!typing || was === typing) return;
        if (isAtBottomNow()) {
            const el = listRef.current;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
        }
    }, [typing, isAtBottomNow]);

    // Close ctx menu / quick reacts on outside click / ESC
    React.useEffect(() => {
        if (!menu && !reactPop) return;

        const onDown = (e) => {
            const wrap = reactPopWrapRef.current;
            if (wrap && wrap.contains(e.target)) return;

            setMenu(null);
            setReactPop(null);
        };

        const onKey = (e) => {
            if (e.key === "Escape") {
                setMenu(null);
                setReactPop(null);
            }
        };

        window.addEventListener("mousedown", onDown, true);
        window.addEventListener("keydown", onKey, true);
        return () => {
            window.removeEventListener("mousedown", onDown, true);
            window.removeEventListener("keydown", onKey, true);
        };
    }, [menu, reactPop]);

    // throttle for onRequestMore
    const moreLockRef = React.useRef(false);
    const lastMoreAtRef = React.useRef(0);

    const updateStickyDay = React.useCallback(() => {
        const el = listRef.current;
        if (!el) return;

        const markers = el.querySelectorAll("[data-daykey]");
        if (!markers || markers.length === 0) {
            setStickyDay(null);
            return;
        }

        const topY = el.scrollTop + 12;
        let current = null;

        for (const node of markers) {
            const y = node.offsetTop;
            if (y <= topY) current = node.getAttribute("data-daylabel") || node.getAttribute("data-daykey");
            else break;
        }

        setStickyDay(current);
    }, []);

    const onScroll = (e) => {
        const el = e.currentTarget;

        const atTop = el.scrollTop <= 24;
        if (atTop && onRequestMore && !loading) {
            const now = Date.now();
            if (!moreLockRef.current && now - lastMoreAtRef.current > 700) {
                moreLockRef.current = true;
                lastMoreAtRef.current = now;
                Promise.resolve(onRequestMore()).finally(() => {
                    moreLockRef.current = false;
                });
            }
        }

        const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 120;
        if (atBottom) setHasNewHiddenMessages(false);

        if (!rafRef.current) {
            rafRef.current = window.requestAnimationFrame(() => {
                rafRef.current = 0;
                updateStickyDay();
            });
        }
    };

    React.useEffect(() => {
        updateStickyDay();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows.length]);

    React.useEffect(() => {
        return () => {
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const quickReacts = ["👍", "❤️", "😂", "🔥", "😮", "😢"];

    const openMediaAtIndex = (idx) => {
        if (typeof onOpenMedia === "function") onOpenMedia(idx);
        else setViewer({ open: true, index: idx });
    };

    return (
        <div className="chat__messages" ref={listRef} onScroll={onScroll}>
            {stickyDay ? <div className="chat__stickyDay">{stickyDay}</div> : null}

            {loading ? <div style={{ padding: 12, opacity: 0.65 }}>Загрузка…</div> : null}

            {rows.map((r) => {
                if (r.kind === "day") {
                    const label = fmtDay(r.day);
                    return (
                        <div key={r.key} className="chat__day" data-daykey={r.dayKey} data-daylabel={label}>
                            {label}
                        </div>
                    );
                }

                const m = r.msg;
                const mk = r.messageKey;

                const fromId = getFromUserId(m);
                const mine = meId != null && fromId != null && String(fromId) === String(meId);

                const deleted = getDeleted(m);

                const rawId = getId(m);
                const serverId = rawId != null && !isTmpId(rawId) ? String(rawId) : null;
                const hasServerId = Boolean(serverId);

                const canEdit = mine && !deleted;
                const canDelete = mine && !deleted;

                const isPending = m?.status === "pending" || !hasServerId;
                const isFailed = m?.status === "failed";
                const isRead = Boolean(m?.readAt) || String(m?.status || "").toLowerCase() === "read";

                // reply: твой DTO уже может отдавать replyTo объект
                const replyObj = m?.replyTo || null;

                // fallback ids (если будешь хранить отдельно)
                const replyToMessageId = m?.replyToMessageId ?? m?.replyToId ?? replyObj?.id ?? null;
                const replyToClientId = m?.replyToClientId ?? null;
                const replyToKey = m?.replyToKey ?? replyToMessageId ?? replyToClientId ?? null;

                const replyMsg =
                    replyToKey && messageMap && typeof messageMap.get === "function" ? messageMap.get(String(replyToKey)) : null;

                const reactions = normalizeReactions(m?.reactions || m?._reactions);

                const renderReplyPreview = () => {
                    if (!replyToKey && !replyObj) return null;

                    // приоритет: нашли в messageMap
                    if (replyMsg) {
                        const who =
                            replyMsg?.fromUserName ||
                            replyMsg?.fromName ||
                            (getFromUserId(replyMsg) != null && meId != null && String(getFromUserId(replyMsg)) === String(meId) ? "Вы" : "Собеседник");

                        const text = String(getText(replyMsg) || "").trim();
                        const snippet = text
                            ? text.slice(0, 90)
                            : Array.isArray(replyMsg?.attachments) && replyMsg.attachments.length
                                ? "Вложение"
                                : "Сообщение";

                        return (
                            <button
                                type="button"
                                className="chat__reply"
                                onClick={() => jumpToMessage(messageKeyOf(replyMsg) || replyToKey || replyObj?.id)}
                                title="Перейти к сообщению"
                            >
                                <div className="bar" />
                                <div className="body">
                                    <div className="who">{who}</div>
                                    <div className="txt">{snippet}</div>
                                </div>
                            </button>
                        );
                    }

                    // если есть replyTo объект прямо в сообщении (как у тебя)
                    if (replyObj) {
                        const who = replyObj?.fromName || "Сообщение";
                        const text = String(replyObj?.text || "").trim();
                        const snippet = text ? text.slice(0, 90) : "Сообщение";

                        return (
                            <button
                                type="button"
                                className="chat__reply"
                                onClick={() => jumpToMessage(String(replyObj?.id || replyToKey))}
                                title="Перейти к сообщению"
                            >
                                <div className="bar" />
                                <div className="body">
                                    <div className="who">{who}</div>
                                    <div className="txt">{snippet}</div>
                                </div>
                            </button>
                        );
                    }

                    return (
                        <button
                            type="button"
                            className="chat__reply"
                            onClick={() => jumpToMessage(String(replyToKey))}
                            title="Перейти к сообщению"
                        >
                            <div className="bar" />
                            <div className="body">
                                <div className="who">Ответ</div>
                                <div className="txt">Перейти к сообщению</div>
                            </div>
                        </button>
                    );
                };

                const atts = Array.isArray(m?.attachments) ? m.attachments.filter(Boolean) : [];
                const mediaAtts = atts.filter((a) => isMedia(a) && a?.url);
                const fileAtts = atts.filter((a) => !isMedia(a) && a?.url);

                const caption = String(getText(m) || "");
                const showCaptionAfterMedia = mediaAtts.length > 0;

                const maxThumbs = 4;
                const thumbs = mediaAtts.slice(0, maxThumbs);
                const hiddenCount = mediaAtts.length - thumbs.length;

                return (
                    <div
                        key={r.key}
                        id={`msg-${mk}`}
                        className={`chat__bubble-row ${mine ? "me" : ""} ${highlightKey === String(mk) ? "is-highlight" : ""}`}
                    >
                        <div
                            className={`chat__bubble ${mine ? "me" : ""} ${deleted ? "is-deleted" : ""}`}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                if (deleted) return;
                                setReactPop(null);
                                setMenu({
                                    x: e.clientX,
                                    y: e.clientY,
                                    message: m,
                                    messageKey: mk,
                                    mine,
                                    canEdit,
                                    canDelete,
                                    hasServerId,
                                });
                            }}
                        >
                            <div className="chat__bubble-actions">
                                <button
                                    type="button"
                                    className="chat__bubble-menu"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (deleted) return;
                                        setReactPop(null);
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMenu({
                                            x: rect.right - 8,
                                            y: rect.bottom + 8,
                                            message: m,
                                            messageKey: mk,
                                            mine,
                                            canEdit,
                                            canDelete,
                                            hasServerId,
                                        });
                                    }}
                                    aria-label="Действия"
                                >
                                    <IconDots style={{ width: 18, height: 18, stroke: "currentColor" }} />
                                </button>
                            </div>

                            {deleted ? (
                                <p style={{ opacity: 0.6, fontStyle: "italic" }}>
                                    Сообщение удалено
                                </p>
                            ) : (
                                <>
                                    {renderReplyPreview()}

                                    {mediaAtts.length > 0 ? (
                                        <div className={`chat__media-grid ${mediaAtts.length === 1 ? "one" : ""}`}>
                                            {thumbs.map((a, idx) => {
                                                const kind = isMedia(a);
                                                const k = mediaKey(m, a);
                                                const startIndex = mediaIndexByKey.get(k) ?? 0;
                                                const isLast = idx === thumbs.length - 1 && hiddenCount > 0;

                                                return (
                                                    <button
                                                        key={k}
                                                        type="button"
                                                        className={`chat__media ${kind} ${isLast ? "has-more" : ""}`}
                                                        onClick={() => openMediaAtIndex(startIndex)}
                                                        aria-label={kind === "video" ? "Открыть видео" : "Открыть изображение"}
                                                    >
                                                        {kind === "video" ? (
                                                            <>
                                                                <video src={a.url} muted playsInline preload="metadata" />
                                                                <span className="chat__media-play" aria-hidden="true">
                                                                    <IconPlay style={{ width: 46, height: 46, stroke: "currentColor" }} />
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <img src={a.url} alt="" loading="lazy" />
                                                        )}
                                                        {isLast ? <span className="chat__media-more">+{hiddenCount}</span> : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}

                                    {!showCaptionAfterMedia && caption ? <p>{caption}</p> : null}
                                    {showCaptionAfterMedia && caption ? <div className="chat__caption">{caption}</div> : null}

                                    {fileAtts.length > 0 ? (
                                        <div className="chat__files">
                                            {fileAtts.map((a) => (
                                                <a
                                                    key={a.id || a.url}
                                                    className="chat__file"
                                                    href={a.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <div className="ic" aria-hidden="true">
                                                        <svg viewBox="0 0 24 24" fill="none">
                                                            <path
                                                                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                                                                strokeWidth="2"
                                                                strokeLinejoin="round"
                                                            />
                                                            <path d="M14 2v6h6" strokeWidth="2" strokeLinejoin="round" />
                                                        </svg>
                                                    </div>
                                                    <div className="meta">
                                                        <div className="name">{a.name || "file"}</div>
                                                        {a.sizeBytes ? <div className="size">{Math.round(a.sizeBytes / 1024)} KB</div> : null}
                                                        {a.size ? <div className="size">{Math.round(a.size / 1024)} KB</div> : null}
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    ) : null}

                                    {/* Reactions */}
                                    {typeof onReact === "function" ? (
                                        <div className="chat__reactions">
                                            {reactions.map((r) => (
                                                <button
                                                    key={r.emoji}
                                                    type="button"
                                                    className={`chat__reaction chat__reactionChip ${r.me ? "me" : ""}`}
                                                    onClick={() => onReact?.(m, r.emoji)}
                                                    title="Реакция"
                                                    disabled={!hasServerId}
                                                >
                                                    <span className="e">{r.emoji}</span>
                                                    <span className="c">{r.count}</span>
                                                </button>
                                            ))}

                                            <button
                                                type="button"
                                                className="chat__reactionPlus"
                                                title={hasServerId ? "Добавить реакцию" : "Реакции доступны после отправки"}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!hasServerId) return;
                                                    setMenu(null);
                                                    setReactPop((prev) =>
                                                        prev?.messageKey === String(mk) ? null : { messageKey: String(mk), message: m, mine }
                                                    );
                                                }}
                                                disabled={!hasServerId}
                                            >
                                                +
                                            </button>

                                            {reactPop?.messageKey === String(mk) ? (
                                                <div className="chat__react" ref={reactPopWrapRef} onMouseDown={(e) => e.stopPropagation()}>
                                                    {quickReacts.map((emo) => (
                                                        <button
                                                            key={emo}
                                                            type="button"
                                                            className="chat__reactbtn"
                                                            onClick={() => {
                                                                onReact?.(m, emo);
                                                                setReactPop(null);
                                                            }}
                                                            title={emo}
                                                        >
                                                            {emo}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </>
                            )}

                            <div className="chat__bubble-meta">
                                <span className="time">{fmtTime(getCreatedAt(m))}</span>

                                {/* .ред. как в TG */}
                                {!deleted && isEdited(m) ? <span className="chat__edited">ред.</span> : null}

                                {mine && !deleted ? (
                                    <>
                                        {isPending ? <span className="chat__status">…</span> : null}
                                        {isFailed ? <span className="chat__status is-failed">!</span> : null}
                                        {!isPending && !isFailed ? <Checks read={isRead} /> : null}
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                );
            })}

            {typing ? <TypingBubble text={typingText} /> : null}

            {hasNewHiddenMessages ? (
                <button className="chat__newmsg" type="button" onClick={() => scrollToBottom(true)}>
                    <IconArrowDown style={{ width: 18, height: 18, stroke: "currentColor" }} />
                    У вас новое сообщение
                </button>
            ) : null}

            {/* ctx menu (не показываем спорные действия для удалённых) */}
            {menu ? (
                <div className="chat__ctxmenu" style={{ left: menu.x, top: menu.y }} onMouseDown={(e) => e.stopPropagation()}>
                    {getDeleted(menu.message) ? (
                        <button type="button" onClick={() => setMenu(null)} style={{ opacity: 0.75 }}>
                            Закрыть
                        </button>
                    ) : (
                        <>
                            {typeof onReply === "function" ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onReply(menu.message);
                                        setMenu(null);
                                    }}
                                >
                                    Ответить
                                </button>
                            ) : null}

                            {typeof onReact === "function" ? (
                                <div className="chat__ctxreacts" aria-label="Реакции">
                                    {quickReacts.map((emo) => (
                                        <button
                                            key={emo}
                                            type="button"
                                            className="chat__ctxreact"
                                            onClick={() => {
                                                if (!menu.hasServerId) return;
                                                onReact(menu.message, emo);
                                                setMenu(null);
                                            }}
                                            title={menu.hasServerId ? emo : "Реакции доступны после отправки"}
                                            disabled={!menu.hasServerId}
                                        >
                                            {emo}
                                        </button>
                                    ))}
                                </div>
                            ) : null}

                            <button
                                type="button"
                                onClick={async () => {
                                    const t = getText(menu.message);
                                    const firstUrl = menu?.message?.attachments?.find((x) => x?.url)?.url;
                                    await safeCopy(isNonEmpty(t) ? t : firstUrl || "");
                                    setMenu(null);
                                }}
                            >
                                Копировать
                            </button>

                            {menu.canEdit ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onEdit?.(menu.message);
                                        setMenu(null);
                                    }}
                                >
                                    Редактировать
                                </button>
                            ) : null}

                            {menu.canDelete ? (
                                <button
                                    type="button"
                                    className="is-danger"
                                    onClick={() => {
                                        onDelete?.(menu.message);
                                        setMenu(null);
                                    }}
                                >
                                    Удалить
                                </button>
                            ) : null}

                            <button type="button" onClick={() => setMenu(null)} style={{ opacity: 0.75 }}>
                                Закрыть
                            </button>
                        </>
                    )}
                </div>
            ) : null}

            {/* Fallback MediaViewer */}
            {typeof onOpenMedia !== "function" ? (
                <MediaViewer
                    open={viewer.open}
                    items={mediaItems}
                    startIndex={viewer.index}
                    onClose={() => setViewer({ open: false, index: 0 })}
                />
            ) : null}
        </div>
    );
});

export default MessageList;
