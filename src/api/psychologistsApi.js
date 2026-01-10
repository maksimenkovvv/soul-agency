import { request } from "./http";

// -------- helpers: label -> range --------
function extractNumbers(label) {
    // Поддержка форматов: "2 000", "2\u00A0000", "2000", "2.000", "2,000" и т.п.
    const s = String(label || "")
        .replace(/\u00A0/g, " ")
        .replace(/[.,]/g, " ");

    const groups = s.match(/\d[\d\s]*/g) || [];
    return groups
        .map((g) => Number(String(g).replace(/\s+/g, "")))
        .filter((n) => Number.isFinite(n));
}

function parsePriceRangeFromLabel(label) {
    const t = String(label || "").toLowerCase().replace(/\u00A0/g, " ");
    const nums = extractNumbers(label);
    if (!nums.length) return null;

    // "до 2 000" => max
    if (t.includes("до") && nums.length === 1) {
        return { minPrice: null, maxPrice: nums[0] };
    }

    // "от 2 000" => min
    if (t.includes("от") && !t.includes("до") && nums.length === 1) {
        return { minPrice: nums[0], maxPrice: null };
    }

    // Диапазон: "от 2 000 до 3 000" / "2000-3000" / "2000–3000"
    if (nums.length >= 2) {
        const [a, b] = nums;
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        return { minPrice: min, maxPrice: max };
    }

    return null;
}

function parseExpRangeFromLabel(label) {
    const t = String(label || "").toLowerCase().replace(/\u00A0/g, " ");
    const nums = extractNumbers(label);
    if (!nums.length) return null;

    // "от 15 лет" / "15+" => min only
    if (nums.length === 1 && (t.includes("+") || t.includes("от") || t.includes("лет"))) {
        return { minExp: nums[0], maxExp: null };
    }

    // Диапазон: "5-10" / "5–10" / "от 5 до 10"
    if (nums.length >= 2) {
        const [a, b] = nums;
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        return { minExp: min, maxExp: max };
    }

    return null;
}

// если выбрано несколько диапазонов — делаем "объединение" в один min/max (самый широкий)
function mergeRanges(ranges, minKey, maxKey) {
    const rs = (ranges || []).filter(Boolean);
    if (!rs.length) return { [minKey]: null, [maxKey]: null };

    const mins = rs.map(r => r[minKey]).filter(v => Number.isFinite(v));
    const maxs = rs.map(r => r[maxKey]).filter(v => Number.isFinite(v));

    const min = mins.length ? Math.min(...mins) : null;
    const max = maxs.length ? Math.max(...maxs) : null;

    return { [minKey]: min, [maxKey]: max };
}

export const psychologistsApi = {
    // сюда прокидываем query из Filters: { q, themes, methods, experience, price, sort }
    list: ({ page, size, q, themes, methods, experience, price, sort } = {}) => {
        const p = Number.isFinite(page) ? page : 0;
        const s = Number.isFinite(size) ? size : 12;

        const qs = new URLSearchParams();
        qs.set("page", String(p));
        qs.set("size", String(s));

        if (q && String(q).trim()) qs.set("q", String(q).trim());
        if (sort) qs.set("sort", sort);

        // themes/methods: ожидаем массив либо объектов {id,...} либо чисел
        // Важно: на бэке чаще всего принимают themeIds/methodIds как повторяющиеся query-параметры.
        // Для совместимости отправляем и старые (themeId/methodId), и новые (themeIds/methodIds).
        (themes || []).forEach((t) => {
            const id = typeof t === "number" ? t : t?.id;
            if (id == null) return;
            qs.append("themeId", String(id));
            qs.append("themeIds", String(id));
        });

        (methods || []).forEach((m) => {
            const id = typeof m === "number" ? m : m?.id;
            if (id == null) return;
            qs.append("methodId", String(id));
            qs.append("methodIds", String(id));
        });

        // price/experience labels -> объединённые min/max
        const priceRanges = (price || []).map(parsePriceRangeFromLabel);
        const expRanges = (experience || []).map(parseExpRangeFromLabel);

        const { minPrice, maxPrice } = mergeRanges(priceRanges, "minPrice", "maxPrice");
        const { minExp, maxExp } = mergeRanges(expRanges, "minExp", "maxExp");

        if (Number.isFinite(minPrice)) qs.set("minPrice", String(minPrice));
        if (Number.isFinite(maxPrice)) qs.set("maxPrice", String(maxPrice));
        if (Number.isFinite(minExp)) qs.set("minExp", String(minExp));
        if (Number.isFinite(maxExp)) qs.set("maxExp", String(maxExp));

        return request(`/api/psychologists?${qs.toString()}`);
    },

    favourites: () => request(`/api/psychologists/favourites`),
    // Optional: if backend provides psychologist details by id.
    // Used as a fallback for the Favorites tab when /favourites returns only ids.
    get: (id) => request(`/api/psychologists/${id}`),
    addFavourite: (id) => request(`/api/psychologists/${id}/favorite`, { method: "POST" }),
    removeFavourite: (id) => request(`/api/psychologists/${id}/favorite`, { method: "DELETE" }),
};
