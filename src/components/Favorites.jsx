import React from "react";
import { Link, useNavigate } from "react-router-dom";

import { psychologistsApi } from "../api/psychologistsApi";
import { useFavorites } from "../favorites/favoritesStore";
import { useToast } from "../ui/toast/ToastProvider";

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

  const avatarUrl =
    raw?.avatarUrl || raw?.avatar_url || raw?.photoUrl || raw?.photo_url || "";

  return { id, name, experience, price, avatarUrl, raw };
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

export default function Favorites() {
  const navigate = useNavigate();
  const toast = useToast();
  const fav = useFavorites();

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  // Load favourites into UI.
  React.useEffect(() => {
    let alive = true;

    async function load() {
      setError("");
      setLoading(true);

      try {
        // Ensure store is up to date
        await fav.refresh();

        // If backend returns full objects on /favourites, we can render immediately.
        const cached = Array.isArray(fav.items) ? fav.items : [];
        if (cached.length > 0) {
          const normalized = cached.map(normalizePsychologist).filter((x) => x?.id != null);
          if (alive) setItems(normalized);
          return;
        }

        // Fallback: /favourites returned ids only.
        const ids = Array.from(fav.ids || []);
        if (!ids.length) {
          if (alive) setItems([]);
          return;
        }

        // Try to load details by id (requires backend: GET /api/psychologists/{id}).
        const rows = await Promise.all(
          ids.map((id) =>
            psychologistsApi
              .get(id)
              .then((x) => x)
              .catch(() => null)
          )
        );

        const normalized = rows
          .filter(Boolean)
          .map(normalizePsychologist)
          .filter((x) => x?.id != null);

        if (alive) setItems(normalized);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Не удалось загрузить избранное");
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep UI in sync when favorites set changes (e.g. user clicked heart in list)
  React.useEffect(() => {
    const ids = new Set(Array.from(fav.ids || []));
    setItems((prev) => (prev || []).filter((p) => ids.has(String(p.id))));
  }, [fav.ids]);

  const handleToggle = async (id) => {
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
    toast.error(msg, { title: "Избранное" });
  };

  const empty = !loading && !error && (!items || items.length === 0);

  return (
    <div className="favorites">
      <h2>Избранное</h2>

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

      <div className="psychologists" style={{ marginBottom: 0 }}>
        <div className="psychologists__item-wrapper">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="psychologists__item psychologists__item--skeleton">
                <div className="psychologists__item-image" />
                <div className="psychologists__item-content" />
              </div>
            ))
          ) : (
            (items || []).map((p) => {
              const isFav = fav.isFavourite(p.id);
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
                      onClick={() => handleToggle(p.id)}
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

        {empty ? (
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
            В избранном пока пусто.
          </div>
        ) : null}
      </div>
    </div>
  );
}
