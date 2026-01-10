import React from "react";
import { IconChevronLeft, IconChevronRight, IconDownload, IconX } from "./chatIcons";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function isNonEmpty(v) {
  return v != null && String(v).trim() !== "";
}

/**
 * Fullscreen media viewer (Telegram-like):
 * - keyboard: Esc / ← / →
 * - click on backdrop closes
 * - supports image + video
 *
 * items: [{ key, url, mime, kind: 'image'|'video', name, caption, createdAt }]
 */
export default function MediaViewer({ open, items = [], startIndex = 0, onClose }) {
  const [index, setIndex] = React.useState(clamp(startIndex, 0, Math.max(0, items.length - 1)));

  React.useEffect(() => {
    if (!open) return;
    setIndex(clamp(startIndex, 0, Math.max(0, items.length - 1)));
  }, [open, startIndex, items.length]);

  // lock body scroll
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const go = React.useCallback(
    (dir) => {
      if (!items.length) return;
      setIndex((i) => clamp(i + dir, 0, items.length - 1));
    },
    [items.length]
  );

  // keyboard
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, go]);

  // basic swipe (pointer)
  const swipeRef = React.useRef({ active: false, x: 0, y: 0 });
  const onPointerDown = (e) => {
    swipeRef.current = { active: true, x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const s = swipeRef.current;
    if (!s.active) return;
    swipeRef.current.active = false;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    go(dx > 0 ? -1 : 1);
  };

  if (!open) return null;

  const cur = items[index] || null;
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  const caption = isNonEmpty(cur?.caption) ? String(cur.caption).trim() : "";

  return (
    <div className="chat__viewer" onMouseDown={onClose} aria-modal="true" role="dialog">
      <div
        className="chat__viewer-shell"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="chat__viewer-top">
          <div className="chat__viewer-title">
            <div className="name">Медиа</div>
            <div className="meta">
              {items.length ? `${index + 1} / ${items.length}` : ""}
            </div>
          </div>

          <div className="chat__viewer-actions">
            {cur?.url ? (
              <a className="chat__viewer-icon" href={cur.url} target="_blank" rel="noreferrer" aria-label="Открыть / скачать">
                <IconDownload style={{ width: 20, height: 20, stroke: "currentColor" }} />
              </a>
            ) : null}
            <button className="chat__viewer-icon" type="button" onClick={onClose} aria-label="Закрыть">
              <IconX style={{ width: 20, height: 20, stroke: "currentColor" }} />
            </button>
          </div>
        </div>

        <div className="chat__viewer-body">
          {canPrev ? (
            <button className="chat__viewer-nav left" type="button" onClick={() => go(-1)} aria-label="Предыдущее">
              <IconChevronLeft style={{ width: 28, height: 28, stroke: "currentColor" }} />
            </button>
          ) : null}

          <div className="chat__viewer-stage">
            {!cur ? null : cur.kind === "video" ? (
              <video className="chat__viewer-media" src={cur.url} controls playsInline />
            ) : (
              <img className="chat__viewer-media" src={cur.url} alt={cur.name || ""} />
            )}
          </div>

          {canNext ? (
            <button className="chat__viewer-nav right" type="button" onClick={() => go(1)} aria-label="Следующее">
              <IconChevronRight style={{ width: 28, height: 28, stroke: "currentColor" }} />
            </button>
          ) : null}
        </div>

        {caption ? <div className="chat__viewer-caption">{caption}</div> : null}
      </div>
    </div>
  );
}
