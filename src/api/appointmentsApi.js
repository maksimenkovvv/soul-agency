import { request } from "./http";

export const appointmentsApi = {
    listMy: () => request("/api/me/appointments", { method: "GET" }),
    createPayment: (bookingId) =>
        request("/payments/yookassa/create", {
            method: "POST",
            json: { bookingId },
        }),
    getOne: (id) => {
        const bookingId = String(id ?? "").trim();
        if (!bookingId) throw new Error("bookingId is required");
        return request(`/api/me/appointments/${bookingId}`, { method: "GET" });
    },
};
