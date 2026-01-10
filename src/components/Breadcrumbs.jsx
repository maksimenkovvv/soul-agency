import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

function pretty(seg) {
    try {
        return decodeURIComponent(seg)
            .replace(/-/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    } catch {
        return seg;
    }
}

export default function Breadcrumbs({ items }) {
    const location = useLocation();

    const autoItems = useMemo(() => {
        // Авто-генерация по URL (если items не передали)
        const parts = (location.pathname || "/").split("/").filter(Boolean);
        const built = [{ label: "Главная", to: "/" }];

        let acc = "";
        parts.forEach((p) => {
            acc += `/${p}`;
            built.push({ label: pretty(p), to: acc });
        });

        return built;
    }, [location.pathname]);

    const crumbs = (items && items.length ? items : autoItems).filter(Boolean);

    if (!crumbs || crumbs.length <= 1) return null;

    return (
        <nav className="b-breadcrumbs" aria-label="Хлебные крошки">
            <ol className="b-breadcrumbs__list">
                {crumbs.map((c, idx) => {
                    const isLast = idx === crumbs.length - 1;
                    return (
                        <li key={`${c.to || c.label}-${idx}`} className="b-breadcrumbs__item">
                            {isLast || !c.to ? (
                                <span className="b-breadcrumbs__current" aria-current="page">
                  {c.label}
                </span>
                            ) : (
                                <Link to={c.to} className="b-breadcrumbs__link">
                                    {c.label}
                                </Link>
                            )}
                            {!isLast ? <span className="b-breadcrumbs__sep">/</span> : null}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
