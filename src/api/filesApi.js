// filesApi.js
// Загрузка файлов через /api/files/*
// Бэкенд (FileController) отдаёт:
// { success: 1, file: { url: "<BASE_URL>/images/<uuid>.jpg" } }

import { request } from "./http";

export const filesApi = {
    uploadImage(file) {
        const fd = new FormData();
        // FileController принимает image или file
        fd.append("image", file);
        return request("/api/files/upload", { method: "POST", body: fd });
    },

    uploadDocument(file) {
        const fd = new FormData();
        fd.append("document", file);
        return request("/api/files/upload-document", { method: "POST", body: fd });
    },

    uploadFromUrl(url) {
        return request("/api/files/upload-url", { method: "POST", json: { url } });
    },
};
