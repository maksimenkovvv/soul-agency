import React from "react";
import { useAuth } from "../auth/authStore";
import { useWs } from "../ws/wsStore";
import { useToast } from "../ui/toast/ToastProvider";
import { chatApi } from "../api/chatApi";
import { chatConfig } from "./chatConfig";

const CHAT_DEBUG =
    String(process.env.REACT_APP_CHAT_DEBUG || "") === "1" ||
    process.env.NODE_ENV === "development";

function dbg(...args) {
    if (CHAT_DEBUG) console.log(...args);
}

function uid() {
    return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

function toDate(v) {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
}

function isNonEmpty(v) {
    return v != null && String(v).trim() !== "";
}

function pickFirst(...vals) {
    for (const v of vals) if (isNonEmpty(v)) return v;
    return null;
}

function tryParseJSON(v) {
    if (v == null) return v;
    if (typeof v !== "string") return v;
    const s = v.trim();
    if (!s) return v;
    try {
        return JSON.parse(s);
    } catch {
        return v;
    }
}

/**
 * Делает абсолютный URL для /images/... (админка на другом домене)
 * Настрой:
 *   REACT_APP_MEDIA_BASE_URL=https://api.example.com
 */
function resolveMediaUrl(url) {
    if (!url) return undefined;
    const s = String(url);

    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("data:") || s.startsWith("blob:")) return s;

    const base =
        process.env.REACT_APP_MEDIA_BASE_URL ||
        process.env.REACT_APP_API_BASE_URL ||
        process.env.REACT_APP_BACKEND_URL ||
        "";

    if (!base) return s;

    const b = String(base).replace(/\/+$/, "");
    const p = s.startsWith("/") ? s : `/${s}`;
    return `${b}${p}`;
}

function hasAny(obj, keys) {
    return keys.some((k) => obj != null && obj[k] != null);
}

function messageKeyOf(m) {
    return m?.id || m?.clientId || `${m?.dialogId || "d"}:${String(m?.createdAt || "")}`;
}

/**
 * ✅ normDialog: НЕ подставляем дефолты, если поле не пришло
 */
function normDialog(raw) {
    if (!raw) return null;

    const id = raw.id ?? raw.dialogId ?? raw.chatId ?? raw.dialog_id ?? raw.chat_id;
    if (id == null) return null;

    const titlePresent = hasAny(raw, [
        "title",
        "name",
        "displayName",
        "partnerName",
        "partner_name",
        "display_name",
    ]);
    const title = titlePresent
        ? pickFirst(raw.title, raw.name, raw.displayName, raw.partnerName, raw.partner_name, raw.display_name) ||
        undefined
        : undefined;

    const avatarPresent = hasAny(raw, [
        "avatarUrl",
        "avatar",
        "photoUrl",
        "partnerAvatarUrl",
        "avatar_url",
        "partner_avatar_url",
        "photo_url",
    ]);
    const avatarUrlRaw = avatarPresent
        ? pickFirst(
        raw.avatarUrl,
        raw.avatar,
        raw.photoUrl,
        raw.partnerAvatarUrl,
        raw.avatar_url,
        raw.partner_avatar_url,
        raw.photo_url
    ) || undefined
        : undefined;

    const lastMessagePresent =
        hasAny(raw, ["lastMessage", "lastText", "preview", "last_message", "last_text", "last_message_text"]) ||
        (raw.last && raw.last.text != null);
    const lastMessage = lastMessagePresent
        ? pickFirst(
        raw.lastMessage,
        raw.lastText,
        raw.last?.text,
        raw.preview,
        raw.last_message,
        raw.last_text,
        raw.last_message_text
    ) || undefined
        : undefined;

    const updatedAtPresent = hasAny(raw, [
        "updatedAt",
        "lastMessageAt",
        "lastAt",
        "modifiedAt",
        "createdAt",
        "updated_at",
        "last_message_at",
        "last_at",
        "modified_at",
        "created_at",
    ]);
    const updatedAt = updatedAtPresent
        ? toDate(
        raw.updatedAt ??
        raw.lastMessageAt ??
        raw.lastAt ??
        raw.modifiedAt ??
        raw.createdAt ??
        raw.updated_at ??
        raw.last_message_at ??
        raw.last_at ??
        raw.modified_at ??
        raw.created_at
    ) || undefined
        : undefined;

    const unreadPresent = hasAny(raw, ["unreadCount", "unread", "unreadMessages", "unread_count", "unread_messages"]);
    const unreadCount = unreadPresent
        ? Number(raw.unreadCount ?? raw.unread ?? raw.unreadMessages ?? raw.unread_count ?? raw.unread_messages) || 0
        : undefined;

    const onlinePresent =
        raw.online != null ||
        raw.isOnline != null ||
        raw.partnerIsOnline != null ||
        raw.partnerOnline != null ||
        raw.partner_is_online != null ||
        raw.partner_online != null;

    const online = onlinePresent
        ? Boolean(
            raw.online ??
            raw.isOnline ??
            raw.partnerIsOnline ??
            raw.partnerOnline ??
            raw.partner_is_online ??
            raw.partner_online
        )
        : undefined;

    const lastSeenPresent =
        raw.partnerLastSeenAt != null ||
        raw.lastSeenAt != null ||
        raw.partner_last_seen_at != null ||
        raw.last_seen_at != null;
    const lastSeenAtRaw = raw.partnerLastSeenAt ?? raw.lastSeenAt ?? raw.partner_last_seen_at ?? raw.last_seen_at;
    const lastSeenAt = lastSeenPresent ? toDate(lastSeenAtRaw) || undefined : undefined;

    const typingPresent = raw.typing != null || raw.isTyping != null || raw.is_typing != null;
    const typing = typingPresent ? Boolean(raw.typing ?? raw.isTyping ?? raw.is_typing) : undefined;

    const lockedPresent =
        raw.locked != null ||
        raw.isLocked != null ||
        raw.readOnly != null ||
        raw.locked_flag != null ||
        raw.read_only != null;
    const locked = lockedPresent
        ? Boolean(raw.locked ?? raw.isLocked ?? raw.readOnly ?? raw.locked_flag ?? raw.read_only)
        : undefined;

    return {
        id: String(id),
        title,
        avatarUrl: avatarUrlRaw ? resolveMediaUrl(avatarUrlRaw) : undefined,
        lastMessage,
        updatedAt,
        unreadCount,
        online,
        lastSeenAt,
        locked,
        typing,
        partnerUserId:
            raw.partnerUserId ??
            raw.otherUserId ??
            raw.peerUserId ??
            raw.partner_user_id ??
            raw.other_user_id ??
            undefined,
    };
}

