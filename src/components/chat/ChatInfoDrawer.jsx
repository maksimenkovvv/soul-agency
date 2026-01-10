import React from "react";
import { IconFile, IconInfo, IconLink, IconX } from "./chatIcons";

function isNonEmpty(v) {
    return v != null && String(v).trim() !== "";
}

function bytesToSize(bytes = 0) {
    const units = ["B", "KB", "MB", "GB"];
    let v = Number(bytes) || 0;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtTime(d) {
    const dd = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dd.getTime())) return "";
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(dd);
}

function extractLinks(text = "") {
    const s = String(text);
    const re = /(https?:\/\/[^\s)\]}>"]+)/gi;
    const out = [];
    let m;
    while ((m = re.exec(s))) {
        out.push(m[1]);
        if (out.length > 200) break;
    }
    return out;
}

function safeHost(url) {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

export default function ChatInfoDrawer({
                                           open,
                                           onClose,
                                           messages = [],
                                           mediaItems = [],
                                           onOpenMedia,
                                           onJumpToMessage,
                                       }) {
    const [tab, setTab] = React.useState("media");
    const [q, setQ] = React.useState("");

    React.useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    React.useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const fileItems = React.useMemo(() => {
        const out = [];
        for (const m of messages || []) {
            const messageKey = m?.id || m?.clientId;
            const atts = Array.isArray(m?.attachments) ? m.attachments : [];
            for (const a of atts) {
                const mime = String(a?.mime || "");
                const kind = String(a?.kind || "");
                const isMedia = kind === "image" || kind === "video" || mime.startsWith("image/") || mime.startsWith("video/");
                if (isMedia) continue;
                if (!a?.url) continue;
                out.push({
                    key: `${messageKey || "m"}::${a?.id || a?.url || "a"}`,
                    url: a.url,
                    name: a.name || "file",
                    size: a.size,
                    mime: a.mime,
                    createdAt: m?.createdAt,
                    messageKey,
                });
            }
        }
        return out.reverse();
    }, [messages]);

    const linkItems = React.useMemo(() => {
        const out = [];
        for (const m of messages || []) {
            const messageKey = m?.id || m?.clientId;
            const links = extractLinks(m?.text || "");
            for (const url of links) {
                out.push({
                    key: `${messageKey || "m"}::${url}`,
                    url,
                    host: safeHost(url),
                    createdAt: m?.createdAt,
                    messageKey,
                });
            }
        }
        return out.reverse();
    }, [messages]);

    const filteredMedia = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return mediaItems;
        return (mediaItems || []).filter((it) => {
            const hay = `${it?.caption || ""} ${it?.name || ""}`.toLowerCase();
            return hay.includes(s);
        });
    }, [mediaItems, q]);

    const filteredFiles = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return fileItems;
        return (fileItems || []).filter((it) => `${it?.name || ""}`.toLowerCase().includes(s));
    }, [fileItems, q]);

    const filteredLinks = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return linkItems;
        return (linkItems || []).filter((it) => `${it?.url || ""}`.toLowerCase().includes(s));
    }, [linkItems, q]);

    if (!open) return null;

    return (
        <div className="chat__drawerOverlay" onMouseDown={onClose} role="dialog" aria-modal="true">
            <div className="chat__drawer" onMouseDown={(e) => e.stopPropagation()}>
                <div className="chat__drawerTop">
                    <div className="chat__drawerTitle">
                        <IconInfo style={{ width: 18, height: 18, stroke: "currentColor" }} />
                        Вложения
                    </div>
                    <button className="chat__drawerClose" type="button" onClick={onClose} aria-label="Закрыть">
                        <IconX style={{ width: 18, height: 18, stroke: "currentColor" }} />
                    </button>
                </div>

                <div className="chat__drawerTabs" role="tablist">
                    <button type="button" className={`chat__drawerTab ${tab === "media" ? "active" : ""}`} onClick={() => setTab("media")}
                            role="tab" aria-selected={tab === "media"}>
                        Медиа
                    </button>
                    <button type="button" className={`chat__drawerTab ${tab === "files" ? "active" : ""}`} onClick={() => setTab("files")}
                            role="tab" aria-selected={tab === "files"}>
                        Файлы
                    </button>
                    <button type="button" className={`chat__drawerTab ${tab === "links" ? "active" : ""}`} onClick={() => setTab("links")}
                            role="tab" aria-selected={tab === "links"}>
                        Ссылки
                    </button>
                </div>

                <div className="chat__drawerSearch">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={tab === "links" ? "Поиск ссылок" : tab === "files" ? "Поиск файлов" : "Поиск медиа"}
                    />
                </div>

                <div className="chat__drawerBody">
                    {tab === "media" ? (
                        filteredMedia.length === 0 ? (
                            <div className="chat__drawerEmpty">Медиа нет</div>
                        ) : (
                            <div className="chat__drawerMediaGrid">
                                {filteredMedia.map((it) => (
                                    <button
                                        key={it.key}
                                        type="button"
                                        className="chat__drawerMedia"
                                        onClick={() => {
                                            const idx = (mediaItems || []).findIndex((x) => x.key === it.key);
                                            if (idx >= 0) onOpenMedia?.(idx);
                                        }}
                                        aria-label="Открыть"
                                    >
                                        {it.kind === "video" ? (
                                            <video src={it.url} muted playsInline preload="metadata" />
                                        ) : (
                                            <img src={it.url} alt="" loading="lazy" />
                                        )}
                                        <span className="chat__drawerMediaMeta">
                      <span className="t">{fmtTime(it.createdAt)}</span>
                                            {isNonEmpty(it.caption) ? <span className="c">{String(it.caption).trim()}</span> : null}
                    </span>
                                        <span
                                            className="chat__drawerMediaJump"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (it.messageKey) onJumpToMessage?.(it.messageKey);
                                            }}
                                            role="button"
                                            tabIndex={0}
                                        >
                      Показать
                    </span>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : null}

                    {tab === "files" ? (
                        filteredFiles.length === 0 ? (
                            <div className="chat__drawerEmpty">Файлов нет</div>
                        ) : (
                            <div className="chat__drawerList">
                                {filteredFiles.map((it) => (
                                    <div key={it.key} className="chat__drawerRow">
                                        <div className="ic" aria-hidden="true">
                                            <IconFile style={{ width: 18, height: 18, stroke: "currentColor" }} />
                                        </div>
                                        <div className="mid">
                                            <div className="name" title={it.name}>{it.name}</div>
                                            <div className="meta">
                                                {it.size ? bytesToSize(it.size) : null}{it.size ? " · " : ""}{fmtTime(it.createdAt)}
                                            </div>
                                        </div>
                                        <div className="right">
                                            <a className="open" href={it.url} target="_blank" rel="noreferrer">Открыть</a>
                                            {it.messageKey ? (
                                                <button type="button" className="jump" onClick={() => onJumpToMessage?.(it.messageKey)}>
                                                    Показать
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : null}

                    {tab === "links" ? (
                        filteredLinks.length === 0 ? (
                            <div className="chat__drawerEmpty">Ссылок нет</div>
                        ) : (
                            <div className="chat__drawerList">
                                {filteredLinks.map((it) => (
                                    <div key={it.key} className="chat__drawerRow">
                                        <div className="ic" aria-hidden="true">
                                            <IconLink style={{ width: 18, height: 18, stroke: "currentColor" }} />
                                        </div>
                                        <div className="mid">
                                            <div className="name" title={it.url}>{it.host}</div>
                                            <div className="meta">{fmtTime(it.createdAt)}</div>
                                        </div>
                                        <div className="right">
                                            <a className="open" href={it.url} target="_blank" rel="noreferrer">Открыть</a>
                                            {it.messageKey ? (
                                                <button type="button" className="jump" onClick={() => onJumpToMessage?.(it.messageKey)}>
                                                    Показать
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : null}
                </div>
            </div>
        </div>
    );
}
