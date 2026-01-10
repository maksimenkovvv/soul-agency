import React from "react";

import Modal from "../ui/Modal";
import Search from "../filters/Search";
import { psychologistsApi } from "../../api/psychologistsApi";

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

function normalizeCard(raw) {
  const id = raw?.id ?? raw?.userId ?? raw?.user_id;
  const name = raw?.name ?? raw?.userName ?? raw?.user_name ?? "Психолог";
  const experience =
    raw?.experience ||
    formatExperienceYears(raw?.experienceYears ?? raw?.experience_years) ||
    "опыт не указан";
  const priceLabel = raw?.price || formatPrice(raw) || "цена по запросу";
  const priceAtTime = raw?.pricePerSession ?? raw?.price_per_session ?? null;
  const avatarUrl = raw?.avatarUrl || raw?.avatar_url || "";
  return {
    id,
    name,
    experience,
    priceLabel,
    priceAtTime,
    image: avatarUrl ? resolveUrl(avatarUrl) : "",
    raw,
  };
}

export default function PsychologistSelectModal({
  open,
  onClose,
  onSelect,
  selectedId,
}) {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);

  const size = 24;

  const loadPage = React.useCallback(async (p) => {
    if (p === 0) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const resp = await psychologistsApi.list({ page: p, size });
      const arr = Array.isArray(resp) ? resp : resp?.content || resp?.items || [];
      const normalized = (arr || [])
        .map(normalizeCard)
        .filter((x) => x?.id != null);

      setItems((prev) => {
        if (p === 0) return normalized;
        const map = new Map((prev || []).map((x) => [x.id, x]));
        for (const x of normalized) map.set(x.id, x);
        return Array.from(map.values());
      });

      const tp = Number(resp?.totalPages);
      if (Number.isFinite(tp) && tp > 0) setTotalPages(tp);
      setPage(p);
    } catch (e) {
      setError(e?.message || "Не удалось загрузить психологов");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setQ("");
    setItems([]);
    setPage(0);
    setTotalPages(1);
    loadPage(0);
  }, [open, loadPage]);

  const canLoadMore = page + 1 < totalPages;

  const filtered = React.useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();
    if (!needle) return items;
    return (items || []).filter((p) => {
      const raw = p?.raw || {};
      const hay = [p?.name, raw?.headline, raw?.about]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Выберите психолога"
      actions={
        canLoadMore ? (
          <button
            type="button"
            className="b-btn"
            onClick={() => loadPage(page + 1)}
            disabled={loadingMore}
          >
            {loadingMore ? "Загрузка…" : "Показать ещё"}
          </button>
        ) : null
      }
    >
      <div className="b-psy-search">
        <Search showAppointmentFilters={false} value={q} onSearch={setQ} />

        {error ? (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,0,0,0.06)",
            }}
          >
            {error}
          </div>
        ) : null}

        <div className="b-psy-search__list">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="b-psy-card b-psy-card--skeleton" />
            ))
          ) : filtered.length ? (
            filtered.map((p) => {
              const active = Number(selectedId) === Number(p.id);
              const img = p.image || PLACEHOLDER;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`b-psy-card ${active ? "is-active" : ""}`}
                  onClick={() => {
                    onSelect?.(p);
                    onClose?.();
                  }}
                >
                  <div className="b-psy-card__avatar">
                    <img
                      src={img}
                      alt={p.name}
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER;
                      }}
                    />
                  </div>
                  <div className="b-psy-card__meta">
                    <div className="b-psy-card__name">{p.name}</div>
                    {p.experience ? (
                      <div className="b-psy-card__sub">Опыт: {p.experience}</div>
                    ) : null}
                    {p.priceLabel ? (
                      <div className="b-psy-card__price">{p.priceLabel}</div>
                    ) : null}
                  </div>
                  <div className="b-psy-card__chev">{active ? "✓" : "›"}</div>
                </button>
              );
            })
          ) : (
            <div className="b-psy-picker__empty" style={{ marginTop: 10 }}>
              Ничего не найдено.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
