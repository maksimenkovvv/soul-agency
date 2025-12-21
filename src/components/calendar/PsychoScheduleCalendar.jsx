import React, { useEffect, useState } from "react";

import { useAuth } from "../../../../../../../../Downloads/src 3/auth/authStore";
import { sessionsApi } from "../../api/sessionsApi";

import WeeklyScheduleEditor from "./WeeklyScheduleEditor";
import BookingCalendar from "./BookingCalendar";

export default function PsychoScheduleCalendar() {
    const { me } = useAuth();
    const psychoId = me?.id;

    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadSchedule = async () => {
        if (!psychoId) return;
        setLoading(true);
        try {
            const sc = await sessionsApi.getSchedule(psychoId);
            setSchedule(sc);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchedule();
    }, [psychoId]);

    const save = async (next) => {
        if (!psychoId) return;
        setSaving(true);
        try {
            const saved = await sessionsApi.upsertSchedule(psychoId, next);
            setSchedule(saved);
        } finally {
            setSaving(false);
        }
    };

    if (!psychoId) {
        return (
            <div className="b-calendar__empty">
                <h3>Недоступно</h3>
                <p>Войдите как психолог, чтобы настроить график.</p>
            </div>
        );
    }

    return (
        <div className="b-sessions-layout b-sessions-layout--psycho">
            <div className="b-sessions-layout__side">
                {loading ? (
                    <div className="b-sessions__loading">Загрузка графика…</div>
                ) : (
                    <WeeklyScheduleEditor value={schedule} onChange={setSchedule} onSave={save} saving={saving} />
                )}
            </div>

            <div className="b-sessions-layout__main">
                <BookingCalendar
                    psychologist={{
                        id: psychoId,
                        name: me?.name || me?.email || `Психолог #${psychoId}`,
                    }}
                    mode="PSYCHO"
                    schedule={schedule}
                    allowDayOff
                />
            </div>
        </div>
    );
}
