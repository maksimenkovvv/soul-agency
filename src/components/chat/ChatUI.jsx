import React from "react";
import { useAuth } from "../../auth/authStore";
import { useChat } from "../../chat/useChat";
import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import MediaViewer from "./MediaViewer";
import ChatInfoDrawer from "./ChatInfoDrawer";
import { IconLock, IconInfo } from "./chatIcons";
import { useToast } from "../../ui/toast/ToastProvider";
import ChatMembersButton from "./ChatMembersButton";
import ChatMembersPopover from "./ChatMembersPopover";
import { chatApi } from "../../api/chatApi";
import ReadByPopover from "./ReadByPopover";
import { useLocation } from "react-router-dom";

/* -------------------- utils -------------------- */

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
 * ✅ ВАЖНО: ключ должен быть безопасным для DOM id (без пробелов)
 * иначе ломаются jump/restore/querySelector.
 */
function messageKeyOf(m) {
    const id = m?.id ?? m?.messageId ?? null;
    const clientId = m?.clientId ?? null;

    if (id != null) return safeIdPart(id);
    if (clientId != null) return safeIdPart(clientId);

    const dialogId = normalizeDialogId(m?.dialogId ?? m?.chatId ?? m?.threadId ?? m?.chatId ?? null);
    const created = m?.createdAt ?? m?.createdWhen ?? m?.created_at ?? m?.created_when ?? "";
    return `${safeIdPart(dialogId || "d")}:${safeIdPart(String(created) || "0")}`;
}

function isNonEmpty(v) {
    return v != null && String(v).trim() !== "";
}

