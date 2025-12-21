import React, { useMemo, useState } from "react";

import { useAuth } from "../auth/authStore";

import psychologist1 from "../assets/img/psychologist-1.webp";
import psychologist2 from "../assets/img/psychologist-2.webp";
import psychologist3 from "../assets/img/psychologist-3.webp";

import PsychologistPicker from "../components/calendar/PsychologistPicker";
import BookingCalendar from "../components/calendar/BookingCalendar";

function Sessions() {
    const { isAuthenticated, role } = useAuth();

    const psychologists = useMemo(
        () => [
            {
                id: 1,
                name: "Иванна Иванова",
                experience: "более 15 лет",
                priceLabel: "50 мин 3000₽",
                priceAtTime: 3000,
                image: psychologist1,
            },
            {
                id: 2,
                name: "Мария Петрова",
                experience: "более 10 лет",
                priceLabel: "50 мин 2500₽",
                priceAtTime: 2500,
                image: psychologist2,
            },
            {
                id: 3,
                name: "Алексей Сидоров",
                experience: "более 8 лет",
                priceLabel: "50 мин 2000₽",
                priceAtTime: 2000,
                image: psychologist3,
            },
        ],
        []
    );

    const [selected, setSelected] = useState(psychologists[0]);
    const [flash, setFlash] = useState(null);

    const canBook = role === "CLIENT" || role === "ADMIN";

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
                    <PsychologistPicker psychologists={psychologists} value={selected} onChange={setSelected} />

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
                    <BookingCalendar
                        psychologist={selected}
                        mode="CLIENT"
                        onBooked={() => {
                            setFlash("Бронь создана (PENDING_PAYMENT). Можно подключить оплату и подтверждение.");
                            window.setTimeout(() => setFlash(null), 4000);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default Sessions;
