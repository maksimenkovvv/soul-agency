import React, { useEffect, useState } from "react";

import { useAuth } from "../auth/authStore";

import { psychologistsApi } from "../api/psychologistsApi";
import PsychologistSelectModal from "../components/calendar/PsychologistSelectModal";
import BookingCalendar from "../components/calendar/BookingCalendar";

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8080";
function resolveUrl(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

function Sessions() {
    const { isAuthenticated, role } = useAuth();

    const [selected, setSelected] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [loadingDefault, setLoadingDefault] = useState(false);
    const [flash, setFlash] = useState(null);

    const canBook = role === "CLIENT" || role === "ADMIN";

    // подхватим "первого" психолога, чтобы календарь сразу был не пуст
    useEffect(() => {
        let alive = true;
        if (selected) return;
        setLoadingDefault(true);
        psychologistsApi
            .list({ page: 0, size: 1 })
            .then((resp) => {
                const arr = Array.isArray(resp) ? resp : resp?.content || [];
                const raw = arr?.[0];
                if (!raw || !alive) return;
                const id = raw?.userId ?? raw?.id;
                setSelected({
                    id,
                    name: raw?.name || `Психолог #${id}`,
                    priceAtTime: raw?.pricePerSession ?? null,
                    image: raw?.avatarUrl || raw?.avatar_url ? resolveUrl(raw?.avatarUrl || raw?.avatar_url) : null,
                });
            })
            .catch(() => {})
            .finally(() => {
                if (alive) setLoadingDefault(false);
            });

        return () => {
            alive = false;
        };
    }, [selected]);

    return (
        <div className="b-sessions-page">
            <div className="b-sessions-page__head">
                <h2>Сессии</h2>
                <p>
                    Выберите психолога и свободный слот в календаре.
                    {!isAuthenticated ? " Для бронирования нужно войти." : !canBook ? " В вашем профиле бронирование недоступно." : ""}
                </p>
            </div>

            {flash ? <div className="b-alert">{flash}</div> : null}

            <div className="b-sessions-layout">
                <div className="b-sessions-layout__side">
                    <div className="b-psy-picker">
                        <div className="b-psy-picker__title">Психолог</div>

                        {selected ? (
                            <button
                                type="button"
                                className="b-psy-card is-active"
                                onClick={() => setPickerOpen(true)}
                                title="Сменить психолога"
                            >
                                <div className="b-psy-card__avatar">
                                    {selected.image ? (
                                        <img src={selected.image} alt={selected.name} />
                                    ) : (
                                        <div className="b-psy-card__placeholder" />
                                    )}
                                </div>
                                <div className="b-psy-card__meta">
                                    <div className="b-psy-card__name">{selected.name}</div>
                                    {selected.priceAtTime != null ? (
                                        <div className="b-psy-card__price">{selected.priceAtTime} ₽</div>
                                    ) : (
                                        <div className="b-psy-card__sub">цена по запросу</div>
                                    )}
                                </div>
                                <div className="b-psy-card__chev">›</div>
                            </button>
                        ) : (
                            <div className="b-psy-picker__empty">
                                {loadingDefault ? "Загрузка…" : "Выберите психолога для просмотра слотов"}
                            </div>
                        )}

                        <button type="button" className="b-btn" onClick={() => setPickerOpen(true)}>
                            {selected ? "Сменить психолога" : "Выбрать психолога"}
                        </button>
                    </div>

                    <div className="b-sessions__tips">
                        <div className="b-sessions__tip">
                            <b>Свободные слоты</b> — это ячейки, сформированные из графика психолога (справа).
                        </div>
                        <div className="b-sessions__tip">
                            <b>Выходные</b> блокируют запись. Их можно добавлять в личном кабинете психолога.
                        </div>
                    </div>
                </div>

                <div className="b-sessions-layout__main">
                    {selected ? (
                        <BookingCalendar
                            psychologist={selected}
                            mode="CLIENT"
                            onBooked={() => {
                                setFlash("Бронь создана (PENDING_PAYMENT). Можно подключить оплату и подтверждение.");
                                window.setTimeout(() => setFlash(null), 4000);
                            }}
                        />
                    ) : (
                        <div className="b-calendar__empty">
                            <h3>Выберите психолога</h3>
                            <p>Сначала выберите специалиста — после этого появятся свободные слоты в календаре.</p>
                            <button type="button" className="b-btn" onClick={() => setPickerOpen(true)}>
                                Выбрать психолога
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <PsychologistSelectModal
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                selectedId={selected?.id}
                onSelect={(p) => {
                    setSelected({
                        id: p.id,
                        name: p.name,
                        priceAtTime: p.priceAtTime ?? null,
                        image: p.image || null,
                    });
                }}
            />
        </div>
    );
}

export default Sessions;
