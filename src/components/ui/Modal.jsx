import React, { useEffect } from "react";

/**
 * Минимальная модалка под стиль проекта.
 *
 * props:
 * - open: boolean
 * - title: string
 * - onClose: () => void
 * - actions: ReactNode (кнопки в футере)
 */
export default function Modal({ open, title, onClose, children, actions }) {
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="b-modal" role="dialog" aria-modal="true">
            <button className="b-modal__backdrop" type="button" onClick={onClose} aria-label="Закрыть" />

            <div className="b-modal__card">
                <div className="b-modal__head">
                    <div className="b-modal__title">{title}</div>
                    <button className="b-modal__close" type="button" onClick={onClose} aria-label="Закрыть">
                        ×
                    </button>
                </div>

                <div className="b-modal__body">{children}</div>

                {actions ? <div className="b-modal__foot">{actions}</div> : null}
            </div>
        </div>
    );
}
