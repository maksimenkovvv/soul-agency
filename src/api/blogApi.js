import { request } from "./http";

export const blogApi = {
    list: ({ page = 0, size = 12, q = "", status = "PUBLISHED", sort } = {}) => {
        const sp = new URLSearchParams();
        sp.set("page", String(page));
        sp.set("size", String(size));
        if (q) sp.set("q", q);
        if (status) sp.set("status", status);
        if (sort) sp.set("sort", sort); // например: publishedAt,desc
        return request(`/api/blog/posts?${sp.toString()}`);
    },

    getBySlug: (slug) => request(`/api/blog/posts/${encodeURIComponent(slug)}`),
    listPublished: ({ page = 0, size = 18 } = {}) =>
        request(`/api/blog/posts?page=${page}&size=${size}&status=PUBLISHED`),
};
