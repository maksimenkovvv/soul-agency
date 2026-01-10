import React from "react";

export default function Footer() {
    return (
        <footer className="app-footer" role="contentinfo">
            <div className="app-footer__glow" />

            <div className="container app-footer__inner">
                <div className="app-footer__left">
                    <span className="app-footer__copy">© 2026 — сделано с любовью</span>
                    <span className="app-footer__heart" aria-hidden="true">💙</span>
                </div>

                <a
                    className="app-footer__brand"
                    href="https://ai-vai.com"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="AI-VAI — перейти на сайт"
                >
                    <span className="app-footer__brandMark" aria-hidden="true">✦</span>
                    <span className="app-footer__brandText">AI-VAI</span>
                    <span className="app-footer__shine" aria-hidden="true" />
                </a>
            </div>
        </footer>
    );
}
