import React, { useMemo } from "react";
import { Helmet } from "react-helmet-async";

function absUrl(pathOrUrl) {
    if (!pathOrUrl) return "";
    try {
        return new URL(pathOrUrl, window.location.origin).toString();
    } catch {
        return "";
    }
}

export default function BreadcrumbsSchema({ items }) {
    const schema = useMemo(() => {
        if (!items?.length) return null;

        const list = items
            .filter((x) => x?.label)
            .map((x, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: String(x.label),
                item: x.to ? absUrl(x.to) : undefined,
            }));

        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: list,
        };
    }, [items]);

    if (!schema) return null;

    return (
        <Helmet>
            <script type="application/ld+json">{JSON.stringify(schema)}</script>
        </Helmet>
    );
}
