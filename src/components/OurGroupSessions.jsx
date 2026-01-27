// src/components/OurGroupSessions.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { sessionsApi } from "../api/sessionsApi";
import { appointmentsApi } from "../api/appointmentsApi";
import { useAuth } from "../auth/authStore";
import { useToast } from "../ui/toast/ToastProvider";

import PsychologistModal from "./ui/PsychologistModal";

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8080";
function resolveUrl(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

function fmtDateTimeRange(startIso, endIso) {
    try {
        const s = startIso ? new Date(startIso) : null;
        const e = endIso ? new Date(endIso) : null;
        if (!s || Number.isNaN(s.getTime())) return "—";

        const dd = `${pad2(s.getDate())}.${pad2(s.getMonth() + 1)}.${s.getFullYear()}`;
        const st = `${pad2(s.getHours())}:${pad2(s.getMinutes())}`;
        let et = "";
        if (e && !Number.isNaN(e.getTime())) et = `${pad2(e.getHours())}:${pad2(e.getMinutes())}`;

        return et ? `${dd} • ${st}–${et}` : `${dd} • ${st}`;
    } catch {
        return "—";
    }
}

function joinTitles(arr) {
    return (arr || [])
        .map((x) => {
            if (!x) return null;
            if (typeof x === "string") return x;
            return x?.title || x?.name || null;
        })
        .filter(Boolean)
        .join(", ");
}

function extractIds(arr) {
    return (arr || [])
        .map((x) => (typeof x === "number" ? x : x?.id))
        .filter((v) => v != null)
        .map((v) => Number(v))
        .filter(Number.isFinite);
}

// ===== price labels -> min/max =====
function extractNumbers(label) {
    const s = String(label || "")
        .replace(/\u00A0/g, " ")
        .replace(/[.,]/g, " ");
    const groups = s.match(/\d[\d\s]*/g) || [];
    return groups
        .map((g) => Number(String(g).replace(/\s+/g, "")))
        .filter((n) => Number.isFinite(n));
}

function parsePriceRangeFromLabel(label) {
    const t = String(label || "").toLowerCase().replace(/\u00A0/g, " ");
    const nums = extractNumbers(label);
    if (!nums.length) return null;

    if (t.includes("до") && nums.length === 1) return { minPrice: null, maxPrice: nums[0] };
    if (t.includes("от") && !t.includes("до") && nums.length === 1) return { minPrice: nums[0], maxPrice: null };

    if (nums.length >= 2) {
        const [a, b] = nums;
        return { minPrice: Math.min(a, b), maxPrice: Math.max(a, b) };
    }
    return null;
}

function mergeRanges(ranges, minKey, maxKey) {
    const rs = (ranges || []).filter(Boolean);
    if (!rs.length) return { [minKey]: null, [maxKey]: null };

    const mins = rs.map((r) => r[minKey]).filter((v) => Number.isFinite(v));
    const maxs = rs.map((r) => r[maxKey]).filter((v) => Number.isFinite(v));

    const min = mins.length ? Math.min(...mins) : null;
    const max = maxs.length ? Math.max(...maxs) : null;

    return { [minKey]: min, [maxKey]: max };
}

function diffMinutes(startIso, endIso) {
    try {
        const s = new Date(startIso);
        const e = new Date(endIso);
        const ms = e.getTime() - s.getTime();
        if (!Number.isFinite(ms) || ms <= 0) return null;
        return Math.round(ms / 60000);
    } catch {
        return null;
    }
}

function normalizeGroupSession(raw) {
    const id = raw?.id ?? raw?.sessionId ?? null;

    const title = raw?.title || "Групповая сессия";
    const coverImg = raw?.coverImg || raw?.cover_img || null;

    const startDateTime = raw?.startDateTime || raw?.start_datetime || null;
    const endDateTime = raw?.endDateTime || raw?.end_datetime || null;

    const priceAtTime = raw?.priceAtTime ?? raw?.price_at_time ?? null;

    const capacityClients = raw?.capacityClients ?? raw?.capacity_clients ?? null;

    const participantsCount =
        raw?.participantsCount ??
        raw?.clientsCount ??
        raw?.membersCount ??
        (Array.isArray(raw?.participants) ? raw.participants.length : 0);

    const psychologist = raw?.psychologist || raw?.owner || raw?.author || null;

    const psyName =
        psychologist?.name ||
        raw?.psychologistName ||
        raw?.psychologist_name ||
        "Психолог";

    const themes = raw?.themes || [];
    const methods = raw?.methods || [];

    const description = raw?.description || "";

    const telemostUrl = raw?.telemostUrl || raw?.telemost_url || raw?.telemostLink || null;
    const paymentUrl = raw?.paymentUrl || raw?.payment_url || raw?.confirmationUrl || null;
    const status = raw?.status || null;

    return {
        id,
        title,
        coverImg,
        startDateTime,
        endDateTime,
        priceAtTime,
        capacityClients,
        participantsCount,
        psyName,
        themes,
        methods,
        description,
        telemostUrl,
        paymentUrl,
        status,
        raw,
    };
}

/**
 * ✅ Переупаковка под PsychologistModal (type="session")
 * Модалка ждёт: image, title, name, pricePerSession, sessionDuration, date, themes, method, description
 */
function toPsychologistModalSession(s, extra = {}) {
    if (!s) return null;

    const duration = s.startDateTime && s.endDateTime ? diffMinutes(s.startDateTime, s.endDateTime) : null;

    return {
        id: s.id,
        title: s.title || "Групповая сессия",
        name: s.psyName || "Психолог",
        image: s.coverImg ? resolveUrl(s.coverImg) : "",
        sessionDuration: duration || 60,
        pricePerSession: s.priceAtTime ?? null,
        date: fmtDateTimeRange(s.startDateTime, s.endDateTime),
        themes: s.themes?.length ? joinTitles(s.themes) : "—",
        method: s.methods?.length ? joinTitles(s.methods) : "—",
        description: s.description || "",
        capacityClients: s.capacityClients ?? null,
        participantsCount: s.participantsCount ?? 0,

        // доп. поля (не ломают)
        paymentUrl: s.paymentUrl || null,
        telemostUrl: s.telemostUrl || null,
        status: s.status || null,

        ...extra,
    };
}

// ✅ пробуем угадать groupSessionId из appointment
function pickGroupSessionIdFromAppointment(a) {
    return (
        a?.groupSessionId ??
        a?.sessionId ??
        a?.session_id ??
        a?.group_session_id ??
        a?.groupSession?.id ??
        a?.session?.id ??
        null
    );
}

export default function OurGroupSessions({ showTitle = true, query, allowLoadMore = false }) {
    const auth = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const isAuthed =
        typeof auth?.isAuthenticated === "boolean"
            ? auth.isAuthenticated
            : Boolean(auth?.isAuthed ?? auth?.token ?? auth?.me);

    const bookingIdParam = searchParams.get("bookingId");
    const paymentReturn = searchParams.get("payment") === "return";

    const autoOpenedRef = useRef(false);

    const pageSize = useMemo(() => (allowLoadMore ? 24 : 12), [allowLoadMore]);

    const serverQueryKey = useMemo(() => {
        return JSON.stringify({
            q: query?.q || "",
            themeIds: extractIds(query?.themes),
            methodIds: extractIds(query?.methods),
            price: query?.price || [],
        });
    }, [query]);

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // ✅ модалка
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [payLoading, setPayLoading] = useState(false);

    const closeModal = () => {
        setModalOpen(false);
        setSelectedSession(null);
        setDetailLoading(false);
        setPayLoading(false);
    };

    const openSession = async (row, extra = {}) => {
        if (!row?.id) return;

        setModalOpen(true);
        setDetailLoading(true);
        setSelectedSession(null);

        try {
            const d = await sessionsApi.getPublicGroupSession(row.id);
            const normalized = normalizeGroupSession(d);

            setSelectedSession(
                toPsychologistModalSession(normalized, {
                    paymentReturn: Boolean(paymentReturn),
                    ...extra,
                })
            );
        } catch (e) {
            toast.error(e?.message || "Не удалось загрузить детали");
            closeModal();
        } finally {
            setDetailLoading(false);
        }
    };

    // ✅ join → pay → redirect
    const handlePay = async (sessionObj) => {
        const sessionId = sessionObj?.id;
        if (!sessionId) return;

        // ✅ если уже есть paymentUrl — просто уходим
        if (sessionObj?.paymentUrl) {
            window.location.href = sessionObj.paymentUrl;
            return;
        }

        if (!isAuthed) {
            toast.info("Войдите, чтобы записаться");
            navigate("/login");
            return;
        }

        try {
            setPayLoading(true);

            // 1) join (если уже вступил — ок)
            try {
                if (typeof sessionsApi?.joinGroupSession === "function") {
                    await sessionsApi.joinGroupSession(sessionId);
                }
            } catch (e) {
                // ignore (already joined etc.)
            }

            // 2) start payment
            let pay = null;
            if (typeof sessionsApi?.startGroupPayment === "function") {
                pay = await sessionsApi.startGroupPayment(sessionId);
            }

            const confirmationUrl =
                pay?.confirmationUrl || pay?.confirmation_url || pay?.url || pay?.payUrl || null;

            if (confirmationUrl) {
                window.location.href = confirmationUrl;
                return;
            }

            toast.success("Вы записались ✅");
            closeModal();
        } catch (e) {
            toast.error(e?.message || "Не удалось записаться / оплатить");
        } finally {
            setPayLoading(false);
        }
    };

    // ✅ авто-открытие: /sessions?bookingId=67&payment=return
    useEffect(() => {
        if (autoOpenedRef.current) return;
        if (!bookingIdParam) return;
        if (!isAuthed) return;

        autoOpenedRef.current = true;

        let cancelled = false;

        (async () => {
            try {
                setModalOpen(true);
                setDetailLoading(true);
                setSelectedSession(null);

                // 1) берём appointment по bookingId
                const a = await appointmentsApi.getOne(bookingIdParam);

                if (cancelled) return;

                // если это НЕ group — уводим на психологов
                const t = String(a?.type || a?.bookingType || "").toUpperCase();
                if (t && t !== "GROUP") {
                    navigate(`/psychologist?bookingId=${a.id}&payment=return`, { replace: true });
                    return;
                }

                const groupSessionId = pickGroupSessionIdFromAppointment(a);

                // 2) если знаем groupSessionId — открываем нормальные детали
                if (groupSessionId) {
                    const d = await sessionsApi.getPublicGroupSession(groupSessionId);
                    const normalized = normalizeGroupSession(d);

                    setSelectedSession(
                        toPsychologistModalSession(normalized, {
                            bookingId: a?.id,
                            paymentReturn: Boolean(paymentReturn),

                            // если апоинтмент уже отдаёт эти поля — прокинем
                            paymentUrl: a?.paymentUrl || null,
                            telemostUrl: a?.telemostUrl || null,
                            status: a?.status || null,
                        })
                    );
                    return;
                }

                // 3) fallback: если groupSessionId нет в DTO — открываем минимум (чтобы не падало)
                setSelectedSession({
                    id: null, // тут нет sessionId — оплатить нельзя без деталей
                    bookingId: a?.id,

                    title: "Групповая сессия",
                    name: a?.psychologistName || "Психолог",
                    image: "",

                    sessionDuration:
                        a?.startDateTime && a?.endDateTime ? diffMinutes(a.startDateTime, a.endDateTime) || 60 : 60,

                    pricePerSession: a?.priceAtTime ?? a?.priceRub ?? null,
                    date: fmtDateTimeRange(a?.startDateTime, a?.endDateTime),

                    themes: "—",
                    method: "—",
                    description: "",

                    paymentUrl: a?.paymentUrl || null,
                    telemostUrl: a?.telemostUrl || null,
                    status: a?.status || null,

                    paymentReturn: Boolean(paymentReturn),

                    // ⚠️ модалка может показывать кнопку оплаты,
                    // но без id сессии оплату стартануть нельзя.
                    // поэтому лучше добавить groupSessionId в DTO на бэке.
                });
            } catch (e) {
                if (cancelled) return;
                toast.error(e?.message || "Не удалось открыть сессию");
                closeModal();
            } finally {
                if (!cancelled) setDetailLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [bookingIdParam, paymentReturn, isAuthed, navigate, toast]);

    // ✅ загрузка списка групповых
    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setError("");
            setItems([]);
            setPage(0);
            setTotalPages(1);

            try {
                const themeIds = extractIds(query?.themes);
                const methodIds = extractIds(query?.methods);

                const priceRanges = (query?.price || []).map(parsePriceRangeFromLabel);
                const { minPrice, maxPrice } = mergeRanges(priceRanges, "minPrice", "maxPrice");

                const resp = await sessionsApi.listPublicGroupSessions({
                    page: 0,
                    size: pageSize,
                    q: query?.q || null,
                    themeIds,
                    methodIds,
                    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
                    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
                });

                const arr = Array.isArray(resp) ? resp : resp?.content || resp?.items || [];
                const normalized = (arr || []).map(normalizeGroupSession).filter((x) => x?.id != null);

                if (!alive) return;

                setItems(normalized);

                const tp = Number(resp?.totalPages);
                if (Number.isFinite(tp) && tp > 0) setTotalPages(tp);

                const pn = Number(resp?.number);
                if (Number.isFinite(pn) && pn >= 0) setPage(pn);
            } catch (e) {
                if (!alive) return;
                setError(e?.message || "Не удалось загрузить групповые сессии");
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [pageSize, serverQueryKey, isAuthed]);

    const canLoadMore = allowLoadMore && page + 1 < totalPages;

    const loadMore = async () => {
        if (!canLoadMore || loadingMore) return;
        setLoadingMore(true);
        setError("");

        try {
            const nextPage = page + 1;

            const themeIds = extractIds(query?.themes);
            const methodIds = extractIds(query?.methods);

            const priceRanges = (query?.price || []).map(parsePriceRangeFromLabel);
            const { minPrice, maxPrice } = mergeRanges(priceRanges, "minPrice", "maxPrice");

            const resp = await sessionsApi.listPublicGroupSessions({
                page: nextPage,
                size: pageSize,
                q: query?.q || null,
                themeIds,
                methodIds,
                minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
                maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
            });

            const arr = Array.isArray(resp) ? resp : resp?.content || resp?.items || [];
            const normalized = (arr || []).map(normalizeGroupSession).filter((x) => x?.id != null);

            setItems((prev) => {
                const map = new Map((prev || []).map((x) => [x.id, x]));
                for (const x of normalized) map.set(x.id, x);
                return Array.from(map.values());
            });

            const tp = Number(resp?.totalPages);
            if (Number.isFinite(tp) && tp > 0) setTotalPages(tp);

            setPage(nextPage);
        } catch (e) {
            setError(e?.message || "Не удалось загрузить ещё");
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className="psychologists">
            {showTitle ? <div className="psychologists__title">Групповые сессии</div> : null}

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
                    Array.from({ length: allowLoadMore ? 6 : 3 }).map((_, i) => (
                        <div key={i} className="psychologists__item psychologists__item--skeleton">
                            <div className="psychologists__item-image" />
                            <div className="psychologists__item-content" />
                        </div>
                    ))
                ) : items.length ? (
                    items.map((s) => {
                        const coverUrl = s.coverImg ? resolveUrl(s.coverImg) : "";
                        const cap = s.capacityClients;
                        const cnt = s.participantsCount || 0;

                        return (
                            <div key={s.id} className="psychologists__item">
                                <div className="psychologists__item-image">
                                    {coverUrl ? (
                                        <img src={coverUrl} alt={s.title} />
                                    ) : (
                                        <div
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                background: "rgba(0,0,0,0.08)",
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="psychologists__item-content">
                                    <button
                                        type="button"
                                        className="psychologists__item-content__arrow"
                                        onClick={() => openSession(s)}
                                        aria-label={`Подробнее: ${s.title}`}
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

                                    <p className="psychologists__item-content__name">{s.title}</p>

                                    <p className="psychologists__item-content__experience">
                                        <span>Психолог:</span> {s.psyName}
                                    </p>

                                    <p className="psychologists__item-content__experience">
                                        <span>Дата:</span> {fmtDateTimeRange(s.startDateTime, s.endDateTime)}
                                    </p>

                                    <p className="psychologists__item-content__experience">
                                        <span>Мест:</span> {cap ? `${cnt}/${cap}` : cnt}
                                    </p>

                                    <p className="psychologists__item-content__price">
                                        {s.priceAtTime != null ? `${s.priceAtTime} ₽` : "цена по запросу"}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
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
                )}
            </div>

            {canLoadMore ? (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
                    <button type="button" className="b-btn" onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? "Загрузка…" : "Показать ещё"}
                    </button>
                </div>
            ) : null}

            {/* ✅ модалка */}
            <PsychologistModal
                isOpen={modalOpen}
                psychologist={selectedSession}
                onClose={closeModal}
                type="session"
                loading={detailLoading}
                onPay={handlePay}
                payLoading={payLoading}
            />
        </div>
    );
}
