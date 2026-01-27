import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/authStore";
import { useToast } from "../../ui/toast/ToastProvider";
import Modal from "../ui/Modal";
import { sessionsApi } from "../../api/sessionsApi";
import { filesApi } from "../../api/filesApi";

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8080";

function resolveUrl(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return `${API_BASE}${u.startsWith("/") ? u : `/${u}`}`;
}

function toStoredFilePath(u) {
    // хотим хранить максимально переносимо: /images/xxx.jpg (а не полный абсолютный URL)
    if (!u) return "";
    try {
        const api = new URL(API_BASE);
        const nu = new URL(u, api);
        // если URL на том же origin что и API — сохраняем только путь
        if (nu.origin === api.origin) {
            return `${nu.pathname}${nu.search || ""}`;
        }
        return u;
    } catch {
        return u;
    }
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

function isoToLocalInput(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
        d.getHours()
    )}:${pad2(d.getMinutes())}`;
}

function localInputToIso(v) {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

// ✅ защита: иногда с бэка может прилететь объект вместо строки
function toCode(x) {
    if (x == null) return "";
    if (typeof x === "string" || typeof x === "number") return String(x);
    if (typeof x === "object") return String(x.code || x.title || x.name || "");
    return String(x);
}

function humanStatus(statusRaw) {
    const s = toCode(statusRaw);
    switch (s) {
        case "OPEN":
            return "Открыта";
        case "PENDING_PAYMENT":
            return "Ожидает оплату";
        case "PAID":
            return "Оплачено";
        case "CANCELLED":
            return "Закрыта";
        case "COMPLETED":
            return "Завершена";
        case "NO_SHOW":
            return "Неявка";
        default:
            return s || "—";
    }
}

function statusKind(statusRaw) {
    const s = toCode(statusRaw);
    if (s === "OPEN") return "open";
    if (s === "PENDING_PAYMENT") return "pending";
    if (s === "PAID") return "paid";
    if (s === "CANCELLED") return "cancelled";
    if (s === "COMPLETED") return "completed";
    if (s === "NO_SHOW") return "noshow";
    return "default";
}

function pickListResp(r) {
    if (Array.isArray(r)) return { items: r, page: 0, size: r.length, hasMore: false };
    const items = r?.content || r?.items || r?.data || [];
    const page = r?.number ?? r?.page ?? 0;
    const size = r?.size ?? r?.pageSize ?? 20;
    const total = r?.totalElements ?? r?.total ?? null;
    const hasMore =
        total != null ? (page + 1) * size < total : Boolean(r?.hasNext ?? r?.has_more);
    return { items: Array.isArray(items) ? items : [], page, size, total, hasMore };
}

function emptyDraft() {
    return {
        id: null,
        title: "",
        coverImg: "",
        description: "",
        startDateTime: "",
        endDateTime: "",
        priceAtTime: "",
        capacityClients: "",
        allowJoin: true,
    };
}

function participantLabel(p) {
    const name = p?.name || p?.fullName || "";
    const email = p?.email || "";
    if (name && email) return `${name} · ${email}`;
    return name || email || "—";
}

export default function GroupSessions() {
    const { role } = useAuth();
    const toast = useToast();

    const isPsy = role === "PSYCHOLOGIST" || role === "ADMIN";

    const [q, setQ] = useState("");
    const [status, setStatus] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState(emptyDraft);

    // cover upload
    const [coverUploading, setCoverUploading] = useState(false);
    const coverInputRef = useRef(null);

    const load = useCallback(
        async ({ nextPage = 0, append = false } = {}) => {
            if (!isPsy) return;
            setLoading(true);
            try {
                const r = await sessionsApi.listMyGroupSessions({
                    page: nextPage,
                    size: 24,
                    q: q || null,
                    status: status && status !== "ALL" ? status : null,
                });

                const parsed = pickListResp(r);
                setPage(parsed.page ?? nextPage);
                setHasMore(Boolean(parsed.hasMore));
                setItems((prev) =>
                    append ? [...prev, ...(parsed.items || [])] : parsed.items || []
                );
            } catch (e) {
                console.error(e);
                toast.error(e?.message || "Не удалось загрузить групповые сессии");
            } finally {
                setLoading(false);
            }
        },
        [isPsy, q, status, toast]
    );

    useEffect(() => {
        const t = setTimeout(() => load({ nextPage: 0, append: false }), 350);
        return () => clearTimeout(t);
    }, [load]);

    const openCreate = () => {
        setDraft(emptyDraft());
        setEditOpen(true);
    };

    const openEdit = async (id) => {
        if (!id) return;

        setSaving(false);
        setDraft((d) => ({ ...d, id }));
        setEditOpen(true);

        try {
            const d = await sessionsApi.getMyGroupSession(id);

            setDraft({
                id: d?.id ?? id,
                title: d?.title || "",
                coverImg: d?.coverImg || d?.cover_img || "",
                description: d?.description || "",
                startDateTime: isoToLocalInput(d?.startDateTime || d?.start_datetime),
                endDateTime: isoToLocalInput(d?.endDateTime || d?.end_datetime),
                priceAtTime: d?.priceAtTime ?? d?.price_at_time ?? "",
                capacityClients: d?.capacityClients ?? d?.capacity_clients ?? "",
                allowJoin: Boolean(d?.allowJoin ?? d?.allow_join ?? false),
            });
        } catch (e) {
            toast.error(e?.message || "Не удалось загрузить сессию");
        }
    };

    const openDetail = async (id) => {
        if (!id) return;

        setDetailOpen(true);
        setDetailLoading(true);
        setDetail(null);

        try {
            const d = await sessionsApi.getMyGroupSession(id);
            setDetail(d);
        } catch (e) {
            toast.error(e?.message || "Не удалось загрузить детали");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeSession = async (row) => {
        if (!row?.id) return;

        const cnt = Number(row?.clientsCount ?? row?.membersCount ?? row?.participantsCount ?? 0);
        if (cnt > 0) {
            toast.info("Нельзя закрыть сессию: уже есть записи");
            return;
        }

        // eslint-disable-next-line no-restricted-globals
        const ok = confirm("Закрыть сессию? Она станет недоступна для записи.");
        if (!ok) return;

        try {
            await sessionsApi.closeMyGroupSession(row.id);
            toast.success("Сессия закрыта");
            await load({ nextPage: 0, append: false });
        } catch (e) {
            toast.error(e?.message || "Не удалось закрыть сессию");
        }
    };

    const draftErrors = useMemo(() => {
        const errors = {};
        if (!draft?.title?.trim()) errors.title = "Укажите название";

        const startIso = localInputToIso(draft?.startDateTime);
        const endIso = localInputToIso(draft?.endDateTime);

        if (!startIso) errors.startDateTime = "Укажите дату и время начала";
        if (!endIso) errors.endDateTime = "Укажите дату и время окончания";
        if (startIso && endIso && startIso >= endIso)
            errors.endDateTime = "Окончание должно быть позже начала";

        const price = draft?.priceAtTime;
        if (price !== "" && price != null) {
            const n = Number(price);
            if (!Number.isFinite(n) || n < 0) errors.priceAtTime = "Некорректная цена";
        }

        const cap = draft?.capacityClients;
        if (cap !== "" && cap != null) {
            const n = Number(cap);
            if (!Number.isFinite(n) || n < 1)
                errors.capacityClients = "Лимит мест должен быть >= 1";
        }

        return errors;
    }, [draft]);

    const canSave = useMemo(() => Object.keys(draftErrors).length === 0, [draftErrors]);
    const sortedItems = useMemo(() => {
        const arr = Array.isArray(items) ? items.slice() : [];
        // newest first
        arr.sort((a, b) =>
            String(b?.startDateTime || b?.start_datetime || "").localeCompare(
                String(a?.startDateTime || a?.start_datetime || "")
            )
        );
        return arr;
    }, [items]);

    const MAX_COVER_BYTES = 5 * 1024 * 1024;

    const pickCoverFile = () => {
        if (coverUploading) return;
        coverInputRef.current?.click?.();
    };

    const onCoverFileSelected = async (e) => {
        const file = e?.target?.files?.[0];
        if (!file) return;

        const reset = () => {
            try {
                // eslint-disable-next-line no-param-reassign
                e.target.value = "";
            } catch {}
        };

        if (file.size > MAX_COVER_BYTES) {
            toast.error("Файл слишком большой (макс. 5MB)");
            reset();
            return;
        }

        setCoverUploading(true);
        try {
            const r = await filesApi.uploadImage(file);
            const url = r?.file?.url || r?.url || r?.avatarUrl || null;
            if (!url) throw new Error("Не удалось получить URL файла");

            const stored = toStoredFilePath(url);
            setDraft((d) => ({ ...d, coverImg: stored }));
            toast.success("Обложка загружена");
        } catch (err) {
            console.error(err);
            toast.error(err?.message || "Не удалось загрузить обложку");
        } finally {
            setCoverUploading(false);
            reset();
        }
    };

    const saveDraft = async () => {
        if (!canSave) return;

        setSaving(true);
        try {
            const payload = {
                title: draft.title?.trim(),
                coverImg: draft.coverImg?.trim() || null,
                description: draft.description?.trim() || null,
                startDateTime: localInputToIso(draft.startDateTime),
                endDateTime: localInputToIso(draft.endDateTime),
                priceAtTime: draft.priceAtTime === "" ? null : Number(draft.priceAtTime),
                capacityClients: draft.capacityClients === "" ? null : Number(draft.capacityClients),
                allowJoin: Boolean(draft.allowJoin),
            };

            if (draft.id) {
                await sessionsApi.updateMyGroupSession(draft.id, payload);
                toast.success("Сессия обновлена");
            } else {
                await sessionsApi.createMyGroupSession(payload);
                toast.success("Сессия создана");
            }

            setEditOpen(false);
            setDraft(emptyDraft());
            await load({ nextPage: 0, append: false });
        } catch (e) {
            console.error(e);
            toast.error(e?.message || "Не удалось сохранить");
        } finally {
            setSaving(false);
        }
    };

    if (!isPsy) {
        return (
            <div
                className="b-schedule-editor__card"
                style={{
                    background: "#fff",
                    borderRadius: 18,
                    padding: 20,
                    border: "1px solid rgba(210,215,219,.55)",
                }}
            >
                Этот раздел доступен только психологу.
            </div>
        );
    }


    return (
        <div className="b-group-sessions">
            <div className="b-group-sessions__head">
                <div>
                    <h2>Групповые сессии</h2>
                    <p>Создавайте и управляйте групповыми встречами. Закрыть можно только если нет записей.</p>
                </div>

                <button type="button" className="b-btn" onClick={openCreate}>
                    + Сессия
                </button>
            </div>

            <div className="b-group-sessions__filters">
                <label className="b-field">
                    <div className="b-field__label">Поиск</div>
                    <input
                        className="b-input"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Название / описание"
                    />
                </label>

                <label className="b-field">
                    <div className="b-field__label">Статус</div>
                    <select className="b-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="ALL">Все</option>
                        <option value="OPEN">Открытые</option>
                        <option value="CANCELLED">Закрытые</option>
                        <option value="COMPLETED">Завершённые</option>
                    </select>
                </label>

                <button
                    type="button"
                    className="b-btn b-btn--transparent"
                    onClick={() => load({ nextPage: 0, append: false })}
                    disabled={loading}
                >
                    {loading ? "Обновление…" : "Обновить"}
                </button>
            </div>

            {loading && !sortedItems.length ? (
                <div className="b-group-sessions__empty">Загрузка…</div>
            ) : sortedItems.length ? (
                <div className="b-group-sessions__grid">
                    {sortedItems.map((row) => {
                        const id = row?.id;
                        const title = row?.title || "Групповая сессия";

                        const cover = row?.coverImg || row?.cover_img || null;
                        const coverUrl = cover ? resolveUrl(cover) : "";

                        const startIso = row?.startDateTime || row?.start_datetime;
                        const endIso = row?.endDateTime || row?.end_datetime;

                        const cap = row?.capacityClients ?? row?.capacity_clients ?? null;
                        const cnt = row?.clientsCount ?? row?.membersCount ?? row?.participantsCount ?? 0;
                        const price = row?.priceAtTime ?? row?.price_at_time ?? null;

                        const canClose = Number(cnt) === 0;

                        return (
                            <div key={id} className="b-gs-card">
                                <button
                                    type="button"
                                    className="b-gs-card__cover"
                                    onClick={() => openDetail(id)}
                                    title="Открыть детали"
                                >
                                    {coverUrl ? <img src={coverUrl} alt="" /> : <div className="b-gs-card__cover-ph" />}
                                </button>

                                <div className="b-gs-card__top">
                                    <div className="b-gs-card__title" title={title}>
                                        {title}
                                    </div>
                                    <div className={`b-gs-status b-gs-status--${statusKind(row?.status)}`}>
                                        {humanStatus(row?.status)}
                                    </div>
                                </div>

                                <div className="b-gs-card__meta">
                                    <div className="b-gs-card__row">
                                        <span className="b-gs-card__label">Дата</span>
                                        <span className="b-gs-card__value">{fmtDateTimeRange(startIso, endIso)}</span>
                                    </div>

                                    <div className="b-gs-card__row">
                                        <span className="b-gs-card__label">Участники</span>
                                        <span className="b-gs-card__value">{cap ? `${cnt}/${cap}` : `${cnt}`}</span>
                                    </div>

                                    <div className="b-gs-card__row">
                                        <span className="b-gs-card__label">Цена</span>
                                        <span className="b-gs-card__value">{price != null ? `${price} ₽` : "—"}</span>
                                    </div>
                                </div>

                                <div className="b-gs-card__actions">
                                    <button type="button" className="b-btn b-btn--transparent" onClick={() => openDetail(id)}>
                                        Детали
                                    </button>
                                    <button type="button" className="b-btn b-btn--transparent" onClick={() => openEdit(id)}>
                                        Редактировать
                                    </button>
                                    <button
                                        type="button"
                                        className="b-btn"
                                        onClick={() => closeSession(row)}
                                        disabled={!canClose || toCode(row?.status) === "CANCELLED"}
                                        title={!canClose ? "Нельзя закрыть: есть записи" : "Закрыть"}
                                    >
                                        Закрыть
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="b-group-sessions__empty">
                    <div className="b-group-sessions__empty-title">Пока нет групповых сессий</div>
                    <button type="button" className="b-btn" onClick={openCreate}>
                        Создать первую
                    </button>
                </div>
            )}

            {hasMore ? (
                <div className="b-group-sessions__more">
                    <button
                        type="button"
                        className="b-btn b-btn--transparent"
                        onClick={() => load({ nextPage: page + 1, append: true })}
                    >
                        Показать ещё
                    </button>
                </div>
            ) : null}

            {/* ===== Detail modal ===== */}
            <Modal
                open={detailOpen}
                title={detail?.title ? detail.title : "Детали групповой сессии"}
                onClose={() => {
                    setDetailOpen(false);
                    setDetail(null);
                }}
                actions={
                    detail?.id ? (
                        <>
                            <button type="button" className="b-btn b-btn--transparent" onClick={() => openEdit(detail.id)}>
                                Редактировать
                            </button>
                            <button
                                type="button"
                                className="b-btn"
                                onClick={() =>
                                    closeSession({
                                        id: detail.id,
                                        clientsCount: (detail?.participants || []).length,
                                        status: detail?.status,
                                    })
                                }
                                disabled={(detail?.participants || []).length > 0 || toCode(detail?.status) === "CANCELLED"}
                            >
                                Закрыть
                            </button>
                        </>
                    ) : null
                }
            >
                {/* ✅ СКРОЛЛ ВНУТРИ МОДАЛКИ */}
                <div className="b-gs-modalScroll">
                    {detailLoading ? (
                        <div className="b-group-sessions__detail-loading">Загрузка…</div>
                    ) : detail ? (
                        <div className="b-gs-detail">
                            <div className="b-gs-detail__top">
                                <div className="b-gs-detail__cover">
                                    {detail?.coverImg || detail?.cover_img ? (
                                        <img src={resolveUrl(detail?.coverImg || detail?.cover_img)} alt="" />
                                    ) : (
                                        <div className="b-gs-detail__cover-ph" />
                                    )}
                                </div>

                                <div className="b-gs-detail__info">
                                    <div className={`b-gs-status b-gs-status--${statusKind(detail?.status)}`}>
                                        {humanStatus(detail?.status)}
                                    </div>

                                    <div className="b-gs-detail__kv">
                                        <div className="b-gs-detail__k">Дата</div>
                                        <div className="b-gs-detail__v">
                                            {fmtDateTimeRange(detail?.startDateTime, detail?.endDateTime)}
                                        </div>

                                        <div className="b-gs-detail__k">Цена</div>
                                        <div className="b-gs-detail__v">
                                            {detail?.priceAtTime != null ? `${detail.priceAtTime} ₽` : "—"}
                                        </div>

                                        <div className="b-gs-detail__k">Лимит</div>
                                        <div className="b-gs-detail__v">
                                            {detail?.capacityClients
                                                ? `${(detail?.participants || []).length}/${detail.capacityClients}`
                                                : "без лимита"}
                                        </div>

                                        <div className="b-gs-detail__k">Дозапись</div>
                                        <div className="b-gs-detail__v">{detail?.allowJoin ? "разрешена" : "закрыта"}</div>
                                    </div>
                                </div>
                            </div>

                            {detail?.description ? (
                                <div className="b-gs-detail__desc">
                                    <div className="b-gs-detail__desc-title">Описание</div>
                                    <div className="b-gs-detail__desc-text">{detail.description}</div>
                                </div>
                            ) : null}

                            <div className="b-gs-detail__participants">
                                <div className="b-gs-detail__participants-head">
                                    <div className="b-gs-detail__participants-title">
                                        Участники ({(detail?.participants || []).length})
                                    </div>
                                </div>

                                {(detail?.participants || []).length ? (
                                    <div className="b-gs-participants">
                                        {(detail.participants || []).map((p, idx) => {
                                            const user = p?.user || p;
                                            const avatar = user?.avatarUrl || user?.avatar_url || null;

                                            const payText = p?.paymentStatus ? toCode(p.paymentStatus) : "";
                                            const stText = p?.status ? toCode(p.status) : "";

                                            return (
                                                <div
                                                    key={p?.id || user?.id || `${user?.email || "u"}_${idx}`}
                                                    className="b-gs-participants__item"
                                                >
                                                    <div className="b-gs-participants__avatar">
                                                        {avatar ? (
                                                            <img src={resolveUrl(avatar)} alt="" />
                                                        ) : (
                                                            <div className="b-gs-participants__avatar-ph" />
                                                        )}
                                                    </div>

                                                    <div className="b-gs-participants__meta">
                                                        <div className="b-gs-participants__name">{participantLabel(user)}</div>
                                                        <div className="b-gs-participants__sub">
                                                            {payText ? `Оплата: ${payText}` : null}
                                                            {stText
                                                                ? payText
                                                                    ? ` · Статус: ${stText}`
                                                                    : `Статус: ${stText}`
                                                                : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="b-gs-detail__participants-empty">Пока никто не записался</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="b-group-sessions__detail-empty">Не удалось загрузить</div>
                    )}
                </div>
            </Modal>

            {/* ===== Edit/Create modal ===== */}
            <Modal
                open={editOpen}
                title={draft?.id ? "Редактировать сессию" : "Новая групповая сессия"}
                onClose={() => {
                    if (saving) return;
                    setEditOpen(false);
                    setDraft(emptyDraft());
                }}
                actions={
                    <>
                        <button
                            type="button"
                            className="b-btn b-btn--transparent"
                            onClick={() => {
                                if (saving) return;
                                setEditOpen(false);
                                setDraft(emptyDraft());
                            }}
                        >
                            Отмена
                        </button>

                        <button
                            type="button"
                            className={`b-btn ${saving ? "is-loading" : ""}`}
                            onClick={saveDraft}
                            disabled={!canSave || saving}
                        >
                            {saving ? (
                                <>
                                    <span className="b-btn__spinner" aria-hidden="true" />
                                    Сохранение…
                                </>
                            ) : (
                                "Сохранить"
                            )}
                        </button>
                    </>
                }
            >
                {/* ✅ СКРОЛЛ ВНУТРИ МОДАЛКИ */}
                <div className="b-gs-modalScroll">
                    <div className="b-gs-form">
                        <label className="b-field">
                            <div className="b-field__label">Название *</div>
                            <input
                                className={`b-input ${draftErrors.title ? "is-error" : ""}`}
                                value={draft.title}
                                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                                placeholder="Например: Группа по тревожности"
                            />
                            {draftErrors.title ? <div className="b-gs-form__err">{draftErrors.title}</div> : null}
                        </label>

                        <div className="b-gs-form__row2">
                            <label className="b-field">
                                <div className="b-field__label">Начало *</div>
                                <input
                                    type="datetime-local"
                                    className={`b-input ${draftErrors.startDateTime ? "is-error" : ""}`}
                                    value={draft.startDateTime}
                                    onChange={(e) => setDraft((d) => ({ ...d, startDateTime: e.target.value }))}
                                />
                                {draftErrors.startDateTime ? (
                                    <div className="b-gs-form__err">{draftErrors.startDateTime}</div>
                                ) : null}
                            </label>

                            <label className="b-field">
                                <div className="b-field__label">Окончание *</div>
                                <input
                                    type="datetime-local"
                                    className={`b-input ${draftErrors.endDateTime ? "is-error" : ""}`}
                                    value={draft.endDateTime}
                                    onChange={(e) => setDraft((d) => ({ ...d, endDateTime: e.target.value }))}
                                />
                                {draftErrors.endDateTime ? (
                                    <div className="b-gs-form__err">{draftErrors.endDateTime}</div>
                                ) : null}
                            </label>
                        </div>

                        <label className="b-field">
                            <div className="b-field__label">Обложка</div>

                            <div className="b-gs-form__cover-tools">
                                <input
                                    className="b-input"
                                    value={draft.coverImg}
                                    onChange={(e) => setDraft((d) => ({ ...d, coverImg: e.target.value }))}
                                    placeholder="URL или /images/..."
                                />

                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={onCoverFileSelected}
                                />

                                <button
                                    type="button"
                                    className={`b-btn b-btn--transparent ${coverUploading ? "is-loading" : ""}`}
                                    onClick={pickCoverFile}
                                    disabled={coverUploading}
                                    title="Загрузить файл"
                                >
                                    {coverUploading ? "Загрузка…" : "Загрузить"}
                                </button>

                                {draft.coverImg ? (
                                    <button
                                        type="button"
                                        className="b-btn b-btn--transparent"
                                        onClick={() => setDraft((d) => ({ ...d, coverImg: "" }))}
                                        disabled={coverUploading}
                                    >
                                        Удалить
                                    </button>
                                ) : null}
                            </div>

                            <div className="b-gs-form__cover-hint">
                                Можно загрузить файл (JPG/PNG/WebP) или вставить ссылку. Размер до 5MB.
                            </div>

                            {draft.coverImg ? (
                                <div className="b-gs-form__cover-preview">
                                    <img src={resolveUrl(draft.coverImg)} alt="" />
                                </div>
                            ) : null}
                        </label>

                        <label className="b-field">
                            <div className="b-field__label">Описание</div>
                            <textarea
                                className="b-input"
                                rows={4}
                                value={draft.description}
                                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                                placeholder="Коротко: формат встречи, кому подходит, правила группы…"
                            />
                        </label>

                        <div className="b-gs-form__row2">
                            <label className="b-field">
                                <div className="b-field__label">Цена за участника (₽)</div>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    className={`b-input ${draftErrors.priceAtTime ? "is-error" : ""}`}
                                    value={draft.priceAtTime}
                                    onChange={(e) => setDraft((d) => ({ ...d, priceAtTime: e.target.value }))}
                                    placeholder="Например: 1500"
                                />
                                {draftErrors.priceAtTime ? (
                                    <div className="b-gs-form__err">{draftErrors.priceAtTime}</div>
                                ) : null}
                            </label>

                            <label className="b-field">
                                <div className="b-field__label">Лимит мест</div>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    className={`b-input ${draftErrors.capacityClients ? "is-error" : ""}`}
                                    value={draft.capacityClients}
                                    onChange={(e) => setDraft((d) => ({ ...d, capacityClients: e.target.value }))}
                                    placeholder="Пусто = без лимита"
                                />
                                {draftErrors.capacityClients ? (
                                    <div className="b-gs-form__err">{draftErrors.capacityClients}</div>
                                ) : null}
                            </label>
                        </div>

                        <div className="b-gs-form__switch">
                            <label className="b-switch">
                                <input
                                    type="checkbox"
                                    checked={Boolean(draft.allowJoin)}
                                    onChange={(e) => setDraft((d) => ({ ...d, allowJoin: e.target.checked }))}
                                />
                                <span className="b-switch__ui" aria-hidden="true" />
                            </label>

                            <div>
                                <div className="b-gs-form__switch-title">Разрешить дозапись</div>
                                <div className="b-gs-form__switch-sub">Если выключено — клиенты не смогут записаться.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
