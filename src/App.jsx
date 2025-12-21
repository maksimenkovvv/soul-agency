import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Main from "./pages/Main";
import About from "./pages/About";
import Psychologist from "./pages/Psychologists";
import Sessions from "./pages/Sessions";
import User from "./pages/User";
import Psycho from "./pages/Psycho";
import Login from "./pages/Login";
import Forbidden from "./pages/Forbidden";
import Chat from "./pages/Chat";
import Notifications from "./pages/Notifications";

import ProtectedRoute from "./auth/ProtectedRoute";

import "./scss/app.scss";

function App() {
    const location = useLocation();

    const hideLayout = location.pathname === "/login";

    return (
        <div className="App">
            <div className="wrapper">
                {!hideLayout && <Header />}

                <Routes>
                    <Route path="/" element={<Main />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/psychologist" element={<Psychologist />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/403" element={<Forbidden />} />

                    {/* USER: CLIENT или ADMIN */}
                    <Route element={<ProtectedRoute roles={["CLIENT", "ADMIN"]} />}>
                        <Route path="/user" element={<User />} />
                    </Route>

                    {/* PSYCHO: PSYCHOLOGIST или ADMIN */}
                    <Route element={<ProtectedRoute roles={["PSYCHOLOGIST", "ADMIN"]} />}>
                        <Route path="/psycho" element={<Psycho />} />
                    </Route>

                    {/* CHAT: CLIENT/PSYCHOLOGIST/ADMIN */}
                    <Route element={<ProtectedRoute roles={["CLIENT", "PSYCHOLOGIST", "ADMIN"]} />}>
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/notifications" element={<Notifications />} />
                    </Route>
                </Routes>

                {!hideLayout && <Footer />}
            </div>
        </div>
    );
}

export default App;
