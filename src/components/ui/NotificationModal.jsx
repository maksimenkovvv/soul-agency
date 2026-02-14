import React from "react";
import Modal from "./Modal";

function fmt(dt) {
    if (!dt) return "";
    try {
        return new Date(dt).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return String(dt);
    }
}

export default function NotificationModal({ open, notification, onClose, onGo }) {
    const n = notification || null;
    const title = n?.title || "Уведомление";
    const message = n?.message || n?.text || n?.body || "";
    const createdAt = n?.createdAt || n?.created_when || n?.created_when || null;
    const linkUrl = n?.linkUrl || n?.url || n?.href || null;

    return (
        <Modal
            open={open && !!n}
            title={title}
            onClose={onClose}
            actions={
                <>
                    {linkUrl ? (
                        <button
                            type="button"
                            className="b-btn b-btn--primary"
                            onClick={() => onGo?.(linkUrl)}
                        >
                            Перейти
                        </button>
                    ) : null}
                    <button type="button" className="b-btn b-btn--transparent" onClick={onClose}>
                        Закрыть
                    </button>
                </>
            }
        >
            <div className="notif-modal">
                {createdAt ? <div className="notif-modal__time">{fmt(createdAt)}</div> : null}
                {message ? <div className="notif-modal__msg">{message}</div> : <div className="notif-modal__msg">—</div>}
            </div>
        </Modal>
    );
}
