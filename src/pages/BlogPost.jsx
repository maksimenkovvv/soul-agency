import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { blogApi } from "../api/blogApi";
import Breadcrumbs from "../components/Breadcrumbs";
import BreadcrumbsSchema from "../components/BreadcrumbsSchema";

function readEnvCra(key, fallback = "") {
    const env = typeof process !== "undefined" && process?.env ? process.env : {};
    return String(env[key] || fallback || "");
}

function formatDate(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
}

function slugifyId(s) {
    return (
        String(s || "")
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s-]/gu, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 80) || `h-${Math.random().toString(16).slice(2)}`
    );
}

function buildTocAndHtml(html, { titleFallback = "Изображение" } = {}) {
    const source = String(html || "");
    if (!source.trim()) return { html: "", toc: [] };

    const parser = new DOMParser();
    const doc = parser.parseFromString(source, "text/html");

    // Внутри статьи не должно быть H1 — понижаем до H2
    doc.querySelectorAll("h1").forEach((h1) => {
        const h2 = doc.createElement("h2");
        for (const a of Array.from(h1.attributes)) h2.setAttribute(a.name, a.value);
        h2.innerHTML = h1.innerHTML;
        h1.replaceWith(h2);
    });

    // Проставляем img: loading/decoding + alt (если пустой)
    doc.querySelectorAll("img").forEach((img) => {
        if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
        if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");

        const alt = (img.getAttribute("alt") || "").trim();
        if (!alt) {
            const fig = img.closest("figure");
            const cap = fig?.querySelector("figcaption")?.textContent?.trim();
            img.setAttribute("alt", cap || titleFallback);
        }
    });

    // TOC по H2/H3 + стабильные id
    const headings = Array.from(doc.querySelectorAll("h2, h3"));
    const used = new Set();
    const toc = headings.map((h) => {
        const text = (h.textContent || "").trim();
        const level = h.tagName.toLowerCase() === "h2" ? 2 : 3;

        let id = h.getAttribute("id") || slugifyId(text);
        while (used.has(id)) id = `${id}-${Math.random().toString(16).slice(2, 6)}`;
        used.add(id);

        h.setAttribute("id", id);
        return { id, text, level };
    });

    return { html: doc.body.innerHTML, toc };
}

function stripHtml(html) {
    const div = document.createElement("div");
    div.innerHTML = String(html || "");
    return (div.textContent || div.innerText || "").trim();
}

function stripToText(html) {
    const div = document.createElement("div");
    div.innerHTML = String(html || "");
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function calcReadingMinutes(text) {
    const words = String(text || "").split(/\s+/).filter(Boolean).length;
    const wpm = 180;
    return Math.max(1, Math.ceil(words / wpm));
}

function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 92;
    window.scrollTo({ top: y, behavior: "smooth" });
}

function ensureAbsUrl(url) {
    if (!url) return "";
    try {
        return new URL(url, window.location.origin).toString();
    } catch {
        return "";
    }
}