function normAttachment(a) {
    if (!a) return null;
    const urlRaw = a.url ?? a.fileUrl ?? a.downloadUrl ?? a.file_url ?? a.download_url;
    const name = a.name ?? a.filename ?? a.originalName ?? a.original_name ?? "file";
    const size = a.size ?? a.bytes ?? null;
    const mime = a.mime ?? a.contentType ?? a.type ?? a.content_type ?? "";
    const kind = a.kind ?? (String(mime).startsWith("image/") ? "image" : "file");
    return {
        id: a.id ?? a.fileId ?? a.file_id ?? uid(),
        kind,
        url: urlRaw ? resolveMediaUrl(urlRaw) : urlRaw,
        name,
        size,
        mime,
    };
}

function pickSenderId(m) {
    return (
        m.fromUserId ??
        m.senderUserId ??
        m.senderId ??
        m.authorUserId ??
        m.userId ??
        m.fromId ??
        m.from_user_id ??
        m.sender_user_id ??
        m.sender_id ??
        m.author_user_id ??
        m.user_id ??
        m.from_id ??
        null
    );
}

function normReplyTo(raw) {
    if (!raw) return null;
    const id = raw.id ?? raw.messageId ?? raw.message_id ?? null;
    if (id == null) return null;

    const mid = String(id);

    return {
        // ✅ алиасы
        id: mid,
        messageId: mid, // <<< ДОБАВИЛИ

        fromUserId:
            raw.fromUserId ??
            raw.senderUserId ??
            raw.userId ??
            raw.from_user_id ??
            raw.sender_user_id ??
            raw.user_id ??
            null,

        fromName: raw.fromName ?? raw.from_user_name ?? raw.senderName ?? raw.sender_name ?? null,
        text: raw.text ?? raw.content ?? raw.message ?? raw.body ?? "",
        createdAt: toDate(raw.createdAt ?? raw.created_when ?? raw.created_at) || null,
    };
}

function normReactions(raw, meId) {
    if (!raw) return [];

    // backend may return:
    // 1) [{emoji,count,me}]
    // 2) [{emoji, users:[...]}]
    // 3) { "❤️": 2, "👍": 1 }
    // 4) { items:[...] }
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : null;

    if (Array.isArray(arr)) {
        return arr
            .map((r) => {
                const emoji = r.emoji ?? r.e ?? r.reaction ?? null;
                if (!emoji) return null;

                let count = r.count ?? r.cnt ?? r.total ?? null;
                const users = r.users ?? r.userIds ?? r.user_ids ?? null;

                if (count == null && Array.isArray(users)) count = users.length;
                if (count == null) count = 1;

                let me = r.me;
                if (me == null && Array.isArray(users) && meId != null) {
                    me = users.some((x) => Number(x) === Number(meId));
                }

                return { emoji: String(emoji), count: Number(count) || 0, me: Boolean(me) };
            })
            .filter(Boolean)
            .filter((x) => x.count > 0);
    }

    if (typeof raw === "object") {
        const out = [];
        for (const [k, v] of Object.entries(raw)) {
            const count = Number(v) || 0;
            if (count > 0) out.push({ emoji: String(k), count, me: false });
        }
        return out;
    }

    return [];
}

function normMessage(raw, dialogIdOverride, meId) {
    if (!raw) return null;

    const m = raw.message && typeof raw.message === "object" ? raw.message : raw;

    const dialogId =
        m.dialogId ??
        m.chatId ??
        m.threadId ??
        raw.dialogId ??
        dialogIdOverride ??
        m.dialog_id ??
        m.chat_id ??
        m.thread_id ??
        raw.dialog_id;

    if (dialogId == null) return null;

    const id = m.id ?? m.messageId ?? m.message_id ?? null;
    const mid = id == null ? null : String(id);

    const createdAt =
        toDate(
            m.createdWhen ??
            m.createdAt ??
            m.sentAt ??
            m.time ??
            m.ts ??
            m.created_when ??
            m.created_at ??
            m.sent_at ??
            m.ts_ms ??
            m.timestamp
        ) || new Date();

    const attachments = (m.attachments ?? m.files ?? m.attachments_list ?? m.file_list ?? [])
        .map(normAttachment)
        .filter(Boolean);

    const replyTo = normReplyTo(m.replyTo ?? m.reply_to ?? m.reply ?? null);

    const replyToMessageId =
        m.replyToMessageId ??
        m.reply_to_message_id ??
        m.replyToId ??
        m.reply_to_id ??
        replyTo?.messageId ?? // ✅ сначала messageId
        replyTo?.id ??
        null;

    const replyToClientId = m.replyToClientId ?? m.reply_to_client_id ?? null;
    const replyToKey = m.replyToKey ?? m.reply_to_key ?? replyToMessageId ?? replyToClientId ?? null;

    const text = m.text ?? m.content ?? m.message ?? m.body ?? m.content_text ?? m.body_text ?? "";

    const fromUserName =
        m.fromUserName ?? m.from_name ?? m.senderName ?? m.sender_name ?? null;

    const reactions = normReactions(m.reactions ?? m.reactionSummary ?? m.reaction_summary ?? null, meId);

    return {
        // ✅ твои поля
        id: mid,
        clientId: m.clientId ?? raw.clientId ?? m.tempId ?? raw.tempId ?? m.client_id ?? raw.client_id ?? null,
        dialogId: String(dialogId),
        fromUserId: pickSenderId(m) == null ? null : Number(pickSenderId(m)),
        fromUserName,
        text,
        createdAt,

        readAt: m.readAt ?? m.read_at ?? null,
        editedAt: m.editedAt ?? m.edited_at ?? null,
        deletedAt: m.deletedAt ?? m.deleted_at ?? null,

        replyTo,
        replyToMessageId: replyToMessageId == null ? null : String(replyToMessageId),
        replyToClientId: replyToClientId == null ? null : String(replyToClientId),
        replyToKey: replyToKey == null ? null : String(replyToKey),

        reactions,

        status: m.status ?? (mid ? "sent" : "pending"),
        attachments,

        // ✅ ВАЖНО: алиасы для UI (чтобы ничего не переписывать в компонентах)
        messageId: mid,        // <<< многие кнопки ищут message.messageId
        content: text,         // <<< многие формы редактирования берут message.content
        fromName: fromUserName // <<< reply-preview / меню может брать fromName
    };
}

