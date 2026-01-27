import React from "react";
import { IconArrowDown, IconDots, IconPlay } from "./chatIcons";
import MediaViewer from "./MediaViewer";
import MessageSenderMeta from "./MessageSenderMeta";

/* -------------------- helpers -------------------- */

const getId = (m) => m?.id ?? m?.messageId ?? null;
const getClientId = (m) => m?.clientId ?? null;

const getFromUserId = (m) => m?.fromUserId ?? m?.senderId ?? null;

const getCreatedAt = (m) => m?.createdAt ?? m?.createdWhen ?? m?.created_at ?? m?.created_when ?? null;
const getText = (m) => m?.text ?? m?.content ?? m?.message ?? "";

const getDeleted = (m) =>
    Boolean(m?.deleted) ||
    Boolean(m?.isDeleted) ||
    Boolean(m?.deletedAt) ||
    Boolean(m?.deletedWhen) ||
    Boolean(m?.deleted_at) ||
    Boolean(m?.deleted_when);

const getLastModified = (m) =>
    m?.lastModified ??
    m?.last_modified ??
    m?.updatedAt ??
    m?.updated_at ??
    m?.editedAt ??
    m?.edited_at ??
    null;

const getEditedAt = (m) => m?.editedAt ?? m?.edited_at ?? m?.editedWhen ?? m?.edited_when ?? getLastModified(m);

const getEditedFlag = (m) =>
    Boolean(m?.isEdited) || Boolean(m?.edited) || Boolean(m?.wasEdited) || Boolean(m?.is_edited);

// ✅ новые флаги из твоего API
const getMineFlag = (m) => (typeof m?.mine === "boolean" ? m.mine : null);
const getReadByMeFlag = (m) => (typeof m?.readByMe === "boolean" ? m.readByMe : null);
const getReadAt = (m) =>
    m?.readAt ??
    m?.read_at ??
    m?.readWhen ??
    m?.read_when ??
    m?.lastReadAt ??
    m?.last_read_at ??
    m?.seenAt ??
    m?.seen_at ??
    null;

const getReadByOtherFlag = (m) => {
    // 1) прямой флаг
    if (typeof m?.readByOther === "boolean") return m.readByOther;

    // 2) числовые счётчики (часто так в GROUP)
    const cnt =
        m?.readByCount ??
        m?.read_count ??
        m?.readCount ??
        m?.readersCount ??
        m?.readers_count ??
        m?.seenCount ??
        m?.seen_count ??
        null;

    if (typeof cnt === "number" && Number.isFinite(cnt)) return cnt > 0;

    // 3) массивы (часто так в GROUP)
    const arr =
        m?.readByUsers ??
        m?.read_by_users ??
        m?.readers ??
        m?.read_by ??
        m?.seenBy ??
        m?.seen_by ??
        null;

    if (Array.isArray(arr)) return arr.length > 0;

    // 4) nested (на всякий)
    const nestedCnt = m?.readBy?.count ?? m?.readers?.count ?? null;
    if (typeof nestedCnt === "number" && Number.isFinite(nestedCnt)) return nestedCnt > 0;

    // 5) если есть readAt/seenAt — считаем прочитанным
    if (getReadAt(m)) return true;

    return null;
};


function toDate(v) {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
}

function createdTs(m) {
    const d = toDate(getCreatedAt(m));
    return d ? d.getTime() : 0;
}

