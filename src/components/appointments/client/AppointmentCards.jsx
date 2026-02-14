import React from "react";
import { Link } from "react-router-dom";
import photoFallback from "../../../assets/img/psychologist-1.webp";
import { appointmentsApi } from "../../../api/appointmentsApi";

// ---- helpers ----
const RU = "ru-RU";

function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function getStatusGroup(startISO, endISO) {
    const now = new Date();
    const start = startISO ? new Date(startISO) : null;
    const end = endISO ? new Date(endISO) : null;

    if (!start || Number.isNaN(start.getTime())) return "upcoming";

    if (end && !Number.isNaN(end.getTime()) && end.getTime() < now.getTime()) return "past";
    if (isSameDay(start, now)) return "today";
    return "upcoming";
}

function formatDateParts(startISO) {
    if (!startISO) {
        return { date_weekday: "—", date_day: "—", time: "—" };
    }

    const d = new Date(startISO);

    const weekdayFull = new Intl.DateTimeFormat(RU, { weekday: "short" }).format(d);
    const date_weekday = weekdayFull.replace(".", "").slice(0, 2).toUpperCase();

    const date_day = new Intl.DateTimeFormat(RU, { day: "numeric", month: "long" }).format(d);

    const time = new Intl.DateTimeFormat(RU, { hour: "2-digit", minute: "2-digit" }).format(d);

    return { date_weekday, date_day, time };
}

function rub(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "—";
    return v.toLocaleString("ru-RU");
}

function isPaid(raw) {
    const s = String(raw?.status || "").toUpperCase();
    const ps = String(raw?.paymentStatus || "").toUpperCase();

    // ✅ максимально терпимо к твоим enum-ам
    return (
        s === "PAID" ||
        s === "SUCCEEDED" ||
        s === "CONFIRMED" ||
        ps === "PAID" ||
        ps === "SUCCEEDED" ||
        // ✅ если телемост уже есть — значит оплата прошла
        Boolean(raw?.telemostUrl || raw?.joinUrl)
    );
}

/**
 * ✅ Рисуем "оплата/состояние" нормально:
 * - PAID -> Оплачено
 * - PENDING_PAYMENT -> Ожидает оплаты
 * - OPEN + нет ссылок -> Бронь отменена/истекла
 */
function derivePaymentUi(appointment) {
    const status = String(appointment?.status || "").toUpperCase();

    const paid = Boolean(appointment?.paid);
    const hasPay = Boolean(appointment?.paymentUrl);
    const hasTele = Boolean(appointment?.telemostUrl);

    const startMs = appointment?.startDateTime ? new Date(appointment.startDateTime).getTime() : null;
    const isPast = Number.isFinite(startMs) ? startMs < Date.now() : false;

    if (paid || hasTele || status === "PAID") {
        return { key: "paid", label: "Оплачено", css: "appointments-cards__badge--paid" };
    }

    // ✅ ожидает оплаты ТОЛЬКО если реально pending
    if (status === "PENDING_PAYMENT" || status === "PENDING") {
        return { key: "pending", label: "Ожидает оплаты", css: "appointments-cards__badge--unpaid" };
    }

    // ✅ если бронь слетела в OPEN / CANCELLED и ссылок нет — считаем отменой
    if ((status === "OPEN" || status === "CANCELLED") && !hasPay && !hasTele) {
        return {
            key: "cancelled",
            label: isPast ? "Не оплачено (истекло)" : "Бронь отменена",
            css: "appointments-cards__badge--cancelled",
        };
    }

    // fallback
    if (!hasPay && !hasTele) {
        return { key: "cancelled", label: "Бронь отменена", css: "appointments-cards__badge--cancelled" };
    }

    return { key: "unknown", label: "Не оплачено", css: "appointments-cards__badge--unpaid" };
}

function buildDetailsLink(a) {
    // ✅ DIRECT открываем как /psychologist?bookingId=...&psychologistId=...
    // ✅ GROUP как /sessions?bookingId=...
    const type = String(a?.type || "").toUpperCase();
    if (type === "GROUP") {
        return `/sessions?bookingId=${a.id}&payment=return`;
    }
    const psyId = a?.psychologistId;
    if (psyId) {
        return `/psychologist?bookingId=${a.id}&payment=return&psychologistId=${psyId}`;
    }
    return `/psychologist?bookingId=${a.id}&payment=return`;
}

