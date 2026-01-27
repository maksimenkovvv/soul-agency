import { request } from "./http";

export const paymentsApi = {
    /**
     * Все транзакции текущего пользователя.
     * Ожидаемый формат ответа: массив PaymentDTO или { items: [...] }
     */
    listMy: () => request("/api/me/payments", { method: "GET" }),

    /**
     * Инициировать возврат (если до сессии > 24ч)
     */
    refund: (paymentId) => {
        const id = String(paymentId ?? "").trim();
        if (!id) throw new Error("paymentId is required");
        return request(`/api/me/payments/${id}/refund`, { method: "POST" });
    },
};
