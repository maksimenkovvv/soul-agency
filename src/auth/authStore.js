import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/authApi";

const STORAGE_KEY = "bs:auth";

function readStored() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
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
    return role.startsWith("ROLE_") ? role.slice(5) : role; // ROLE_CLIENT -> CLIENT
}

const Ctx = createContext(null);

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(() => readStored());
    // auth = { token, me: {id,email,role,name} }
    const [booting, setBooting] = useState(true);

    const isAuthenticated = !!auth?.me?.role;

    const setAuthSafe = (next) => {
        setAuth(next);
        writeStored(next);
    };

    const boot = async () => {
        setBooting(true);
        try {
            // 1) refresh -> token
            const r = await authApi.refresh();
            const token = r?.token || r?.accessToken || null;

            // сохраняем token, чтобы http.js стал отправлять Authorization
            setAuthSafe({ token, me: null });

            // 2) me -> user info
            const me = await authApi.me(); // {id,email,role,name} где role=ROLE_CLIENT
            const normalized = { ...me, role: normalizeRole(me.role) };

            setAuthSafe({ token, me: normalized });
        } catch {
            setAuthSafe(null);
        } finally {
            setBooting(false);
        }
    };

    useEffect(() => {
        boot();
    }, []);

    const login = async (email, password) => {
        const r = await authApi.login(email, password);
        const token = r?.token || r?.accessToken || null;

        setAuthSafe({ token, me: null });

        const me = await authApi.me();
        const normalized = { ...me, role: normalizeRole(me.role) };
        setAuthSafe({ token, me: normalized });

        return normalized;
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch {}
        setAuthSafe(null);
    };

    const value = useMemo(
        () => ({
            booting,
            auth,
            me: auth?.me || null,
            token: auth?.token || null,
            role: auth?.me?.role || null, // уже CLIENT/PSYCHOLOGIST/ADMIN
            isAuthenticated,
            boot,
            login,
            logout,
        }),
        [booting, auth, isAuthenticated]
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
    return allowed.includes(userRole);
}
