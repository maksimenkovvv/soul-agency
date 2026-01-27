import React from "react";
import BookingCalendar from "../calendar/BookingCalendar"; // <-- проверь путь

const PLACEHOLDER =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="#EEF1F4"/>
      <stop offset="1" stop-color="#E6E9EE"/>
    </linearGradient>
  </defs>
  <rect width="640" height="420" rx="24" fill="url(#g)"/>
  <circle cx="320" cy="160" r="52" fill="#D7DDE3"/>
  <path d="M160 360c20-80 84-120 160-120s140 40 160 120" fill="#D7DDE3"/>
</svg>
`);

function PsychologistModal({
                               isOpen,
                               psychologist,
                               onClose,
                               type = "psychologist",

                               // ✅ добавили
                               onPay, // вызывается в session режиме по кнопке снизу
                               loading = false,
                               payLabel = "Перейти к оплате",
                           }) {
    const ANIM_MS = 280;

    // ✅ хук №1
    const [mounted, setMounted] = React.useState(false);

    // ✅ хук №2-3
    const [isDescriptionExpanded, setIsDescriptionExpanded] = React.useState(false);
    const [isEducationExpanded, setIsEducationExpanded] = React.useState(false);

    // ✅ хук №4
    const [showCalendar, setShowCalendar] = React.useState(false);

    // ✅ хук №5
    const [bookedInfo, setBookedInfo] = React.useState(null);

    // ✅ хук №6 (эффект монтажа с анимацией закрытия)
    React.useEffect(() => {
        if (isOpen) {
            setMounted(true);
            return;
        }
        const t = setTimeout(() => setMounted(false), ANIM_MS);
        return () => clearTimeout(t);
    }, [isOpen]);

    // ✅ хук №7 (сброс UI при открытии новой карточки/модалки)
    React.useEffect(() => {
        if (!isOpen) return;
        setIsDescriptionExpanded(false);
        setIsEducationExpanded(false);
        setShowCalendar(false);
        setBookedInfo(null);
    }, [isOpen, psychologist?.id]);

    // ✅ хук №8 (useMemo НЕ должен быть ниже return)
    const calendarPsychologist = React.useMemo(() => {
        if (!psychologist) return null;

        return {
            ...psychologist,
            id: psychologist.id,
            name: psychologist.name,
            // чтобы BookingCalendar мог поставить priceAtTime
            priceAtTime: psychologist.priceAtTime ?? psychologist.pricePerSession ?? null,
        };
    }, [psychologist]);

    // ✅ хук №9 — блокируем скролл body
    React.useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        return () => {
            document.body.style.overflow = prev || "auto";
        };
    }, [isOpen]);

    // ✅ хук №10 — ESC закрывает модалку
    React.useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose]);

    // ✅ ТОЛЬКО ПОСЛЕ ВСЕХ ХУКОВ можно return
    if (!mounted || !psychologist) return null;

    const shouldShowDescriptionButton = psychologist.description && psychologist.description.length > 150;
    const shouldShowEducationButton = psychologist.education && psychologist.education.length > 100;

    const truncateText = (text, maxLength, isExpanded) => {
        if (!text) return "";
        return isExpanded ? text : text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
    };

    const prettySlot = (start, end) => {
        if (!start || !end) return "";
        const s = new Date(start);
        const e = new Date(end);
        const date = s.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "short" });
        const t1 = s.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        const t2 = e.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        return `${date}, ${t1} — ${t2}`;
    };

    const safeImgSrc = psychologist?.image || psychologist?.avatarUrl || psychologist?.photoUrl || "";
    const imgSrc = safeImgSrc ? safeImgSrc : PLACEHOLDER;

    const priceLabel =
        psychologist?.pricePerSession != null
            ? `${psychologist.pricePerSession}₽`
            : psychologist?.priceAtTime != null
                ? `${psychologist.priceAtTime}₽`
                : "цена по запросу";

    const durationLabel =
        psychologist?.sessionDuration != null
            ? `${psychologist.sessionDuration} мин`
            : psychologist?.sessionDurationMinutes != null
                ? `${psychologist.sessionDurationMinutes} мин`
                : "—";

    const participantsCount = Number(psychologist?.participantsCount ?? 0);
    const capacityClients =
        psychologist?.capacityClients != null && psychologist?.capacityClients !== ""
            ? Number(psychologist.capacityClients)
            : null;

    const placesLabel = capacityClients ? `${participantsCount}/${capacityClients}` : String(participantsCount);

    const renderContent = () => {
        // ======= GROUP SESSION =======
        if (type === "session") {
            return (
                <>
                    <div className="psychologist-modal__avatar">
                        <img
                            src={imgSrc}
                            alt={psychologist.title || psychologist.name}
                            onError={(e) => {
                                e.currentTarget.src = PLACEHOLDER;
                            }}
                        />
                    </div>

                    <div className="psychologist-modal__header">
                        <h2 className="psychologist-modal__header-name">
                            {psychologist.title || psychologist.name}
                        </h2>

                        <p className="psychologist-modal__header-price">
                            Групповая сессия {durationLabel} {priceLabel}
                        </p>

                        <div className="psychologist-modal__header-info">
                            <div className="psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__row-data">Время</div>
                                <div className="psychologist-modal__header-info__row-data">{psychologist.date || "—"}</div>
                            </div>

                            <div className="psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__row-data">Психолог</div>
                                <div className="psychologist-modal__header-info__row-data">{psychologist.name || "—"}</div>
                            </div>

                            {/* ✅ места (если есть) */}
                            <div className="psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__row-data">Участники</div>
                                <div className="psychologist-modal__header-info__row-data">{placesLabel}</div>
                            </div>

                            <div className="psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__row-data">Темы</div>
                                <div className="psychologist-modal__header-info__row-data">
                                    {psychologist.themes || "Не указаны"}
                                </div>
                            </div>

                            <div className="psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__row-data">Метод</div>
                                <div className="psychologist-modal__header-info__row-data">
                                    {psychologist.method || "Не указан"}
                                </div>
                            </div>

                            <div className="psychologist-modal__header-info__row">
                                <div className="psychologist-modal__header-info__row-data">Описание</div>
                                <div className="psychologist-modal__header-info__row-data psychologist-modal__header-info__row-data--expand">
                                    {truncateText(psychologist.description, 150, isDescriptionExpanded)}
                                    {shouldShowDescriptionButton && (
                                        <button
                                            type="button"
                                            className="psychologist-modal__expand-button"
                                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                        >
                                            {isDescriptionExpanded ? "Свернуть" : "Развернуть"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ✅ нижняя панель */}
                    <div className="psychologist-modal__bottom">
                        <div className="psychologist-modal__bottom-price">{priceLabel}</div>
                        <div className="psychologist-modal__bottom-date">{psychologist.date || "—"}</div>

                        <button
                            type="button"
                            className="psychologist-modal__bottom-button b-btn"
                            onClick={() => (onPay ? onPay(psychologist) : alert("Оплата/Запись"))}
                            disabled={loading}
                            title={loading ? "Загрузка..." : payLabel}
                        >
                            {loading ? "Загрузка…" : payLabel}
                        </button>
                    </div>
                </>
            );
        }

        // ======= PSYCHOLOGIST (встроенный календарь) =======
        return (
            <>
                <div className="psychologist-modal__avatar">
                    <img
                        src={imgSrc}
                        alt={psychologist.name}
                        onError={(e) => {
                            e.currentTarget.src = PLACEHOLDER;
                        }}
                    />
                </div>

                <div className="psychologist-modal__header">
                    <h2 className="psychologist-modal__header-name">
                        {psychologist.name}
                        {psychologist.age ? `, ${psychologist.age} лет` : ""}
                    </h2>

                    <p className="psychologist-modal__header-price">
                        Индивидуальная сессия {durationLabel} {priceLabel}
                    </p>

                    <div className="psychologist-modal__header-info">
                        {/* ✅ Время */}
                        <div className="psychologist-modal__header-info__row">
                            <div className="psychologist-modal__header-info__row-data">Время</div>

                            <div className="psychologist-modal__header-info__row-data psychologist-modal__header-info__row-data--expand">
                                {bookedInfo ? (
                                    <div>
                                        <b>{prettySlot(bookedInfo.startDateTime, bookedInfo.endDateTime)}</b>
                                        <div style={{ opacity: 0.65, marginTop: 6 }}>
                                            Слот забронирован — оплата доступна в календаре
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ opacity: 0.7 }}>Выберите слот в календаре</div>
                                )}

                                <button
                                    type="button"
                                    className="psychologist-modal__expand-button"
                                    onClick={() => setShowCalendar((s) => !s)}
                                >
                                    {showCalendar ? "Скрыть календарь" : "Открыть календарь"}
                                </button>
                            </div>
                        </div>

                        {/* ✅ Встроенный календарь */}
                        {showCalendar && calendarPsychologist && (
                            <div className="psychologist-modal__calendar">
                                <BookingCalendar
                                    psychologist={calendarPsychologist}
                                    mode="CLIENT"
                                    allowDayOff={false}
                                    onBooked={(booking) => setBookedInfo(booking || null)}
                                />
                            </div>
                        )}

                        {/* ✅ Остальная инфа */}
                        <div className="psychologist-modal__header-info__row">
                            <div className="psychologist-modal__header-info__row-data">Опыт</div>
                            <div className="psychologist-modal__header-info__row-data">{psychologist.experience || "—"}</div>
                        </div>

                        <div className="psychologist-modal__header-info__row">
                            <div className="psychologist-modal__header-info__row-data">Образование</div>
                            <div className="psychologist-modal__header-info__row-data psychologist-modal__header-info__row-data--expand">
                                {truncateText(psychologist.education, 100, isEducationExpanded)}
                                {shouldShowEducationButton && (
                                    <button
                                        type="button"
                                        className="psychologist-modal__expand-button"
                                        onClick={() => setIsEducationExpanded(!isEducationExpanded)}
                                    >
                                        {isEducationExpanded ? "Свернуть" : "Развернуть"}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="psychologist-modal__header-info__row">
                            <div className="psychologist-modal__header-info__row-data">Темы</div>
                            <div className="psychologist-modal__header-info__row-data">
                                {psychologist.themes || "—"}
                            </div>
                        </div>

                        <div className="psychologist-modal__header-info__row">
                            <div className="psychologist-modal__header-info__row-data">Метод</div>
                            <div className="psychologist-modal__header-info__row-data">
                                {psychologist.method || "—"}
                            </div>
                        </div>

                        <div className="psychologist-modal__header-info__row">
                            <div className="psychologist-modal__header-info__row-data">Описание</div>
                            <div className="psychologist-modal__header-info__row-data psychologist-modal__header-info__row-data--expand">
                                {truncateText(psychologist.description, 150, isDescriptionExpanded)}
                                {shouldShowDescriptionButton && (
                                    <button
                                        type="button"
                                        className="psychologist-modal__expand-button"
                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    >
                                        {isDescriptionExpanded ? "Свернуть" : "Развернуть"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ✅ нижняя панель */}
                <div className="psychologist-modal__bottom">
                    <div className="psychologist-modal__bottom-price">{priceLabel}</div>
                    <div className="psychologist-modal__bottom-date">
                        {bookedInfo ? prettySlot(bookedInfo.startDateTime, bookedInfo.endDateTime) : "—"}
                    </div>
                    <button
                        type="button"
                        className="psychologist-modal__bottom-button b-btn"
                        onClick={() => setShowCalendar(true)}
                    >
                        Выбрать время
                    </button>
                </div>
            </>
        );
    };

    return (
        <div className={`psychologist-modal ${isOpen ? "is-open" : ""}`}>
            <div className="psychologist-modal__overlay" onClick={onClose} />

            <div className="psychologist-modal__content">
                <button
                    type="button"
                    className="psychologist-modal__close"
                    onClick={onClose}
                    aria-label="Закрыть"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {renderContent()}
            </div>
        </div>
    );
}

export default PsychologistModal;
