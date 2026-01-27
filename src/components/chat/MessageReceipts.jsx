import React from "react";

function ChecksIcon({ double = false }) {
    // простая иконка, подгони под свои SVG если уже есть
    return (
        <span className={`chat__checks ${double ? "is-double" : ""}`}>
      ✓{double ? "✓" : ""}
    </span>
    );
}

/**
 * props:
 * - isMine: boolean
 * - canOpenReadBy: boolean (например group && isMine)
 * - readByAnyone: boolean (message.id <= maxReadByOthers)
 */
export default function MessageReceipts({ isMine, canOpenReadBy, readByAnyone, onClick }) {
    if (!isMine) return null;

    const double = !!readByAnyone;

    if (!canOpenReadBy) {
        return <ChecksIcon double={double} />;
    }

    return (
        <button type="button" className="chat__checks-btn" onClick={onClick} title="Кто прочитал">
            <ChecksIcon double={double} />
        </button>
    );
}
