// Central chat WS destinations.
// Override with env vars if your backend uses different routes.

export const chatConfig = {
  // publish
  send: process.env.REACT_APP_CHAT_SEND_DEST || "/app/chat.send",
  typing: process.env.REACT_APP_CHAT_TYPING_DEST || "/app/chat.typing",
  edit: process.env.REACT_APP_CHAT_EDIT_DEST || "/app/chat.edit",
  remove: process.env.REACT_APP_CHAT_REMOVE_DEST || "/app/chat.delete",

  // subscribe
  inbox: process.env.REACT_APP_CHAT_INBOX_SUB || "/user/queue/chat",
  typingSub: process.env.REACT_APP_CHAT_TYPING_SUB || "/user/queue/chat.typing",
  dialogsSub: process.env.REACT_APP_CHAT_DIALOGS_SUB || "/user/queue/chat.dialogs",
};