function clampText(s, max = 160) {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function safeIso(dt) {
    if (!dt) return null;
    const d = new Date(dt);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

// --- RELATED utils ---
function normalizeTokens(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((x) => x.trim())
        .filter(Boolean);
}

function unique(arr) {
    return Array.from(new Set(arr));
}

function extractKeywords(post) {
    const kw = post?.seo?.keywords || "";
    const fromKw = kw.split(",").map((x) => x.trim()).filter(Boolean);
    const fromTitle = normalizeTokens(post?.title).slice(0, 8);
    return unique([...fromKw, ...fromTitle]).slice(0, 18);
}

function scorePost(candidate, tokens) {
    if (!candidate) return 0;
    const hay = [candidate.title, candidate.description, candidate?.seo?.keywords].join(" ");
    const hayTokens = new Set(normalizeTokens(hay));

    let score = 0;
    tokens.forEach((t) => {
        const tt = normalizeTokens(t)[0];
        if (tt && hayTokens.has(tt)) score += 2;
    });

    const titleSet = new Set(normalizeTokens(candidate.title));
    tokens.forEach((t) => {
        const tt = normalizeTokens(t)[0];
        if (tt && titleSet.has(tt)) score += 1;
    });

    return score;
}

// --- ROUTE utils (id-slug) ---
function parseIdSlugParam(raw) {
    const s = String(raw || "").trim();
    if (!s) return { id: null, slug: "" };

    // /blog/2-some-slug
    const m = s.match(/^(\d+)-(.+)$/);
    if (m) return { id: Number(m[1]), slug: m[2] };

    // /blog/some-slug
    return { id: null, slug: s };
}

function blogPostPath(p) {
    if (!p) return "/blog";
    const id = p.id ?? p.postId ?? null;
    const slug = String(p.slug || "").trim();

    // основной формат
    if (id && slug) return `/blog/${id}-${slug}`;

    // деградация
    if (slug) return `/blog/${slug}`;
    if (id) return `/blog/${id}`;
    return "/blog";
}

function buildSchemas({
                          post,
                          canonicalUrl,
                          metaTitle,
                          metaDescription,
                          ogImage,
                          datePublished,
                          dateModified,
                          author,
                          readingMinutes,
                          faqItems,
                          howTo,
                      }) {
    const schemas = [];

    const SITE_NAME = readEnvCra("REACT_APP_SITE_NAME", "");
    const ORG_LOGO = readEnvCra("REACT_APP_ORG_LOGO", "");
    const publisher =
        SITE_NAME
            ? {
                "@type": "Organization",
                name: SITE_NAME,
                logo: ORG_LOGO ? { "@type": "ImageObject", url: ensureAbsUrl(ORG_LOGO) || ORG_LOGO } : undefined,
            }
            : undefined;

    schemas.push({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        headline: metaTitle,
        description: metaDescription,
        image: ogImage ? [ogImage] : undefined,
        datePublished: safeIso(datePublished) || undefined,
        dateModified: safeIso(dateModified) || undefined,
        dateCreated: safeIso(post?.createdWhen || post?.createdAt || datePublished) || undefined,
        author: author
            ? {
                "@type": "Person",
                name: author.name,
                url: author.url || undefined,
                image: author.image || undefined,
                description: author.description || undefined,
            }
            : undefined,
        publisher: post?.seo?.publisherName
            ? {
                "@type": "Organization",
                name: post.seo.publisherName,
                logo: post.seo.publisherLogoUrl ? { "@type": "ImageObject", url: ensureAbsUrl(post.seo.publisherLogoUrl) } : undefined,
            }
            : publisher,
        wordCount: stripToText(post?.content).split(/\s+/).filter(Boolean).length || undefined,
        timeRequired: readingMinutes ? `PT${readingMinutes}M` : undefined,
        keywords: post?.seo?.keywords || undefined,
        inLanguage: "ru-RU",
    });

    if (Array.isArray(faqItems) && faqItems.length) {
        const mainEntity = faqItems
            .filter((x) => x?.question && x?.answer)
            .map((x) => ({
                "@type": "Question",
                name: String(x.question).trim(),
                acceptedAnswer: { "@type": "Answer", text: stripToText(x.answer) },
            }));

        if (mainEntity.length) {
            schemas.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity });
        }
    }

    if (howTo?.name && Array.isArray(howTo?.steps) && howTo.steps.length) {
        schemas.push({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: String(howTo.name).trim(),
            description: howTo.description ? String(howTo.description).trim() : undefined,
            step: howTo.steps
                .filter((s) => s?.name || s?.text)
                .map((s, idx) => ({
                    "@type": "HowToStep",
                    position: idx + 1,
                    name: s.name ? String(s.name).trim() : undefined,
                    text: s.text ? String(s.text).trim() : undefined,
                    url: canonicalUrl ? `${canonicalUrl}#step-${idx + 1}` : undefined,
                })),
        });
    }

    return schemas;
}

