import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App";
import { AuthProvider } from "./auth/authStore";
import { NotificationsProvider } from "./notifications/notificationsStore";
import { WsProvider } from "./ws/wsStore";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
    <BrowserRouter>
        <AuthProvider>
            <WsProvider>
                <NotificationsProvider>
                    <App />
                </NotificationsProvider>
            </WsProvider>
        </AuthProvider>
    </BrowserRouter>
);
