import React, { useMemo } from "react";

import {useAuth} from "../../../auth/authStore";
import BookingCalendar from "../../calendar/BookingCalendar";

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8080";
function resolveUrl(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

function PsychologistAppointments() {
    const { me, role } = useAuth();

    const psychologist = useMemo(() => {
        // текущий психолог = текущий пользователь
        const id = me?.id ?? me?.userId ?? null;
        if (!id) return null;

        const name = me?.name || me?.fullName || me?.email || `Психолог #${id}`;
        const img = me?.avatarUrl || me?.avatar || null;

        return {
            id,
            name,
            priceAtTime: null,
            image: img ? resolveUrl(img) : null,
        };
    }, [me]);

    if (!psychologist) return <div className="b-calendar__empty">Загрузка профиля…</div>;

    // Если тут может оказаться ADMIN — тоже ок (тогда покажешь записи админа как “психолога”).
    // Если не надо — можно просто: if (role !== "PSYCHOLOGIST") return null;
    return (
        <div className="b-sessions-page">
            <div className="b-sessions-page__head">
                <h2>Записи</h2>
                <p>Ваши активные записи на сессии в календаре.</p>
            </div>

            <BookingCalendar
                psychologist={psychologist}
                mode="PSYCHOLOGIST"
                // можно добавить колбэк, если внутри календаря будут действия
                onBooked={null}
            />
        </div>
    );
}

export default PsychologistAppointments;
