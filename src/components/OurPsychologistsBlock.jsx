// src/components/OurPsychologistsBlock.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import PsychologistModal from "./ui/PsychologistModal";
import OurPsychologistTitle from "./OurPsychologistsBlockTitle";
import { psychologistsApi } from "../api/psychologistsApi";
import { appointmentsApi } from "../api/appointmentsApi";
import { useAuth } from "../auth/authStore";
import { useToast } from "../ui/toast/ToastProvider";
import { useFavorites } from "../favorites/favoritesStore";

import openBtn from "../assets/img/info.svg"
import closeBtn from "../assets/img/close.svg"

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8080";

function resolveUrl(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
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

    const avatarUrl = raw?.avatarUrl || raw?.avatar_url || raw?.photoUrl || raw?.photo_url || "";

    const isFavourite = Boolean(raw?.isFavourite ?? raw?.is_favourite ?? raw?.favourite ?? raw?.favorite);

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

function extractIds(arr) {
    return (arr || [])
        .map((x) => (typeof x === "number" ? x : x?.id))
        .filter((v) => v != null)
        .map((v) => String(v));
}

function pickFirstArray(...candidates) {
    for (const c of candidates) {
        if (Array.isArray(c)) return c;
    }
    return null;
}

function getThemeIds(raw) {
    const arr = pickFirstArray(raw?.themes, raw?.themeIds, raw?.theme_ids);
    return arr ? extractIds(arr) : null;
}

function getMethodIds(raw) {
    const arr = pickFirstArray(raw?.methods, raw?.methodIds, raw?.method_ids);
    return arr ? extractIds(arr) : null;
}

function hasIntersection(haveIds, selectedIds) {
    if (!selectedIds || selectedIds.length === 0) return true;
    if (haveIds == null) return true;
    if (haveIds.length === 0) return false;

    const set = new Set(haveIds.map(String));
    return selectedIds.some((id) => set.has(String(id)));
}

function applyClientOnlyFilters(items, query) {
    if (!query) return items;

    const selectedThemeIds = extractIds(query.themes);
    const selectedMethodIds = extractIds(query.methods);

    if (selectedThemeIds.length === 0 && selectedMethodIds.length === 0) return items;

    return (items || []).filter((p) => {
        const raw = p?.raw || {};
        const haveThemeIds = getThemeIds(raw);
        const haveMethodIds = getMethodIds(raw);

        if (!hasIntersection(haveThemeIds, selectedThemeIds)) return false;
        if (!hasIntersection(haveMethodIds, selectedMethodIds)) return false;
        return true;
    });
}

function pickMethodName(raw) {
    return raw?.method?.name || raw?.methodName || raw?.methods || "—";
}

function pickThemesText(raw) {
    const arr = raw?.themes;
    if (Array.isArray(arr)) {
        const names = arr.map((t) => (typeof t === "string" ? t : t?.name)).filter(Boolean);
        if (names.length) return names.join(", ");
    }
    return raw?.themesText || raw?.themesName || raw?.themes || "—";
}

export default function OurPsychologists({
    showTitle = true,
    psychologistsLenght = null,
    query,
    allowLoadMore = false,
}) {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPsychologist, setSelectedPsychologist] = useState(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const auth = useAuth();
    const toast = useToast();
    const fav = useFavorites();

    const isAuthed =
        typeof auth?.isAuthed === "boolean"
            ? auth.isAuthed
            : Boolean(auth?.user || auth?.me || auth?.profile || auth?.token);

    // ✅ params после оплаты / из "Записей"
    const bookingIdParam = searchParams.get("bookingId");
    const psychologistIdParam = searchParams.get("psychologistId");
    const paymentReturn = searchParams.get("payment") === "return";

    // ✅ чтобы не открывать бесконечно
    const autoOpenedRef = useRef(false);

    const limit = psychologistsLenght ?? null;

    const pageSize = useMemo(() => {
        if (Number.isFinite(limit)) return Math.min(Number(limit), 50);
        return allowLoadMore ? 24 : 12;
    }, [limit, allowLoadMore]);

    const serverQueryKey = useMemo(() => {
        const themes = (query?.themes || [])
            .map((x) => (typeof x === "number" ? x : x?.id))
            .filter((v) => v != null);

        const methods = (query?.methods || [])
            .map((x) => (typeof x === "number" ? x : x?.id))
            .filter((v) => v != null);

        return JSON.stringify({
            q: query?.q || "",
            price: query?.price || [],
            experience: query?.experience || [],
            themes,
            methods,
        });
    }, [query]);

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const openModal = useCallback((p, extra = {}) => {
        const raw = p?.raw || {};

        const modalData = {
            id: p.id,
            name: p.name,
            image: p.avatarUrl ? resolveUrl(p.avatarUrl) : PLACEHOLDER,

            age: raw?.age ?? raw?.userAge ?? raw?.user_age ?? null,
            experience: raw?.experience ?? p.experience,

            sessionDuration:
                raw?.sessionDurationMinutes ??
                raw?.session_duration_minutes ??
                raw?.sessionDuration ??
                50,

            pricePerSession: raw?.pricePerSession ?? raw?.price_per_session ?? raw?.price ?? null,

            method: pickMethodName(raw),
            themes: pickThemesText(raw),

            education: raw?.headline ?? "",
            description: raw?.about ?? "",
            availableDates: raw?.availableDates ?? raw?.available_dates ?? [],

            ...extra,
        };

        setSelectedPsychologist(modalData);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setSelectedPsychologist(null);
    }, []);

    // ✅ загрузка списка психологов
    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setError("");
            setItems([]);
            setPage(0);
            setTotalPages(1);

            try {
                const resp = await psychologistsApi.list({
                    page: 0,
                    size: pageSize,
                    q: query?.q,
                    themes: query?.themes,
                    methods: query?.methods,
                    price: query?.price,
                    experience: query?.experience,
                });

                const arr = Array.isArray(resp) ? resp : resp?.items || resp?.content || [];
                const normalized = (arr || []).map(normalizePsychologist).filter((x) => x?.id != null);

                if (!alive) return;

                setItems(normalized);

                const tp = Number(resp?.totalPages);
                if (Number.isFinite(tp) && tp > 0) setTotalPages(tp);

                const pn = Number(resp?.number);
                if (Number.isFinite(pn) && pn >= 0) setPage(pn);
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
    }, [pageSize, isAuthed, serverQueryKey]);

    /**
     * ✅ АВТО-ОТКРЫТИЕ после возврата оплаты:
     * НИКОГДА не дергаем psychologistsApi.get(id) -> 404,
     * а ищем психолога В УЖЕ ЗАГРУЖЕННОМ СПИСКЕ.
     */
    useEffect(() => {
        if (autoOpenedRef.current) return;

        const hasAutoParams = Boolean(bookingIdParam || psychologistIdParam);
        if (!hasAutoParams) return;

        // ждём пока список психологов будет загружен
        if (loading) return;

        autoOpenedRef.current = true;

        (async () => {
            try {
                let psyId = psychologistIdParam ? String(psychologistIdParam) : null;
                let appointment = null;

                // если есть bookingId — лучше узнать точную инфу по записи
                if (bookingIdParam) {
                    if (!isAuthed) {
                        toast.info("Войдите, чтобы открыть запись");
                        navigate("/login");
                        return;
                    }

                    appointment = await appointmentsApi.getOne(bookingIdParam);

                    // ✅ если групповая — уводим на страницу групповых
                    const t = appointment?.type || appointment?.bookingType;
                    if (t === "GROUP") {
                        navigate(`/sessions?bookingId=${appointment.id}&payment=return`, { replace: true });
                        return;
                    }

                    // ✅ direct — берем психолога из appointment если есть
                    if (appointment?.psychologistId != null) {
                        psyId = String(appointment.psychologistId);
                    }
                }

                if (!psyId) return;

                // ✅ ИЩЕМ психолога ТОЛЬКО в items (никаких get(id) => 404)
                const found = (items || []).find((x) => String(x.id) === String(psyId));
                if (!found) {
                    toast.error("Не удалось найти психолога в списке (попробуй обновить страницу)");
                    return;
                }

                openModal(found, {
                    bookingId: appointment?.id ? String(appointment.id) : bookingIdParam ? String(bookingIdParam) : null,
                    paymentReturn: Boolean(paymentReturn),

                    // если в appointment есть выбранное время
                    initialStartDateTime: appointment?.startDateTime ?? null,
                    initialEndDateTime: appointment?.endDateTime ?? null,

                    // можешь использовать это в PsychologistModal, чтобы сразу раскрыть календарь
                    autoOpenCalendar: true,
                });
            } catch (e) {
                console.error(e);
                toast.error(e?.message || "Не удалось открыть запись");
            }
        })();
    }, [
        bookingIdParam,
        psychologistIdParam,
        paymentReturn,
        isAuthed,
        loading,
        items,
        navigate,
        openModal,
        toast,
    ]);

    const clientFiltered = useMemo(() => applyClientOnlyFilters(items, query), [items, query]);

    const displayed = useMemo(() => {
        if (!limit) return clientFiltered;
        return clientFiltered.slice(0, limit);
    }, [clientFiltered, limit]);

    const canLoadMore = allowLoadMore && !limit && page + 1 < totalPages;

    const loadMore = async () => {
        if (!canLoadMore || loadingMore) return;
        setLoadingMore(true);
        setError("");

        try {
            const nextPage = page + 1;

            const resp = await psychologistsApi.list({
                page: nextPage,
                size: pageSize,
                q: query?.q,
                themes: query?.themes,
                methods: query?.methods,
                price: query?.price,
                experience: query?.experience,
            });

            const arr = Array.isArray(resp) ? resp : resp?.items || resp?.content || [];
            const normalized = (arr || []).map(normalizePsychologist).filter((x) => x?.id != null);

            setItems((prev) => {
                const map = new Map((prev || []).map((x) => [x.id, x]));
                for (const x of normalized) map.set(x.id, x);
                return Array.from(map.values());
            });

            const tp = Number(resp?.totalPages);
            if (Number.isFinite(tp) && tp > 0) setTotalPages(tp);

            setPage(nextPage);
        } catch (e) {
            setError(e?.message || "Не удалось загрузить ещё психологов");
        } finally {
            setLoadingMore(false);
        }
    };

    const toggleFavourite = async (id) => {
        const res = await fav.toggle(id);

        if (res?.unauth) {
            toast.info("Войдите, чтобы добавлять в избранное");
            navigate("/login");
            return;
        }

        if (res?.ok) {
            if (res.removed) toast.info("Удалено из избранного", { title: "Избранное" });
            if (res.added) toast.success("Добавлено в избранное", { title: "Избранное" });
            return;
        }

        const msg = res?.error?.message || "Не удалось обновить избранное";
        setError(msg);
        toast.error(msg, { title: "Избранное" });
    };

    // ✅ блокировка скролла
    useEffect(() => {
        const prev = document.body.style.overflow;
        if (modalOpen) document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [modalOpen]);

    // кнопка показа инфы о психологе для адаптива
    const [openInfoIds, setOpenInfoIds] = useState([]);
    const toggleInfo = (id) => {
        setOpenInfoIds((prev) =>
            prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
        );
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
                        const isFav = fav.isFavourite(p.id);
                        const imgSrc = p.avatarUrl ? resolveUrl(p.avatarUrl) : PLACEHOLDER;

                        const raw = p?.raw || {};
                        const method = pickMethodName(raw);
                        const themes = pickThemesText(raw);

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

                                <div className="psychologists__item-info">
                                    <div
                                        className="psychologists__item-info__close"
                                        onClick={() => toggleInfo(p.id)}
                                    >
                                        <img src={openInfoIds.includes(p.id) ? closeBtn : openBtn} alt="" />
                                    </div>
                                    <div
                                        className={`psychologists__item-info__wrapper ${openInfoIds.includes(p.id) ? "is-open" : ""
                                            }`}
                                    >
                                        <div className="psychologists__item-info__item">
                                            <span>Опыт:</span> {p.experience}
                                        </div>
                                        <div className="psychologists__item-info__item">
                                            <span>Метод:</span> {method}
                                        </div>
                                        <div className="psychologists__item-info__item">
                                            <span>Темы:</span> {themes}
                                        </div>
                                    </div>
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

                                    <button
                                        type="button"
                                        className="psychologists__item-content__arrow"
                                        onClick={() => openModal(p)}
                                        aria-label={`Подробнее о психологе ${p.name}`}
                                        title="Подробнее"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path
                                                d="M1 8H15M15 8L8 1M15 8L8 15"
                                                stroke="white"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </button>

                                    <Link to={`/psychologist/${p.id}`} className="psychologists__item-content__name">
                                        {p.name}
                                    </Link>

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

            {!loading && displayed.length === 0 ? (
                <div
                    style={{
                        marginTop: 16,
                        padding: "14px 16px",
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(136,133,255,0.10)",
                        opacity: 0.95,
                    }}
                >
                    Ничего не найдено. Попробуйте изменить фильтры.
                </div>
            ) : null}

            {canLoadMore ? (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
                    <button type="button" className="b-btn" onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? "Загрузка…" : "Показать ещё"}
                    </button>
                </div>
            ) : null}

            <PsychologistModal
                isOpen={modalOpen}
                psychologist={selectedPsychologist}
                onClose={closeModal}
                type="psychologist"
            />
        </div>
    );
}
