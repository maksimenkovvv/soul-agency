// chatConfig.js
export const chatConfig = {
    // publish
    send: process.env.REACT_APP_CHAT_SEND_DEST || "/app/chat.send",
    typing: process.env.REACT_APP_CHAT_TYPING_DEST || "/app/chat.typing",
    edit: process.env.REACT_APP_CHAT_EDIT_DEST || "/app/chat.edit",
    remove: process.env.REACT_APP_CHAT_REMOVE_DEST || "/app/chat.delete",
    react: process.env.REACT_APP_CHAT_REACT_DEST || "/app/chat.react",
    read: process.env.REACT_APP_CHAT_READ_DEST || "/app/chat.read",

    // subscribe (personal queues)
    inbox: process.env.REACT_APP_CHAT_INBOX_SUB || "/user/queue/chat",
    typingSub: process.env.REACT_APP_CHAT_TYPING_SUB || "/user/queue/chat.typing",
    dialogsSub: process.env.REACT_APP_CHAT_DIALOGS_SUB || "/user/queue/chat.dialogs",

    // ✅ presence per chat (topics)
    // presenceSub: (chatId) => process.env.REACT_APP_CHAT_PRESENCE_SUB_PREFIX
    //     ? `${process.env.REACT_APP_CHAT_PRESENCE_SUB_PREFIX}${String(chatId)}`
    //     : `/topic/chat.${String(chatId)}.presence`,

    presenceSub: process.env.REACT_APP_CHAT_PRESENCE_SUB_PREFIX || "/user/queue/chat.presence",

    // ✅ join/leave (optional; backend can ignore if not implemented)
    presenceJoin: process.env.REACT_APP_CHAT_PRESENCE_JOIN_DEST || "/app/chat.presence.join",
    presenceLeave: process.env.REACT_APP_CHAT_PRESENCE_LEAVE_DEST || "/app/chat.presence.leave",

    view: process.env.REACT_APP_CHAT_VIEW || "/app/chat.view",
    viewHeartbeatMs: 20000, // 15–25s норм
};