function isEdited(m) {
    if (!m || getDeleted(m)) return false;

    if (getEditedFlag(m)) return true;

    const created = toDate(getCreatedAt(m));
    const editedAt = toDate(getEditedAt(m));

    if (created && editedAt) {
        const c = created.getTime();
        const e = editedAt.getTime();
        return e > c + 1500;
    }

    const lm = toDate(getLastModified(m));
    if (!created || !lm) return false;
    return lm.getTime() > created.getTime() + 1500;
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

async function safeCopy(text) {
    try {
        await navigator.clipboard?.writeText?.(text);
    } catch {}
}

function isNonEmpty(v) {
    return v != null && String(v).trim() !== "";
}

function isTmpId(v) {
    if (v == null) return false;
    const s = String(v);
    return s.startsWith("tmp_") || s.startsWith("c:") || s.startsWith("client:");
}

function safeIdPart(v) {
    return String(v ?? "")
        .trim()
        .replace(/\s+/g, "_");
}

function normalizeDialogId(x) {
    if (x == null) return null;
    if (typeof x === "object") return x.id ?? x.dialogId ?? x.chatId ?? x.threadId ?? null;
    return x;
}

/**
 * ✅ ВАЖНО:
 * messageKeyOf ДОЛЖЕН быть безопасным для id="" (без пробелов),
 * иначе ломаются jump/restore/querySelector.
 */
function messageKeyOf(m) {
    const id = getId(m);
    const cid = getClientId(m);
    if (id != null) return safeIdPart(id);
    if (cid != null) return safeIdPart(cid);

    const didRaw = normalizeDialogId(m?.dialogId ?? m?.chatId ?? m?.threadId ?? m?.chatId ?? "d");
    const did = didRaw != null ? safeIdPart(didRaw) : "d";
    const ts = createdTs(m);
    return `${did}:${String(ts || 0)}`;
}

function normalizeReactions(raw) {
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

function cssEscapeSafe(v) {
    const s = String(v ?? "");
    if (typeof window !== "undefined" && window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(s);
    return s.replace(/["\\]/g, "\\$&");
}

function guessDialogId(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return null;
    const m = messages[0] || messages[messages.length - 1];
    const did = normalizeDialogId(m?.dialogId ?? m?.chatId ?? m?.threadId ?? m?.chatId ?? null);
    return did != null ? String(did) : null;
}

/**
 * ✅ NEW:
 * onMessagesSeen(ids:number[]) — батч, когда сообщения реально попали в viewport
 * ✅ onBottomVisible() — когда виден низ списка (sentinel)
 * ✅ ref API: jumpToMessage + getScrollState + restoreScrollState
 */
const MessageList = React.forwardRef(function MessageList(
    {
        messages = [],
        meId,
        myRole,
        loading,
        onRequestMore,
        onEdit,
        onDelete,

        typing = false,
        typingText = "Печатает…",

        onReply,
        onReact,

        onOpenMedia,
        mediaItems: mediaItemsExternal,
        mediaIndexByKey: mediaIndexByKeyExternal,
        messageMap,

        onMessagesSeen,
        onBottomVisible,
        onOpenReadInfo,
        dialogId,
        members = [],
        chatType,
        showSenderMetaForMineInGroup = false,
    },
    ref
) {
    const listRef = React.useRef(null);

    const [hasNewHiddenMessages, setHasNewHiddenMessages] = React.useState(false);
    const [viewer, setViewer] = React.useState({ open: false, index: 0 });
    const [menu, setMenu] = React.useState(null);
    const [reactPop, setReactPop] = React.useState(null);
    const reactPopWrapRef = React.useRef(null);

    const [stickyDay, setStickyDay] = React.useState(null);
    const rafRef = React.useRef(0);

    const [highlightKey, setHighlightKey] = React.useState(null);
    const highlightTimerRef = React.useRef(null);

    // ✅ определяем GROUP без доп. запросов
    const isGroup = React.useMemo(() => {
        const t = String(chatType || "").toUpperCase();
        if (t) return t === "GROUP";
        // fallback: если участников > 2 — почти наверняка GROUP
        return Array.isArray(members) && members.length > 2;
    }, [chatType, members]);

    // ✅ map участников: userId -> sender object для MessageSenderMeta
    const membersById = React.useMemo(() => {
        const map = new Map();
        (members || []).forEach((u) => {
            const id = u?.userId ?? u?.id ?? null;
            if (id == null) return;

            const name = u?.name ?? u?.fullName ?? u?.email ?? "Пользователь";
            map.set(String(id), {
                id,
                userId: id,
                fullName: name,
                name,
                email: u?.email ?? null,
                avatarUrl: u?.avatarUrl ?? u?.avatar ?? null,
                avatar: u?.avatar ?? null,
                isOnline: u?.isOnline,
                lastSeenAt: u?.lastSeenAt,
            });
        });
        return map;
    }, [members]);

    const resolveSender = React.useCallback(
        (m) => {
            const uid = getFromUserId(m);
            if (uid == null) return null;

            const found = membersById.get(String(uid));
            if (found) return found;

            // fallback из сообщения
            const nm = m?.fromUserName || m?.fromName || "Пользователь";
            return { id: uid, userId: uid, fullName: nm, name: nm, avatarUrl: null };
        },
        [membersById]
    );

    // -------- media helpers --------
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

    const mediaItemsInternal = React.useMemo(() => {
        const out = [];
        for (const m of messages || []) {
            if (getDeleted(m)) continue;
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

    // -------- rows --------
    const rows = React.useMemo(() => {
        const out = [];
        let prevDay = null;

        // ✅ для GROUP: чтобы не рисовать sender meta на каждом сообщении подряд
        // сохраняем предыдущего автора в рамках дня
        let prevFromInDay = null;

        for (const m of messages || []) {
            const day = toDate(getCreatedAt(m));
            if (day) {
                if (!prevDay || !isSameDay(prevDay, day)) {
                    const k = dayKey(day);
                    out.push({ kind: "day", key: `day:${k}`, day, dayKey: k });
                    prevDay = day;
                    prevFromInDay = null; // новая дата — заново показываем sender meta
                }
            }

            const mk = messageKeyOf(m);
            out.push({
                kind: "msg",
                key: `m:${mk}`,
                msg: m,
                messageKey: mk,
                prevFromUserId: prevFromInDay,
            });

            prevFromInDay = getFromUserId(m);
        }
        return out;
    }, [messages]);

    // -------- scroll helpers --------
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
        if (!el || !key) return false;

        const node = el.querySelector(`#msg-${cssEscapeSafe(String(key))}`);
        if (node && typeof node.scrollIntoView === "function") {
            node.scrollIntoView({ block: "center", behavior: "smooth" });
            setHighlightKey(String(key));

            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = setTimeout(() => setHighlightKey(null), 1400);
            return true;
        }
        return false;
    }, []);

    const getScrollState = React.useCallback(() => {
        const el = listRef.current;
        if (!el) return null;

        const scrollTop = el.scrollTop;

        const nodes = el.querySelectorAll('[id^="msg-"]');
        let anchorKey = null;
        let anchorOffset = 0;

        for (const node of nodes) {
            const top = node.offsetTop;
            if (top >= scrollTop + 8) {
                anchorKey = String(node.id).replace(/^msg-/, "");
                anchorOffset = top - scrollTop;
                break;
            }
        }

        if (!anchorKey && nodes.length) {
            const node = nodes[0];
            anchorKey = String(node.id).replace(/^msg-/, "");
            anchorOffset = node.offsetTop - scrollTop;
        }

        return { scrollTop, anchorKey, anchorOffset };
    }, []);

    const restoreScrollState = React.useCallback((state) => {
        const el = listRef.current;
        if (!el || !state) return;

        if (state.anchorKey) {
            const node = el.querySelector(`#msg-${cssEscapeSafe(String(state.anchorKey))}`);
            if (node) {
                const nextTop = Math.max(0, node.offsetTop - (Number(state.anchorOffset) || 0));
                el.scrollTo({ top: nextTop, behavior: "auto" });
                return;
            }
        }

        if (typeof state.scrollTop === "number") {
            el.scrollTo({ top: Math.max(0, state.scrollTop), behavior: "auto" });
        }
    }, []);

    React.useImperativeHandle(ref, () => ({
        jumpToMessage,
        getScrollState,
        restoreScrollState,
    }));

    // -------- context menu closing --------
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

        window.addEventListener("mousedown", onDown);
        window.addEventListener("keydown", onKey, true);
        return () => {
            window.removeEventListener("mousedown", onDown);
            window.removeEventListener("keydown", onKey, true);
        };
    }, [menu, reactPop]);

    React.useEffect(() => {
        if (menu?.message && getDeleted(menu.message)) setMenu(null);
        if (reactPop?.message && getDeleted(reactPop.message)) setReactPop(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);

    // -------- sticky day --------
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

    // -------- load more on top (keep position) --------
    const moreLockRef = React.useRef(false);
    const lastMoreAtRef = React.useRef(0);

    const onScroll = (e) => {
        const el = e.currentTarget;

        const atTop = el.scrollTop <= 24;
        if (atTop && onRequestMore && !loading) {
            const now = Date.now();
            if (!moreLockRef.current && now - lastMoreAtRef.current > 700) {
                moreLockRef.current = true;
                lastMoreAtRef.current = now;

                const beforeHeight = el.scrollHeight;
                const beforeTop = el.scrollTop;

                Promise.resolve(onRequestMore())
                    .catch(() => {})
                    .finally(() => {
                        moreLockRef.current = false;
                        requestAnimationFrame(() => {
                            const afterHeight = el.scrollHeight;
                            const delta = afterHeight - beforeHeight;
                            if (delta > 0) el.scrollTop = beforeTop + delta;
                        });
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

    // -------- autoscroll on new messages --------
    const prevLenRef = React.useRef(0);
    React.useEffect(() => {
        const prevLen = prevLenRef.current;
        prevLenRef.current = messages.length;

        if (messages.length === 0) return;

        if (prevLen === 0) {
            scrollToBottom(false);
            return;
        }

        if (messages.length <= prevLen) return;

        const last = messages[messages.length - 1];

        // ✅ mine: сначала берём флаг mine из API, если нет — fallback по meId
        const mineByApi = getMineFlag(last);
        const mine =
            typeof mineByApi === "boolean"
                ? mineByApi
                : meId != null && getFromUserId(last) != null && String(getFromUserId(last)) === String(meId);

        scrollToBottom(mine);
    }, [messages.length, meId, scrollToBottom, messages]);

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

    // -------- ✅ per-message observer (read when visible) --------
    const roleStr = String(myRole || "").toLowerCase();
    const isPsychLike = roleStr.includes("psy") || roleStr.includes("admin");

    const ioRef = React.useRef(null);
    const nodesRef = React.useRef(new Map()); // mid:number -> element
    const seenLocalRef = React.useRef(new Set()); // mid:number already queued/sent
    const seenQueueRef = React.useRef(new Set());
    const flushTimerRef = React.useRef(0);

    const flushSeen = React.useCallback(() => {
        flushTimerRef.current = 0;
        if (typeof onMessagesSeen !== "function") {
            seenQueueRef.current.clear();
            return;
        }
        const ids = Array.from(seenQueueRef.current);
        if (!ids.length) return;

        seenQueueRef.current.clear();
        onMessagesSeen(ids);
    }, [onMessagesSeen]);

    const scheduleFlush = React.useCallback(() => {
        if (flushTimerRef.current) return;
        flushTimerRef.current = window.setTimeout(flushSeen, 500);
    }, [flushSeen]);

    const dialogIdActual = React.useMemo(() => {
        const d = normalizeDialogId(dialogId);
        if (d != null) return String(d);
        return String(guessDialogId(messages) ?? "");
    }, [dialogId, messages]);

    const lastDialogRef = React.useRef("");

    React.useEffect(() => {
        if (lastDialogRef.current === dialogIdActual) return;
        lastDialogRef.current = dialogIdActual;

        seenLocalRef.current.clear();
        seenQueueRef.current.clear();

        if (ioRef.current) {
            try {
                ioRef.current.disconnect();
            } catch {}
        }
        nodesRef.current.clear();
    }, [dialogIdActual]);

    React.useEffect(() => {
        const root = listRef.current;
        if (!root || typeof onMessagesSeen !== "function") return;

        if (ioRef.current) ioRef.current.disconnect();

        ioRef.current = new IntersectionObserver(
            (entries) => {
                if (typeof document !== "undefined" && document.visibilityState && document.visibilityState !== "visible") return;

                for (const e of entries) {
                    if (!e.isIntersecting) continue;
                    if (e.intersectionRatio < 0.65) continue;

                    const el = e.target;
                    const mid = el?.getAttribute?.("data-mid");
                    if (!mid) continue;

                    const n = Number(mid);
                    if (!Number.isFinite(n) || n <= 0) continue;

                    if (seenLocalRef.current.has(n)) continue;
                    seenLocalRef.current.add(n);
                    seenQueueRef.current.add(n);
                }

                if (seenQueueRef.current.size) scheduleFlush();
            },
            { root, threshold: [0.65] }
        );

        for (const el of nodesRef.current.values()) {
            ioRef.current.observe(el);
        }

        return () => {
            if (ioRef.current) ioRef.current.disconnect();
            ioRef.current = null;
            if (flushTimerRef.current) {
                clearTimeout(flushTimerRef.current);
                flushTimerRef.current = 0;
            }
        };
    }, [onMessagesSeen, scheduleFlush]);

    const attachReadableNode = React.useCallback((messageId, el) => {
        const mid = Number(messageId);
        if (!Number.isFinite(mid) || mid <= 0) return;

        const prev = nodesRef.current.get(mid);

        if (!el) {
            if (prev && ioRef.current) {
                try {
                    ioRef.current.unobserve(prev);
                } catch {}
            }
            nodesRef.current.delete(mid);
            return;
        }

        if (prev && ioRef.current) {
            try {
                ioRef.current.unobserve(prev);
            } catch {}
        }
        nodesRef.current.set(mid, el);
        if (ioRef.current) {
            try {
                ioRef.current.observe(el);
            } catch {}
        }
    }, []);

    // -------- ✅ bottom sentinel observer --------
    const bottomRef = React.useRef(null);
    const bottomIoRef = React.useRef(null);
    const bottomLockRef = React.useRef(0);

    React.useEffect(() => {
        const root = listRef.current;
        const sentinel = bottomRef.current;
        if (!root || !sentinel || typeof onBottomVisible !== "function") return;

        if (bottomIoRef.current) bottomIoRef.current.disconnect();

        bottomIoRef.current = new IntersectionObserver(
            (entries) => {
                if (typeof document !== "undefined" && document.visibilityState && document.visibilityState !== "visible") return;

                for (const e of entries) {
                    if (!e.isIntersecting) continue;

                    const now = Date.now();
                    if (now - bottomLockRef.current < 600) return;
                    bottomLockRef.current = now;

                    if (isAtBottomNow()) onBottomVisible();
                }
            },
            { root, threshold: [0.1] }
        );

        bottomIoRef.current.observe(sentinel);

        return () => {
            if (bottomIoRef.current) bottomIoRef.current.disconnect();
            bottomIoRef.current = null;
        };
    }, [onBottomVisible, isAtBottomNow]);

    // -------- UI --------
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

                // ✅ mine: сначала из API, потом fallback
                const mineByApi = getMineFlag(m);
                const mine =
                    typeof mineByApi === "boolean"
                        ? mineByApi
                        : meId != null && getFromUserId(m) != null && String(getFromUserId(m)) === String(meId);

                const deleted = getDeleted(m);

                const rawId = getId(m);
                const serverId = rawId != null && !isTmpId(rawId) ? Number(rawId) : null;
                const hasServerId = Number.isFinite(serverId) && serverId > 0;

                const canEdit = mine && !deleted;
                const canDelete = mine && !deleted;
                const canInteract = !deleted && hasServerId;

                const isPending = m?.status === "pending" || !hasServerId;
                const isFailed = m?.status === "failed";

                // legacy flags (если вернутся)
                const byClientLegacy = Boolean(m?.isReadByClient ?? m?.is_read_by_client);
                const byPsyLegacy = Boolean(m?.isReadByPsychologist ?? m?.is_read_by_psychologist);

                // ✅ NEW: readByMe/readByOther из API (приоритет)
                const readByMeApi = getReadByMeFlag(m);
                const readByOtherApi = getReadByOtherFlag(m);

                // ✅ "прочитано мной" для входящих
                const readByMe =
                    typeof readByMeApi === "boolean" ? readByMeApi : isPsychLike ? byPsyLegacy : byClientLegacy;

                // ✅ "прочитано собеседником" для моих
                const legacyOther = isPsychLike ? byClientLegacy : byPsyLegacy;

                const readByOther =
                    typeof readByOtherApi === "boolean"
                        ? readByOtherApi
                        : isGroup
                            ? Boolean(byClientLegacy || byPsyLegacy)
                            : legacyOther;


                // ✅ CHECKS: только для моих
                // readAt тоже считаем как "прочитано" (если вдруг бэк отдаёт timestamp)
                const isReadForChecks = mine ? Boolean(readByOther || getReadAt(m)) : false;

                // ✅ observe only: incoming + serverId + not deleted + not readByMe
                const shouldObserveRead = !mine && !deleted && hasServerId && !readByMe;

                const replyObj = m?.replyTo ?? null;
                const replyToMessageId = m?.replyToMessageId ?? m?.replyToId ?? replyObj?.id ?? null;
                const replyToClientId = m?.replyToClientId ?? null;
                const replyToKey = m?.replyToKey ?? replyToMessageId ?? replyToClientId ?? null;

                const replyMsg =
                    replyToKey && messageMap && typeof messageMap.get === "function" ? messageMap.get(String(replyToKey)) : null;

                const reactions = deleted ? [] : normalizeReactions(m?.reactions || m?._reactions);

                // ✅ NEW: sender meta for GROUP (без доп. запросов)
                const fromUserId = getFromUserId(m);
                const senderMetaAllowed = isGroup && !deleted && fromUserId != null && (showSenderMetaForMineInGroup || !mine);

                // показываем только если автор сменился (или это первое сообщение дня)
                const shouldShowSenderMeta =
                    senderMetaAllowed && String(fromUserId) !== String(r.prevFromUserId ?? "");

                const senderMeta = shouldShowSenderMeta ? resolveSender(m) : null;

                const renderReplyPreview = () => {
                    if (deleted) return null;
                    if (!replyToKey && !replyObj) return null;

                    if (replyMsg) {
                        const replyDeleted = getDeleted(replyMsg);

                        const who =
                            replyMsg?.fromUserName ||
                            replyMsg?.fromName ||
                            (getMineFlag(replyMsg) === true ||
                            (getFromUserId(replyMsg) != null && meId != null && String(getFromUserId(replyMsg)) === String(meId))
                                ? "Вы"
                                : "Собеседник");

                        let snippet = "Сообщение";
                        if (replyDeleted) {
                            snippet = "Сообщение удалено";
                        } else {
                            const text = String(getText(replyMsg) || "").trim();
                            snippet = text
                                ? text.slice(0, 90)
                                : Array.isArray(replyMsg?.attachments) && replyMsg.attachments.length
                                    ? "Вложение"
                                    : "Сообщение";
                        }

                        return (
                            <button
                                type="button"
                                className={`chat__reply ${replyDeleted ? "is-deleted" : ""}`}
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
                        <button type="button" className="chat__reply" onClick={() => jumpToMessage(String(replyToKey))} title="Перейти к сообщению">
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

                if (m?.system) {
                    return (
                        <div key={m.clientId || m.id} className="chat__sysmsg">
                            <div className="chat__sysmsg-pill">{m.text || m.content || ""}</div>
                        </div>
                    );
                }
                return (
                    <div
                        key={r.key}
                        id={`msg-${mk}`}
                        className={`chat__bubble-row ${mine ? "me" : ""} ${highlightKey === String(mk) ? "is-highlight" : ""}`}
                        data-mid={shouldObserveRead ? String(serverId) : undefined}
                        ref={
                            shouldObserveRead
                                ? (el) => {
                                    if (serverId != null) attachReadableNode(serverId, el);
                                }
                                : null
                        }
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
                            {!deleted ? (
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
                            ) : null}

                            {deleted ? (
                                <>
                                    <p style={{ opacity: 0.6, fontStyle: "italic", margin: 0 }}>Сообщение удалено</p>
                                    <div className="chat__bubble-meta">
                                        <span className="time">{fmtTime(getCreatedAt(m))}</span>
                                        {mine ? (
                                            <>
                                                {isPending ? <span className="chat__status">…</span> : null}
                                                {isFailed ? <span className="chat__status is-failed">!</span> : null}
                                                {!isPending && !isFailed ? <Checks read={isReadForChecks} /> : null}
                                            </>
                                        ) : null}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* ✅ NEW: sender meta в GROUP (по fromUserId + members) */}
                                    {shouldShowSenderMeta && senderMeta ? (
                                        <MessageSenderMeta sender={senderMeta} showName compact />
                                    ) : null}

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
                                            {fileAtts.map((a) => {
                                                const bytes = Number(a.size ?? a.sizeBytes ?? a.bytes ?? 0) || 0;
                                                const kb = bytes ? Math.max(1, Math.round(bytes / 1024)) : 0;

                                                return (
                                                    <a key={a.id || a.url} className="chat__file" href={a.url} target="_blank" rel="noreferrer">
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
                                                            {kb ? <div className="size">{kb} KB</div> : null}
                                                        </div>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    ) : null}

                                    {typeof onReact === "function" ? (
                                        <div className="chat__reactions">
                                            {reactions.map((rct) => (
                                                <button
                                                    key={rct.emoji}
                                                    type="button"
                                                    className={`chat__reaction chat__reactionChip ${rct.me ? "me" : ""}`}
                                                    onClick={() => {
                                                        if (!canInteract) return;
                                                        onReact?.(m, rct.emoji);
                                                    }}
                                                    title="Реакция"
                                                    disabled={!canInteract}
                                                >
                                                    <span className="e">{rct.emoji}</span>
                                                    <span className="c">{rct.count}</span>
                                                </button>
                                            ))}

                                            <button
                                                type="button"
                                                className="chat__reactionPlus"
                                                title={canInteract ? "Добавить реакцию" : "Реакции доступны после отправки"}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!canInteract) return;
                                                    setMenu(null);
                                                    setReactPop((prev) =>
                                                        prev?.messageKey === String(mk) ? null : { messageKey: String(mk), message: m, mine }
                                                    );
                                                }}
                                                disabled={!canInteract}
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
                                                                if (!canInteract) return;
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

                                    <div className="chat__bubble-meta">
                                        <span className="time">{fmtTime(getCreatedAt(m))}</span>
                                        {isEdited(m) ? <span className="chat__edited">ред.</span> : null}

                                        {mine ? (
                                            <>
                                                {isPending ? <span className="chat__status">…</span> : null}
                                                {isFailed ? <span className="chat__status is-failed">!</span> : null}

                                                {!isPending && !isFailed ? (
                                                    <button
                                                        type="button"
                                                        className="chat__checks-btn"
                                                        onClick={(e) => {
                                                            if (typeof onOpenReadInfo !== "function" || !hasServerId) return;
                                                            onOpenReadInfo({ messageId: serverId, anchorEl: e.currentTarget });
                                                        }}
                                                        title="Кто прочитал"
                                                        style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                                                    >
                                                        <Checks read={isReadForChecks} />
                                                    </button>
                                                ) : null}
                                            </>
                                        ) : null}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}

            {typing ? <TypingBubble text={typingText} /> : null}

            {/* ✅ sentinel для onBottomVisible */}
            <div ref={bottomRef} style={{ height: 1 }} />


            {hasNewHiddenMessages ? (
                <button className="chat__newmsg" type="button" onClick={() => scrollToBottom(true)}>
                    <IconArrowDown style={{ width: 18, height: 18, stroke: "currentColor" }} />
                    У вас новое сообщение
                </button>
            ) : null}

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

            {typeof onOpenMedia !== "function" ? (
                <MediaViewer open={viewer.open} items={mediaItems} startIndex={viewer.index} onClose={() => setViewer({ open: false, index: 0 })} />
            ) : null}
        </div>
    );
});

export default MessageList;
