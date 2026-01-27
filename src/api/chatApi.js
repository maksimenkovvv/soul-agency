// chatApi.js
import { request } from "./http";

function pickArray(res) {
    if (Array.isArray(res)) return res;
    return res?.items || res?.content || res?.data || [];
}

export const chatApi = {
    listDialogs: async () => {
        const res = await request("/api/chat/dialogs");
        return pickArray(res);
    },

    listMessages: async (dialogId, { limit = 30, cursor } = {}) => {
        const qs = new URLSearchParams();
        qs.set("limit", String(limit));
        if (cursor) qs.set("cursor", String(cursor));

        const res = await request(`/api/chat/dialogs/${String(dialogId)}/messages?${qs.toString()}`);
        if (res && typeof res === "object" && !Array.isArray(res) && Array.isArray(res.items)) return res;
        return { items: pickArray(res), nextCursor: null };
    },

    sendMessage: async (dialogId, { text, content, clientId, files, replyToKey, replyToMessageId, replyToClientId } = {}) => {
        const bodyText = content != null ? content : text;
        const did = String(dialogId);

        const hasFiles = Array.isArray(files) && files.length > 0;
        if (hasFiles) {
            const fd = new FormData();
            if (bodyText != null) fd.append("content", bodyText);
            if (clientId) fd.append("clientId", clientId);

            if (replyToMessageId != null) fd.append("replyToMessageId", String(replyToMessageId));
            if (replyToClientId != null) fd.append("replyToClientId", String(replyToClientId));
            else if (replyToKey != null) fd.append("replyToKey", String(replyToKey));

            for (const f of files) fd.append("files", f);

            return request(`/api/chat/dialogs/${did}/messages`, { method: "POST", body: fd, headers: {} });
        }

        return request(`/api/chat/dialogs/${did}/messages`, {
            method: "POST",
            json: {
                content: bodyText || "",
                clientId,
                ...(replyToMessageId != null
                    ? { replyToMessageId }
                    : replyToClientId != null
                        ? { replyToClientId: String(replyToClientId) }
                        : replyToKey != null
                            ? { replyToKey: String(replyToKey) }
                            : {}),
            },
        });
    },

    markMessagesRead: async (dialogId, messageIds = []) => {
        const did = String(dialogId);
        const ids = Array.isArray(messageIds) ? messageIds.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0) : [];
        if (!ids.length) return { updated: 0 };

        return request(`/api/chat/dialogs/${did}/messages/read`, { method: "POST", json: { messageIds: ids } });
    },

    getMessageReaders: async (messageId) => {
        return request(`/api/chat/messages/${String(messageId)}/readers`);
    },

    reactToMessage: async (messageId, { emoji, add } = {}) => {
        return request(`/api/chat/messages/${String(messageId)}/reactions`, {
            method: "POST",
            json: { emoji: emoji != null ? String(emoji) : "", ...(add === undefined ? {} : { add: Boolean(add) }) },
        });
    },

    getDialog: async (dialogId) => {
        const did = String(dialogId);
        return request(`/api/chat/dialogs/${did}`);
    },

    listMembers: async (dialogId) => {
        const did = String(dialogId);
        const res = await request(`/api/chat/dialogs/${did}/members`);
        if (Array.isArray(res)) return res;
        return res?.items || res?.content || res?.data || [];
    },

    // ✅ поиск пользователей (подстрой endpoint под свой бэк)
    searchUsers: async (q) => {
        const qs = new URLSearchParams();
        qs.set("q", String(q || ""));
        const res = await request(`/api/users/search?${qs.toString()}`);
        return pickArray(res);
    },

    // ✅ add member (GROUP)
    addMember: async (chatId, userId) => {
        return request(`/api/chat/dialogs/${String(chatId)}/members`, {
            method: "POST",
            body: JSON.stringify({ userId }),
            headers: { "Content-Type": "application/json" },
        });
    },

    // ✅ remove member (GROUP)
    removeMember: async (chatId, userId) => {
        return request(`/api/chat/dialogs/${String(chatId)}/members/${String(userId)}`, {
            method: "DELETE",
        });
    },

    getDialogInfo: async (chatId, { includeMembers = true } = {}) => {
        const qs = new URLSearchParams();
        qs.set("includeMembers", includeMembers ? "true" : "false");
        const res = await request(`/api/chat/dialogs/${String(chatId)}/info?${qs.toString()}`);
        return res;
    },
};