function sortByUpdatedDesc(a, b) {
    const ta = a?.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
    const tb = b?.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
    return tb - ta;
}

function extractItems(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    return res.items || res.content || res.messages || res.data?.items || res.data || [];
}

/**
 * REST typing=false не должен сбивать WS typing=true
 */
function mergeDialogSafe(prev, next) {
    if (!prev) return next;
    if (!next) return prev;

    const merged = { ...prev, ...next };

    if (!isNonEmpty(next.title) && isNonEmpty(prev.title)) merged.title = prev.title;
    if (!isNonEmpty(next.avatarUrl) && isNonEmpty(prev.avatarUrl)) merged.avatarUrl = prev.avatarUrl;
    if (!isNonEmpty(next.lastMessage) && isNonEmpty(prev.lastMessage)) merged.lastMessage = prev.lastMessage;

    if (!(next.updatedAt instanceof Date) && prev.updatedAt instanceof Date) merged.updatedAt = prev.updatedAt;

    if (typeof next.typing !== "boolean" && typeof prev.typing === "boolean") merged.typing = prev.typing;
    if (typeof next.online !== "boolean" && typeof prev.online === "boolean") merged.online = prev.online;
    if (!(next.lastSeenAt instanceof Date) && prev.lastSeenAt instanceof Date) merged.lastSeenAt = prev.lastSeenAt;

    if (prev.typing === true && next.typing === false) merged.typing = true;

    if (typeof next.unreadCount !== "number" && typeof prev.unreadCount === "number")
        merged.unreadCount = prev.unreadCount;
    if (typeof next.locked !== "boolean" && typeof prev.locked === "boolean") merged.locked = prev.locked;

    return merged;
}

function mergeMessages(prevArr, incomingArr) {
    const prev = Array.isArray(prevArr) ? prevArr : [];
    const inc = Array.isArray(incomingArr) ? incomingArr : [];

    const map = new Map();
    for (const m of prev) {
        const key = m?.id ? `id:${m.id}` : m?.clientId ? `c:${m.clientId}` : null;
        if (key) map.set(key, m);
    }

    for (const nm of inc) {
        const key = nm?.id ? `id:${nm.id}` : nm?.clientId ? `c:${nm.clientId}` : null;
        if (!key) continue;

        const old = map.get(key);
        if (!old) {
            map.set(key, nm);
            continue;
        }

        const merged = { ...old, ...nm };

        if ((!nm.attachments || nm.attachments.length === 0) && old.attachments?.length) merged.attachments = old.attachments;
        if (!isNonEmpty(nm.text) && isNonEmpty(old.text) && !nm.deletedAt) merged.text = old.text;

        // ✅ keep reply/reactions if server didn't send
        if (!nm.replyTo && old.replyTo) merged.replyTo = old.replyTo;
        if (!nm.replyToKey && old.replyToKey) merged.replyToKey = old.replyToKey;
        if (!nm.replyToMessageId && old.replyToMessageId) merged.replyToMessageId = old.replyToMessageId;
        if (!nm.replyToClientId && old.replyToClientId) merged.replyToClientId = old.replyToClientId;

        if ((!nm.reactions || nm.reactions.length === 0) && old.reactions?.length) merged.reactions = old.reactions;

        map.set(key, merged);
    }

    const out = Array.from(map.values());
    out.sort((a, b) => (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0));
    return out;
}

// ------------------------------
// reactions helpers (optimistic)
// ------------------------------

function upsertReactionSummary(current = [], emoji, nextMe, delta) {
    const arr = Array.isArray(current) ? [...current] : [];
    const ix = arr.findIndex((x) => String(x.emoji) === String(emoji));

    if (ix === -1) {
        const count = Math.max(0, Number(delta) || 0);
        if (count <= 0) return arr;
        arr.push({ emoji: String(emoji), count, me: Boolean(nextMe) });
        return arr;
    }

    const cur = arr[ix];
    const nextCount = Math.max(0, (Number(cur.count) || 0) + (Number(delta) || 0));
    if (nextCount <= 0) {
        arr.splice(ix, 1);
        return arr;
    }

    arr[ix] = { ...cur, count: nextCount, me: Boolean(nextMe) };
    return arr;
}

