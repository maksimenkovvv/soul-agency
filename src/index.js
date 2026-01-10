import React from "react";
import ReactDOM from "react-dom/client";
import {BrowserRouter} from "react-router-dom";

import "./index.css";
import App from "./App";
import {AuthProvider} from "./auth/authStore";
import {NotificationsProvider} from "./notifications/notificationsStore";
import {WsProvider} from "./ws/wsStore";
import {ToastProvider} from "./ui/toast/ToastProvider";
import {FavoritesProvider} from "./favorites/favoritesStore";
import {HelmetProvider} from "react-helmet-async";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
    <BrowserRouter>
        <AuthProvider>
            <WsProvider>
                <ToastProvider>
                    <NotificationsProvider>
                        <FavoritesProvider>
                            <HelmetProvider>
                                <App/>
                            </HelmetProvider>
                        </FavoritesProvider>
                    </NotificationsProvider>
                </ToastProvider>
            </WsProvider>
        </AuthProvider>
    </BrowserRouter>
);
