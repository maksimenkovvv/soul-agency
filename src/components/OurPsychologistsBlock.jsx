import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import OurPsychologistTitle from "./OurPsychologistsBlockTitle";
import { psychologistsApi } from "../api/psychologistsApi";
import { useAuth } from "../auth/authStore";

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8080";

function resolveUrl(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u; // абсолютный
    // относительный -> приклеиваем API_BASE
    return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

const PLACEHOLDER =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="24" fill="#EEF1F4"/>
  <circle cx="120" cy="98" r="34" fill="#D7DDE3"/>
  <path d="M48 206c10-44 44-66 72-66s62 22 72 66" fill="#D7DDE3"/>
</svg>
`);

function formatExperienceYears(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return `более ${n} лет`;
}

function formatPrice(raw) {
    const minutes = raw?.sessionDurationMinutes ?? raw?.session_duration_minutes ?? 50;
    const price = raw?.pricePerSession ?? raw?.price_per_session;
    if (!price) return null;
    return `${minutes} мин ${price}₽`;
}

function normalizePsychologist(raw) {
    const id = raw?.id ?? raw?.userId ?? raw?.user_id;
    const name = raw?.name ?? raw?.userName ?? raw?.user_name ?? "Психолог";

    const experience =
        raw?.experience ||
        formatExperienceYears(raw?.experienceYears ?? raw?.experience_years) ||
        "опыт не указан";

    const price = raw?.price || formatPrice(raw) || "цена по запросу";

    const avatarUrl =
        raw?.avatarUrl || raw?.avatar_url || raw?.photoUrl || raw?.photo_url || "";

    const isFavourite = Boolean(
        raw?.isFavourite ?? raw?.is_favourite ?? raw?.favourite ?? raw?.favorite
    );

    return { id, name, experience, price, avatarUrl, raw, isFavourite };
}

function HeartIcon({ active }) {
    return (
        <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M1 7.48355C1.00002 6.1756 1.40511 4.89841 2.16176 3.82069C2.9184 2.74296 3.99101 1.9154 5.23792 1.44729C6.48482 0.979189 7.84737 0.892568 9.14559 1.19887C10.4438 1.50517 11.6166 2.18999 12.5092 3.16287C12.572 3.22871 12.648 3.2812 12.7325 3.31708C12.8169 3.35296 12.9079 3.37148 13 3.37148C13.092 3.37148 13.183 3.35296 13.2675 3.31708C13.3519 3.2812 13.4279 3.22871 13.4908 3.16287C14.3805 2.18367 15.5536 1.49309 16.8539 1.18307C18.1542 0.873046 19.5201 0.958274 20.7698 1.42741C22.0194 1.89655 23.0936 2.72734 23.8493 3.80921C24.6049 4.89109 25.0063 6.17273 24.9999 7.48355C24.9999 10.1752 23.1999 12.1851 21.3999 13.9481L14.8096 20.1929C14.586 20.4444 14.3103 20.6465 14.0008 20.7856C13.6914 20.9248 13.3552 20.9978 13.0147 21C12.6742 21.0021 12.3371 20.9332 12.0259 20.7979C11.7147 20.6626 11.4364 20.464 11.2096 20.2152L4.59999 13.9481C2.79999 12.1851 1 10.1869 1 7.48355Z"
                fill={active ? "#ff4d6d" : "#D2D7DB"}
                stroke={active ? "#ff4d6d" : "#D2D7DB"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function OurPsychologists({ showTitle = true, psychologistsLenght = null }) {
    const navigate = useNavigate();
    const auth = useAuth();

    const isAuthed =
        typeof auth?.isAuthed === "boolean"
            ? auth.isAuthed
            : Boolean(auth?.user || auth?.me || auth?.profile || auth?.token);

    const limit = psychologistsLenght ?? null;

    const [items, setItems] = useState([]);
    const [favIds, setFavIds] = useState(() => new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const resp = await psychologistsApi.list({ limit });

                const arr = Array.isArray(resp) ? resp : (resp?.items || resp?.content || []);
                const normalized = (arr || []).map(normalizePsychologist).filter((x) => x?.id != null);

                if (!alive) return;

                setItems(normalized);

                // если бэк уже отдаёт isFavourite — можно сразу
                setFavIds(new Set(normalized.filter((x) => x.isFavourite).map((x) => x.id)));

                // если есть отдельный эндпоинт избранного — подтянем точнее
                if (isAuthed) {
                    try {
                        const fav = await psychologistsApi.favourites();
                        const ids = Array.isArray(fav)
                            ? fav.map((x) => (typeof x === "number" ? x : x?.id)).filter((v) => v != null)
                            : [];
                        if (alive) setFavIds(new Set(ids));
                    } catch {
                        // не критично
                    }
                }
            } catch (e) {
                if (!alive) return;
                setError(e?.message || "Не удалось загрузить психологов");
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [limit, isAuthed]);

    const displayed = useMemo(() => {
        if (!limit) return items;
        return items.slice(0, limit);
    }, [items, limit]);

    const toggleFavourite = async (id) => {
        if (!isAuthed) {
            navigate("/login");
            return;
        }

        const currentlyFav = favIds.has(id);

        // optimistic UI
        const next = new Set(favIds);
        if (currentlyFav) next.delete(id);
        else next.add(id);
        setFavIds(next);

        try {
            if (currentlyFav) await psychologistsApi.removeFavourite(id);
            else await psychologistsApi.addFavourite(id);
        } catch (e) {
            setFavIds(new Set(favIds)); // rollback
            setError(e?.message || "Не удалось обновить избранное");
        }
    };

    return (
        <div className="psychologists">
            {showTitle && <OurPsychologistTitle />}

            {error ? (
                <div
                    style={{
                        marginTop: 12,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(255,0,0,0.06)",
                    }}
                >
                    {error}
                </div>
            ) : null}

            <div className="psychologists__item-wrapper">
                {loading ? (
                    Array.from({ length: limit || 3 }).map((_, i) => (
                        <div key={i} className="psychologists__item psychologists__item--skeleton">
                            <div className="psychologists__item-image" />
                            <div className="psychologists__item-content" />
                        </div>
                    ))
                ) : (
                    displayed.map((p) => {
                        const isFav = favIds.has(p.id);
                        const imgSrc = p.avatarUrl ? resolveUrl(p.avatarUrl) : PLACEHOLDER;

                        return (
                            <div key={p.id} className="psychologists__item">
                                <div className="psychologists__item-image">
                                    <img
                                        src={imgSrc}
                                        alt={p.name}
                                        onError={(e) => {
                                            e.currentTarget.src = PLACEHOLDER;
                                        }}
                                    />
                                </div>

                                <div className="psychologists__item-content">
                                    <button
                                        type="button"
                                        className={`psychologists__item-content__favourites ${isFav ? "is-active" : ""}`}
                                        onClick={() => toggleFavourite(p.id)}
                                        aria-label={isFav ? "Убрать из избранного" : "В избранное"}
                                        title={isFav ? "Убрать из избранного" : "В избранное"}
                                    >
                                        <HeartIcon active={isFav} />
                                    </button>

                                    <Link to={`/psychologist/${p.id}`} className="psychologists__item-content__arrow">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M1 8H15M15 8L8 1M15 8L8 15"
                                                stroke="white"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </Link>

                                    <p className="psychologists__item-content__name">{p.name}</p>
                                    <p className="psychologists__item-content__experience">
                                        <span>Опыт:</span> {p.experience}
                                    </p>
                                    <p className="psychologists__item-content__price">{p.price}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
