import React from "react";
import { Link } from "react-router-dom";

export default function Forbidden() {
    return (
        <div style={{ padding: 24 }}>
            <h2>403 — Нет доступа</h2>
            <p>У вас нет прав для просмотра этой страницы.</p>
            <Link to="/">На главную</Link>
        </div>
    );
}
