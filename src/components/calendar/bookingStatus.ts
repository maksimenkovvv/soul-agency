export function humanStatus(b, { forRole = "CLIENT" } = {}) {
    const s = String(b?.status || "");
    switch (s) {
        case "OPEN":
            return "Свободно";

        case "PENDING_PAYMENT":
            return forRole === "PSYCHOLOGIST"
                ? "Забронировано (ждём оплату)"
                : "Забронировано (ожидает оплаты)";

        case "PAID":
            return "Оплачено";
        case "CANCELLED":
            return "Отменено";
        case "COMPLETED":
            return "Завершено";
        case "NO_SHOW":
            return "Неявка";
        default:
            return s || "—";
    }
}

export function statusBadgeKind(status) {
    const s = String(status || "");
    if (s === "OPEN") return "open";
    if (s === "PAID") return "paid";
    if (s === "PENDING_PAYMENT") return "pending";
    if (s === "CANCELLED") return "cancelled";
    if (s === "COMPLETED") return "completed";
    if (s === "NO_SHOW") return "noshow";
    return "default";
}
