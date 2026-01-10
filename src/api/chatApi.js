import { request } from "./http";

// Chat REST API
// - GET  /api/chat/dialogs
// - GET  /api/chat/dialogs/{id}/messages?limit=30&cursor=...
// - POST /api/chat/dialogs/{id}/messages  (JSON or multipart)
// - POST /api/chat/dialogs/{id}/read
// - POST /api/chat/messages/{messageId}/reactions

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

        const res = await request(`/api/chat/dialogs/${dialogId}/messages?${qs.toString()}`);

        // if backend returns {items,nextCursor}
        if (res && typeof res === "object" && !Array.isArray(res) && Array.isArray(res.items)) return res;

        // fallback for arrays
        return { items: pickArray(res), nextCursor: null };
    },

    sendMessage: async (
        dialogId,
        { text, content, clientId, files, replyToKey, replyToMessageId } = {}
    ) => {
        const bodyText = content != null ? content : text;

        const hasFiles = Array.isArray(files) && files.length > 0;
        if (hasFiles) {
            const fd = new FormData();
            if (bodyText != null) fd.append("content", bodyText);
            if (clientId) fd.append("clientId", clientId);

            // reply
            if (replyToMessageId != null) fd.append("replyToMessageId", String(replyToMessageId));
            else if (replyToKey != null) fd.append("replyToKey", String(replyToKey));

            for (const f of files) fd.append("files", f);

            return request(`/api/chat/dialogs/${dialogId}/messages`, {
                method: "POST",
                body: fd,
                headers: {}, // важно: не ставим Content-Type вручную
            });
        }

        return request(`/api/chat/dialogs/${dialogId}/messages`, {
            method: "POST",
            json: {
                content: bodyText || "",
                clientId,
                ...(replyToMessageId != null
                    ? { replyToMessageId }
                    : replyToKey != null
                        ? { replyToKey: String(replyToKey) }
                        : {}),
            },
        });
    },

    markDialogRead: async (dialogId) => {
        return request(`/api/chat/dialogs/${dialogId}/read`, { method: "POST" });
    },

    /**
     * Reactions
     * POST /api/chat/messages/{messageId}/reactions
     * body: { emoji: "👍", add?: true|false }   // если add не передать — бэк может трактовать как toggle
     * returns: { messageId, reactions:[{emoji,count,me}] }
     */
    reactToMessage: async (messageId, { emoji, add } = {}) => {
        return request(`/api/chat/messages/${messageId}/reactions`, {
            method: "POST",
            json: {
                emoji: emoji != null ? String(emoji) : "",
                ...(add === undefined ? {} : { add: Boolean(add) }),
            },
        });
    },
};
