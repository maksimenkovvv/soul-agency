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

// Unified STOMP client for calendar / chat / notifications.
// Your backend exposes 3 handshake endpoints:
//   /ws-booking, /ws-chat, /ws-notifications
// They all attach to the SAME broker, so the frontend can keep ONE connection
// (pick any one endpoint) and subscribe to all destinations (/topic/*, /user/*).

const Ctx = createContext(null);

function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

function baseHttpUrl() {
  const fromEnv =
    process.env.REACT_APP_WS_BASE_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    "http://localhost:8080";
  return String(fromEnv).replace(/\/$/, "");
}

function endpointPath() {
  // choose one handshake endpoint (works for all topics)
  return process.env.REACT_APP_WS_ENDPOINT || "/ws-notifications";
}

function sockJsUrl() {
  const ep = endpointPath();
  return `${baseHttpUrl()}${ep.startsWith("/") ? ep : `/${ep}`}`;
}

function safeParse(body) {
  if (body == null) return null;
  if (typeof body === "object") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export function WsProvider({ children }) {
  const { token, isAuthenticated } = useAuth();

  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Keep pending subs (so components can call subscribe() before connection is up)
  const subsRef = useRef(new Map());

  const activate = useCallback(() => {
    if (!token) return;
    if (clientRef.current?.active) return;

    const client = new Client({
      // We prefer SockJS (works behind proxies, avoids ws/wss issues)
      webSocketFactory: () => new SockJS(sockJsUrl()),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (str) => {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.log("[stomp]", str);
        }
      },
      onConnect: () => {
        setConnected(true);
        // resubscribe everything
        for (const [id, rec] of subsRef.current.entries()) {
          if (rec?.sub) continue;
          try {
            rec.sub = client.subscribe(rec.destination, (msg) => {
              const data = safeParse(msg.body);
              rec.handler?.(data, msg);
            }, rec.options || {});
          } catch {
            // ignore
          }
          subsRef.current.set(id, rec);
        }
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onWebSocketClose: () => {
        setConnected(false);
        // mark all active subs as inactive (will resubscribe on reconnect)
        for (const [id, rec] of subsRef.current.entries()) {
          subsRef.current.set(id, { ...rec, sub: null });
        }
      },
      onStompError: (frame) => {
        // eslint-disable-next-line no-console
        console.error("[stomp] broker error", frame?.headers?.message, frame?.body);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [token]);

  const deactivate = useCallback(async () => {
    const c = clientRef.current;
    clientRef.current = null;
    setConnected(false);

    // Cleanup subs
    for (const [id, rec] of subsRef.current.entries()) {
      try {
        rec?.sub?.unsubscribe?.();
      } catch {}
      subsRef.current.set(id, { ...rec, sub: null });
    }

    if (c) {
      try {
        await c.deactivate();
      } catch {}
    }
  }, []);

  // Auto connect/disconnect
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
    if (connected && client) {
      try {
        rec.sub = client.subscribe(destination, (msg) => {
          const data = safeParse(msg.body);
          handler?.(data, msg);
        }, options || {});
        subsRef.current.set(id, rec);
      } catch {
        // ignore
      }
    }

    // unsubscribe
    return () => {
      const cur = subsRef.current.get(id);
      try {
        cur?.sub?.unsubscribe?.();
      } catch {}
      subsRef.current.delete(id);
    };
  }, [connected]);

  const publish = useCallback((destination, body, headers) => {
    const client = clientRef.current;
    if (!client || !client.active) return false;
    try {
      client.publish({
        destination,
        headers: headers || {},
        body: body == null ? "" : (typeof body === "string" ? body : JSON.stringify(body)),
      });
      return true;
    } catch {
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
