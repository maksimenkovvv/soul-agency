import React from "react";

import { paymentsApi } from "../../api/paymentsApi";
import { useToast } from "../../ui/toast/ToastProvider";

function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);

    // локаль пользователя (русская), таймзона берётся из браузера
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const min = pad2(d.getMinutes());
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

function formatMoney(amount, currency) {
    const a = Number(amount);
    if (!Number.isFinite(a)) return "—";
    const cur = currency || "RUB";
    try {
        return new Intl.NumberFormat("ru-RU", {
            style: "currency",
            currency: cur,
        }).format(a);
    } catch {
        return `${a.toFixed(2)} ${cur}`;
    }
}

function statusLabel(status) {
    const s = String(status || "").toUpperCase();
    switch (s) {
        case "PENDING":
            return "Ожидает";
        case "SUCCEEDED":
        case "PAID":
            return "Оплачен";
        case "CANCELED":
        case "CANCELLED":
            return "Отменён";
        case "REFUND_REQUESTED":
            return "Возврат в обработке";
        case "REFUNDED":
            return "Возвращён";
        case "FAILED":
            return "Ошибка";
        default:
            return status ? String(status) : "—";
    }
}

function statusClass(status) {
    const s = String(status || "").toUpperCase();
    if (s === "SUCCEEDED" || s === "PAID") return "success";
    if (s === "PENDING") return "pending";
    if (s === "REFUND_REQUESTED") return "pending";
    if (s === "REFUNDED") return "muted";
    if (s === "CANCELED" || s === "CANCELLED" || s === "FAILED") return "danger";
    return "muted";
}

function computeRefundable(item) {
    // если сервер прислал готовый флаг — используем его
    if (typeof item?.refundable === "boolean") return item.refundable;

    // fallback: считаем по bookingStart
    const bookingStart = item?.bookingStart || item?.startDateTime || item?.sessionStart;
    if (!bookingStart) return false;

    const start = new Date(bookingStart);
    if (Number.isNaN(start.getTime())) return false;

    // только если оплачен
    const st = String(item?.status || "").toUpperCase();
    if (!(st === "SUCCEEDED" || st === "PAID")) return false;

    const cutoff = Date.now() + 24 * 60 * 60 * 1000;
    return start.getTime() > cutoff; // строго больше 24 часов
}

export default function Payments() {
    const toast = useToast();

    const [loading, setLoading] = React.useState(true);
    const [items, setItems] = React.useState([]);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await paymentsApi.listMy();
            const list = Array.isArray(res) ? res : (res?.items || []);
            setItems(Array.isArray(list) ? list : []);
        } catch (e) {
            toast.error(e?.message || "Не удалось загрузить платежи");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        load();
    }, [load]);

    const handleRefund = async (p) => {
        const id = p?.id ?? p?.paymentId;
        if (!id) return;

        const ok = window.confirm(
            "Инициировать возврат средств?\n\n" +
            "Важно: возврат доступен только если до сессии больше 24 часов."
        );
        if (!ok) return;

        try {
            await paymentsApi.refund(id);
            toast.success("Заявка на возврат отправлена");
            await load();
        } catch (e) {
            toast.error(e?.message || "Не удалось инициировать возврат");
        }
    };

    return (
        <section className="b-payments">
            <div className="payments__head">
                <h2 className="payments__title">Платежи</h2>

                <button
                    type="button"
                    className={`b-btn b-btn--transparent payments__refresh ${loading ? "is-loading" : ""}`}
                    onClick={load}
                    disabled={loading}
                >
                    {loading ? <span className="b-btn__spinner" aria-hidden="true" /> : null}
                    Обновить
                </button>
            </div>

            {loading ? (
                <div className="payments__state">Загрузка…</div>
            ) : items.length === 0 ? (
                <div className="payments__state">Платежей пока нет</div>
            ) : (
                <div className="payments__items">
                    {items.map((p) => {
                        const refundable = computeRefundable(p);
                        const paymentId = p?.providerPaymentId || p?.externalId || p?.yooKassaPaymentId || p?.id;

                        return (
                            <article key={String(p?.id ?? paymentId)} className="payments__item">
                                <div className="payments__item-top">
                                    <div className="payments__item-title">
                                        <span className="payments__item-label">Транзакция</span>
                                        <span className="payments__item-id">{paymentId}</span>
                                    </div>

                                    <span className={`payments__status is-${statusClass(p?.status)}`}>
                                        {statusLabel(p?.status)}
                                    </span>
                                </div>

                                <div className="payments__meta">
                                    <div className="payments__meta-row">
                                        <span className="payments__meta-k">Сумма</span>
                                        <span className="payments__meta-v">{formatMoney(p?.amount, p?.currency)}</span>
                                    </div>
                                    <div className="payments__meta-row">
                                        <span className="payments__meta-k">Дата</span>
                                        <span className="payments__meta-v">{formatDateTime(p?.createdAt || p?.created_at)}</span>
                                    </div>
                                    <div className="payments__meta-row">
                                        <span className="payments__meta-k">Запись</span>
                                        <span className="payments__meta-v">{p?.bookingId ? `#${p.bookingId}` : "—"}</span>
                                    </div>
                                    <div className="payments__meta-row">
                                        <span className="payments__meta-k">Сессия</span>
                                        <span className="payments__meta-v">{formatDateTime(p?.bookingStart)}</span>
                                    </div>
                                </div>

                                <div className="payments__actions">
                                    {refundable ? (
                                        <button
                                            type="button"
                                            className="b-btn payments__refund"
                                            onClick={() => handleRefund(p)}
                                        >
                                            Инициировать возврат
                                        </button>
                                    ) : (
                                        <div className="payments__hint">
                                            Возврат недоступен (до сессии менее 24 часов или платёж не оплачен)
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