function isMediaAtt(a) {
    const mime = String(a?.mime || "");
    const kind = String(a?.kind || "");
    if (kind === "image" || mime.startsWith("image/")) return "image";
    if (kind === "video" || mime.startsWith("video/")) return "video";
    return null;
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

function cssEscapeSafe(v) {
    const s = String(v ?? "");
    // Prefer native
    if (typeof window !== "undefined" && window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(s);
    }
    // Fallback: escape anything that can break selectors
    return s.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

function isFinitePositiveInt(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
}

// ✅ максимально совместимый вызов markDialogReadSeen (и главное: НЕ [object Object])
function safeMarkDialogReadSeen(fn, dialogId, messageId) {
    if (typeof fn !== "function") return;

    const did = normalizeDialogId(dialogId);
    if (did == null) return;

    const didStr = String(did);
    const midStr = messageId != null ? String(messageId) : null;

    try {
        if (!midStr) {
            fn(didStr);
            return;
        }
    } catch {}

    try {
        if (midStr) {
            fn(didStr, midStr);
            return;
        }
    } catch {}

    try {
        if (midStr) {
            fn(didStr, { messageId: midStr });
            return;
        }
    } catch {}

    try {
        if (midStr) {
            fn({ dialogId: didStr, messageId: midStr });
            return;
        }
    } catch {}

    try {
        if (midStr) {
            fn({ dialogId: didStr, lastReadMessageId: midStr });
            return;
        }
    } catch {}

    try {
        fn({ dialogId: didStr });
    } catch {}
}

/* -------------------- API field helpers (new + legacy) -------------------- */

function getText(m) {
    return m?.text ?? m?.content ?? "";
}

function getMine(m, myId) {
    // ✅ приоритет: API mine
    if (typeof m?.mine === "boolean") return m.mine;

    // legacy fallback
    const from = m?.fromUserId ?? m?.senderId ?? null;
    if (myId == null || from == null) return false;
    return String(from) === String(myId);
}

function getReadByMe(m, isPsychologistLike) {
    // ✅ приоритет: API readByMe
    if (typeof m?.readByMe === "boolean") return m.readByMe;

    // legacy flags
    const myFlag = isPsychologistLike ? "isReadByPsychologist" : "isReadByClient";
    return Boolean(m?.[myFlag]);
}

function getReadByOther(m, isPsychologistLike) {
    // ✅ приоритет: API readByOther
    if (typeof m?.readByOther === "boolean") return m.readByOther;

    // legacy flags (для МОИХ сообщений)
    return isPsychologistLike ? Boolean(m?.isReadByClient) : Boolean(m?.isReadByPsychologist);
}

function pickLastIncomingServerMessageId(arr, myId) {
    if (!Array.isArray(arr) || !arr.length) return null;

    for (let i = arr.length - 1; i >= 0; i--) {
        const m = arr[i];
        if (!m) continue;
        if (Boolean(m?.deleted || m?.isDeleted)) continue;

        const mine = getMine(m, myId);
        if (mine) continue;

        const rawId = m?.id ?? m?.messageId ?? null;
        if (rawId == null) continue;
        if (isTmpId(rawId)) continue;
        if (!isFinitePositiveInt(rawId)) continue;

        return String(rawId);
    }
    return null;
}

function collectUnreadIncomingIds(arr, myId, isPsychologistLike, limit = 80) {
    if (!Array.isArray(arr) || !arr.length) return [];

    const out = [];
    for (let i = arr.length - 1; i >= 0; i--) {
        const m = arr[i];
        if (!m) continue;
        if (Boolean(m?.deleted || m?.isDeleted)) continue;

        const mine = getMine(m, myId);
        if (mine) continue;

        const id = m?.id ?? m?.messageId ?? null;
        if (id == null || isTmpId(id)) continue;
        if (!isFinitePositiveInt(id)) continue;

        const readByMe = getReadByMe(m, isPsychologistLike);
        if (!readByMe) out.push(Number(id));

        if (out.length >= limit) break;
    }

    return Array.from(new Set(out)).filter((x) => Number.isFinite(x) && x > 0);
}

export default function ChatUI() {
    const toast = useToast();
    const location = useLocation();

    const deepLink = React.useMemo(() => {
        const sp = new URLSearchParams(location.search || "");

        const dialogId = sp.get("dialogId") || sp.get("chatId") || sp.get("did") || null;
        const messageId = sp.get("messageId") || sp.get("mid") || sp.get("msgId") || sp.get("msg") || null;

        return {
            dialogId: dialogId != null && String(dialogId).trim() !== "" ? String(dialogId) : null,
            messageId: messageId != null && String(messageId).trim() !== "" ? String(messageId) : null,
        };
    }, [location.search]);

    const deepLinkStateRef = React.useRef({
        key: null,
        jumpDone: false,
    });

    const { me } = useAuth();

    const {
        meId,
        dialogs,
        dialogsLoading,
        dialogsError,
        activeDialogId,
        activeDialog,

        activeTypingUsers = [], // ✅ ДОБАВИЛИ

        markDialogReadSeen,
        markMessagesRead,

        openDialog,
        messages,
        messagesLoading,
        loadMore,
        sendMessage,
        notifyTyping,
        editMessage,
        deleteMessage,
        reactToMessage,

        patchMessageLocal,
    } = useChat();

    const myRole = me?.role || null;
    const isPsychologistLike = myRole === "PSYCHOLOGIST" || myRole === "ADMIN";

    // ✅ единый id (если useChat ещё не дал meId — берём из auth)
    const myId = meId ?? me?.id ?? null;

    const seenLockRef = React.useRef({ did: null, at: 0 });
    const composerRef = React.useRef(null);
    const listRef = React.useRef(null);

    const [dragOver, setDragOver] = React.useState(false);
    const [editing, setEditing] = React.useState(null);
    const [replyTo, setReplyTo] = React.useState(null);

    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const membersBtnRef = React.useRef(null);
    const [membersOpen, setMembersOpen] = React.useState(false);

    const [viewer, setViewer] = React.useState({ open: false, index: 0 });

    /* -------------------- scroll remember (per dialog) -------------------- */

    const scrollStoreRef = React.useRef(new Map()); // did -> state
    const lastRestoredForRef = React.useRef(null); // did
    const restoringRef = React.useRef(false);

    const saveScroll = React.useCallback(
        (dialogId) => {
            const did = String(dialogId || "");
            if (!did) return;
            const st = listRef.current?.getScrollState?.();
            if (!st) return;

            scrollStoreRef.current.set(did, st);
            try {
                localStorage.setItem(`chat_scroll_${did}`, JSON.stringify(st));
            } catch {}
        },
        [listRef]
    );

    const loadScroll = React.useCallback((dialogId) => {
        const did = String(dialogId || "");
        if (!did) return null;

        const mem = scrollStoreRef.current.get(did);
        if (mem) return mem;

        try {
            const raw = localStorage.getItem(`chat_scroll_${did}`);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }, []);

    React.useEffect(() => {
        const did = activeDialogId ? String(activeDialogId) : null;
        return () => {
            if (did) saveScroll(did);
        };
    }, [activeDialogId, saveScroll]);

    React.useEffect(() => {
        const onVis = () => {
            if (document.visibilityState !== "visible" && activeDialogId) saveScroll(activeDialogId);
        };
        const onUnload = () => {
            if (activeDialogId) saveScroll(activeDialogId);
        };

        document.addEventListener("visibilitychange", onVis);
        window.addEventListener("beforeunload", onUnload);
        return () => {
            document.removeEventListener("visibilitychange", onVis);
            window.removeEventListener("beforeunload", onUnload);
        };
    }, [activeDialogId, saveScroll]);

    React.useEffect(() => {
        if (!activeDialogId) return;
        const t = window.setInterval(() => saveScroll(activeDialogId), 2000);
        return () => window.clearInterval(t);
    }, [activeDialogId, saveScroll]);

    React.useEffect(() => {
        lastRestoredForRef.current = null;
        restoringRef.current = false;
    }, [activeDialogId]);

    React.useEffect(() => {
        const did = activeDialogId ? String(activeDialogId) : null;
        if (!did) return;
        if (messagesLoading) return;
        if (!listRef.current?.restoreScrollState) return;

        if (lastRestoredForRef.current === did) return;
        if (restoringRef.current) return;

        restoringRef.current = true;

        const run = async () => {
            const st = loadScroll(did);

            if (
                deepLink.messageId &&
                (!deepLink.dialogId || String(deepLink.dialogId) === String(did)) &&
                !deepLinkStateRef.current.jumpDone
            ) {
                lastRestoredForRef.current = did;
                restoringRef.current = false;
                return;
            }

            if (!st) {
                lastRestoredForRef.current = did;
                restoringRef.current = false;
                return;
            }

            const waitFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
            await waitFrame();
            await waitFrame();

            const anchorKey = st?.anchorKey ? String(st.anchorKey) : null;

            const hasAnchorInDom = () => {
                if (!anchorKey) return true;
                const sel = `.chat__messages #msg-${cssEscapeSafe(anchorKey)}`;
                return Boolean(document.querySelector(sel));
            };

            let tries = 0;
            while (!hasAnchorInDom() && typeof loadMore === "function" && tries < 3) {
                tries += 1;
                try {
                    await Promise.resolve(loadMore());
                } catch {}
                await waitFrame();
                await waitFrame();
            }

            listRef.current?.restoreScrollState?.(st);

            await waitFrame();
            listRef.current?.restoreScrollState?.(st);

            lastRestoredForRef.current = did;
            restoringRef.current = false;
        };

        run().catch(() => {
            lastRestoredForRef.current = did;
            restoringRef.current = false;
        });
    }, [activeDialogId, messagesLoading, loadScroll, loadMore]);

    const readByAnchorRef = React.useRef(null);
    const [readByOpen, setReadByOpen] = React.useState(false);
    const [readByMessageId, setReadByMessageId] = React.useState(null);

    const openReadBy = React.useCallback(({ messageId, anchorEl } = {}) => {
        if (!messageId) return;
        readByAnchorRef.current = anchorEl || null;
        setReadByMessageId(String(messageId));
        setReadByOpen(true);
    }, []);

    const closeReadBy = React.useCallback(() => {
        setReadByOpen(false);
        setReadByMessageId(null);
        readByAnchorRef.current = null;
    }, []);


    /* -------------------- top bar helpers -------------------- */

    const fmtLastSeen = React.useCallback((v) => {
        if (!v) return "";
        const d = v instanceof Date ? v : new Date(v);
        if (Number.isNaN(d.getTime())) return "";
        const now = new Date();
        const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();

        const datePart = isToday
            ? "сегодня"
            : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(d);
        const timePart = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d);
        return `${datePart} в ${timePart}`;
    }, []);

    React.useEffect(() => {
        setEditing(null);
        closeReadBy();
        setReplyTo(null);
        setDrawerOpen(false);
        setMembersOpen(false);
        setViewer({ open: false, index: 0 });
        setDragOver(false);
    }, [activeDialogId]);

    /* -------------------- DnD -------------------- */

    const onDrop = React.useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);

            if (!activeDialog || Boolean(activeDialog.locked)) return;

            const files = e.dataTransfer?.files;
            if (files && files.length) composerRef.current?.addFiles?.(files);
        },
        [activeDialog]
    );

    const onDragOver = React.useCallback(
        (e) => {
            if (!activeDialog || Boolean(activeDialog.locked)) return;
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
        },
        [activeDialog]
    );

    const onDragLeave = React.useCallback((e) => {
        if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
        setDragOver(false);
    }, []);

    const loadReaders = React.useCallback(async (_chatId, messageId) => {
        const res = await chatApi.getMessageReaders(messageId);
        const list = Array.isArray(res) ? res : res?.items || res?.content || res?.data || [];

        // нормализуем, чтобы ReadByPopover точно понимал поля
        return (Array.isArray(list) ? list : []).map((x) => {
            const u = x?.user || x?.reader || x?.member || null;
            return {
                userId: x?.userId ?? u?.userId ?? u?.id ?? x?.id ?? null,
                fullName: x?.fullName ?? x?.name ?? u?.fullName ?? u?.name ?? u?.email ?? null,
                name: x?.name ?? u?.name ?? u?.fullName ?? null,
                avatarUrl: x?.avatarUrl ?? u?.avatarUrl ?? u?.avatar ?? null,
                readAt: x?.readAt ?? x?.read_at ?? x?.at ?? x?.timestamp ?? null,
            };
        });
    }, []);

    // ✅ group detection
    const isGroup = React.useMemo(() => {
        if (!activeDialog) return false;

        if (activeDialog?.type != null) return String(activeDialog.type).toUpperCase() === "GROUP";
        if (activeDialog?.chatType != null) return String(activeDialog.chatType).toUpperCase() === "GROUP";
        if (activeDialog?.isGroup != null) return Boolean(activeDialog.isGroup);

        const mc = Number(activeDialog?.membersCount ?? NaN);
        if (Number.isFinite(mc)) return mc > 2;

        const mem = Array.isArray(activeDialog?.members) ? activeDialog.members : [];
        if (mem.length) return mem.length > 2;

        if (activeDialog?.partnerUserId == null) return true;
        return false;
    }, [activeDialog]);

    const members = Array.isArray(activeDialog?.members) ? activeDialog.members : [];
    const membersCount = Number.isFinite(Number(activeDialog?.membersCount))
        ? Number(activeDialog?.membersCount)
        : members.length;

    const onlineCount = Number.isFinite(Number(activeDialog?.onlineCount))
        ? Number(activeDialog?.onlineCount)
        : members.filter((m) => m?.isOnline === true || m?.online === true).length;

    const typingActive =
        (Array.isArray(activeTypingUsers) && activeTypingUsers.length > 0 && !Boolean(activeDialog?.locked)) ||
        (Boolean(activeDialog?.typing) && !Boolean(activeDialog?.locked));

    const typingText = React.useMemo(() => {
        if (!typingActive) return "";

        if (!isGroup) return "Печатает…";

        const ids = Array.isArray(activeTypingUsers) ? activeTypingUsers : [];
        if (!ids.length) return "Печатает…";

        const nameOf = (id) => {
            const m = members.find((x) => Number(x?.userId ?? x?.id) === Number(id));
            return m?.fullName || m?.name || m?.title || m?.email || "Кто-то";
        };

        const names = ids.map(nameOf).filter(Boolean);

        if (names.length === 1) return `${names[0]} печатает…`;
        if (names.length === 2) return `${names[0]} и ${names[1]} печатают…`;
        return `${names[0]} и ещё ${names.length - 1} печатают…`;
    }, [typingActive, isGroup, activeTypingUsers, members]);


    /**
     * ✅ нормализуем UI поля:
     * - гарантируем m.text для UI
     * - виртуальный readAt для галочек (если readByOther=true, а readAt нет) — только для МОИХ server-сообщений
     */
    const uiMessages = React.useMemo(() => {
        const arr = Array.isArray(messages) ? messages : [];
        if (!arr.length) return arr;

        return arr.map((m) => {
            const text = getText(m);
            const mine = getMine(m, myId);
            const readByOther = getReadByOther(m, isPsychologistLike);

            // ✅ виртуальный readAt только для моих server сообщений
            if (mine && readByOther && !m?.readAt && (m?.id != null && !isTmpId(m.id) && isFinitePositiveInt(m.id))) {
                const at =
                    m?.lastModified ||
                    m?.editedAt ||
                    (m?.createdAt instanceof Date ? m.createdAt.toISOString() : m?.createdAt) ||
                    m?.createdWhen ||
                    new Date().toISOString();

                return { ...m, text, readAt: at };
            }

            return m?.text != null ? m : { ...m, text };
        });
    }, [messages, myId, isPsychologistLike]);

    const hasUnreadIncoming = React.useMemo(() => {
        const arr = Array.isArray(uiMessages) ? uiMessages : [];
        if (!arr.length) return false;

        for (let i = arr.length - 1; i >= 0; i--) {
            const m = arr[i];
            if (!m) continue;
            if (Boolean(m?.deleted || m?.isDeleted)) continue;

            const mine = getMine(m, myId);
            if (mine) continue;

            const readByMe = getReadByMe(m, isPsychologistLike);
            return !readByMe;
        }
        return false;
    }, [uiMessages, myId, isPsychologistLike]);

    const messageMap = React.useMemo(() => {
        const map = new Map();
        for (const m of uiMessages || []) {
            const k = messageKeyOf(m);
            map.set(String(k), m);
            if (m?.id != null) map.set(String(m.id), m);
            if (m?.clientId != null) map.set(String(m.clientId), m);
        }
        return map;
    }, [uiMessages]);

    const mediaItems = React.useMemo(() => {
        const out = [];
        for (const m of uiMessages || []) {
            const deleted = Boolean(m?.deleted || m?.isDeleted);
            if (deleted) continue;

            const atts = Array.isArray(m?.attachments) ? m.attachments : [];
            for (const a of atts) {
                const kind = isMediaAtt(a);
                if (!kind || !a?.url) continue;
                out.push({
                    key: `${messageKeyOf(m)}::${a?.id || a?.url || "a"}`,
                    url: a.url,
                    mime: a.mime,
                    kind,
                    name: a.name,
                    caption: getText(m) || "",
                    createdAt: m?.createdAt || m?.createdWhen,
                    messageKey: messageKeyOf(m),
                });
            }
        }
        return out;
    }, [uiMessages]);

    const mediaIndexByKey = React.useMemo(() => {
        const map = new Map();
        mediaItems.forEach((it, idx) => map.set(it.key, idx));
        return map;
    }, [mediaItems]);

    const openMediaAt = React.useCallback((index) => {
        setViewer({ open: true, index: Math.max(0, Number(index) || 0) });
    }, []);

    const jumpToMessage = React.useCallback((messageKey) => {
        listRef.current?.jumpToMessage?.(String(messageKey));
    }, []);

    /* -------------------- open dialog (save scroll before switching) -------------------- */

    const handleOpenDialog = React.useCallback(
        (dialogId) => {
            if (activeDialogId) saveScroll(activeDialogId);
            if (typeof openDialog === "function") openDialog(dialogId);
        },
        [activeDialogId, saveScroll, openDialog]
    );

    React.useEffect(() => {
        const did = deepLink.dialogId;
        const mid = deepLink.messageId;

        // deep-link вообще не задан
        if (!did && !mid) return;

        const key = `${did || ""}|${mid || ""}`;
        if (deepLinkStateRef.current.key !== key) {
            deepLinkStateRef.current.key = key;
            deepLinkStateRef.current.jumpDone = false;
        }

        // если указан dialogId — открываем его
        if (did && String(activeDialogId || "") !== String(did || "")) {
            handleOpenDialog(did);
        }
    }, [deepLink.dialogId, deepLink.messageId, activeDialogId, handleOpenDialog]);


    /* -------------------- read seen -------------------- */

    const lastBottomMarkRef = React.useRef({ did: null, at: 0 });

    const onBottomVisible = React.useCallback(() => {
        if (!activeDialog?.id) return;
        if (typeof document !== "undefined" && document.visibilityState && document.visibilityState !== "visible") return;
        if (!hasUnreadIncoming) return;

        const did = String(activeDialog.id);
        const now = Date.now();
        if (lastBottomMarkRef.current.did === did && now - lastBottomMarkRef.current.at < 1200) return;
        lastBottomMarkRef.current = { did, at: now };

        // 1) per-message
        if (typeof markMessagesRead === "function") {
            const ids = collectUnreadIncomingIds(uiMessages, myId, isPsychologistLike, 80);
            if (ids.length) {
                markMessagesRead({ dialogId: activeDialog.id, messageIds: ids }).catch?.(() => {});
            }
            return;
        }

        // 2) legacy
        const lastIncomingId = pickLastIncomingServerMessageId(uiMessages, myId);
        if (!lastIncomingId) return;
        safeMarkDialogReadSeen(markDialogReadSeen, activeDialog.id, lastIncomingId);
    }, [
        activeDialog?.id,
        activeDialog,
        hasUnreadIncoming,
        uiMessages,
        myId,
        isPsychologistLike,
        markMessagesRead,
        markDialogReadSeen,
    ]);

    /* -------------------- reply / react / submit -------------------- */

    const handleReply = React.useCallback(
        (m) => {
            if (!m) return;

            if (Boolean(m?.deleted || m?.isDeleted)) {
                toast.info("Нельзя ответить на удалённое сообщение", { duration: 2200 });
                return;
            }

            const serverId = m?.id != null && !isTmpId(m.id) && isFinitePositiveInt(m.id) ? String(m.id) : null;
            if (!serverId) {
                toast.info("Можно ответить после отправки сообщения", { duration: 2200 });
                return;
            }

            setReplyTo({
                messageId: serverId,
                fromUserId: m?.fromUserId ?? null,
                fromName: m?.fromUserName || m?.fromName || null,
                text: getText(m) || "",
                createdAt: m?.createdAt || m?.createdWhen || null,
            });

            setTimeout(() => composerRef.current?.focus?.(), 0);
        },
        [toast]
    );

    const handleReact = React.useCallback(
        (m, emoji) => {
            if (!activeDialog || !m || !emoji) return;
            if (Boolean(m?.deleted || m?.isDeleted)) return;

            const serverMessageId = m?.id != null && !isTmpId(m.id) && isFinitePositiveInt(m.id) ? String(m.id) : null;
            if (!serverMessageId) {
                toast.info("Реакцию можно поставить после отправки сообщения", { duration: 2200 });
                return;
            }

            const cur = normalizeReactions(m?.reactions);
            const exists = cur.find((r) => String(r.emoji) === String(emoji));
            const add = exists ? !Boolean(exists.me) : true;

            if (typeof reactToMessage !== "function") {
                toast.error("reactToMessage не подключён в useChat()", { duration: 2600 });
                return;
            }

            reactToMessage({
                dialogId: activeDialog.id,
                messageId: serverMessageId,
                emoji: String(emoji),
                add,
            });
        },
        [activeDialog, reactToMessage, toast]
    );

    const onSubmit = async ({ text, files, replyToMessageId, replyTo: replyToObj }) => {
        if (!activeDialog) return;

        // ✅ edit mode
        if (editing) {
            const editServerId =
                editing?.id != null && !isTmpId(editing.id) && isFinitePositiveInt(editing.id) ? String(editing.id) : null;

            // 1) server edit
            if (editServerId) {
                await editMessage({
                    dialogId: activeDialog.id,
                    messageId: editServerId,
                    text,
                });
                setEditing(null);
                toast.success("Сообщение обновлено", { duration: 2200 });
                return;
            }

            // 2) локальная правка pending (без NaN в WS)
            const localKey = editing?.clientId ?? editing?.id ?? null;
            if (localKey && typeof patchMessageLocal === "function") {
                patchMessageLocal(activeDialog.id, localKey, (cur) => ({
                    ...cur,
                    text,
                    content: text,
                    isEdited: true,
                    editedAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                }));
                setEditing(null);
                toast.success("Сообщение обновлено", { duration: 2200 });
                return;
            }

            setEditing(null);
            return;
        }

        const finalReplyToMessageId = replyToMessageId ?? replyTo?.messageId ?? null;
        const finalReplyTo = replyToObj ?? replyTo ?? null;

        await sendMessage({
            dialogId: activeDialog.id,
            text,
            files,
            replyToMessageId: finalReplyToMessageId,
            replyTo: finalReplyTo,
        });

        setReplyTo(null);
    };

    // ✅ per-message read: MessageList присылает ids/keys видимых сообщений
    const onMessagesSeen = React.useCallback(
        async (messageIds) => {
            if (!activeDialog?.id) return;
            if (!Array.isArray(messageIds) || messageIds.length === 0) return;
            if (typeof document !== "undefined" && document.visibilityState && document.visibilityState !== "visible") return;

            const did = String(activeDialog.id);
            const now = Date.now();
            if (seenLockRef.current.did === did && now - seenLockRef.current.at < 250) return;
            seenLockRef.current = { did, at: now };

            const ids = [];
            for (const raw of messageIds) {
                if (raw == null) continue;
                if (isTmpId(raw)) continue;

                // ✅ raw может быть id или messageKey — пробуем через messageMap
                const key = String(raw);
                const m = messageMap.get(key);
                if (!m) continue;

                if (Boolean(m?.deleted || m?.isDeleted)) continue;

                const mine = getMine(m, myId);
                if (mine) continue;

                const readByMe = getReadByMe(m, isPsychologistLike);
                if (readByMe) continue;

                const mid = m?.id ?? m?.messageId ?? null;
                if (mid == null || isTmpId(mid)) continue;
                if (!isFinitePositiveInt(mid)) continue;

                ids.push(Number(mid));
                if (ids.length >= 80) break;
            }

            const uniqIds = Array.from(new Set(ids));
            if (!uniqIds.length) return;

            if (typeof markMessagesRead === "function") {
                try {
                    await markMessagesRead({ dialogId: activeDialog.id, messageIds: uniqIds });
                } catch {}
            } else {
                const lastIncomingId = pickLastIncomingServerMessageId(uiMessages, myId);
                if (lastIncomingId) safeMarkDialogReadSeen(markDialogReadSeen, activeDialog.id, lastIncomingId);
            }
        },
        [activeDialog?.id, activeDialog, markMessagesRead, uiMessages, myId, isPsychologistLike, markDialogReadSeen, messageMap]
    );

    React.useEffect(() => {
        const did = deepLink.dialogId;
        const mid = deepLink.messageId;

        if (!mid) return; // прыгать некуда

        // если в ссылке задан dialogId — ждём пока он станет активным
        if (did && String(activeDialogId || "") !== String(did || "")) return;

        // должен быть активный диалог
        if (!activeDialogId) return;

        // пока грузим — не дёргаем
        if (messagesLoading) return;

        if (deepLinkStateRef.current.jumpDone) return;
        if (!listRef.current?.jumpToMessage) return;

        let cancelled = false;

        const waitFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
        const keyA = String(mid);
        const keyB = safeIdPart(mid); // потому что DOM id безопасный

        const hasInDom = () => {
            const a = `.chat__messages #msg-${cssEscapeSafe(keyA)}`;
            const b = `.chat__messages #msg-${cssEscapeSafe(keyB)}`;
            return Boolean(document.querySelector(a) || document.querySelector(b));
        };

        const hasInMap = () => {
            return Boolean(messageMap?.get(keyA) || messageMap?.get(keyB));
        };

        const run = async () => {
            // 1) пытаемся догрузить, пока не появится (в map или в DOM)
            let tries = 0;
            while (!cancelled && tries < 15 && typeof loadMore === "function" && !hasInMap() && !hasInDom()) {
                tries += 1;
                try {
                    await Promise.resolve(loadMore());
                } catch {}
                await waitFrame();
                await waitFrame();
            }

            if (cancelled) return;

            // 2) прыжок (на всякий — 2 раза, чтобы после рендера точно сработало)
            listRef.current?.jumpToMessage?.(keyB);
            await waitFrame();
            listRef.current?.jumpToMessage?.(keyB);

            deepLinkStateRef.current.jumpDone = true;
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [
        deepLink.dialogId,
        deepLink.messageId,
        activeDialogId,
        messagesLoading,
        loadMore,
        messageMap,
    ]);


    /* -------------------- render -------------------- */

    return (
        <div className="b-chat">
            <ChatSidebar
                dialogs={dialogs}
                loading={dialogsLoading}
                error={dialogsError}
                activeDialogId={activeDialogId}
                onOpen={handleOpenDialog}
            />

            <div className="chat__panel chat__main" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
                {!activeDialog ? (
                    <div className="chat__main__title">Выберите диалог слева</div>
                ) : (
                    <>
                        <div className="chat__topbar">
                            <ChatMembersPopover
                                open={membersOpen}
                                anchorRef={membersBtnRef}
                                members={members}
                                meId={myId}
                                myRole={myRole}
                                onClose={() => setMembersOpen(false)}
                                searchUsers={(q) => chatApi.searchUsers(q)}
                                onAddUser={async (u) => {
                                    const uid = u?.userId ?? u?.id;
                                    if (!uid) return;

                                    await chatApi.addMember(activeDialog.id, uid);
                                    toast.success(`${u?.fullName || u?.name || u?.email || "Пользователь"} добавлен(а)`, { duration: 2200 });
                                    setMembersOpen(false);
                                }}
                                onRemoveUser={async (m) => {
                                    const uid = m?.userId ?? m?.id;
                                    if (!uid) return;

                                    const name = m?.fullName || m?.name || m?.email || "Пользователь";
                                    await chatApi.removeMember(activeDialog.id, uid);
                                    toast.success(`${name} удалён(а)`, { duration: 2200 });
                                }}
                            />


                            <div className="chat__topbar-left">
                                <div className="chat__avatar">
                                    {activeDialog.avatarUrl ? <img src={activeDialog.avatarUrl} alt="" /> : <div className="chat__avatar-fallback" />}
                                </div>

                                <div className="chat__title">
                                    <div className="name">{activeDialog.title || "Диалог"}</div>

                                    <div className="meta">
                                        {activeDialog.locked ? (
                                            <span className="chat__mini">
                        <IconLock style={{ width: 16, height: 16, stroke: "currentColor" }} />
                        Чат закрыт
                      </span>
                                        ) : typingActive ? (
                                            <span className="chat__typing">
                                                {typingText || "Печатает…"}
                                                <span className="dots">
                                                  <span />
                                                  <span />
                                                  <span />
                                                </span>
                                              </span>
                                        ) : (

                                            <span className="chat__mini">
                        {isGroup ? (
                            <span ref={membersBtnRef} style={{ position: "relative", display: "inline-flex" }}>
                            <ChatMembersButton
                                count={membersCount}
                                onlineCount={Number.isFinite(onlineCount) ? onlineCount : undefined}
                                onClick={() => setMembersOpen((v) => !v)}
                            />
                          </span>
                        ) : (
                            <>
                                {activeDialog.online
                                    ? "В сети"
                                    : activeDialog.lastSeenAt
                                        ? `Был(а) ${fmtLastSeen(activeDialog.lastSeenAt)}`
                                        : "Не в сети"}
                            </>
                        )}
                      </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="chat__topbar-right">
                                <button
                                    type="button"
                                    className="chat__topbar-btn"
                                    onClick={() => setDrawerOpen((v) => !v)}
                                    aria-label="Информация"
                                    title="Информация"
                                >
                                    <IconInfo style={{ width: 18, height: 18, stroke: "currentColor" }} />
                                </button>
                            </div>
                        </div>

                        {activeDialog.locked ? (
                            <div className="chat__readonly">
                                <p>Этот чат сейчас только для чтения.</p>
                            </div>
                        ) : null}

                        <ReadByPopover
                            open={readByOpen}
                            anchorRef={readByAnchorRef}
                            chatId={activeDialog.id}
                            messageId={readByMessageId}
                            loadReaders={loadReaders}
                            onClose={closeReadBy}
                        />

                        <MessageList
                            ref={listRef}
                            messages={uiMessages}
                            meId={myId}
                            myRole={myRole}
                            loading={messagesLoading}
                            onRequestMore={loadMore}
                            typing={typingActive}
                            typingText={typingText}
                            onReply={handleReply}
                            onReact={handleReact}
                            onMessagesSeen={onMessagesSeen}
                            onOpenMedia={openMediaAt}
                            mediaItems={mediaItems}
                            mediaIndexByKey={mediaIndexByKey}
                            messageMap={messageMap}
                            onBottomVisible={onBottomVisible}

                            dialogId={activeDialog.id}
                            members={members}
                            chatType={activeDialog.type || activeDialog.chatType || (isGroup ? "GROUP" : "DIRECT")}
                            onOpenReadInfo={openReadBy}
                            onEdit={(m) => {
                                if (!m || Boolean(m?.deleted || m?.isDeleted)) return;
                                setEditing(m);
                                setReplyTo(null);
                                setTimeout(() => composerRef.current?.focus?.(), 0);
                            }}
                            onDelete={(m) => {
                                if (!m) return;

                                const deleted = Boolean(m?.deleted || m?.isDeleted);
                                if (deleted) return;

                                // ✅ delete server message only when id is numeric
                                const serverId = m?.id != null && !isTmpId(m.id) && isFinitePositiveInt(m.id) ? String(m.id) : null;

                                if (serverId) {
                                    deleteMessage({ dialogId: activeDialog.id, messageId: serverId });
                                    toast.success("Сообщение удалено", { duration: 2200 });
                                    return;
                                }

                                // ✅ pending/local delete (без NaN в WS)
                                const localKey = m?.clientId ?? m?.id ?? null;
                                if (localKey && typeof patchMessageLocal === "function") {
                                    patchMessageLocal(activeDialog.id, localKey, (cur) => ({
                                        ...cur,
                                        deleted: true,
                                        isDeleted: true,
                                        deletedAt: new Date().toISOString(),
                                        deletedWhen: new Date().toISOString(),
                                        text: "Сообщение удалено",
                                        content: "Сообщение удалено",
                                        attachments: [],
                                        reactions: [],
                                        replyTo: null,
                                        replyToKey: null,
                                        replyToMessageId: null,
                                        replyToClientId: null,
                                    }));
                                    toast.success("Сообщение удалено", { duration: 2200 });
                                }
                            }}
                        />

                        <ChatComposer
                            ref={composerRef}
                            disabled={Boolean(activeDialog.locked)}
                            mode={editing ? "edit" : "send"}
                            initialText={getText(editing) || ""}
                            onCancel={() => setEditing(null)}
                            onTyping={() => {
                                if (activeDialog.locked) return;
                                if (typeof notifyTyping === "function") notifyTyping(activeDialog.id);
                            }}
                            replyTo={replyTo}
                            onClearReply={() => setReplyTo(null)}
                            onSubmit={onSubmit}
                        />

                        {dragOver ? (
                            <div className="chat__dropzone">
                                <div className="chat__dropzone-card">Отпустите файлы, чтобы прикрепить</div>
                            </div>
                        ) : null}

                        <ChatInfoDrawer
                            open={drawerOpen}
                            onClose={() => setDrawerOpen(false)}
                            messages={uiMessages}
                            mediaItems={mediaItems}
                            onOpenMedia={(idx) => openMediaAt(idx)}
                            onJumpToMessage={(key) => {
                                setDrawerOpen(false);
                                setTimeout(() => jumpToMessage(key), 50);
                            }}
                        />

                        <MediaViewer
                            open={viewer.open}
                            items={mediaItems}
                            startIndex={viewer.index}
                            onClose={() => setViewer({ open: false, index: 0 })}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
