import { request } from "./http";

export const authApi = {
    login: (email, password) =>
        request("/auth/login", { method: "POST", json: { email: email, password } }),

    register: (fullName, email, password) =>
        request("/auth/register", { method: "POST", json: { fullName, email, password } }),

    registerVerify: (email, code) =>
        request("/auth/register/verify", { method: "POST", json: { email, code } }),

    registerResend: (email) =>
        request("/auth/register/resend", { method: "POST", json: { email } }),

    recoveryRequest: (email) =>
        request("/auth/recovery/request", { method: "POST", json: { email } }),

    recoveryVerify: (email, code) =>
        request("/auth/recovery/verify", { method: "POST", json: { email, code } }),

    recoveryConfirm: (email, code, newPassword) =>
        request("/auth/recovery/confirm", { method: "POST", json: { email, code, newPassword } }),

    refresh: () => request("/auth/refresh", { method: "POST" }),
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/api/me", { method: "GET" }),
};
