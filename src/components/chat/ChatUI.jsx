import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/authStore";

import ava1 from "../../assets/img/psychologist-1.webp";
import ava2 from "../../assets/img/psychologist-2.webp";
import ava3 from "../../assets/img/psychologist-3.webp";

// --- helpers ---
const fmtTime = (d) =>
    new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(d);

const fmtDay = (d) =>
    new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long" }).format(d);

const fmtListTime = (d) => {
    const now = new Date();
    const isToday =
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (isToday) return fmtTime(d);
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(d);
};

const bytesToSize = (bytes = 0) => {
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const isImageFile = (file) => file?.type?.startsWith("image/");

function uid() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// --- icons ---
function IconSearch(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M10.5 18.5a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path d="M21 21l-4.3-4.3" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function IconPaperclip(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M21 12.5l-8.6 8.6a6 6 0 0 1-8.5-8.5l9.2-9.2a4.5 4.5 0 0 1 6.4 6.4l-9.2 9.2a3 3 0 0 1-4.2-4.2l8.6-8.6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconSend(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M22 2 11 13"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M22 2 15 22l-4-9-9-4 20-7Z"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconLock(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M7 11V8a5 5 0 0 1 10 0v3"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M6 11h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconFile(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path d="M14 2v6h6" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}

function IconX(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="M18 6 6 18"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M6 6l12 12"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconChevronLeft(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconChevronRight(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconCheck(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="m20 6-11 11-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconDoubleCheck(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path
                d="m1 12 5 5L17 6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="m7 12 5 5L23 6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// --- main UI ---
function ChatUI() {
    const { me } = useAuth();

    const demoDialogs = useMemo(() => {
        const now = new Date();
        return [
            {
                id: "d1",
                title: "Мария Иванова",
                avatar: ava1,
                lastMessage: "Ок, созвонимся завтра 🙂",
                updatedAt: new Date(now.getTime() - 1000 * 60 * 6),
                unreadCount: 2,
                online: true,
                typing: false,
                locked: false,
            },
            {
                id: "d2",
                title: "Служба поддержки",
                avatar: ava2,
                lastMessage: "Ваша заявка принята. Мы на связи.",
                updatedAt: new Date(now.getTime() - 1000 * 60 * 80),
                unreadCount: 0,
                online: true,
                typing: false,
                locked: true, // пример: чат закрыт админом
            },
            {
                id: "d3",
                title: "Артём (психолог)",
                avatar: ava3,
                lastMessage: "Отправьте, пожалуйста, результаты теста.",
                updatedAt: new Date(now.getTime() - 1000 * 60 * 60 * 26),
                unreadCount: 0,
                online: false,
                typing: false,
                locked: false,
            },
        ];
    }, []);

    const demoMessages = useMemo(() => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 1000 * 60 * 60 * 26);
        return {
            d1: [
                {
                    id: "m1",
                    from: "them",
                    text: "Привет! Сможете сегодня в 18:00?",
                    createdAt: new Date(now.getTime() - 1000 * 60 * 55),
                    isRead: true,
                },
                {
                    id: "m2",
                    from: "me",
                    text: "Да, отлично. Пришлите ссылку на созвон.",
                    createdAt: new Date(now.getTime() - 1000 * 60 * 52),
                    status: "read",
                },
                {
                    id: "m3",
                    from: "them",
                    text: "Лови 🙂",
                    createdAt: new Date(now.getTime() - 1000 * 60 * 51),
                    isRead: true,
                    attachments: [
                        {
                            id: "a1",
                            kind: "file",
                            name: "link.txt",
                            size: 1024,
                            url: "#",
                        },
                    ],
                },
                {
                    id: "m4",
                    from: "them",
                    text: "И вот ещё материалы к встрече",
                    createdAt: new Date(now.getTime() - 1000 * 60 * 8),
                    isRead: false,
                    attachments: [
                        {
                            id: "a2",
                            kind: "image",
                            url: "https://picsum.photos/seed/burosoul1/800/600",
                            name: "photo-1.jpg",
                        },
                        {
                            id: "a3",
                            kind: "image",
                            url: "https://picsum.photos/seed/burosoul2/800/600",
                            name: "photo-2.jpg",
                        },
                        {
                            id: "a4",
                            kind: "image",
                            url: "https://picsum.photos/seed/burosoul3/800/600",
                            name: "photo-3.jpg",
                        },
                    ],
                },
            ],
            d2: [
                {
                    id: "s1",
                    from: "them",
                    text: "Чат временно закрыт администратором. Читать можно, писать нельзя.",
                    createdAt: new Date(now.getTime() - 1000 * 60 * 80),
                    isRead: true,
                },
            ],
            d3: [
                {
                    id: "p1",
                    from: "them",
                    text: "Добрый день! Можем начать с короткого опросника.",
                    createdAt: new Date(yesterday.getTime() - 1000 * 60 * 35),
                    isRead: true,
                },
                {
                    id: "p2",
                    from: "me",
                    text: "Да, конечно. Пришлите, пожалуйста.",
                    createdAt: new Date(yesterday.getTime() - 1000 * 60 * 33),
                    status: "delivered",
                },
            ],
        };
    }, []);

    const [dialogs, setDialogs] = useState(demoDialogs);
    const [activeId, setActiveId] = useState(demoDialogs[0]?.id || null);
    const [tab, setTab] = useState("all"); // all | unread
    const [query, setQuery] = useState("");

    const [messagesByDialog, setMessagesByDialog] = useState(demoMessages);

    const [draft, setDraft] = useState("");
    const [pending, setPending] = useState([]); // {id,file,url?,kind,name,size}
    const fileRef = useRef(null);

    const [lightbox, setLightbox] = useState(null); // {images:[{url,name}], index}

    const activeDialog = dialogs.find((d) => d.id === activeId) || null;
    const activeMessages = messagesByDialog[activeId] || [];

    const filteredDialogs = useMemo(() => {
        const q = query.trim().toLowerCase();
        return dialogs
            .filter((d) => (tab === "unread" ? (d.unreadCount || 0) > 0 : true))
            .filter((d) => (q ? d.title.toLowerCase().includes(q) || (d.lastMessage || "").toLowerCase().includes(q) : true))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }, [dialogs, tab, query]);

    const canWrite = !!activeDialog && !activeDialog.locked;

    // mark as read on open
    useEffect(() => {
        if (!activeDialog) return;

        if ((activeDialog.unreadCount || 0) > 0) {
            setDialogs((prev) => prev.map((d) => (d.id === activeDialog.id ? { ...d, unreadCount: 0 } : d)));
        }

        setMessagesByDialog((prev) => {
            const arr = prev[activeDialog.id] || [];
            const next = arr.map((m) => (m.from === "them" ? { ...m, isRead: true } : m));
            return { ...prev, [activeDialog.id]: next };
        });
    }, [activeId]);

    // keep scroll to bottom
    const listRef = useRef(null);
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [activeId, activeMessages.length]);

    // cleanup object URLs
    useEffect(() => {
        return () => {
            pending.forEach((p) => {
                if (p.url?.startsWith("blob:")) URL.revokeObjectURL(p.url);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openFiles = () => fileRef.current?.click();

    const onPickFiles = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const mapped = files.map((file) => {
            const kind = isImageFile(file) ? "image" : "file";
            const url = kind === "image" ? URL.createObjectURL(file) : null;
            return { id: uid(), file, kind, url, name: file.name, size: file.size };
        });
        setPending((prev) => [...prev, ...mapped]);
        e.target.value = "";
    };

    const removePending = (id) => {
        setPending((prev) => {
            const item = prev.find((p) => p.id === id);
            if (item?.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
            return prev.filter((p) => p.id !== id);
        });
    };

    const updateDialogLast = (dialogId, lastMessage) => {
        setDialogs((prev) =>
            prev.map((d) =>
                d.id === dialogId
                    ? {
                          ...d,
                          lastMessage,
                          updatedAt: new Date(),
                      }
                    : d
            )
        );
    };

    const sendMessage = () => {
        if (!activeDialog) return;
        if (!canWrite) return;

        const text = draft.trim();
        const hasFiles = pending.length > 0;
        if (!text && !hasFiles) return;

        const attachments = pending.map((p) => ({
            id: p.id,
            kind: p.kind,
            url: p.kind === "image" ? p.url : "#",
            name: p.name,
            size: p.size,
        }));

        const newMsg = {
            id: uid(),
            from: "me",
            text,
            createdAt: new Date(),
            status: "sent",
            attachments: attachments.length ? attachments : undefined,
        };

        setMessagesByDialog((prev) => ({
            ...prev,
            [activeDialog.id]: [...(prev[activeDialog.id] || []), newMsg],
        }));

        updateDialogLast(activeDialog.id, text || (attachments.length ? `📎 ${attachments.length} файл(а)` : ""));
        setDraft("");
        setPending([]);

        // demo: deliver -> read
        setTimeout(() => {
            setMessagesByDialog((prev) => {
                const arr = prev[activeDialog.id] || [];
                const next = arr.map((m) => (m.id === newMsg.id ? { ...m, status: "delivered" } : m));
                return { ...prev, [activeDialog.id]: next };
            });
        }, 600);

        setTimeout(() => {
            setMessagesByDialog((prev) => {
                const arr = prev[activeDialog.id] || [];
                const next = arr.map((m) => (m.id === newMsg.id ? { ...m, status: "read" } : m));
                return { ...prev, [activeDialog.id]: next };
            });
        }, 1400);

        // demo: typing + auto reply
        setDialogs((prev) => prev.map((d) => (d.id === activeDialog.id ? { ...d, typing: true } : d)));
        setTimeout(() => {
            setDialogs((prev) => prev.map((d) => (d.id === activeDialog.id ? { ...d, typing: false } : d)));
            const reply = {
                id: uid(),
                from: "them",
                text: "Принято ✅",
                createdAt: new Date(),
                isRead: true,
            };
            setMessagesByDialog((prev) => ({
                ...prev,
                [activeDialog.id]: [...(prev[activeDialog.id] || []), reply],
            }));
            updateDialogLast(activeDialog.id, reply.text);
        }, 2200);
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const firstUnreadIndex = useMemo(() => {
        const idx = activeMessages.findIndex((m) => m.from === "them" && !m.isRead);
        return idx;
    }, [activeMessages]);

    const grouped = useMemo(() => {
        const out = [];
        let lastDay = "";
        activeMessages.forEach((m, idx) => {
            const d = new Date(m.createdAt);
            const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (day !== lastDay) {
                out.push({ kind: "day", id: `day_${day}`, label: fmtDay(d) });
                lastDay = day;
            }
            if (idx === firstUnreadIndex && firstUnreadIndex !== -1) {
                out.push({ kind: "unread", id: "unread", label: "Непрочитанные" });
            }
            out.push({ kind: "msg", id: m.id, msg: m });
        });
        return out;
    }, [activeMessages, firstUnreadIndex]);

    const openLightbox = (images, index) => {
        setLightbox({ images, index });
    };

    const closeLightbox = () => setLightbox(null);

    const stepLightbox = (dir) => {
        setLightbox((prev) => {
            if (!prev) return prev;
            const n = prev.images.length;
            const next = (prev.index + dir + n) % n;
            return { ...prev, index: next };
        });
    };

    return (
        <div className="b-chat">
            {/* LEFT */}
            <div className="chat__sidebar chat__panel">
                <div className="chat__sidebar-head">
                    <div className="chat__sidebar-title">
                        <h2>Чаты</h2>
                        <span className="chat__pill">{me?.name || me?.email || "Вы"}</span>
                    </div>

                    <div className="b-search" style={{ maxWidth: "100%" }}>
                        <input
                            className="search-input"
                            placeholder="Поиск по чатам"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>

                    <div className="chat__tabs">
                        <button className={`chat__tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>Все</button>
                        <button
                            className={`chat__tab ${tab === "unread" ? "active" : ""}`}
                            onClick={() => setTab("unread")}
                        >
                            Непрочитанные
                        </button>
                    </div>
                </div>

                <div className="chat__sidebar-body">
                    {filteredDialogs.map((d) => (
                        <div
                            key={d.id}
                            className={`chat__dialog ${d.id === activeId ? "active" : ""}`}
                            onClick={() => setActiveId(d.id)}
                        >
                            <div className="chat__avatar">
                                <img src={d.avatar} alt="" />
                            </div>
                            <div className="chat__dialog-mid">
                                <div className="chat__dialog-top">
                                    <div className="chat__name">{d.title}</div>
                                    <span className={`chat__status-dot ${d.online ? "online" : ""}`} />
                                    {d.locked && (
                                        <span className="chat__mini" title="Чат закрыт">
                                            <IconLock />
                                        </span>
                                    )}
                                </div>
                                <div className="chat__last">
                                    {d.typing ? (
                                        <span className="chat__typing">
                                            печатает
                                            <span className="dots">
                                                <span />
                                                <span />
                                                <span />
                                            </span>
                                        </span>
                                    ) : (
                                        d.lastMessage
                                    )}
                                </div>
                            </div>
                            <div className="chat__dialog-right">
                                <div className="chat__time">{fmtListTime(d.updatedAt)}</div>
                                {(d.unreadCount || 0) > 0 ? <div className="chat__badge">{d.unreadCount}</div> : <div style={{ height: 22 }} />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT */}
            <div className="chat__main chat__panel">
                {!activeDialog ? (
                    <div style={{ padding: 30 }}>Выберите диалог</div>
                ) : (
                    <>
                        <div className="chat__topbar">
                            <div className="chat__topbar-left">
                                <div className="chat__avatar" style={{ width: 44, height: 44, borderRadius: 12 }}>
                                    <img src={activeDialog.avatar} alt="" />
                                </div>
                                <div className="chat__title">
                                    <div className="name">{activeDialog.title}</div>
                                    <div className="meta">
                                        {activeDialog.locked ? (
                                            <span className="chat__mini">
                                                <IconLock /> чат закрыт
                                            </span>
                                        ) : activeDialog.typing ? (
                                            <span className="chat__typing">
                                                печатает
                                                <span className="dots">
                                                    <span />
                                                    <span />
                                                    <span />
                                                </span>
                                            </span>
                                        ) : activeDialog.online ? (
                                            "онлайн"
                                        ) : (
                                            "был(а) недавно"
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="chat__actions">
                                <button className="chat__iconbtn" type="button" title="Поиск">
                                    <IconSearch />
                                </button>
                            </div>
                        </div>

                        {!canWrite && (
                            <div className="chat__readonly">
                                <p>Чат отключён администратором. Читать можно, писать нельзя.</p>
                                <span className="chat__pill">
                                    <IconLock /> read-only
                                </span>
                            </div>
                        )}

                        <div className="chat__messages" ref={listRef}>
                            {grouped.map((row) => {
                                if (row.kind === "day") {
                                    return (
                                        <div key={row.id} className="chat__day">
                                            {row.label}
                                        </div>
                                    );
                                }
                                if (row.kind === "unread") {
                                    return (
                                        <div key={row.id} className="chat__unread">
                                            <span>{row.label}</span>
                                        </div>
                                    );
                                }

                                const m = row.msg;
                                const isMe = m.from === "me";
                                const images = (m.attachments || []).filter((a) => a.kind === "image");
                                const files = (m.attachments || []).filter((a) => a.kind === "file");
                                const gridClass = images.length <= 1 ? "one" : "";

                                return (
                                    <div key={row.id} className={`chat__bubble-row ${isMe ? "me" : ""}`}
                                        >
                                        <div className={`chat__bubble ${isMe ? "me" : ""}`}>
                                            {m.text ? <p>{m.text}</p> : null}

                                            {images.length ? (
                                                <div className={`chat__attach-grid ${gridClass}`}>
                                                    {images.slice(0, 4).map((a, idx) => (
                                                        <div
                                                            key={a.id}
                                                            className="chat__image"
                                                            onClick={() => openLightbox(images, idx)}
                                                        >
                                                            <img src={a.url} alt={a.name || ""} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}

                                            {files.length ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                                                    {files.map((f) => (
                                                        <div key={f.id} className="chat__file">
                                                            <div className="ic">
                                                                <IconFile />
                                                            </div>
                                                            <div className="meta">
                                                                <div className="name">{f.name}</div>
                                                                <div className="size">{bytesToSize(f.size || 0)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}

                                            <div className="chat__bubble-meta">
                                                <span className="time">{fmtTime(new Date(m.createdAt))}</span>
                                                {isMe ? (
                                                    <span className={`ticks ${m.status === "read" ? "read" : ""}`}
                                                        title={m.status === "read" ? "Прочитано" : m.status === "delivered" ? "Доставлено" : "Отправлено"}
                                                    >
                                                        {m.status === "sent" ? <IconCheck /> : <IconDoubleCheck />}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="chat__composer">
                            {pending.length ? (
                                <div className="chat__previews">
                                    {pending.map((p) => (
                                        <div
                                            key={p.id}
                                            className={`chat__preview ${p.kind === "file" ? "chat__preview-file" : ""}`}
                                        >
                                            {p.kind === "image" ? (
                                                <img src={p.url} alt={p.name} />
                                            ) : (
                                                <>
                                                    <div className="ic" style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid rgba(210,215,219,0.55)" }}>
                                                        <IconFile />
                                                    </div>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                        <div className="name">{p.name}</div>
                                                        <div className="size">{bytesToSize(p.size)}</div>
                                                    </div>
                                                </>
                                            )}
                                            <button className="remove" type="button" onClick={() => removePending(p.id)} title="Убрать">
                                                <IconX style={{ width: 14, height: 14, stroke: "#313235" }} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            <div className="chat__compose-row">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    multiple
                                    onChange={onPickFiles}
                                    style={{ display: "none" }}
                                />

                                <button
                                    type="button"
                                    className="chat__attachbtn"
                                    onClick={openFiles}
                                    title="Прикрепить файлы"
                                    disabled={!canWrite}
                                >
                                    <IconPaperclip />
                                </button>

                                <textarea
                                    className="chat__textarea"
                                    placeholder={canWrite ? "Сообщение… (Enter — отправить, Shift+Enter — перенос)" : "Чат закрыт администратором"}
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={onKeyDown}
                                    disabled={!canWrite}
                                />

                                <button
                                    type="button"
                                    className="chat__send"
                                    onClick={sendMessage}
                                    disabled={!canWrite || (!draft.trim() && pending.length === 0)}
                                >
                                    Отправить
                                    <IconSend />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* lightbox */}
            {lightbox ? (
                <div className="chat__lightbox" onMouseDown={closeLightbox}>
                    <div className="chat__lightbox-card" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="chat__lightbox-top">
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <span className="chat__pill">
                                    {lightbox.index + 1}/{lightbox.images.length}
                                </span>
                                <span style={{ fontSize: 14, color: "rgba(49,50,53,0.55)" }}>
                                    {lightbox.images[lightbox.index]?.name || ""}
                                </span>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button className="chat__iconbtn" type="button" onClick={() => stepLightbox(-1)} title="Назад">
                                    <IconChevronLeft />
                                </button>
                                <button className="chat__iconbtn" type="button" onClick={() => stepLightbox(1)} title="Вперёд">
                                    <IconChevronRight />
                                </button>
                                <button className="chat__iconbtn" type="button" onClick={closeLightbox} title="Закрыть">
                                    <IconX />
                                </button>
                            </div>
                        </div>
                        <div className="chat__lightbox-body">
                            <img src={lightbox.images[lightbox.index].url} alt="" />
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default ChatUI;
