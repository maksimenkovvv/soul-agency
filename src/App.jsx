import React, { useMemo } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Main from "./pages/Main";
import About from "./pages/About";
import Psychologist from "./pages/Psychologists";
import Sessions from "./pages/Sessions";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Forbidden from "./pages/Forbidden";
import Chat from "./pages/Chat";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

import ProtectedRoute from "./auth/ProtectedRoute";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";

import NotFound from "./pages/NotFound";

import "./scss/app.scss";

function readEnvCra(key, fallback = "") {
    // В CRA process.env подменяется сборщиком на этапе билдa.
    // В рантайме в браузере "process" может отсутствовать — поэтому страховка.
    const env =
        typeof process !== "undefined" && process?.env ? process.env : {};
    return String(env[key] || fallback || "");
}

function ensureAbsUrl(url) {
    if (!url) return "";
    try {
        return new URL(url, window.location.origin).toString();
    } catch {
        return "";
    }
}

function AppSeo() {
    const location = useLocation();

    const SITE_NAME = readEnvCra("REACT_APP_SITE_NAME", "Soul Agency");
    const SITE_URL = readEnvCra("REACT_APP_SITE_URL", "");
    const DEFAULT_DESCRIPTION = readEnvCra(
        "REACT_APP_SITE_DESCRIPTION",
        "Платформа для подбора психолога, записей на сессии и общения."
    );
    const DEFAULT_OG_IMAGE = readEnvCra("REACT_APP_OG_IMAGE", "");

    const TWITTER_SITE = readEnvCra("REACT_APP_TWITTER_SITE", ""); // @username
    const ORG_LOGO = readEnvCra("REACT_APP_ORG_LOGO", ""); // абсолютный url
    const SAME_AS_RAW = readEnvCra("REACT_APP_SAME_AS", ""); // "https://t.me/..,https://vk.com/.."

    const siteOrigin = useMemo(() => {
        if (SITE_URL) return ensureAbsUrl(SITE_URL) || SITE_URL;
        if (typeof window === "undefined") return "";
        return window.location.origin;
    }, [SITE_URL]);

    const canonicalUrl = useMemo(() => {
        if (!siteOrigin) return "";
        const pathname = location?.pathname || "/";
        return new URL(pathname, siteOrigin).toString();
    }, [siteOrigin, location?.pathname]);

    const ogImage = useMemo(() => {
        const v = DEFAULT_OG_IMAGE ? ensureAbsUrl(DEFAULT_OG_IMAGE) : "";
        return v || "";
    }, [DEFAULT_OG_IMAGE]);

    const sameAs = useMemo(() => {
        if (!SAME_AS_RAW) return [];
        return SAME_AS_RAW
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }, [SAME_AS_RAW]);

    const orgSchema = useMemo(() => {
        if (!siteOrigin) return null;
        const obj = {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: siteOrigin,
        };
        if (ORG_LOGO) obj.logo = ensureAbsUrl(ORG_LOGO) || ORG_LOGO;
        if (sameAs.length) obj.sameAs = sameAs;
        return obj;
    }, [SITE_NAME, siteOrigin, ORG_LOGO, sameAs]);

    const websiteSchema = useMemo(() => {
        if (!siteOrigin) return null;
        const searchTarget = new URL(
            "/blog?query={search_term_string}",
            siteOrigin
        ).toString();

        return {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: siteOrigin,
            potentialAction: {
                "@type": "SearchAction",
                target: searchTarget,
                "query-input": "required name=search_term_string",
            },
        };
    }, [SITE_NAME, siteOrigin]);

    const webPageSchema = useMemo(() => {
        if (!canonicalUrl) return null;
        return {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: SITE_NAME,
            url: canonicalUrl,
            inLanguage: "ru-RU",
        };
    }, [SITE_NAME, canonicalUrl]);

    return (
        <Helmet prioritizeSeoTags>
            {/* База */}
            <html lang="ru" />
            <title>{SITE_NAME}</title>
            <meta name="description" content={DEFAULT_DESCRIPTION} />
            {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
            <meta name="robots" content="index, follow" />

            {/* Open Graph */}
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:type" content="website" />
            <meta property="og:locale" content="ru_RU" />
            <meta property="og:title" content={SITE_NAME} />
            <meta property="og:description" content={DEFAULT_DESCRIPTION} />
            {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
            {ogImage ? <meta property="og:image" content={ogImage} /> : null}
            {ogImage ? <meta property="og:image:alt" content={SITE_NAME} /> : null}

            {/* Twitter */}
            <meta
                name="twitter:card"
                content={ogImage ? "summary_large_image" : "summary"}
            />
            {TWITTER_SITE ? <meta name="twitter:site" content={TWITTER_SITE} /> : null}
            <meta name="twitter:title" content={SITE_NAME} />
            <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
            {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}

            {/* JSON-LD: базовые схемы */}
            {orgSchema ? (
                <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
            ) : null}
            {websiteSchema ? (
                <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
            ) : null}
            {webPageSchema ? (
                <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
            ) : null}
        </Helmet>
    );
}

function App() {
    const location = useLocation();

    // Скрываем Header только на странице авторизации
    const hideHeader = location.pathname === "/login";

    // Скрываем Footer на страницах авторизации и dashboard
    const hideFooter =
        location.pathname === "/login" ||
        location.pathname === "/dashboard" ||
        location.pathname === "/dashboard/settings";

    return (
        <div className="App">
            <AppSeo />

            <div className="wrapper">
                {!hideHeader && <Header />}

                <Routes>
                    <Route path="/" element={<Main />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/psychologist" element={<Psychologist />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/403" element={<Forbidden />} />

                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />

                    <Route element={<ProtectedRoute roles={["CLIENT", "PSYCHOLOGIST", "ADMIN"]} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/dashboard/settings" element={<Settings />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/notifications" element={<Notifications />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                </Routes>

                {!hideFooter && <Footer />}
            </div>
        </div>
    );
}

export default App;
