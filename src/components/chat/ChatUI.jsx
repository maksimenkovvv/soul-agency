import React from "react";
import { useChat } from "../../chat/useChat";
import ChatSidebar from "./ChatSidebar";
import MessageList from "./MessageList";
import ChatComposer from "./ChatComposer";
import MediaViewer from "./MediaViewer";
import ChatInfoDrawer from "./ChatInfoDrawer";
import { IconLock, IconInfo } from "./chatIcons";
import { useToast } from "../../ui/toast/ToastProvider";

function isTmpId(v) {
    if (v == null) return false;
    const s = String(v);
    return s.startsWith("tmp_") || s.startsWith("c:") || s.startsWith("client:");
}

function messageKeyOf(m) {
    return m?.id || m?.clientId || `${m?.dialogId || "d"}:${String(m?.createdAt || "")}`;
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

// оставил (может пригодиться локально/в будущем), но сейчас reactions уезжают на бэк через useChat.reactToMessage
function toggleReactionList(list, emoji) {
    const cur = normalizeReactions(list);
    const idx = cur.findIndex((x) => x.emoji === emoji);
    if (idx < 0) {
        cur.push({ emoji, count: 1, me: true });
        return cur;
    }
    const item = cur[idx];
    if (item.me) {
        const nextCount = Math.max(0, (item.count || 0) - 1);
        if (nextCount === 0) cur.splice(idx, 1);
        else cur[idx] = { ...item, count: nextCount, me: false };
        return cur;
    }
    cur[idx] = { ...item, count: (item.count || 0) + 1, me: true };
    return cur;
}

export default function ChatUI() {
    const toast = useToast();

    const {
        meId,
        dialogs,
        dialogsLoading,
        dialogsError,
        activeDialogId,
        activeDialog,
        openDialog,
        messages,
        messagesLoading,
        loadMore,
        sendMessage,
        notifyTyping,
        editMessage,
        deleteMessage,

        // ✅ NEW: реакция уходит на бэк (optimistic внутри useChat)
        reactToMessage,
    } = useChat();

    const composerRef = React.useRef(null);
    const listRef = React.useRef(null);

    const [dragOver, setDragOver] = React.useState(false);
    const [editing, setEditing] = React.useState(null);

    // ✅ Reply state (цитирование)
    // для ChatComposer: { messageId, fromUserId, fromName, text, createdAt }
    const [replyTo, setReplyTo] = React.useState(null);

    // ✅ Drawer state
    const [drawerOpen, setDrawerOpen] = React.useState(false);

    // ✅ Unified media viewer state
    const [viewer, setViewer] = React.useState({ open: false, index: 0 });

    const fmtLastSeen = React.useCallback((v) => {
        if (!v) return "";
        const d = v instanceof Date ? v : new Date(v);
        if (Number.isNaN(d.getTime())) return "";
        const now = new Date();
        const isToday =
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate();

        const datePart = isToday
            ? "сегодня"
            : new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(d);

        const timePart = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d);
        return `${datePart} в ${timePart}`;
    }, []);

    // cancel edit / reply if dialog changes
    React.useEffect(() => {
        setEditing(null);
        setReplyTo(null);
        setDrawerOpen(false);
        setViewer({ open: false, index: 0 });
    }, [activeDialogId]);

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const files = e.dataTransfer?.files;
        if (files && files.length) composerRef.current?.addFiles?.(files);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const onDragLeave = (e) => {
        if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
        setDragOver(false);
    };

    const typingActive = Boolean(activeDialog?.typing) && !Boolean(activeDialog?.locked);
    const typingText = "Печатает…";

    // ✅ messageMap для reply preview + drawer jump
    const messageMap = React.useMemo(() => {
        const map = new Map();
        for (const m of messages || []) {
            const k = messageKeyOf(m);
            map.set(String(k), m);
            if (m?.id != null) map.set(String(m.id), m);
            if (m?.clientId != null) map.set(String(m.clientId), m);
        }
        return map;
    }, [messages]);

    // ✅ unified media items + index map (for viewer + drawer)
    const mediaItems = React.useMemo(() => {
        const out = [];
        for (const m of messages || []) {
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
                    caption: m?.text || "",
                    createdAt: m?.createdAt,
                    messageKey: messageKeyOf(m),
                });
            }
        }
        return out;
    }, [messages]);

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

    // ✅ Reply: сохраняем именно server messageId (чтобы уходило на бэк)
    const handleReply = React.useCallback(
        (m) => {
            if (!m) return;

            const serverId = m?.id != null && !isTmpId(m.id) ? String(m.id) : null;
            if (!serverId) {
                toast.info("Можно ответить после отправки сообщения", { duration: 2200 });
                return;
            }

            setReplyTo({
                messageId: serverId,
                fromUserId: m?.fromUserId ?? null,
                fromName: m?.fromUserName || m?.fromName || null,
                text: m?.text || "",
                createdAt: m?.createdAt || null,
            });

            setTimeout(() => composerRef.current?.focus?.(), 0);
        },
        [toast]
    );

    // ✅ Reactions: на бэк (optimistic/rollback внутри useChat.reactToMessage)
    const handleReact = React.useCallback(
        (m, emoji) => {
            if (!activeDialog || !m || !emoji) return;

            const serverMessageId = m?.id != null && !isTmpId(m.id) ? String(m.id) : null;
            if (!serverMessageId) {
                toast.info("Реакцию можно поставить после отправки сообщения", { duration: 2200 });
                return;
            }

            // toggle add/remove по текущему состоянию "me"
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

    // ✅ Submit: цитата уходит на бэк: replyToMessageId + (опционально) replyTo объект для optimistic preview
    const onSubmit = async ({ text, files, replyToMessageId, replyTo: replyToObj }) => {
        if (!activeDialog) return;

        if (editing) {
            await editMessage({
                dialogId: activeDialog.id,
                messageId: editing.id || editing.clientId,
                text,
            });
            setEditing(null);
            toast.success("Сообщение обновлено", { duration: 2200 });
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

    return (
        <div className="b-chat">
            <ChatSidebar
                dialogs={dialogs}
                loading={dialogsLoading}
                error={dialogsError}
                activeDialogId={activeDialogId}
                onOpen={openDialog}
            />

            <div className="chat__panel chat__main" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
                {!activeDialog ? (
                    <div className="chat__main__title">Выберите диалог слева</div>
                ) : (
                    <>
                        <div className="chat__topbar">
                            <div className="chat__topbar-left">
                                <div className="chat__avatar">
                                    {activeDialog.avatarUrl ? (
                                        <img src={activeDialog.avatarUrl} alt="" />
                                    ) : (
                                        <div className="chat__avatar-fallback" />
                                    )}
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
                        Печатает
                        <span className="dots">
                          <span />
                          <span />
                          <span />
                        </span>
                      </span>
                                        ) : (
                                            <span className="chat__mini">
                        {activeDialog.online
                            ? "В сети"
                            : activeDialog.lastSeenAt
                                ? `Был(а) ${fmtLastSeen(activeDialog.lastSeenAt)}`
                                : "Не в сети"}
                      </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="chat__topbar-right">
                                <button
                                    type="button"
                                    className="chat__topbar-btn"
                                    onClick={() => setDrawerOpen(true)}
                                    aria-label="Вложения"
                                    title="Вложения"
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

                        <MessageList
                            ref={listRef}
                            messages={messages}
                            meId={meId}
                            loading={messagesLoading}
                            onRequestMore={loadMore}
                            typing={typingActive}
                            typingText={typingText}
                            onReply={handleReply}
                            onReact={handleReact}
                            onOpenMedia={openMediaAt}
                            mediaItems={mediaItems}
                            mediaIndexByKey={mediaIndexByKey}
                            messageMap={messageMap}
                            onEdit={(m) => {
                                setEditing(m);
                                setReplyTo(null);
                                setTimeout(() => composerRef.current?.focus?.(), 0);
                            }}
                            onDelete={(m) => {
                                if (!m) return;

                                const serverId = m.id && !isTmpId(m.id) ? m.id : null;

                                if (serverId) {
                                    deleteMessage({ dialogId: activeDialog.id, messageId: serverId });
                                    toast.success("Сообщение удалено", { duration: 2200 });
                                    return;
                                }

                                if (m.clientId) {
                                    deleteMessage({ dialogId: activeDialog.id, messageId: m.clientId });
                                    toast.success("Сообщение удалено", { duration: 2200 });
                                    return;
                                }
                            }}
                        />

                        <ChatComposer
                            ref={composerRef}
                            disabled={Boolean(activeDialog.locked)}
                            mode={editing ? "edit" : "send"}
                            initialText={editing?.text || ""}
                            onCancel={() => setEditing(null)}
                            onTyping={() => notifyTyping(activeDialog.id)}
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
                            messages={messages}
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
