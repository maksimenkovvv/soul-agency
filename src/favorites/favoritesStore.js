import React from "react";

import { psychologistsApi } from "../api/psychologistsApi";
import { useAuth } from "../auth/authStore";

// Favorites store keeps a global Set of psychologist ids added to favorites.
// It also optionally caches the full psychologist objects if backend returns them.

const Ctx = React.createContext(null);

function toId(v) {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "string") return String(v);
  return v?.id != null ? String(v.id) : null;
}

function extractIds(arr) {
  return (arr || []).map(toId).filter((x) => x != null);
}

function isObjectRow(x) {
  return x && typeof x === "object" && (x.id != null || x.userId != null || x.user_id != null);
}

export function FavoritesProvider({ children }) {
  const auth = useAuth();
  const isAuthed = Boolean(auth?.me?.id && auth?.token);

  const [loading, setLoading] = React.useState(false);
  const [ids, setIds] = React.useState(() => new Set());
  const [items, setItems] = React.useState([]); // optional cache of favourite psychologists

  const refresh = React.useCallback(async () => {
    if (!isAuthed) {
      setIds(new Set());
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const fav = await psychologistsApi.favourites();
      const arr = Array.isArray(fav) ? fav : (fav?.items || fav?.content || []);

      const idsList = extractIds(arr);
      setIds(new Set(idsList));

      // If backend returns full objects, keep them for the Favorites tab.
      if (arr.some(isObjectRow)) {
        setItems(arr);
      } else {
        setItems([]);
      }
    } catch {
      // non-critical: keep empty
      setIds(new Set());
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthed]);

  // auto-refresh on auth changes
  React.useEffect(() => {
    if (auth?.booting) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.booting, auth?.me?.id, auth?.token]);

  const isFavourite = React.useCallback((id) => {
    const sid = toId(id);
    if (!sid) return false;
    return ids.has(sid);
  }, [ids]);

  // Toggle favourite for current user.
  // Returns { ok, unauth?, added?, removed?, error? }
  const toggle = React.useCallback(async (id) => {
    const sid = toId(id);
    if (!sid) return { ok: false, error: new Error("bad id") };
    if (!isAuthed) return { ok: false, unauth: true };

    const prevIds = new Set(ids);
    const wasFav = prevIds.has(sid);

    // optimistic update
    const nextIds = new Set(prevIds);
    if (wasFav) nextIds.delete(sid);
    else nextIds.add(sid);
    setIds(nextIds);

    // keep cache in sync (remove optimistically)
    if (wasFav) {
      setItems((prev) => (prev || []).filter((x) => toId(x) !== sid));
    }

    try {
      if (wasFav) await psychologistsApi.removeFavourite(sid);
      else await psychologistsApi.addFavourite(sid);

      // if added and we don't have cached object – we leave it, UI can refresh() if needed
      return { ok: true, added: !wasFav, removed: wasFav };
    } catch (e) {
      // rollback
      setIds(prevIds);
      // restore items cache by refetching (safe)
      refresh();
      return { ok: false, error: e };
    }
  }, [ids, isAuthed, refresh]);

  const value = React.useMemo(() => (
    {
      loading,
      ids,
      items,
      isAuthed,
      refresh,
      isFavourite,
      toggle,
    }
  ), [loading, ids, items, isAuthed, refresh, isFavourite, toggle]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useFavorites must be used inside FavoritesProvider");
  return v;
}
