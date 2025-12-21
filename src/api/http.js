const BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8080";

function url(path) {
    return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function readToken() {
    try {
        const raw = localStorage.getItem("bs:auth");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.token || null;
    } catch {
        return null;
    }
}

export async function request(path, { method = "GET", json, headers, ...rest } = {}) {
    const token = readToken();
    const hasAuthHeader = headers && (headers.Authorization || headers.authorization);

    const res = await fetch(url(path), {
        method,
        headers: {
            ...(json ? { "Content-Type": "application/json" } : {}),
            ...(token && !hasAuthHeader ? { Authorization: `Bearer ${token}` } : {}),
            ...(headers || {}),
        },
        body: json ? JSON.stringify(json) : rest.body,
        credentials: "include", // refresh-cookie
        ...rest,
    });

    if (!res.ok) {
        // пытаемся распарсить JSON-ошибку
        const ct = res.headers.get("content-type") || "";
        let payload = null;
        try {
            payload = ct.includes("application/json") ? await res.json() : await res.text();
        } catch {}

        const err = new Error(
            typeof payload === "string" ? payload : (payload?.message || `HTTP ${res.status}`)
        );
        err.status = res.status;
        if (payload && typeof payload === "object") Object.assign(err, payload);
        throw err;
    }

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
}
