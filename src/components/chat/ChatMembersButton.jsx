import React from "react";

export default function ChatMembersButton({ count, onlineCount, onClick }) {
    const onlineText = typeof onlineCount === "number" ? ` • онлайн: ${onlineCount}` : "";
    return (
        <button type="button" className="chat__members-btn" onClick={onClick}>
            {count} участник{count % 10 === 1 && count % 100 !== 11 ? "" : count % 10 >= 2 && count % 10 <= 4 && !(count % 100 >= 12 && count % 100 <= 14) ? "а" : "ов"}
            <span className="chat__members-btn-sub">{onlineText}</span>
        </button>
    );
}