export default function BlogPost() {
    const { slug: slugParam } = useParams();
    const location = useLocation();

    const route = useMemo(() => parseIdSlugParam(slugParam), [slugParam]);

    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState(null);
    const [notFound, setNotFound] = useState(false);

    const [activeId, setActiveId] = useState(null);
    const [progress, setProgress] = useState(0);

    const [relatedLoading, setRelatedLoading] = useState(false);
    const [relatedPosts, setRelatedPosts] = useState([]);

    const contentRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setNotFound(false);
        setPost(null);

        (async () => {
            try {
                // если есть getById — используем его для /blog/{id}-{slug}
                if (route?.id && typeof blogApi?.getById === "function") {
                    const res = await blogApi.getById(route.id);
                    if (!mounted) return;
                    setPost(res);
                    setNotFound(!res);
                    return;
                }

                // иначе всегда грузим по "чистому" slug (без id-)
                const res = await blogApi.getBySlug(route?.slug || "");
                if (!mounted) return;
                setPost(res);
                setNotFound(!res);
            } catch {
                if (mounted) setNotFound(true);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [route?.id, route?.slug]);

    // canonical лучше вести на нормализованный id-slug (если есть post)
    const canonicalUrl = useMemo(() => {
        try {
            const path = post?.id && post?.slug ? blogPostPath(post) : (location.pathname || "");
            return new URL(path, window.location.origin).toString();
        } catch {
            return "";
        }
    }, [location.pathname, post?.id, post?.slug]);

    const crumbsUi = useMemo(
        () => [{ label: "Главная", to: "/" }, { label: "Блог", to: "/blog" }, { label: post?.title || "Статья" }],
        [post?.title]
    );

    const crumbsSchema = useMemo(() => {
        const postTo = post?.id && post?.slug ? blogPostPath(post) : (location.pathname || `/blog/${slugParam || ""}`);
        return [
            { label: "Главная", to: "/" },
            { label: "Блог", to: "/blog" },
            { label: post?.title || "Статья", to: postTo },
        ];
    }, [post?.title, post?.id, post?.slug, location.pathname, slugParam]);

    const { htmlWithIds, toc, textForReading } = useMemo(() => {
        if (!post?.content) return { htmlWithIds: "", toc: [], textForReading: "" };
        const built = buildTocAndHtml(post.content, { titleFallback: post?.title || "Изображение" });
        const text = stripHtml(built.html);
        return { htmlWithIds: built.html, toc: built.toc, textForReading: text };
    }, [post?.content, post?.title]);

    const readingMinutes = useMemo(
        () => (post?.readingTimeMinutes ? post.readingTimeMinutes : calcReadingMinutes(textForReading)),
        [post?.readingTimeMinutes, textForReading]
    );

    const metaTitle = useMemo(() => post?.seo?.title || post?.seo?.metaTitle || post?.title || "", [post]);
    const metaDescription = useMemo(() => {
        const fromSeo = post?.seo?.description || post?.seo?.metaDescription;
        const fromLead = post?.description;
        const fromBody = clampText(textForReading, 170);
        return clampText(fromSeo || fromLead || fromBody, 170);
    }, [post, textForReading]);

    const ogImage = useMemo(() => ensureAbsUrl(post?.seo?.ogImageUrl || post?.previewImageUrl || ""), [post]);

    const datePublished = post?.createdWhen || post?.createdAt || null;
    const dateModified = post?.lastModifiedWhen || post?.modifiedAt || datePublished || null;

    const author = useMemo(() => {
        if (!post?.author?.name) return null;
        return {
            name: post.author.name,
            url: "",
            image: post?.author?.avatar ? ensureAbsUrl(post.author.avatar) : "",
            description: post?.authorBio || "",
        };
    }, [post]);

    const faqItems = post?.seo?.faq || post?.faq || [];
    const howTo = post?.seo?.howTo || post?.howTo || null;

    const schemas = useMemo(() => {
        if (!post || !canonicalUrl) return [];
        return buildSchemas({
            post,
            canonicalUrl,
            metaTitle,
            metaDescription,
            ogImage,
            datePublished,
            dateModified,
            author,
            readingMinutes,
            faqItems,
            howTo,
        });
    }, [post, canonicalUrl, metaTitle, metaDescription, ogImage, datePublished, dateModified, author, readingMinutes, faqItems, howTo]);

    const metaLine = useMemo(() => {
        const bits = [];
        if (datePublished) bits.push(`Опубликовано: ${formatDate(datePublished)}`);
        if (dateModified && dateModified !== datePublished) bits.push(`Обновлено: ${formatDate(dateModified)}`);
        if (post?.author?.name) bits.push(post.author.name);
        if (readingMinutes) bits.push(`${readingMinutes} мин чтения`);
        return bits.join(" • ");
    }, [post?.author?.name, readingMinutes, datePublished, dateModified]);

    // --- RELATED FETCH ---
    useEffect(() => {
        let mounted = true;

        // если поста ещё нет — сбросим related и загрузку
        if (!post?.id) {
            setRelatedPosts([]);
            setRelatedLoading(false);
            return () => {
                mounted = false;
            };
        }

        const normalizeToArray = (res) => {
            if (Array.isArray(res)) return res;

            // Spring Page
            if (Array.isArray(res?.content)) return res.content;

            // старый формат
            if (Array.isArray(res?.items)) return res.items;

            // axios обертка
            if (Array.isArray(res?.data?.content)) return res.data.content;
            if (Array.isArray(res?.data?.items)) return res.data.items;

            return [];
        };

        (async () => {
            setRelatedLoading(true);
            try {
                const page = await blogApi.listPublished({ page: 0, size: 18 });
                const arr = normalizeToArray(page);

                const tokens = extractKeywords(post);

                const related = arr
                    .filter((p) => p && p.id !== post.id && p.slug !== post.slug && p.status === "PUBLISHED")
                    .map((p) => ({ p, s: scorePost(p, tokens) }))
                    .sort((a, b) => {
                        if (b.s !== a.s) return b.s - a.s;
                        const da = Date.parse(a.p?.createdWhen ?? a.p?.createdAt ?? 0) || 0;
                        const db = Date.parse(b.p?.createdWhen ?? b.p?.createdAt ?? 0) || 0;
                        return db - da;
                    })
                    .map((x) => x.p)
                    .slice(0, 5);

                if (mounted) setRelatedPosts(related);
            } catch {
                if (mounted) setRelatedPosts([]);
            } finally {
                if (mounted) setRelatedLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [post?.id, post?.slug]);

    // TOC highlight
    useEffect(() => {
        if (!toc?.length) return;

        const els = toc.map((t) => document.getElementById(t.id)).filter(Boolean);
        if (!els.length) return;

        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
            },
            { root: null, rootMargin: "-84px 0px -70% 0px", threshold: [0.01, 0.1, 0.2] }
        );

        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [toc, htmlWithIds]);

    // Reading progress
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        const onScroll = () => {
            const rect = el.getBoundingClientRect();
            const viewportH = window.innerHeight || 1;
            const total = rect.height - viewportH * 0.25;
            if (total <= 0) {
                setProgress(1);
                return;
            }
            const passed = Math.min(Math.max(-rect.top + 92, 0), total);
            setProgress(Math.min(1, passed / total));
        };

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, [htmlWithIds]);

    // Share
    const shareUrl = canonicalUrl || (typeof window !== "undefined" ? window.location.href : "");
    const shareTitle = metaTitle || post?.title || "";

    function openShare(url) {
        window.open(url, "_blank", "noopener,noreferrer");
    }

    async function onShareNativeOrCopy() {
        try {
            if (navigator.share) {
                await navigator.share({ title: shareTitle, text: metaDescription, url: shareUrl });
                return;
            }
        } catch {}
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {}
    }

    if (loading) {
        return (
            <div className="b-blog-post">
                <Helmet>
                    <title>Загрузка…</title>
                    <meta name="robots" content="noindex, nofollow" />
                </Helmet>

                <Breadcrumbs items={crumbsUi} />
                <BreadcrumbsSchema items={crumbsSchema} />

                <div className="b-blog-post__skeleton" />
            </div>
        );
    }

    if (notFound || !post) {
        return (
            <div className="b-blog-post">
                <Helmet>
                    <title>Пост не найден</title>
                    <meta name="robots" content="noindex, nofollow" />
                    {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
                </Helmet>

                <Breadcrumbs items={crumbsUi} />
                <BreadcrumbsSchema items={crumbsSchema} />

                <div className="b-blog-post__head">
                    <Link to="/blog" className="b-blog-post__back">
                        ← В блог
                    </Link>
                </div>
                <div className="b-blog-post__notfound">Пост не найден.</div>
            </div>
        );
    }

    const noindex = !!post?.seo?.noindex;

    return (
        <div className="b-blog-post">
            <Helmet prioritizeSeoTags>
                <title>{metaTitle}</title>
                {metaDescription ? <meta name="description" content={metaDescription} /> : null}
                {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
                <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
                {author?.name ? <meta name="author" content={author.name} /> : null}

                {/* Open Graph */}
                <meta property="og:type" content="article" />
                <meta property="og:title" content={metaTitle} />
                {metaDescription ? <meta property="og:description" content={metaDescription} /> : null}
                {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
                <meta property="og:locale" content="ru_RU" />
                {ogImage ? <meta property="og:image" content={ogImage} /> : null}
                {ogImage ? <meta property="og:image:alt" content={metaTitle || "Обложка"} /> : null}
                {datePublished ? <meta property="article:published_time" content={safeIso(datePublished) || ""} /> : null}
                {dateModified ? <meta property="article:modified_time" content={safeIso(dateModified) || ""} /> : null}
                {author?.name ? <meta property="article:author" content={author.name} /> : null}

                {/* Twitter */}
                <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
                <meta name="twitter:title" content={metaTitle} />
                {metaDescription ? <meta name="twitter:description" content={metaDescription} /> : null}
                {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}

                {/* JSON-LD */}
                {schemas.map((obj, i) => (
                    <script key={i} type="application/ld+json">
                        {JSON.stringify(obj)}
                    </script>
                ))}
            </Helmet>

            <Breadcrumbs items={crumbsUi} />
            <BreadcrumbsSchema items={crumbsSchema} />

            <div className="b-reading-progress" aria-hidden="true">
                <div className="b-reading-progress__bar" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>

            <div className="b-blog-post__head">
                <Link to="/blog" className="b-blog-post__back">
                    ← В блог
                </Link>

                <h1 className="b-blog-post__title">{post.title}</h1>
                {metaLine ? <div className="b-blog-post__meta">{metaLine}</div> : null}

                {post.description ? <div className="b-blog-post__lead">{post.description}</div> : null}

                {post.previewImageUrl ? (
                    <div className="b-blog-post__cover">
                        <img
                            src={post.previewImageUrl}
                            alt={post?.seo?.imageAlt || post.title || "Обложка"}
                            decoding="async"
                            fetchpriority="high"
                            loading="eager"
                        />
                    </div>
                ) : null}

                <div className="b-share">
                    <div className="b-share__title">Поделиться</div>
                    <div className="b-share__buttons">
                        <button type="button" className="b-share__btn b-share__btn--primary" onClick={onShareNativeOrCopy}>
                            Поделиться
                        </button>

                        <button
                            type="button"
                            className="b-share__btn"
                            onClick={() => openShare(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`)}
                        >
                            Telegram
                        </button>

                        <button type="button" className="b-share__btn" onClick={() => openShare(`https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}`)}>
                            VK
                        </button>

                        <button type="button" className="b-share__btn" onClick={() => openShare(`https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`)}>
                            WhatsApp
                        </button>

                        <button
                            type="button"
                            className="b-share__btn"
                            onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)}
                        >
                            Facebook
                        </button>

                        <button
                            type="button"
                            className="b-share__btn"
                            onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`)}
                        >
                            LinkedIn
                        </button>
                    </div>
                </div>
            </div>

            <div className="b-blog-post__layout">
                <main className="b-blog-post__main">
                    <div ref={contentRef} className="b-prose" dangerouslySetInnerHTML={{ __html: htmlWithIds || "" }} />

                    {howTo?.name && Array.isArray(howTo?.steps) && howTo.steps.length ? (
                        <section className="b-howto" aria-label="HowTo">
                            <h2 className="b-howto__title">{howTo.name}</h2>
                            {howTo.description ? <div className="b-howto__lead">{howTo.description}</div> : null}

                            <ol className="b-howto__steps">
                                {howTo.steps.map((s, idx) => (
                                    <li key={idx} id={`step-${idx + 1}`} className="b-howto__step">
                                        {s.name ? <h3 className="b-howto__stepTitle">{s.name}</h3> : null}
                                        {s.text ? <div className="b-howto__stepText">{s.text}</div> : null}
                                    </li>
                                ))}
                            </ol>
                        </section>
                    ) : null}

                    {Array.isArray(faqItems) && faqItems.length ? (
                        <section className="b-faq" aria-label="FAQ">
                            <h2 className="b-faq__title">Вопросы и ответы</h2>
                            <div className="b-faq__list">
                                {faqItems
                                    .filter((x) => x?.question && x?.answer)
                                    .map((x, idx) => (
                                        <div key={idx} className="b-faq__item">
                                            <h3 className="b-faq__q">{x.question}</h3>
                                            <div className="b-faq__a" dangerouslySetInnerHTML={{ __html: x.answer || "" }} />
                                        </div>
                                    ))}
                            </div>
                        </section>
                    ) : null}

                    <div className="b-blog-post__footer">
                        <Link to="/blog" className="b-btn b-btn--transparent">
                            Назад к списку
                        </Link>
                    </div>
                </main>

                <aside className="b-blog-post__aside">
                    {toc?.length ? (
                        <div className="b-toc">
                            <div className="b-toc__title">Оглавление</div>
                            <div className="b-toc__list">
                                {toc.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        className={[
                                            "b-toc__item",
                                            t.level === 3 ? "b-toc__item--h3" : "",
                                            activeId === t.id ? "is-active" : "",
                                        ].join(" ")}
                                        onClick={() => scrollToId(t.id)}
                                        title={t.text}
                                    >
                                        {t.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="b-related" aria-label="Похожие статьи">
                        <div className="b-related__title">Похожие статьи</div>

                        {relatedLoading ? (
                            <div className="b-related__list">
                                <div className="b-related__skeleton" />
                                <div className="b-related__skeleton" />
                                <div className="b-related__skeleton" />
                            </div>
                        ) : relatedPosts?.length ? (
                            <div className="b-related__list">
                                {relatedPosts.map((p) => (
                                    <Link
                                        key={p.id || p.slug}
                                        to={blogPostPath(p)} // ✅ id-slug
                                        className="b-related__item"
                                    >
                                        <div className="b-related__item-title">{p.title}</div>
                                        <div className="b-related__item-meta">
                                            {p.createdWhen ? formatDate(p.createdWhen) : ""}
                                            {p?.author?.name ? ` • ${p.author.name}` : ""}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="b-related__empty">Пока нет похожих материалов.</div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
