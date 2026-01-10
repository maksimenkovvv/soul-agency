import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { blogApi } from "../api/blogApi";
import Breadcrumbs from "../components/Breadcrumbs";
import BreadcrumbsSchema from "../components/BreadcrumbsSchema";

function formatDate(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
}

const crumbs = [
    { label: "Главная", to: "/" },
    { label: "Блог", to: "/blog" },
];

export default function Blog() {
    const [sp, setSp] = useSearchParams();
    const page = Math.max(0, parseInt(sp.get("page") || "0", 10) || 0);
    const q = (sp.get("q") || "").trim();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ items: [], page: 0, size: 12, total: 0 });
    const [queryDraft, setQueryDraft] = useState(q);

    const totalPages = useMemo(() => {
        const size = data.size || 12;
        return Math.max(1, Math.ceil((data.total || 0) / size));
    }, [data.total, data.size]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        blogApi
            .list({ page, size: 12, q })
            .then((res) => {
                if (!mounted) return;
                setData({
                    items: Array.isArray(res?.content) ? res.content : [],
                    page: res?.number ?? page,
                    size: res?.size ?? 12,
                    total: res?.totalElements ?? 0,
                });
            })
            .catch((err) => {
                console.error(err);
                if (!mounted) return;
                setData({ items: [], page, size: 12, total: 0 });
            })
            .finally(() => mounted && setLoading(false));

        return () => {
            mounted = false;
        };
    }, [page, q]);


    const applySearch = (e) => {
        e.preventDefault();
        const nextQ = queryDraft.trim();
        const next = new URLSearchParams(sp);
        if (nextQ) next.set("q", nextQ);
        else next.delete("q");
        next.set("page", "0");
        setSp(next);
    };

    const goPage = (p) => {
        const next = new URLSearchParams(sp);
        next.set("page", String(p));
        setSp(next);
    };

    return (
        <div className="b-blog">
            <Breadcrumbs items={crumbs} />
            <BreadcrumbsSchema items={crumbs} />
            <div className="b-blog__hero">
                <div>
                    <h1 className="b-blog__title">Блог</h1>
                    <p className="b-blog__subtitle">
                        Статьи о психологии, терапии и том, как выбрать “своего” специалиста.
                    </p>
                </div>

                <form className="b-blog__search" onSubmit={applySearch}>
                    <input
                        className="b-blog__search-input"
                        value={queryDraft}
                        onChange={(e) => setQueryDraft(e.target.value)}
                        placeholder="Поиск по статьям…"
                    />
                    <button className="b-btn" type="submit">
                        Найти
                    </button>
                </form>
            </div>

            {loading ? (
                <div className="b-blog__grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="b-blog-card b-blog-card--skeleton" />
                    ))}
                </div>
            ) : data.items.length ? (
                <>
                    <div className="b-blog__grid">
                        {data.items.map((post) => (
                            <Link key={post.id || post.slug} to={`/blog/${post.id}-${post.slug}`} className="b-blog-card">
                                {post.previewImageUrl ? (
                                    <div className="b-blog-card__media">
                                        <img src={post.previewImageUrl} alt={post.title || "Обложка"} />
                                    </div>
                                ) : (
                                    <div className="b-blog-card__media b-blog-card__media--empty" aria-hidden="true" />
                                )}

                                <div className="b-blog-card__body">
                                    <div className="b-blog-card__meta">
                                        {post.publishedAt ? <span>{formatDate(post.publishedAt)}</span> : <span />}
                                        {post.readingTimeMinutes ? <span>• {post.readingTimeMinutes} мин</span> : null}
                                    </div>

                                    <div className="b-blog-card__title">{post.title}</div>
                                    {post.description ? <div className="b-blog-card__desc">{post.description}</div> : null}

                                    <div className="b-blog-card__footer">
                                        <span className="b-blog-card__more">Читать →</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="b-blog__pager">
                        <button
                            className="b-btn b-btn--transparent"
                            onClick={() => goPage(Math.max(0, page - 1))}
                            disabled={page <= 0}
                            type="button"
                        >
                            Назад
                        </button>

                        <div className="b-blog__pager-info">
                            Страница <b>{page + 1}</b> из <b>{totalPages}</b>
                        </div>

                        <button
                            className="b-btn"
                            onClick={() => goPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                            type="button"
                        >
                            Вперёд
                        </button>
                    </div>
                </>
            ) : (
                <div className="b-blog__empty">
                    Ничего не найдено{q ? <> по запросу <b>“{q}”</b></> : null}.
                </div>
            )}
        </div>
    );
}
