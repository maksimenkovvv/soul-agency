import {request} from "./http";

// Профиль текущего пользователя.
// Если на бэке путь/DTO другой — поменяй тут, остальные компоненты трогать не придётся.
export const profileApi = {
    // email менять нельзя — отправляем только разрешённые поля
    updateMe: ({name, login} = {}) =>
        request("/api/me", {
            method: "PUT",
            json: {name, login},
        }),

    // Смена пароля
    changePassword: ({currentPassword, newPassword, confirmNewPassword} = {}) =>
        request("/api/me/password", {
            method: "PUT",
            json: {currentPassword, newPassword, confirmNewPassword},
        }),

    // Загрузка аватарки (multipart/form-data, field name: image)
    uploadAvatar: (file) => {
        const fd = new FormData();
        fd.append("image", file);
        return request("/api/me/avatar", {method: "POST", body: fd});
    },

    deleteAvatar: (id) => {
        return request(`/api/me/avatar?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    // Профиль психолога для self (только для роли PSYCHOLOGIST)
    getMyPsychologistProfile: () => request("/api/me/psychologist-profile"),
    updateMyPsychologistProfile: (dto) =>
        request("/api/me/psychologist-profile", {method: "PUT", json: dto}),
};