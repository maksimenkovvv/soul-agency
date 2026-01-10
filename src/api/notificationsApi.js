import { request } from "./http";

function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const notificationsApi = {
  list: ({ onlyUnread = false, limit = 20, cursor } = {}) =>
    request(`/api/notifications${qs({ onlyUnread, limit, cursor })}`),

  unreadCount: () => request("/api/notifications/unread-count"),

  markRead: (id) => request(`/api/notifications/${id}/read`, { method: "POST" }),

  markAllRead: () => request("/api/notifications/read-all", { method: "POST" }),

  archive: (id) => request(`/api/notifications/${id}/archive`, { method: "POST" }),
};
