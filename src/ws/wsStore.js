import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import { useAuth } from "../auth/authStore";

const Ctx = createContext(null);

const WS_DEBUG =
    String(process.env.REACT_APP_CHAT_DEBUG || "") === "1" ||
    process.env.NODE_ENV === "development";

function dbg(...args) {
    if (WS_DEBUG) console.log(...args);
}

function makeId() {
    return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

function baseHttpUrl() {
    const fromEnv =
        process.env.REACT_APP_WS_BASE_URL ||
        process.env.REACT_APP_API_BASE_URL ||
        process.env.REACT_APP_BACKEND_URL ||
        "http://localhost:8080";
    return String(fromEnv).replace(/\/$/, "");
}

function endpointPath() {
    return process.env.REACT_APP_WS_ENDPOINT || "/ws-notifications";
}

function sockJsUrl() {
    const ep = endpointPath();
    return `${baseHttpUrl()}${ep.startsWith("/") ? ep : `/${ep}`}`;
}

/**
 * robust JSON parse:
 * - parses JSON
 * - if result is JSON-string -> parses again
 * - if result is {body:"{...}"} -> parses body
 */
function safeParse(body) {
    if (body == null) return null;
    if (typeof body === "object") return body;

    const s = String(body).trim();
    if (!s) return null;

    try {
        let v = JSON.parse(s);

        // { body: "..." } wrapper
        if (v && typeof v === "object" && typeof v.body === "string") {
            const b = v.body.trim();
            if (
                (b.startsWith("{") && b.endsWith("}")) ||
                (b.startsWith("[") && b.endsWith("]"))
            ) {
                try {
                    v = JSON.parse(b);
                } catch {}
            }
        }

        // double encoded
        if (typeof v === "string") {
            const s2 = v.trim();
            if (
                (s2.startsWith("{") && s2.endsWith("}")) ||
                (s2.startsWith("[") && s2.endsWith("]"))
            ) {
                try {
                    return JSON.parse(s2);
                } catch {
                    return v;
                }
            }
        }

        return v;
    } catch {
        return body;
    }
}

export function WsProvider({ children }) {
    const { token, isAuthenticated } = useAuth();

    const clientRef = useRef(null);
    const tokenRef = useRef(token);
    const [connected, setConnected] = useState(false);

    // id -> { destination, handler, options, sub }
    const subsRef = useRef(new Map());

    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    const markSubsDisconnected = useCallback(() => {
        for (const [id, rec] of subsRef.current.entries()) {
            subsRef.current.set(id, { ...rec, sub: null });
        }
    }, []);

    const cleanupSubs = useCallback(() => {
        for (const [id, rec] of subsRef.current.entries()) {
            try {
                rec?.sub?.unsubscribe?.();
            } catch {}
            subsRef.current.set(id, { ...rec, sub: null });
        }
    }, []);

    const resubscribeAll = useCallback((client) => {
        for (const [id, rec] of subsRef.current.entries()) {
            if (!rec || rec.sub) continue;

            try {
                const sub = client.subscribe(
                    rec.destination,
                    (msg) => {
                        const parsed = safeParse(msg?.body);

                        dbg("[ws] <<<", rec.destination, {
                            stompDest: msg?.headers?.destination,
                            sub: msg?.headers?.subscription,
                            len: msg?.headers?.["content-length"],
                            raw: msg?.body,
                            parsed,
                        });

                        rec.handler?.(parsed, msg);
                    },
                    rec.options || {}
                );

                subsRef.current.set(id, { ...rec, sub });
            } catch (e) {
                dbg("[ws] subscribe error", rec.destination, e);
            }
        }
    }, []);

    const activate = useCallback(() => {
        if (!tokenRef.current) return;
        if (clientRef.current?.active) return;

        const url = sockJsUrl();

        const client = new Client({
            webSocketFactory: () => new SockJS(url),

            connectHeaders: tokenRef.current
                ? { Authorization: `Bearer ${tokenRef.current}` }
                : {},

            reconnectDelay: 4000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,

            debug: (str) => {
                if (WS_DEBUG) console.log("[stomp]", str);
            },

            onConnect: () => {
                dbg("[ws] connected", url);
                setConnected(true);
                resubscribeAll(client);
            },

            onDisconnect: () => {
                dbg("[ws] disconnected");
                setConnected(false);
            },

            onWebSocketClose: (evt) => {
                dbg("[ws] socket closed", evt?.code, evt?.reason);
                setConnected(false);
                markSubsDisconnected();
            },

            onWebSocketError: (evt) => {
                dbg("[ws] socket error", evt);
                setConnected(false);
                markSubsDisconnected();
            },

            onStompError: (frame) => {
                console.error("[stomp] broker error", frame?.headers?.message, frame?.body);
            },
        });

        clientRef.current = client;
        client.activate();
    }, [markSubsDisconnected, resubscribeAll]);

    const deactivate = useCallback(async () => {
        const c = clientRef.current;
        clientRef.current = null;
        setConnected(false);

        cleanupSubs();

        if (c) {
            try {
                await c.deactivate();
            } catch {}
        }
    }, [cleanupSubs]);

    useEffect(() => {
        if (isAuthenticated && token) activate();
        else deactivate();
    }, [isAuthenticated, token, activate, deactivate]);

    const subscribe = useCallback((destination, handler, options) => {
        const id = makeId();

        const rec = {
            destination,
            handler,
            options: options || {},
            sub: null,
        };

        subsRef.current.set(id, rec);

        const client = clientRef.current;

        if (client?.active) {
            try {
                const sub = client.subscribe(
                    destination,
                    (msg) => {
                        const parsed = safeParse(msg?.body);

                        dbg("[ws] <<<", destination, {
                            stompDest: msg?.headers?.destination,
                            sub: msg?.headers?.subscription,
                            len: msg?.headers?.["content-length"],
                            raw: msg?.body,
                            parsed,
                        });

                        handler?.(parsed, msg);
                    },
                    options || {}
                );

                subsRef.current.set(id, { ...rec, sub });
            } catch (e) {
                dbg("[ws] subscribe error", destination, e);
            }
        } else {
            dbg("[ws] queued sub until connect:", destination);
        }

        return () => {
            const cur = subsRef.current.get(id);
            try {
                cur?.sub?.unsubscribe?.();
            } catch {}
            subsRef.current.delete(id);
        };
    }, []);

    const publish = useCallback((destination, body, headers) => {
        const client = clientRef.current;
        if (!client || !client.active) return false;

        try {
            const b = body == null ? "" : typeof body === "string" ? body : JSON.stringify(body);
            dbg("[ws] >>>", destination, b);

            client.publish({
                destination,
                headers: headers || {},
                body: b,
            });

            return true;
        } catch (e) {
            dbg("[ws] publish error", destination, e);
            return false;
        }
    }, []);

    const value = useMemo(
        () => ({
            connected,
            subscribe,
            publish,
        }),
        [connected, subscribe, publish]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWs() {
    const v = useContext(Ctx);
    if (!v) throw new Error("useWs must be used inside WsProvider");
    return v;
}
