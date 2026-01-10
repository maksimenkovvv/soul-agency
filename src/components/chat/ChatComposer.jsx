import React from "react";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import { IconPaperclip, IconSend, IconX } from "./chatIcons";

function uid() {
    return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

function isImage(file) {
    return String(file?.type || "").startsWith("image/");
}

function bytesToSize(bytes = 0) {
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function insertAtCursor(textarea, valueToInsert) {
    if (!textarea) return { nextValue: valueToInsert, nextPos: valueToInsert.length };

    const value = textarea.value ?? "";
    const start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : value.length;
    const end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : value.length;

    const nextValue = value.slice(0, start) + valueToInsert + value.slice(end);
    const nextPos = start + valueToInsert.length;

    return { nextValue, nextPos };
}

// simple smile icon (чтобы не добавлять новый файл)
function IconSmile(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" strokeWidth="2" />
            <path
                d="M8.5 14.2c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path d="M9 10h.01" strokeWidth="3" strokeLinecap="round" />
            <path d="M15 10h.01" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

const ChatComposer = React.forwardRef(function ChatComposer(
    {
        disabled,
        mode, // 'send' | 'edit'
        initialText,
        onCancel,
        onSubmit,
        onTyping,

        // ✅ reply
        // { messageId, fromName, text, createdAt, fromUserId }
        replyTo,
        onClearReply,
    },
    ref
) {
    const textareaRef = React.useRef(null);
    const fileRef = React.useRef(null);
    const typingRef = React.useRef(null);

    // emoji
    const emojiWrapRef = React.useRef(null);
    const [emojiOpen, setEmojiOpen] = React.useState(false);

    const [draft, setDraft] = React.useState(initialText || "");
    const [pending, setPending] = React.useState([]); // {id,file,url,kind,name,size}

    // keep draft in sync when switching edit mode / message
    React.useEffect(() => {
        setDraft(initialText || "");
        setPending([]);
        setEmojiOpen(false);
    }, [initialText, mode]);

    // auto height
    React.useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
    }, [draft]);

    React.useEffect(
        () => () => {
            if (typingRef.current) clearTimeout(typingRef.current);
        },
        []
    );

    // close emoji on outside click / ESC
    React.useEffect(() => {
        if (!emojiOpen) return;

        const onDocDown = (e) => {
            const wrap = emojiWrapRef.current;
            if (!wrap) return;
            if (wrap.contains(e.target)) return;
            setEmojiOpen(false);
        };

        const onKey = (e) => {
            if (e.key === "Escape") setEmojiOpen(false);
        };

        document.addEventListener("mousedown", onDocDown, true);
        document.addEventListener("keydown", onKey, true);
        return () => {
            document.removeEventListener("mousedown", onDocDown, true);
            document.removeEventListener("keydown", onKey, true);
        };
    }, [emojiOpen]);

    const addFiles = React.useCallback((files) => {
        const arr = Array.from(files || []).filter(Boolean);
        if (arr.length === 0) return;
        setPending((prev) => {
            const next = [...prev];
            for (const f of arr) {
                const id = uid();
                next.push({
                    id,
                    file: f,
                    kind: isImage(f) ? "image" : "file",
                    url: URL.createObjectURL(f),
                    name: f.name,
                    size: f.size,
                });
            }
            return next;
        });
    }, []);

    React.useImperativeHandle(ref, () => ({
        addFiles,
        focus: () => textareaRef.current?.focus?.(),
    }));

    const removePending = (id) => {
        setPending((prev) => {
            const cur = prev.find((x) => x.id === id);
            if (cur?.url) {
                try {
                    URL.revokeObjectURL(cur.url);
                } catch {}
            }
            return prev.filter((x) => x.id !== id);
        });
    };

    const emitTyping = () => {
        if (!typingRef.current) {
            onTyping?.();
            typingRef.current = setTimeout(() => {
                typingRef.current = null;
            }, 600);
        }
    };

    const clearPendingWithRevoke = () => {
        setPending((prev) => {
            for (const p of prev) {
                if (p?.url) {
                    try {
                        URL.revokeObjectURL(p.url);
                    } catch {}
                }
            }
            return [];
        });
    };

    const submit = () => {
        if (disabled) return;

        const text = String(draft || "").trimEnd();
        const files = pending.map((p) => p.file).filter(Boolean);

        if (!text && files.length === 0) return;

        const replyToMessageId = replyTo?.messageId != null ? String(replyTo.messageId) : null;

        onSubmit?.({
            text,
            files,

            // ✅ на бэк
            replyToMessageId,

            // ✅ для optimistic UI (useChat кладёт в optimistic.replyTo)
            replyTo: replyToMessageId
                ? {
                    id: replyToMessageId,
                    fromUserId: replyTo?.fromUserId ?? null,
                    fromName: replyTo?.fromName ?? null,
                    text: replyTo?.text ?? "",
                    createdAt: replyTo?.createdAt ?? null,
                }
                : null,
        });

        if (mode !== "edit") {
            setDraft("");
            clearPendingWithRevoke();
            setEmojiOpen(false);

            // ✅ после отправки — очищаем reply
            onClearReply?.();
        }
    };

    const onPaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const files = [];
        for (let i = 0; i < items.length; i++) {
            if (String(items[i].type || "").includes("image")) {
                const f = items[i].getAsFile();
                if (f) files.push(f);
            }
        }
        if (files.length) addFiles(files);
    };

    const onPickEmoji = (emojiData) => {
        const ta = textareaRef.current;

        const { nextValue, nextPos } = insertAtCursor(ta, emojiData?.emoji || "");
        setDraft(nextValue);

        requestAnimationFrame(() => {
            try {
                ta?.focus?.();
                if (ta && typeof ta.setSelectionRange === "function") {
                    ta.setSelectionRange(nextPos, nextPos);
                }
            } catch {}
        });

        emitTyping();
    };

    const renderReplyBar = () => {
        if (mode === "edit") return null;
        if (!replyTo?.messageId) return null;

        const who = replyTo?.fromName || "Сообщение";
        const txt = String(replyTo?.text || "").trim();
        const snippet = txt ? txt.slice(0, 110) : "…";

        return (
            <div className="chat__replybar">
                <div className="chat__replybar-line" />
                <div className="chat__replybar-body">
                    <div className="chat__replybar-title">Ответ: {who}</div>
                    <div className="chat__replybar-text">{snippet}</div>
                </div>
                <button
                    type="button"
                    className="chat__replybar-close"
                    onClick={onClearReply}
                    aria-label="Убрать цитату"
                >
                    <IconX style={{ width: 16, height: 16, stroke: "currentColor" }} />
                </button>
            </div>
        );
    };

    return (
        <div className="chat__composer">
            {mode === "edit" ? (
                <div className="chat__editbar">
                    <div className="chat__editbar-title">Редактирование сообщения</div>
                    <button type="button" className="chat__editbar-cancel" onClick={onCancel}>
                        Отмена
                    </button>
                </div>
            ) : null}

            {renderReplyBar()}

            {pending.length > 0 ? (
                <div className="chat__previews">
                    {pending.map((p) =>
                        p.kind === "image" ? (
                            <div key={p.id} className="chat__preview">
                                <img src={p.url} alt="" />
                                <button
                                    type="button"
                                    className="remove"
                                    onClick={() => removePending(p.id)}
                                    aria-label="Убрать"
                                >
                                    <IconX style={{ width: 14, height: 14, stroke: "currentColor" }} />
                                </button>
                            </div>
                        ) : (
                            <div key={p.id} className="chat__preview chat__preview-file">
                                <div style={{ minWidth: 0 }}>
                                    <div className="name">{p.name}</div>
                                    <div className="size">{bytesToSize(p.size)}</div>
                                </div>
                                <button
                                    type="button"
                                    className="remove"
                                    onClick={() => removePending(p.id)}
                                    aria-label="Убрать"
                                >
                                    <IconX style={{ width: 14, height: 14, stroke: "currentColor" }} />
                                </button>
                            </div>
                        )
                    )}
                </div>
            ) : null}

            <div className="chat__compose-row">
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                        addFiles(e.target.files);
                        e.target.value = "";
                    }}
                />

                <button
                    type="button"
                    className="chat__attachbtn"
                    onClick={() => fileRef.current?.click?.()}
                    disabled={disabled}
                    aria-label="Вложение"
                >
                    <IconPaperclip style={{ width: 22, height: 22, stroke: "currentColor" }} />
                </button>

                {/* ✅ Emoji button + popover */}
                <div className="chat__emojiWrap" ref={emojiWrapRef}>
                    <button
                        type="button"
                        className="chat__emojiBtn"
                        onClick={() => !disabled && setEmojiOpen((v) => !v)}
                        disabled={disabled}
                        aria-label="Смайлики"
                        aria-expanded={emojiOpen ? "true" : "false"}
                    >
                        <IconSmile style={{ width: 22, height: 22, stroke: "currentColor" }} />
                    </button>

                    {emojiOpen ? (
                        <div className="chat__emojiPopover" role="dialog" aria-label="Выбор смайлика">
                            <EmojiPicker
                                onEmojiClick={(emojiData) => onPickEmoji(emojiData)}
                                theme={Theme.LIGHT}
                                emojiStyle={EmojiStyle.NATIVE}
                                searchPlaceholder="Поиск"
                                lazyLoadEmojis={true}
                                height={420}
                                width={340}
                                previewConfig={{ showPreview: false }}
                            />
                        </div>
                    ) : null}
                </div>

                <textarea
                    ref={textareaRef}
                    className="chat__textarea"
                    value={draft}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        emitTyping();
                    }}
                    onPaste={onPaste}
                    placeholder={disabled ? "Чат недоступен" : "Сообщение…"}
                    disabled={disabled}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submit();
                        }
                    }}
                />

                <button
                    type="button"
                    className="chat__send"
                    onClick={submit}
                    disabled={disabled || (!draft.trim() && pending.length === 0)}
                    aria-label={mode === "edit" ? "Сохранить" : "Отправить"}
                >
                    {mode === "edit" ? (
                        <>
                            Сохранить
                            <IconSend style={{ width: 18, height: 18, stroke: "currentColor" }} />
                        </>
                    ) : (
                        <IconSend style={{ width: 20, height: 20, stroke: "currentColor" }} />
                    )}
                </button>
            </div>
        </div>
    );
});

export default ChatComposer;
