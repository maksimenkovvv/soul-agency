import { request } from "./http";

// Public dictionaries for filters.
// Backend suggestion: expose these endpoints under /api/dict
// - GET /api/dict/themes  -> [{id, code, title, isActive}]
// - GET /api/dict/methods -> [{id, code, title, isActive}]

export const dictApi = {
  themes: () => request("/api/dict/themes"),
  methods: () => request("/api/dict/methods"),
};