function AppointmentCards({ filter }) {
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [payingId, setPayingId] = React.useState(null);

    // ✅ грузим реальные записи
    React.useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setLoading(true);
                setError("");
                const data = await appointmentsApi.listMyAll();
                const list = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.content)
                        ? data.content
                        : Array.isArray(data?.items)
                            ? data.items
                            : [];

                const normalized = list.map((a) => {
                    const statusGroup = getStatusGroup(a.startDateTime, a.endDateTime);

                    const paid = isPaid(a);
                    const status = String(a?.status || "").toUpperCase();

                    const paymentUrl = a.paymentUrl || a.confirmationUrl || a.payUrl || null;
                    const telemostUrl = a.telemostUrl || a.joinUrl || a.meetingUrl || null;

                    const type = String(a?.type || a?.sessionType || "").toUpperCase() || null;
                    const groupSessionId = a.groupSessionId || a.group_session_id || a.sessionId || a.session_id || null;

                    // ✅ title/name for group sessions
                    const displayName =
                        type === "GROUP"
                            ? a.sessionTitle || a.title || a.name || "Групповая сессия"
                            : a.psychologistName || a.psychologist?.name || "Психолог";

                    const photo =
                        type === "GROUP"
                            ? (a.sessionCoverUrl || a.coverUrl || a.imageUrl || photoFallback)
                            : (a.psychologistAvatarUrl || a.psychologist?.avatarUrl || photoFallback);

                    // ✅ Платить можно ТОЛЬКО если pending
                    const canPay =
                        !paid &&
                        (status === "PENDING_PAYMENT" || status === "PENDING") &&
                        (statusGroup === "upcoming" || statusGroup === "today");

                    // details link (supports bookingId OR direct groupSessionId)
                    const detailsLink =
                        type === "GROUP"
                            ? groupSessionId
                                ? `/sessions?groupSessionId=${encodeURIComponent(String(groupSessionId))}`
                                : "/sessions"
                            : buildDetailsLink(a);

                    return {
                        id: a.id,
                        type,
                        groupSessionId,
                        psychologistId: a.psychologistId,
                        name: displayName,
                        photo,
                        price: a.priceRub ?? a.priceAtTime ?? a.price ?? null,
                        startDateTime: a.startDateTime,
                        endDateTime: a.endDateTime,
                        statusGroup,
                        status,

                        paid,
                        canPay,

                        paymentUrl,
                        telemostUrl,
                        detailsLink,
                    };
                });

                if (!alive) return;
                setItems(normalized);
            } catch (e) {
                if (!alive) return;
                setError(e?.message || "Не удалось загрузить записи");
            } finally {
                if (!alive) return;
                setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    // ✅ фильтрация как раньше
    const filteredAppointments = React.useMemo(() => {
        return items.filter((appointment) => {
            if (filter === "all") return true;
            if (filter === "upcoming") return appointment.statusGroup === "upcoming" || appointment.statusGroup === "today";
            if (filter === "past") return appointment.statusGroup === "past";
            return true;
        });
    }, [items, filter]);

    async function handlePay(appointment) {
        if (!appointment?.id) return;

        // ✅ защита: нельзя платить если бронь уже OPEN/CANCELLED
        if (!appointment.canPay) {
            alert("Эта бронь уже отменена или истекла. Запишитесь заново 🙂");
            return;
        }

        try {
            setPayingId(appointment.id);

            // 1) если уже есть paymentUrl → просто открываем
            if (appointment.paymentUrl) {
                window.open(appointment.paymentUrl, "_blank", "noopener,noreferrer");
                return;
            }

            // 2) иначе просим бэк создать оплату и вернуть ссылку
            const res = await appointmentsApi.createPayment(appointment.id);

            const url =
                res?.paymentUrl ||
                res?.confirmationUrl ||
                res?.url ||
                res?.redirectUrl ||
                res?.payUrl;

            if (!url) {
                throw new Error("Бэк не вернул ссылку на оплату");
            }

            window.open(url, "_blank", "noopener,noreferrer");

            setItems((prev) =>
                prev.map((x) => (x.id === appointment.id ? { ...x, paymentUrl: url } : x))
            );
        } catch (e) {
            alert(e?.message || "Ошибка при создании оплаты");
        } finally {
            setPayingId(null);
        }
    }

    function handleTelemost(appointment) {
        if (!appointment?.telemostUrl) return;
        window.open(appointment.telemostUrl, "_blank", "noopener,noreferrer");
    }

    return (
        <div className="b-appointments-cards">
            {loading && (
                <div className="appointments-cards__notfound">
                    <p className="appointments-cards__notfound-title">Загрузка записей...</p>
                </div>
            )}

            {!loading && error && (
                <div className="appointments-cards__notfound">
                    <p className="appointments-cards__notfound-title">Ошибка: {error}</p>
                </div>
            )}

            {!loading && !error && filteredAppointments.length > 0 ? (
                <div className="appointments-cards__items">
                    {filteredAppointments.map((appointment) => {
                        const dateParts = formatDateParts(appointment.startDateTime);

                        const statusLabel =
                            appointment.statusGroup === "upcoming"
                                ? "Предстоит"
                                : appointment.statusGroup === "today"
                                    ? "Сегодня"
                                    : "Завершено";

                        const payUi = derivePaymentUi(appointment);

                        const isUpcoming = appointment.statusGroup === "upcoming" || appointment.statusGroup === "today";
                        const detailsLink = appointment.detailsLink || buildDetailsLink(appointment);

                        return (
                            <div key={appointment.id} className="appointments-cards__item">
                                <div className="appointments-cards__item-top">
                                    <div className="appointments-cards__item-top__info">
                                        <span className="appointments-cards__item-top__info-day">
                                            {dateParts.date_weekday},{" "}
                                        </span>
                                        <span className="appointments-cards__item-top__info-date">{dateParts.date_day}</span>
                                        <span className="appointments-cards__item-top__info-time">{dateParts.time}</span>
                                    </div>

                                    <div className={`appointments-cards__item-top__status ${appointment.statusGroup}`}>
                                        {statusLabel}
                                    </div>
                                </div>

                                <div className="appointments-cards__item-middle">
                                    <img
                                        src={appointment.photo}
                                        onError={(e) => (e.currentTarget.src = photoFallback)}
                                        alt={appointment.name}
                                        className="appointments-cards__item-middle__photo"
                                    />
                                    <div className="appointments-cards__item-middle__name">{appointment.name}</div>
                                    <div className="appointments-cards__item-middle__price">{rub(appointment.price)} ₽</div>

                                    {/* ✅ мини-индикатор оплаты */}
                                    <div className="appointments-cards__item-middle__meta">
                                        <span className={`appointments-cards__badge ${payUi.css}`}>
                                            {payUi.label}
                                        </span>
                                    </div>
                                </div>

                                {/* ---- actions ---- */}
                                <div className="appointments-cards__item-actions">
                                    {/* ✅ если pending → оплатить */}
                                    {!appointment.paid && appointment.canPay && isUpcoming && (
                                        <button
                                            className="appointments-cards__item-bottom b-btn"
                                            onClick={() => handlePay(appointment)}
                                            disabled={payingId === appointment.id}
                                        >
                                            {payingId === appointment.id ? "Создаём оплату..." : "Оплатить"}
                                        </button>
                                    )}

                                    {/* ✅ если оплачено → телемост */}
                                    {appointment.paid && isUpcoming && (
                                        <button
                                            className="appointments-cards__item-bottom b-btn"
                                            onClick={() => handleTelemost(appointment)}
                                            disabled={!appointment.telemostUrl}
                                            title={!appointment.telemostUrl ? "Ссылка появится ближе к сессии" : ""}
                                        >
                                            Открыть Телемост
                                        </button>
                                    )}

                                    {/* ✅ если бронь отменена/истекла (OPEN + нет ссылок) → показываем “записаться снова” */}
                                    {payUi.key === "cancelled" && (
                                        <Link
                                            className="appointments-cards__item-bottom b-btn b-btn--transparent"
                                            to="/psychologist"
                                        >
                                            Записаться снова
                                        </Link>
                                    )}

                                    {/* ✅ прошлые → записаться снова */}
                                    {appointment.statusGroup === "past" && (
                                        <Link className="appointments-cards__item-bottom b-btn b-btn--transparent" to="/psychologist">
                                            Записаться снова
                                        </Link>
                                    )}

                                    {/* ✅ Подробнее (правильная ссылка) */}
                                    <Link
                                        className="appointments-cards__item-bottom b-btn b-btn--transparent"
                                        to={detailsLink}
                                    >
                                        Подробнее
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {!loading && !error && filteredAppointments.length === 0 && (
                <div className="appointments-cards__notfound">
                    <p className="appointments-cards__notfound-title">
                        Здесь будут храниться ваши записи на сессии
                    </p>
                    <div className="appointments-cards__notfound-btn">
                        <Link className="b-btn" to="/psychologist">
                            Подобрать психолога
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AppointmentCards;
