import React from "react";

const ToastContext = React.createContext(null);

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);
  const timeoutsRef = React.useRef(new Map());

  const remove = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const push = React.useCallback(
    ({ type = "info", title, message, duration = 3500 }) => {
      const id = makeId();
      const toast = {
        id,
        type,
        title,
        message,
        createdAt: Date.now(),
      };

      setToasts((prev) => [toast, ...prev].slice(0, 5));

      const timeout = setTimeout(() => remove(id), duration);
      timeoutsRef.current.set(id, timeout);
      return id;
    },
    [remove]
  );

  const api = React.useMemo(
    () => ({
      push,
      remove,
      success: (message, opts = {}) =>
        push({ type: "success", title: opts.title || "Готово", message, duration: opts.duration }),
      error: (message, opts = {}) =>
        push({ type: "error", title: opts.title || "Ошибка", message, duration: opts.duration }),
      info: (message, opts = {}) =>
        push({ type: "info", title: opts.title || "Инфо", message, duration: opts.duration }),
    }),
    [push, remove]
  );

  React.useEffect(() => {
    return () => {
      for (const t of timeoutsRef.current.values()) clearTimeout(t);
      timeoutsRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function Icon({ type }) {
  if (type === "success") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ToastViewport({ toasts, onClose }) {
  return (
    <div className="b-toast" role="region" aria-label="Уведомления">
      {toasts.map((t) => (
        <div key={t.id} className={`b-toast__item is-${t.type}`} role="status">
          <div className="b-toast__icon" aria-hidden="true">
            <Icon type={t.type} />
          </div>
          <div className="b-toast__body">
            {t.title ? <div className="b-toast__title">{t.title}</div> : null}
            {t.message ? <div className="b-toast__text">{t.message}</div> : null}
          </div>
          <button className="b-toast__close" onClick={() => onClose(t.id)} aria-label="Закрыть">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
