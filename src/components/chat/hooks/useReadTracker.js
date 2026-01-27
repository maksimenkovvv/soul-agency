import { useEffect, useMemo, useRef } from "react";

function rafThrottle(fn) {
    let raf = 0;
    let lastArgs = null;
    return (...args) => {
        lastArgs = args;
        if (raf) return;
        raf = requestAnimationFrame(() => {
            raf = 0;
            fn(...(lastArgs || []));
        });
    };
}

function getMaxVisibleMessageId(containerEl, selector = "[data-msgid]") {
    if (!containerEl) return null;

    const rect = containerEl.getBoundingClientRect();
    const nodes = containerEl.querySelectorAll(selector);

    let maxId = null;

    for (const node of nodes) {
        const r = node.getBoundingClientRect();
        // элемент считается "видимым" если пересекается с viewport контейнера по вертикали
        const visible =
            r.bottom >= rect.top + 8 &&
            r.top <= rect.bottom - 8;

        if (!visible) continue;

        const idStr = node.getAttribute("data-msgid");
        const id = idStr ? Number(idStr) : null;
        if (!id || Number.isNaN(id)) continue;

        if (maxId == null || id > maxId) maxId = id;
    }

    return maxId;
}

/**
 * @param {Object} params
 * @param {React.RefObject<HTMLElement>} params.scrollRef  - контейнер со скроллом
 * @param {React.RefObject<HTMLElement>} params.bottomRef  - якорь внизу списка (div)
 * @param {number|null} params.myLastReadId - текущий lastReadMessageId пользователя
 * @param {(messageId:number)=>void} params.onMarkReadUpTo - вызвать API (желательно debounce на уровне сервиса)
 * @param {boolean} params.enabled
 */
export function useReadTracker({
                                   scrollRef,
                                   bottomRef,
                                   myLastReadId,
                                   onMarkReadUpTo,
                                   enabled = true,
                               }) {
    const lastSentRef = useRef(myLastReadId || 0);

    useEffect(() => {
        lastSentRef.current = myLastReadId || 0;
    }, [myLastReadId]);

    const tryMark = useMemo(() => {
        return (maxVisibleId) => {
            if (!enabled) return;
            if (!maxVisibleId) return;
            if (maxVisibleId <= (lastSentRef.current || 0)) return;

            lastSentRef.current = maxVisibleId;
            onMarkReadUpTo(maxVisibleId);
        };
    }, [enabled, onMarkReadUpTo]);

    useEffect(() => {
        if (!enabled) return;
        const root = scrollRef?.current;
        const target = bottomRef?.current;
        if (!root || !target) return;

        let io = null;

        try {
            io = new IntersectionObserver(
                (entries) => {
                    const e = entries[0];
                    if (!e?.isIntersecting) return;

                    const maxVisible = getMaxVisibleMessageId(root);
                    tryMark(maxVisible);
                },
                {
                    root,
                    threshold: 0.1,
                    // чуть заранее, чтобы на "докрутил почти до низа" уже считалось прочитанным
                    rootMargin: "120px 0px 120px 0px",
                }
            );

            io.observe(target);
        } catch (e) {
            // если IO сломался, fallback ниже все равно спасет
        }

        return () => {
            if (io) io.disconnect();
        };
    }, [enabled, scrollRef, bottomRef, tryMark]);

    useEffect(() => {
        if (!enabled) return;
        const root = scrollRef?.current;
        if (!root) return;

        let t = null;

        const onScroll = rafThrottle(() => {
            // небольшая задержка: после инерции/скролла дождаться "оседания"
            if (t) clearTimeout(t);
            t = setTimeout(() => {
                const maxVisible = getMaxVisibleMessageId(root);
                tryMark(maxVisible);
            }, 160);
        });

        root.addEventListener("scroll", onScroll, { passive: true });

        // “разбудить” после маунта/смены списка
        const kick = () => {
            const maxVisible = getMaxVisibleMessageId(root);
            tryMark(maxVisible);
        };
        const kickT = setTimeout(kick, 0);

        return () => {
            root.removeEventListener("scroll", onScroll);
            if (t) clearTimeout(t);
            clearTimeout(kickT);
        };
    }, [enabled, scrollRef, tryMark]);
}
