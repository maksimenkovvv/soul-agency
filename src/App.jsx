import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

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
import Settings from './pages/Settings';

import ProtectedRoute from "./auth/ProtectedRoute";

import "./scss/app.scss";

function App() {
    const location = useLocation();

    // Скрываем Header только на странице авторизации
    const hideHeader = location.pathname === "/login";

    // Скрываем Footer на страницах авторизации и dashboard
    const hideFooter = location.pathname === "/login" || location.pathname === "/dashboard" || location.pathname === "/dashboard/settings";

    return (
        <div className="App">
            <div className="wrapper">
                {!hideHeader && <Header />}

                <Routes>
                    <Route path="/" element={<Main />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/psychologist" element={<Psychologist />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/403" element={<Forbidden />} />
                    <Route path="/dashboard/settings" element={<Settings />} /> {/*ссылка на настройки ЛК*/}

                    {/*/!* PSYCHO: PSYCHOLOGIST или ADMIN *!/*/}
                    {/*⬇️TODO: доделать БД и endpoints. Пока что временно отключены⬇️*/}
                    {/*<Route element={<ProtectedRoute roles={["CLIENT", "PSYCHOLOGIST", "ADMIN"]} />}>*/}
                    <Route path="/dashboard" element={<Dashboard />} />
                    {/*</Route>*/}
                    {/*⬆️TODO: доделать БД и endpoints. Пока что временно отключены⬆️*/}


                    {/*/!* CHAT: CLIENT/PSYCHOLOGIST/ADMIN *!/*/}
                    {/*⬇️TODO: доделать БД и endpoints. Пока что временно отключены⬇️*/}
                    {/*<Route element={<ProtectedRoute roles={["CLIENT", "PSYCHOLOGIST", "ADMIN"]} />}>*/}
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/notifications" element={<Notifications />} />
                    {/*</Route>*/}
                    {/*⬆️TODO: доделать БД и endpoints. Пока что временно отключены⬆️*/}
                </Routes>

                {!hideFooter && <Footer />}
            </div>
        </div>
    );
}

export default App;
