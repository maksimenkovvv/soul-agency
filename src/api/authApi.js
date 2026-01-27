import { request } from "./http";

export const authApi = {
    login: (email, password, captchaToken) =>
        request("/auth/login", {
            method: "POST",
            json: { email, password, captchaToken: captchaToken || null },
        }),

    register: (fullName, email, password, captchaToken) =>
        request("/auth/register", {
            method: "POST",
            json: { fullName, email, password, captchaToken: captchaToken || null },
        }),

    registerVerify: (email, code) =>
        request("/auth/register/verify", { method: "POST", json: { email, code } }),

    registerResend: (email, captchaToken) =>
        request("/auth/register/resend", { method: "POST", json: { email, captchaToken: captchaToken || null } }),

    recoveryRequest: (email, captchaToken) =>
        request("/auth/recovery/request", { method: "POST", json: { email, captchaToken: captchaToken || null } }),

    recoveryVerify: (email, code) =>
        request("/auth/recovery/verify", { method: "POST", json: { email, code } }),

    recoveryConfirm: (email, code, newPassword) =>
        request("/auth/recovery/confirm", { method: "POST", json: { email, code, newPassword } }),

    refresh: () => request("/auth/refresh", { method: "POST", json: {} }),
    logout: () => request("/auth/logout", { method: "POST", json: {} }),
    me: () => request("/api/me", { method: "GET" }),
};
