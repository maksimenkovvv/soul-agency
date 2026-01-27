import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authApi } from "../api/authApi";

const STORAGE_KEY = "bs:auth";

/** shape: { token: string|null, me: {id,email,role,name,...}|null } */
function readStored() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeStored(v) {
    try {
        if (!v) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {}
}

function normalizeRole(role) {
    if (!role) return null;
    const s = String(role);
    return s.startsWith("ROLE_") ? s.slice(5) : s; // ROLE_CLIENT -> CLIENT
}

const Ctx = createContext(null);

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(() => readStored()); // {token, me}
    const [booting, setBooting] = useState(true);

    // защита от двойного boot/login в StrictMode / быстрых кликов
    const bootSeq = useRef(0);

    const setAuthSafe = useCallback((next) => {
        setAuth(next);
        writeStored(next);
    }, []);

    const applyMe = useCallback(
        (token, meRaw) => {
            if (!meRaw) return setAuthSafe({ token: token ?? null, me: null });
            const normalized = { ...meRaw, role: normalizeRole(meRaw.role) };
            setAuthSafe({ token: token ?? null, me: normalized });
            return normalized;
        },
        [setAuthSafe]
    );

    const boot = useCallback(async () => {
        const seq = ++bootSeq.current;
        setBooting(true);
        try {
            // refresh возвращает accessToken/token ИЛИ может вернуть вообще пусто, но выставить cookie
            const r = await authApi.refresh();
            const token = r?.token ?? r?.accessToken ?? r?.jwt ?? null;

            // если refresh не дал токен, всё равно пробуем me (cookie-based)
            const me = await authApi.me();
            if (seq !== bootSeq.current) return; // устаревший вызов
            applyMe(token, me);
        } catch {
            if (seq !== bootSeq.current) return;
            setAuthSafe(null);
        } finally {
            if (seq === bootSeq.current) setBooting(false);
        }
    }, [applyMe, setAuthSafe]);

    useEffect(() => {
        // один boot на монтировании
        boot();
    }, [boot]);

    const login = useCallback(
        async (email, password, captchaToken) => {
            const seq = ++bootSeq.current;
            setBooting(true);
            try {
                const r = await authApi.login(String(email || "").trim(), password, captchaToken);
                const token = r?.token ?? r?.accessToken ?? r?.jwt ?? null;

                // token мог прийти хедером/кукой, me — отдельным запросом
                const me = await authApi.me();
                if (seq !== bootSeq.current) return null;
                return applyMe(token, me);
            } finally {
                if (seq === bootSeq.current) setBooting(false);
            }
        },
        [applyMe]
    );

    const logout = useCallback(async () => {
        const seq = ++bootSeq.current;
        setBooting(true);
        try {
            try {
                await authApi.logout();
            } catch {}
            if (seq !== bootSeq.current) return;
            setAuthSafe(null);
        } finally {
            if (seq === bootSeq.current) setBooting(false);
        }
    }, [setAuthSafe]);

    const isAuthenticated = !!auth?.me?.role;

    const value = useMemo(
        () => ({
            booting,
            auth,
            me: auth?.me || null,
            token: auth?.token || null,
            role: auth?.me?.role || null, // CLIENT/PSYCHOLOGIST/ADMIN
            isAuthenticated,
            boot,
            login,
            logout,
        }),
        [booting, auth, isAuthenticated, boot, login, logout]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
    const v = useContext(Ctx);
    if (!v) throw new Error("useAuth must be used inside AuthProvider");
    return v;
}

export function hasRole(userRole, allowed = []) {
    if (!userRole) return false;
    return Array.isArray(allowed) && allowed.includes(userRole);
}