export function useChat() {
    const { me, isAuthenticated } = useAuth();
    const { subscribe, publish, connected } = useWs();
    const toast = useToast();

    const meId = me?.id ?? null;

    const [dialogs, setDialogs] = React.useState([]);
    const [activeDialogId, setActiveDialogId] = React.useState(null);
    const [dialogsLoading, setDialogsLoading] = React.useState(true);
    const [dialogsError, setDialogsError] = React.useState("");

    const [messagesByDialog, setMessagesByDialog] = React.useState(() => new Map());
    const [messagesLoading, setMessagesLoading] = React.useState(() => new Map());
    const [messagesCursor, setMessagesCursor] = React.useState(() => new Map());
    const [historyLoadedByDialog, setHistoryLoadedByDialog] = React.useState(() => new Map());

    const typingTimeoutsRef = React.useRef(new Map());
    const dialogsRefreshTimerRef = React.useRef(null);

    // outbound typing control
    const typingStopTimersRef = React.useRef(new Map());
    const typingLastSentRef = React.useRef(new Map());
    const typingOnRef = React.useRef(new Map());

    const setLoadingFor = React.useCallback((dialogId, v) => {
        setMessagesLoading((prev) => {
            const n = new Map(prev);
            n.set(String(dialogId), Boolean(v));
            return n;
        });
    }, []);

    // ✅ UI helper: локально пропатчить сообщение по id/clientId/messageKey
    const patchMessageLocal = React.useCallback((dialogId, keyOrId, patchOrUpdater) => {
        const did = String(dialogId);
        const k = keyOrId == null ? null : String(keyOrId);
        if (!k) return;

        setMessagesByDialog((prev) => {
            const n = new Map(prev);
            const arr = n.get(did) || [];
            if (!arr.length) return prev;

            const ix = arr.findIndex((m) => {
                if (m?.id != null && String(m.id) === k) return true;
                if (m?.clientId != null && String(m.clientId) === k) return true;
                return String(messageKeyOf(m)) === k;
            });

            if (ix === -1) return prev;

            const cur = arr[ix];
            const nextMsg =
                typeof patchOrUpdater === "function"
                    ? patchOrUpdater(cur)
                    : { ...cur, ...(patchOrUpdater || {}) };

            const copy = [...arr];
            copy[ix] = nextMsg;
            n.set(did, copy);
            return n;
        });
    }, []);

    const refreshDialogsDebounced = React.useCallback(() => {
        if (dialogsRefreshTimerRef.current) return;
        dialogsRefreshTimerRef.current = setTimeout(async () => {
            dialogsRefreshTimerRef.current = null;
            try {
                const raw = await chatApi.listDialogs();
                const incoming = (raw || []).map(normDialog).filter(Boolean);

                setDialogs((prev) => {
                    const map = new Map(prev.map((d) => [d.id, d]));
                    const merged = incoming.map((d) => mergeDialogSafe(map.get(d.id), d));
                    for (const p of prev) if (!merged.some((x) => x.id === p.id)) merged.push(p);
                    return merged.sort(sortByUpdatedDesc);
                });
            } catch {}
        }, 300);
    }, []);

    const upsertDialog = React.useCallback((raw) => {
        const d = normDialog(raw);
        if (!d) return;
        setDialogs((prev) => {
            const idx = prev.findIndex((x) => x.id === d.id);
            if (idx === -1) return [...prev, d].sort(sortByUpdatedDesc);
            const merged = mergeDialogSafe(prev[idx], d);
            const next = [...prev];
            next[idx] = merged;
            return next.sort(sortByUpdatedDesc);
        });
    }, []);

    const setTyping = React.useCallback((dialogId, isTyping) => {
        const did = String(dialogId);

        setDialogs((prev) => {
            const idx = prev.findIndex((x) => x.id === did);
            if (idx === -1) return prev; // ✅ не создаём заглушку

            const next = [...prev];
            next[idx] = { ...next[idx], typing: Boolean(isTyping) };
            return next;
        });
    }, []);

    const applyEdit = React.useCallback((dialogId, messageId, patch) => {
        const did = String(dialogId);
        const mid = messageId == null ? null : String(messageId);
        if (!mid) return;

        setMessagesByDialog((prev) => {
            const n = new Map(prev);
            const arr = n.get(did) || [];
            const ix = arr.findIndex((m) => m.id === mid || (m.clientId && m.clientId === mid));
            if (ix === -1) return prev;
            const copy = [...arr];
            copy[ix] = { ...copy[ix], ...patch };
            n.set(did, copy);
            return n;
        });
    }, []);

    const applyEditByClientId = React.useCallback((dialogId, clientId, patch) => {
        const did = String(dialogId);
        if (!clientId) return;

        setMessagesByDialog((prev) => {
            const n = new Map(prev);
            const arr = n.get(did) || [];
            const ix = arr.findIndex((m) => m.clientId && m.clientId === clientId);
            if (ix === -1) return prev;
            const copy = [...arr];
            copy[ix] = { ...copy[ix], ...patch };
            n.set(did, copy);
            return n;
        });
    }, []);

    const applyDelete = React.useCallback((dialogId, messageId) => {
        const did = String(dialogId);
        const mid = messageId == null ? null : String(messageId);
        if (!mid) return;

        setMessagesByDialog((prev) => {
            const n = new Map(prev);
            const arr = n.get(did) || [];
            const ix = arr.findIndex((m) => m.id === mid || (m.clientId && m.clientId === mid));
            if (ix === -1) return prev;
            const copy = [...arr];
            copy[ix] = {
                    ...copy[ix],
                    deletedAt: new Date().toISOString(),
                    isDeleted: true,
                    text: "Сообщение удалено",
                    attachments: [],
                    reactions: [],
                    replyTo: null,
                    replyToKey: null,
                    replyToMessageId: null,
                replyToClientId: null,
        };

            n.set(did, copy);
            return n;
        });
    }, []);

    const applyReactionsSet = React.useCallback((dialogId, messageId, reactions) => {
        const did = String(dialogId);
        const mid = messageId == null ? null : String(messageId);
        if (!mid) return;

        setMessagesByDialog((prev) => {
            const n = new Map(prev);
            const arr = n.get(did) || [];
            const ix = arr.findIndex((m) => m.id === mid || (m.clientId && m.clientId === mid));
            if (ix === -1) return prev;
            const copy = [...arr];
            copy[ix] = { ...copy[ix], reactions: Array.isArray(reactions) ? reactions : [] };
            n.set(did, copy);
            return n;
        });
    }, []);

    const applyReactionOptimistic = React.useCallback((dialogId, messageId, emoji, add) => {
        const did = String(dialogId);
        const mid = messageId == null ? null : String(messageId);
        if (!mid) return { did, mid, prev: null, next: null };

        let snapshotPrev = null;
        let snapshotNext = null;

        setMessagesByDialog((prev) => {
            const n = new Map(prev);
            const arr = n.get(did) || [];
            const ix = arr.findIndex((m) => m.id === mid || (m.clientId && m.clientId === mid));
            if (ix === -1) return prev;

            const cur = arr[ix];
            snapshotPrev = cur?.reactions || [];

            const already = (cur.reactions || []).find((r) => r.emoji === emoji);
            const alreadyMe = Boolean(already?.me);

            const realAdd = add != null ? Boolean(add) : !alreadyMe;
            const delta = realAdd ? +1 : -1;
            const nextMe = realAdd ? true : false;

            const nextReactions = upsertReactionSummary(cur.reactions || [], emoji, nextMe, delta);
            snapshotNext = nextReactions;

            const copy = [...arr];
            copy[ix] = { ...cur, reactions: nextReactions };
            n.set(did, copy);
            return n;
        });

        return { did, mid, prev: snapshotPrev, next: snapshotNext };
    }, []);

    const appendMessage = React.useCallback(
        (msg) => {
            if (!msg?.dialogId) return;
            const did = String(msg.dialogId);

            setMessagesByDialog((prev) => {
                const n = new Map(prev);
                const cur = n.get(did) || [];

                if (msg.id && cur.some((x) => x.id === msg.id)) return prev;

                if (msg.clientId) {
                    const ix = cur.findIndex((x) => x.clientId && x.clientId === msg.clientId);
                    if (ix >= 0) {
                        const copy = [...cur];
                        copy[ix] = { ...copy[ix], ...msg, status: msg.status || "sent" };
                        n.set(did, copy);
                        return n;
                    }
                }

                const nextArr = [...cur, msg].sort(
                    (a, b) => (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0)
                );
                n.set(did, nextArr);
                return n;
            });

            upsertDialog({
                id: did,
                lastMessage: msg.text || (msg.attachments?.length ? "Вложение" : ""),
                updatedAt: toDate(msg.createdAt) || new Date(),
            });

            const isActive = activeDialogId && String(activeDialogId) === did;
            const fromOther = meId != null && msg.fromUserId != null && Number(msg.fromUserId) !== Number(meId);

            if (fromOther) setTyping(did, false);

            if (isActive && fromOther) {
                chatApi.markDialogRead(did).catch(() => {});
                setDialogs((prev) => prev.map((d) => (d.id === did ? { ...d, unreadCount: 0 } : d)));
            }
        },
        [upsertDialog, activeDialogId, meId, setTyping]
    );

    // initial dialogs load
    React.useEffect(() => {
        let alive = true;
        (async () => {
            if (!isAuthenticated) {
                setDialogs([]);
                setActiveDialogId(null);
                setDialogsLoading(false);
                return;
            }
            try {
                setDialogsLoading(true);
                setDialogsError("");

                const raw = await chatApi.listDialogs();
                if (!alive) return;

                const incoming = (raw || []).map(normDialog).filter(Boolean);

                setDialogs((prev) => {
                    if (!prev.length) return incoming.sort(sortByUpdatedDesc);
                    const map = new Map(prev.map((d) => [d.id, d]));
                    const merged = incoming.map((d) => mergeDialogSafe(map.get(d.id), d));
                    for (const p of prev) if (!merged.some((x) => x.id === p.id)) merged.push(p);
                    return merged.sort(sortByUpdatedDesc);
                });

                setActiveDialogId((cur) => (cur && incoming.some((d) => d.id === String(cur)) ? String(cur) : null));
            } catch (e) {
                if (!alive) return;
                setDialogsError(e?.message || "Не удалось загрузить диалоги");
                setDialogs([]);
                setActiveDialogId(null);
            } finally {
                if (alive) setDialogsLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [isAuthenticated]);

    const loadMessages = React.useCallback(
        async (dialogId, { append = false } = {}) => {
            const did = String(dialogId);
            try {
                setLoadingFor(did, true);

                const cursor = append ? messagesCursor.get(did) : null;
                const res = await chatApi.listMessages(did, { limit: 30, cursor });

                const rawItems = extractItems(res);
                const incoming = (rawItems || []).map((x) => normMessage(x, did, meId)).filter(Boolean);

                setMessagesByDialog((prev) => {
                    const n = new Map(prev);
                    const cur = n.get(did) || [];

                    if (!append) {
                        const merged = mergeMessages(cur, incoming);
                        n.set(did, merged);
                    } else {
                        const merged = mergeMessages([...incoming, ...cur], []);
                        n.set(did, merged);
                    }

                    return n;
                });

                setMessagesCursor((prev) => {
                    const n = new Map(prev);
                    n.set(did, res?.nextCursor ?? res?.next_cursor ?? null);
                    return n;
                });

                if (!append) {
                    setHistoryLoadedByDialog((prev) => {
                        const n = new Map(prev);
                        n.set(did, true);
                        return n;
                    });
                }
            } catch (e) {
                toast.error(e?.message || "Не удалось загрузить сообщения");
            } finally {
                setLoadingFor(did, false);
            }
        },
        [setLoadingFor, messagesCursor, toast, meId]
    );

    React.useEffect(() => {
        if (!activeDialogId) return;
        const did = String(activeDialogId);

        const loaded = historyLoadedByDialog.get(did) === true;
        if (!loaded) loadMessages(did, { append: false });

        chatApi.markDialogRead(did).catch(() => {});
        setDialogs((prev) => prev.map((d) => (d.id === did ? { ...d, unreadCount: 0 } : d)));
    }, [activeDialogId, loadMessages, historyLoadedByDialog]);

    // presence polling fallback
    React.useEffect(() => {
        if (!isAuthenticated) return;
        const t = setInterval(() => refreshDialogsDebounced(), 15000);
        return () => clearInterval(t);
    }, [isAuthenticated, refreshDialogsDebounced]);

    // WS subscriptions
    React.useEffect(() => {
        if (!isAuthenticated) return;

        const unsubs = [];

        const handleTypingPayload = (payload, msg) => {
            dbg("[typing] raw", payload, msg?.headers);

            let p = payload;
            if (p && typeof p === "object" && typeof p.body === "string") p = tryParseJSON(p.body);
            if (typeof p === "string") p = tryParseJSON(p);
            if (typeof p === "string") p = tryParseJSON(p);
            if (!p || typeof p !== "object") return;

            const did = p.dialogId ?? p.chatId ?? p.threadId ?? p.dialog_id ?? p.chat_id ?? p.thread_id;
            const isTyping = p.isTyping ?? p.typing ?? p.is_typing;
            const from = p.fromUserId ?? p.senderUserId ?? p.userId ?? p.from_user_id ?? p.sender_user_id ?? p.user_id;

            if (did == null) return;
            if (from != null && meId != null && Number(from) === Number(meId)) return;

            if (isTyping === false) {
                setTyping(did, false);
                const key = String(did);
                const prevT = typingTimeoutsRef.current.get(key);
                if (prevT) clearTimeout(prevT);
                typingTimeoutsRef.current.delete(key);
                return;
            }

            setTyping(did, true);

            const key = String(did);
            const prevT = typingTimeoutsRef.current.get(key);
            if (prevT) clearTimeout(prevT);

            const tt = setTimeout(() => setTyping(did, false), 2600);
            typingTimeoutsRef.current.set(key, tt);
        };

        const handleRead = (payloadRaw) => {
            let obj = payloadRaw;
            if (obj && typeof obj === "object" && typeof obj.body === "string") obj = tryParseJSON(obj.body);
            if (typeof obj === "string") obj = tryParseJSON(obj);
            if (!obj || typeof obj !== "object") return;

            const type = String(obj.type || "").toUpperCase();
            if (type !== "READ") return;

            const did = obj.chatId ?? obj.dialogId ?? obj.chat_id ?? obj.dialog_id;
            if (did == null) return;

            const readerId = obj.fromUserId ?? obj.readerUserId ?? obj.from_user_id ?? obj.reader_user_id ?? null;
            if (readerId != null && meId != null && Number(readerId) === Number(meId)) return;

            const readAt = toDate(obj.readAt ?? obj.lastReadAt ?? obj.last_read_at ?? obj.read_at) || new Date();

            setMessagesByDialog((prev) => {
                const n = new Map(prev);
                const arr = n.get(String(did)) || [];
                if (!arr.length) return prev;

                const next = arr.map((m) => {
                    const mine = meId != null && m?.fromUserId != null && Number(m.fromUserId) === Number(meId);
                    if (!mine) return m;
                    if (m.readAt) return m;
                    if (m.status === "failed") return m;
                    return { ...m, readAt: readAt.toISOString() };
                });

                n.set(String(did), next);
                return n;
            });

            upsertDialog({ id: String(did) });
        };

        const handleReactions = (obj) => {
            const did = obj.dialogId ?? obj.chatId ?? obj.dialog_id ?? obj.chat_id ?? null;
            const mid = obj.messageId ?? obj.id ?? obj.message_id ?? null;
            if (did == null || mid == null) return;

            const reactions = normReactions(obj.reactions ?? obj.reactionSummary ?? obj.reaction_summary ?? [], meId);
            applyReactionsSet(did, mid, reactions);
        };

        unsubs.push(
            subscribe(chatConfig.inbox, (payload, msg) => {
                let obj = payload;

                if (obj && typeof obj === "object" && typeof obj.body === "string") obj = tryParseJSON(obj.body);
                if (typeof obj === "string") obj = tryParseJSON(obj);
                if ((!obj || typeof obj !== "object") && msg?.body) obj = tryParseJSON(msg.body);
                if (!obj) return;

                const type = String(obj.type || obj.event || obj.action || "").toUpperCase();

                if (type === "DIALOGS_CHANGED") {
                    refreshDialogsDebounced();
                    return;
                }

                if (type === "READ") {
                    handleRead(obj);
                    return;
                }

                if (obj.isTyping != null || obj.typing != null || obj.is_typing != null || type.includes("TYP")) {
                    handleTypingPayload(obj, msg);
                    return;
                }

                if (type.includes("REACTION") || type.includes("REACT")) {
                    handleReactions(obj);
                    return;
                }

                if (type.includes("DELETED") || type.includes("DELETE") || type.includes("REMOVE")) {
                    const did = obj.dialogId ?? obj.chatId ?? obj.threadId ?? obj.dialog_id ?? obj.chat_id;
                    const mid = obj.messageId ?? obj.id ?? obj.message_id;
                    if (did != null && mid != null) applyDelete(did, mid);
                    refreshDialogsDebounced();
                    return;
                }

                if (type.includes("EDITED") || type.includes("EDIT") || type.includes("UPDATE")) {
                    const did = obj.dialogId ?? obj.chatId ?? obj.threadId ?? obj.dialog_id ?? obj.chat_id;
                    const mid = obj.messageId ?? obj.id ?? obj?.message?.id ?? obj.message_id;
                    if (did == null || mid == null) return;

                    const patchMsg = obj.message ? normMessage(obj.message, did, meId) : null;
                    applyEdit(did, mid, {
                        text: patchMsg?.text ?? obj.content ?? obj.text ?? "",
                        editedAt: obj.editedAt ??
                            obj.edited_at ??
                            obj.lastModified ?? new Date().toISOString(),
                        replyTo: patchMsg?.replyTo ?? undefined,
                        replyToKey: patchMsg?.replyToKey ?? undefined,
                        replyToMessageId: patchMsg?.replyToMessageId ?? undefined,
                        replyToClientId: patchMsg?.replyToClientId ?? undefined,
                        reactions: patchMsg?.reactions ?? undefined,
                    });
                    refreshDialogsDebounced();
                    return;
                }

                const msg2 = normMessage(obj, obj.chatId ?? obj.dialogId ?? obj.chat_id ?? obj.dialog_id, meId);
                if (msg2) {
                    appendMessage(msg2);
                    refreshDialogsDebounced();
                    return;
                }

                upsertDialog(obj);
            })
        );

        if (chatConfig.typingSub) {
            unsubs.push(subscribe(chatConfig.typingSub, handleTypingPayload));
        }

        if (chatConfig.dialogsSub) {
            unsubs.push(
                subscribe(chatConfig.dialogsSub, (payload, msg) => {
                    let obj = payload;
                    if (obj && typeof obj === "object" && typeof obj.body === "string") obj = tryParseJSON(obj.body);
                    if (typeof obj === "string") obj = tryParseJSON(obj);
                    if ((!obj || typeof obj !== "object") && msg?.body) obj = tryParseJSON(msg.body);
                    if (!obj) return;

                    const type = String(obj.type || "").toUpperCase();
                    if (type === "DIALOGS_CHANGED") {
                        refreshDialogsDebounced();
                        return;
                    }

                    const arr = Array.isArray(obj) ? obj : obj.items || obj.content || obj.data || null;
                    if (Array.isArray(arr)) {
                        const incoming = arr.map(normDialog).filter(Boolean);
                        setDialogs((prev) => {
                            const map = new Map(prev.map((d) => [d.id, d]));
                            const merged = incoming.map((d) => mergeDialogSafe(map.get(d.id), d));
                            for (const p2 of prev) if (!merged.some((x) => x.id === p2.id)) merged.push(p2);
                            return merged.sort(sortByUpdatedDesc);
                        });
                    } else {
                        upsertDialog(obj);
                    }
                })
            );
        }

        return () => {
            for (const u of unsubs) {
                try {
                    u?.();
                } catch {}
            }

            for (const t of typingTimeoutsRef.current.values()) clearTimeout(t);
            typingTimeoutsRef.current.clear();

            for (const t of typingStopTimersRef.current.values()) clearTimeout(t);
            typingStopTimersRef.current.clear();

            typingLastSentRef.current.clear();
            typingOnRef.current.clear();

            if (dialogsRefreshTimerRef.current) clearTimeout(dialogsRefreshTimerRef.current);
            dialogsRefreshTimerRef.current = null;
        };
    }, [
        isAuthenticated,
        subscribe,
        appendMessage,
        applyDelete,
        applyEdit,
        applyReactionsSet,
        upsertDialog,
        setTyping,
        meId,
        refreshDialogsDebounced,
    ]);

    const openDialog = React.useCallback(
        (dialogId) => {
            const did = String(dialogId);
            setActiveDialogId(did);

            setDialogs((prev) => prev.map((d) => (d.id === did ? { ...d, unreadCount: 0 } : d)));

            const loaded = historyLoadedByDialog.get(did) === true;
            if (!loaded) loadMessages(did, { append: false });

            chatApi.markDialogRead(did).catch(() => {});
        },
        [loadMessages, historyLoadedByDialog]
    );

    const sendMessage = React.useCallback(
        async ({ dialogId, text, files, replyToMessageId, replyToClientId, replyToKey, replyTo }) => {
            const did = String(dialogId);
            const clientId = uid();

            const finalReplyToMessageId = replyToMessageId != null ? String(replyToMessageId) : null;
            const finalReplyToClientId = replyToClientId != null ? String(replyToClientId) : null;
            const finalReplyToKey = replyToKey != null ? String(replyToKey) : finalReplyToMessageId || finalReplyToClientId;

            const optimistic = {
                id: `tmp_${clientId}`,
                clientId,
                dialogId: did,
                fromUserId: meId == null ? null : Number(meId),
                text: text || "",
                createdAt: new Date(),
                status: "pending",
                readAt: null,

                // ✅ для MessageList (перейти к сообщению)
                replyToMessageId: finalReplyToMessageId,
                replyToClientId: finalReplyToClientId,
                replyToKey: finalReplyToKey,

                // ✅ для красивого превью (если MessageList умеет читать replyTo)
                replyTo: finalReplyToMessageId
                    ? {
                        id: String(finalReplyToMessageId),
                        messageId: String(finalReplyToMessageId), // ✅ алиас
                        fromUserId: replyTo?.fromUserId ?? null,
                        fromName: replyTo?.fromName ?? replyTo?.fromUserName ?? null,
                        text: replyTo?.text ?? replyTo?.content ?? "",
                        createdAt: replyTo?.createdAt ?? null,
                    }
                    : null,

                reactions: [],
                attachments: (files || []).map((f) => ({
                    id: uid(),
                    kind: f.type?.startsWith("image/") ? "image" : "file",
                    url: URL.createObjectURL(f),
                    name: f.name,
                    size: f.size,
                    mime: f.type,
                    _local: true,
                    _file: f,
                })),
            };

            appendMessage(optimistic);

            const canWs = connected && typeof publish === "function";
            const hasFiles = Array.isArray(files) && files.length > 0;

            // если файлы — обычно проще REST multipart
            if (hasFiles) {
                try {
                    const saved = await chatApi.sendMessage(did, {
                        text: text || "",
                        clientId,
                        files,
                        replyToMessageId: finalReplyToMessageId,
                        replyToClientId: finalReplyToClientId,
                        replyToKey: finalReplyToKey,
                    });
                    const msg = normMessage(saved, did, meId);
                    if (msg) appendMessage(msg);
                } catch (e) {
                    toast.error(e?.message || "Не удалось отправить сообщение");
                    applyEditByClientId(did, clientId, { status: "failed" });
                }
                return;
            }

            // WS
            const ok = canWs
                ? publish(chatConfig.send, {
                    chatId: Number(did),
                    content: text || "",
                    clientId,
                    replyToMessageId: finalReplyToMessageId ? Number(finalReplyToMessageId) : null,
                    replyToId: finalReplyToMessageId ? Number(finalReplyToMessageId) : null, // на всякий
                    replyToClientId: finalReplyToClientId,
                    replyToKey: finalReplyToKey,
                })
                : false;

            // REST fallback
            if (!ok) {
                try {
                    const saved = await chatApi.sendMessage(did, {
                        text: text || "",
                        clientId,
                        replyToMessageId: finalReplyToMessageId,
                        replyToClientId: finalReplyToClientId,
                        replyToKey: finalReplyToKey,
                    });
                    const msg = normMessage(saved, did, meId);
                    if (msg) appendMessage(msg);
                } catch (e) {
                    toast.error(e?.message || "Не удалось отправить сообщение");
                    applyEditByClientId(did, clientId, { status: "failed" });
                }
            }
        },
        [appendMessage, connected, publish, meId, toast, applyEditByClientId]
    );

    /**
     * ✅ reactions: уводим на бэк (WS + REST fallback)
     * UI делает optimistic toggle, потом сервер присылает актуальный summary (или REST ответ)
     */
    const reactToMessage = React.useCallback(
        async ({ dialogId, messageId, emoji, add }) => {
            const did = String(dialogId);
            const mid = String(messageId);
            if (!emoji || !mid) return null;

            // optimistic локально
            const snap = applyReactionOptimistic(did, mid, String(emoji), add);

            const canWs = connected && typeof publish === "function" && Boolean(chatConfig.react);

            const payload = {
                messageId: Number(mid),
                emoji: String(emoji),
                add: add, // если undefined — бэк может сам трактовать как toggle, но лучше передавать boolean
            };

            const ok = canWs ? publish(chatConfig.react, payload) : false;
            if (ok) return { ok: true };

            // REST fallback
            try {
                const res = await chatApi.reactToMessage(mid, { emoji: String(emoji), add: add == null ? undefined : Boolean(add) });
                if (res?.reactions) {
                    const reactions = normReactions(res.reactions, meId);
                    applyReactionsSet(did, mid, reactions);
                }
                return res;
            } catch (e) {
                toast.error(e?.message || "Не удалось поставить реакцию");
                // откат
                if (snap?.prev) applyReactionsSet(did, mid, snap.prev);
                return null;
            }
        },
        [applyReactionOptimistic, connected, publish, toast, applyReactionsSet, meId]
    );

    /**
     * ✅ typing
     */
    const notifyTyping = React.useCallback(
        (dialogId) => {
            const did = String(dialogId);
            if (!connected || typeof publish !== "function") return;

            const sendTyping = (flag) => {
                publish(chatConfig.typing, {
                    chatId: Number(did),
                    typing: Boolean(flag),
                    isTyping: Boolean(flag),
                });
            };

            const now = Date.now();
            const last = typingLastSentRef.current.get(did) || 0;

            if (now - last > 900) {
                sendTyping(true);
                typingLastSentRef.current.set(did, now);
                typingOnRef.current.set(did, true);
            }

            const prevStop = typingStopTimersRef.current.get(did);
            if (prevStop) clearTimeout(prevStop);

            const t = setTimeout(() => {
                if (typingOnRef.current.get(did) === true) {
                    sendTyping(false);
                    typingOnRef.current.set(did, false);
                }
            }, 1200);

            typingStopTimersRef.current.set(did, t);
        },
        [connected, publish]
    );

    const editMessage = React.useCallback(
        async ({ dialogId, messageId, text }) => {
            const did = String(dialogId);
            const mid = String(messageId);
            applyEdit(did, mid, { text, editedAt: new Date().toISOString() });

            const ok =
                connected && typeof publish === "function"
                    ? publish(chatConfig.edit, { messageId: Number(mid), content: text })
                    : false;

            if (!ok) {
                // REST fallback если добавишь
            }
        },
        [applyEdit, connected, publish]
    );

    const deleteMessage = React.useCallback(
        async ({ dialogId, messageId }) => {
            const did = String(dialogId);
            const mid = String(messageId);
            applyDelete(did, mid);

            const ok =
                connected && typeof publish === "function"
                    ? publish(chatConfig.remove, { messageId: Number(mid) })
                    : false;

            if (!ok) {
                // REST fallback если добавишь
            }
        },
        [applyDelete, connected, publish]
    );

    const activeDialog = React.useMemo(() => dialogs.find((d) => d.id === String(activeDialogId)), [dialogs, activeDialogId]);

    const activeMessages = React.useMemo(
        () => (activeDialogId ? messagesByDialog.get(String(activeDialogId)) || [] : []),
        [messagesByDialog, activeDialogId]
    );

    const activeLoading = React.useMemo(
        () => (activeDialogId ? messagesLoading.get(String(activeDialogId)) || false : false),
        [messagesLoading, activeDialogId]
    );

    const loadMoreActive = React.useCallback(async () => {
        const did = activeDialogId;
        if (!did) return;
        const cursor = messagesCursor.get(String(did));
        if (!cursor) return;
        await loadMessages(String(did), { append: true });
    }, [activeDialogId, messagesCursor, loadMessages]);

    const activeTyping = Boolean(activeDialog?.typing);
    const activeTypingText = activeTyping ? "Печатает…" : "";

    return {
        meId,
        dialogs,
        dialogsLoading,
        dialogsError,

        activeDialogId,
        activeDialog,
        activeTyping,
        activeTypingText,

        openDialog,

        messages: activeMessages,
        messagesLoading: activeLoading,
        loadMore: loadMoreActive,

        sendMessage,
        notifyTyping,
        editMessage,
        deleteMessage,

        // ✅ ui helpers
        patchMessageLocal,

        // ✅ reactions
        reactToMessage,
        reactMessage: reactToMessage, // alias под старый UI-деструктуринг

        // optional
        connected,
    };
}
