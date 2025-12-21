import { request } from "./http";

export const psychologistsApi = {
    /**
     * ожидаем:
     * GET /api/psychologists?limit=3
     */
    list: ({ limit } = {}) =>
        request(
            `/api/psychologists${Number.isFinite(limit) ? `?limit=${encodeURIComponent(limit)}` : ""}`
        ),

    // GET /api/psychologists/favourites -> [1,2] или [{id:1},{id:2}]
    favourites: () => request(`/api/psychologists/favourites`),

    // POST /api/psychologists/{id}/favourites
    addFavourite: (id) => request(`/api/psychologists/${id}/favourites`, { method: "POST" }),

    // DELETE /api/psychologists/{id}/favourites
    removeFavourite: (id) => request(`/api/psychologists/${id}/favourites`, { method: "DELETE" }),
};
