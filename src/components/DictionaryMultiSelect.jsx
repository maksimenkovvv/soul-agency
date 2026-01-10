import React from "react";

/**
 * Универсальный мультиселект для справочников (темы/методы).
 *
 * value может быть:
 *  - массивом объектов [{id,title,...}, ...]
 *  - массивом id [1,2,3]
 *
 * onChange отдаёт массив объектов: {id, title, isActive}
 */
export default function DictionaryMultiSelect({
  label,
  value,
  onChange,
  loadOptions,
  disabled = false,
  emptyText = "Нет вариантов",
  searchPlaceholder = "Поиск…",
}) {
  const ref = React.useRef(null);
  const hydratedOnceRef = React.useRef(false);

  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const [options, setOptions] = React.useState([]); // [{id,title,isActive,code}]
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [selected, setSelected] = React.useState([]);

  const normalizeOption = React.useCallback((x) => {
    if (!x) return null;
    const id = x?.id;
    if (id == null) return null;
    const title = x?.title ?? x?.name ?? x?.label;
    if (!title) return null;
    return {
      id,
      code: x?.code,
      title,
      isActive: x?.isActive ?? x?.active ?? true,
    };
  }, []);

  const normalizeSelection = React.useCallback((arr, opts) => {
    const list = Array.isArray(arr) ? arr : [];
    const map = new Map((opts || []).map((o) => [String(o.id), o]));

    const out = [];
    for (const item of list) {
      const id = item?.id ?? item;
      if (id == null) continue;
      const hit = map.get(String(id));
      if (hit) out.push(hit);
      else {
        const title = item?.title ?? item?.name ?? item?.label ?? `#${id}`;
        out.push({ id, title, isActive: true });
      }
    }
    // unique by id
    const uniq = [];
    const seen = new Set();
    for (const o of out) {
      const key = String(o?.id);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniq.push(o);
    }
    return uniq;
  }, []);

  // load options
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await loadOptions?.();
        const arr = Array.isArray(res) ? res : res?.content || res?.items || [];
        const norm = (arr || [])
          .map(normalizeOption)
          .filter((x) => x?.id != null && x?.title);
        if (!alive) return;
        setOptions(norm);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Не удалось загрузить список");
        setOptions([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadOptions, normalizeOption]);

  // sync controlled value -> local selected (и «гидрация» id -> object по справочнику)
  React.useEffect(() => {
    const incoming = Array.isArray(value) ? value : [];
    const incomingIsIdsOnly = incoming.some((v) => v != null && typeof v !== "object");

    const next = normalizeSelection(incoming, options);
    setSelected(next);

    // если прилетели id, после загрузки справочника один раз заменим их на объекты
    if (incomingIsIdsOnly && options.length > 0 && !hydratedOnceRef.current) {
      hydratedOnceRef.current = true;
      onChange?.(next);
    }
  }, [value, options, normalizeSelection, onChange]);

  // close on outside click
  React.useEffect(() => {
    const onDown = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const isSelected = (opt) => {
    const id = opt?.id;
    return selected.some((x) => String(x?.id) === String(id));
  };

  const toggle = (opt) => {
    const id = opt?.id;
    if (id == null) return;

    const disabledOpt = opt?.isActive === false;
    const already = isSelected(opt);
    if (disabledOpt && !already) return;

    const next = already
      ? selected.filter((x) => String(x?.id) !== String(id))
      : [...selected, opt];
    setSelected(next);
    onChange?.(next);
  };

  const remove = (id) => {
    const next = selected.filter((x) => String(x?.id) !== String(id));
    setSelected(next);
    onChange?.(next);
  };

  const clear = () => {
    setSelected([]);
    onChange?.([]);
  };

  const filtered = React.useMemo(() => {
    const query = (q || "").trim().toLowerCase();
    if (!query) return options || [];
    return (options || []).filter((o) => (o?.title || "").toLowerCase().includes(query));
  }, [q, options]);

  return (
    <div className="settings__dict" ref={ref}>
      <div className="settings__dict-head">
        <div className="login__label">{label}</div>
        <button
          type="button"
          className="settings__dict-add"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          aria-label={`Выбрать: ${label}`}
          title={`Выбрать: ${label}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 1V15" stroke="#313235" strokeWidth="2" strokeLinecap="round" />
            <path d="M1 8H15" stroke="#313235" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {selected.length > 0 ? (
        <div className="settings__dict-chips">
          {selected.map((s) => (
            <div key={String(s?.id)} className="settings__dict-chip">
              <span className="settings__dict-chip-title">{s?.title ?? `#${s?.id}`}</span>
              <button
                type="button"
                className="settings__dict-chip-x"
                onClick={() => remove(s?.id)}
                title="Убрать"
                disabled={disabled}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.5 2.5L2.5 9.5" stroke="#313235" strokeOpacity="0.55" strokeLinecap="round" />
                  <path d="M2.5 2.5L9.5 9.5" stroke="#313235" strokeOpacity="0.55" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="settings__dict-empty">Не выбрано</div>
      )}

      {open && (
        <div className="settings__dict-dropdown">
          <div className="settings__dict-top">
            <input
              className="login__input settings__dict-search"
              type="text"
              placeholder={searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading}
            />
            <div className="settings__dict-actions">
              <button type="button" className="settings__dict-clear" onClick={clear} disabled={disabled || selected.length === 0}>
                Очистить
              </button>
              <button type="button" className="settings__dict-done" onClick={() => setOpen(false)}>
                Готово
              </button>
            </div>
          </div>

          {loading ? (
            <div className="settings__dict-msg">Загрузка…</div>
          ) : error ? (
            <div className="settings__dict-msg">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="settings__dict-msg">{emptyText}</div>
          ) : (
            <div className="settings__dict-list">
              {filtered.map((opt) => {
                const sel = isSelected(opt);
                const dis = opt?.isActive === false;
                return (
                  <div
                    key={String(opt?.id)}
                    className={`settings__dict-item ${sel ? "selected" : ""} ${dis ? "is-disabled" : ""}`}
                    onClick={() => {
                      if (disabled) return;
                      toggle(opt);
                    }}
                  >
                    <div className="settings__dict-item-title">{opt?.title}</div>
                    {sel && (
                      <div className="settings__dict-mark">
                        <svg width="18" height="13" viewBox="0 0 18 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17 1L6 12L1 7" stroke="#8885FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
