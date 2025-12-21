import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { useAuth } from "../auth/authStore";

// ===== UI настройки =====
const CODE_LEN = 5;
const DEFAULT_RESEND_COOLDOWN_SEC = 60; // UX-таймер (сервер всё равно главный)
const DEFAULT_MAX_ATTEMPTS = 5;

function pad2(n) {
    return String(n).padStart(2, "0");
}

function formatMMSS(totalSec) {
    const sec = Math.max(0, Number(totalSec) || 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${pad2(m)}:${pad2(s)}`;
}

// ===== eye icon (active/inactive) =====
function EyeIcon({ open }) {
    return open ? (
        // eye open
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ) : (
        // eye off
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M8.2 3.2C9.1 2.8 10 2.6 11 2.6C13.9 2.6 16.4 4.4 18.2 8C17.6 9.2 16.9 10.2 16.1 11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M6.2 4.7C4.5 5.9 3.2 7.7 2.4 9.4C2.3 9.6 2.3 9.8 2.4 10C4 13.3 7.1 15.2 11 15.2C12.3 15.2 13.5 15 14.6 14.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M9.1 6.7C8.6 7.2 8.3 7.9 8.3 8.6C8.3 10.2 9.6 11.5 11.2 11.5C11.9 11.5 12.6 11.2 13.1 10.7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M1.2 1.2L20.8 14.8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function Login() {
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();

    // чтобы можно было авто-логиниться после verify, даже если state поменяется
    const registrationPasswordRef = useRef("");

    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [isCodeMode, setIsCodeMode] = useState(false);
    const [isPasswordChangeMode, setIsPasswordChangeMode] = useState(false);
    const [isRegistrationCodeMode, setIsRegistrationCodeMode] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        fullName: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [code, setCode] = useState(Array.from({ length: CODE_LEN }, () => ""));
    const [isPolicyChecked, setIsPolicyChecked] = useState(false);
    const [checkboxError, setCheckboxError] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [focus, setFocus] = useState({
        password: false,
        newPassword: false,
        confirmPassword: false,
    });

    const [isLoading, setIsLoading] = useState(false);

    // ===== notice вместо голой строки =====
    const [notice, setNotice] = useState(null); // { type: "error"|"warn"|"info", text: string }
    const clearNotice = () => setNotice(null);
    const showNotice = (type, text) => setNotice({ type, text: text || "Ошибка" });
    const showError = (text) => showNotice("error", text);
    const showWarn = (text) => showNotice("warn", text);
    const showInfo = (text) => showNotice("info", text);

    // ===== server-driven counters (persist) =====
    const [resendUntilTs, setResendUntilTs] = useState(0); // ms
    const [lockedUntilTs, setLockedUntilTs] = useState(0); // ms
    const [attemptsLeft, setAttemptsLeft] = useState(DEFAULT_MAX_ATTEMPTS);

    // derived seconds
    const [resendLeft, setResendLeft] = useState(0);
    const [lockLeft, setLockLeft] = useState(0);

    const codeInputRefs = useRef([]);
    const inCodeStep = isCodeMode || isRegistrationCodeMode;

    const emailNormalized = useMemo(() => (formData.email || "").trim().toLowerCase(), [formData.email]);

    const flowKey = useMemo(() => {
        const mode = isRegistrationCodeMode ? "reg" : "rec";
        return `bs:code_flow:${mode}:${emailNormalized || "noemail"}`;
    }, [isRegistrationCodeMode, emailNormalized]);

    const fullCode = useMemo(() => code.join(""), [code]);

    const isCodeComplete = useMemo(() => code.every((d) => typeof d === "string" && d.length === 1), [code]);

    // ✅ ВАЖНО: НЕ useMemo() с Date.now()
    const isLocked = lockedUntilTs ? Date.now() < lockedUntilTs : false;
    const canResend = !isLocked && (!resendUntilTs || Date.now() >= resendUntilTs);

    // ===== restore persisted flow state when entering code step =====
    useEffect(() => {
        if (!inCodeStep) return;

        try {
            const raw = localStorage.getItem(flowKey);
            if (!raw) return;

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return;

            if (typeof parsed.resendUntilTs === "number") setResendUntilTs(parsed.resendUntilTs);
            if (typeof parsed.lockedUntilTs === "number") setLockedUntilTs(parsed.lockedUntilTs);
            if (typeof parsed.attemptsLeft === "number") setAttemptsLeft(parsed.attemptsLeft);
        } catch {
            // ignore
        }
    }, [inCodeStep, flowKey]);

    // ===== persist while in code step =====
    useEffect(() => {
        if (!inCodeStep) return;
        try {
            localStorage.setItem(
                flowKey,
                JSON.stringify({
                    resendUntilTs,
                    lockedUntilTs,
                    attemptsLeft,
                })
            );
        } catch {
            // ignore
        }
    }, [inCodeStep, flowKey, resendUntilTs, lockedUntilTs, attemptsLeft]);

    // ===== ticking timers (сразу пересчитать, не ждать 1 сек) =====
    useEffect(() => {
        if (!inCodeStep) return;

        const recalc = () => {
            const now = Date.now();

            const r = resendUntilTs ? Math.ceil((resendUntilTs - now) / 1000) : 0;
            setResendLeft(r > 0 ? r : 0);

            const l = lockedUntilTs ? Math.ceil((lockedUntilTs - now) / 1000) : 0;
            setLockLeft(l > 0 ? l : 0);

            // auto reset lock if expired
            if (lockedUntilTs && now >= lockedUntilTs && attemptsLeft === 0) {
                setAttemptsLeft(DEFAULT_MAX_ATTEMPTS);
                setLockedUntilTs(0);
            }
        };

        recalc();
        const t = setInterval(recalc, 1000);
        return () => clearInterval(t);
    }, [inCodeStep, resendUntilTs, lockedUntilTs, attemptsLeft]);

    // ===== helpers =====
    const focusFirstEmptyDigit = () => {
        const idx = code.findIndex((d) => !d);
        const i = idx === -1 ? CODE_LEN - 1 : idx;
        codeInputRefs.current[i]?.focus();
    };

    const resetCodeStepState = () => {
        setCode(Array.from({ length: CODE_LEN }, () => ""));
        setResendUntilTs(0);
        setLockedUntilTs(0);
        setResendLeft(0);
        setLockLeft(0);
        setAttemptsLeft(DEFAULT_MAX_ATTEMPTS);
        try {
            localStorage.removeItem(flowKey);
        } catch {
            // ignore
        }
    };

    // применяем серверные ограничения (423/429/attemptsLeft)
    const applyServerLimits = (err) => {
        const now = Date.now();
        const retry = Number(err?.retryAfterSeconds);
        const attempts = err?.attemptsLeft;

        if (err?.status === 401) {
            resetCodeStepState();
            return true;
        }

        if (Number.isFinite(attempts)) {
            setAttemptsLeft(Math.max(0, Number(attempts)));
        }

        if (err?.status === 429 && Number.isFinite(retry) && retry > 0) {
            setResendUntilTs(now + retry * 1000);
            return true;
        }

        if (err?.status === 423 && Number.isFinite(retry) && retry > 0) {
            setLockedUntilTs(now + retry * 1000);
            setAttemptsLeft(0);
            return true;
        }

        if ((err?.code === "CODE_LOCKED" || err?.code === "RESEND_TOO_SOON") && Number.isFinite(retry) && retry > 0) {
            if (err?.code === "RESEND_TOO_SOON") setResendUntilTs(now + retry * 1000);
            if (err?.code === "CODE_LOCKED") {
                setLockedUntilTs(now + retry * 1000);
                setAttemptsLeft(0);
            }
            return true;
        }

        return false;
    };

    const consumeAttemptFallback = () => {
        setAttemptsLeft((v) => Math.max(0, v - 1));
    };

    const startResendCooldownUX = () => {
        setResendUntilTs(Date.now() + DEFAULT_RESEND_COOLDOWN_SEC * 1000);
    };

    // ===== form events =====
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData((prev) => ({
            email: prev.email,
            password: "",
            fullName: "",
            newPassword: "",
            confirmPassword: "",
        }));
        setIsPolicyChecked(false);
        setCheckboxError(false);
        clearNotice();
    };

    const handleCodeChange = (index, value) => {
        if (isLoading || isLocked) return;

        const v = (value || "").trim();

        // paste of full code into any cell
        if (v.length > 1) {
            const digits = v.replace(/\D/g, "").slice(0, CODE_LEN).split("");
            if (digits.length) {
                const next = Array.from({ length: CODE_LEN }, (_, i) => digits[i] || "");
                setCode(next);
                const lastIdx = Math.min(digits.length - 1, CODE_LEN - 1);
                codeInputRefs.current[lastIdx]?.focus();
            }
            return;
        }

        const digit = v.replace(/\D/g, "").slice(0, 1);
        const next = [...code];
        next[index] = digit;
        setCode(next);

        if (digit && index < CODE_LEN - 1) {
            codeInputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (isLoading || isLocked) return;

        if (e.key === "Backspace" && !code[index] && index > 0) {
            codeInputRefs.current[index - 1]?.focus();
        }

        if (e.key === "Enter") {
            e.currentTarget.form?.requestSubmit?.();
        }
    };

    const toggleRecoveryMode = () => {
        clearNotice();
        setIsRecoveryMode((v) => !v);
        setIsCodeMode(false);
        setIsPasswordChangeMode(false);
        setIsRegistrationCodeMode(false);
        resetCodeStepState();
    };

    const goBack = () => {
        clearNotice();

        if (isPasswordChangeMode) {
            setIsPasswordChangeMode(false);
            setIsCodeMode(true);
            return;
        }

        if (isCodeMode) {
            setIsCodeMode(false);
            setIsRecoveryMode(true);
            resetCodeStepState();
            return;
        }

        if (isRegistrationCodeMode) {
            setIsRegistrationCodeMode(false);
            setIsLoginMode(false);
            resetCodeStepState();
            return;
        }
    };

    // ===== resend code =====
    const resendCode = async () => {
        if (isLoading) return;
        clearNotice();

        if (!emailNormalized) {
            showError("Введите e-mail");
            return;
        }

        if (isLocked) {
            showWarn(`Слишком много попыток. Попробуйте через ${formatMMSS(lockLeft || 0)}.`);
            return;
        }

        if (!canResend) {
            showInfo(`Можно отправить повторно через ${formatMMSS(resendLeft || 0)}.`);
            return;
        }

        setIsLoading(true);
        try {
            if (isRegistrationCodeMode) {
                await authApi.registerResend(emailNormalized);
            } else {
                await authApi.recoveryRequest(emailNormalized);
            }
            startResendCooldownUX();
            showInfo("Код отправлен повторно.");
        } catch (err) {
            applyServerLimits(err);
            showError(err?.message || "Не удалось отправить код");
        } finally {
            setIsLoading(false);
        }
    };

    // ======== MAIN SUBMIT ========
    const handleSubmit = async (e) => {
        e.preventDefault();
        clearNotice();

        if (inCodeStep && isLocked) {
            showWarn(`Слишком много попыток. Попробуйте через ${formatMMSS(lockLeft || 0)}.`);
            return;
        }

        // 1) PASSWORD CHANGE
        if (isPasswordChangeMode) {
            if (!emailNormalized) {
                showError("Введите e-mail");
                return;
            }

            if (formData.newPassword !== formData.confirmPassword) {
                showError("Пароли не совпадают");
                return;
            }

            if (!isCodeComplete) {
                showError("Введите код полностью");
                focusFirstEmptyDigit();
                return;
            }

            setIsLoading(true);
            try {
                await authApi.recoveryConfirm(emailNormalized, fullCode, formData.newPassword);

                showInfo("Пароль изменён. Теперь войдите.");
                setIsPasswordChangeMode(false);
                setIsLoginMode(true);
                setIsRecoveryMode(false);
                setIsCodeMode(false);

                resetCodeStepState();
                resetForm();
            } catch (err) {
                const applied = applyServerLimits(err);
                if (!applied && !Number.isFinite(err?.attemptsLeft)) consumeAttemptFallback();
                showError(err?.status === 401 ? "Сессия истекла. Повторите попытку." : err?.message || "Ошибка смены пароля");
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // 2) CODE STEP: verify
        if (inCodeStep) {
            if (!emailNormalized) {
                showError("Введите e-mail");
                return;
            }

            if (!isCodeComplete) {
                showError("Пожалуйста, введите полный код");
                focusFirstEmptyDigit();
                return;
            }

            setIsLoading(true);
            try {
                if (isRegistrationCodeMode) {
                    await authApi.registerVerify(emailNormalized, fullCode);

                    // ✅ авто-логин после подтверждения почты
                    const pwd = registrationPasswordRef.current || formData.password;
                    if (pwd) {
                        await authLogin(emailNormalized, pwd);
                        resetCodeStepState();
                        navigate("/", { replace: true });
                        return;
                    }

                    showInfo("Почта подтверждена! Войдите в аккаунт.");
                    setIsRegistrationCodeMode(false);
                    setIsLoginMode(true);
                    resetCodeStepState();
                    resetForm();
                } else {
                    await authApi.recoveryVerify(emailNormalized, fullCode);
                    setIsPasswordChangeMode(true);
                    setIsCodeMode(false);
                    showInfo("Код принят. Придумайте новый пароль.");
                }
            } catch (err) {
                const applied = applyServerLimits(err);
                if (!applied && !Number.isFinite(err?.attemptsLeft)) consumeAttemptFallback();
                showError(err?.status === 401 ? "Сессия истекла. Запросите код заново." : err?.message || "Неверный код");
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // 3) RECOVERY REQUEST
        if (isRecoveryMode) {
            if (!emailNormalized) {
                showError("Введите e-mail");
                return;
            }

            setIsLoading(true);
            try {
                await authApi.recoveryRequest(emailNormalized);

                setIsCodeMode(true);
                setIsRecoveryMode(false);

                resetCodeStepState();
                startResendCooldownUX();
                showInfo("Код отправлен на почту.");
                setTimeout(() => codeInputRefs.current[0]?.focus(), 50);
            } catch (err) {
                applyServerLimits(err);
                showError(err?.message || "Ошибка запроса");
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // 4) LOGIN / REGISTER
        if (!isLoginMode && !isPolicyChecked) {
            setCheckboxError(true);
            showWarn("Подтвердите согласие на обработку персональных данных.");
            return;
        }
        setCheckboxError(false);

        setIsLoading(true);
        try {
            if (isLoginMode) {
                await authLogin(emailNormalized, formData.password);
                navigate("/", { replace: true });
            } else {
                // ✅ запоминаем пароль для авто-логина после verify
                registrationPasswordRef.current = formData.password;

                await authApi.register(formData.fullName, emailNormalized, formData.password);

                setIsRegistrationCodeMode(true);
                resetCodeStepState();
                startResendCooldownUX();
                showInfo("Мы отправили код подтверждения на почту.");
                setTimeout(() => codeInputRefs.current[0]?.focus(), 50);
            }
        } catch (err) {
            showError(err?.message || "Ошибка запроса");
        } finally {
            setIsLoading(false);
        }
    };

    // ===== UI texts =====
    const title = isPasswordChangeMode
        ? "Смена пароля"
        : isCodeMode
            ? "Сброс пароля"
            : isRegistrationCodeMode
                ? "Регистрация"
                : isRecoveryMode
                    ? "Забыли пароль?"
                    : isLoginMode
                        ? "Вход"
                        : "Регистрация";

    const subtitle =
        isCodeMode || isRegistrationCodeMode
            ? "Письмо уже в пути. Введите код — и продолжим."
            : isRecoveryMode && !isCodeMode
                ? "Введите e-mail, и мы отправим код для восстановления доступа"
                : "";

    const noticeStyle = noticeBoxStyle(notice?.type);

    return (
        <div className="login">
            <div className="login__wrapper">
                <h2 className="login__title">{title}</h2>

                {subtitle ? <p className="login__subtitle">{subtitle}</p> : null}

                {notice ? (
                    <div className={`login__notice login__notice--${notice.type}`} style={noticeStyle}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 999, marginTop: 5, ...noticeDotStyle(notice.type) }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, marginBottom: 2 }}>{noticeTitle(notice.type)}</div>
                                <div style={{ opacity: 0.9 }}>{notice.text}</div>
                            </div>
                            <button
                                type="button"
                                onClick={clearNotice}
                                aria-label="Закрыть"
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontSize: 18,
                                    lineHeight: "18px",
                                    opacity: 0.6,
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ) : null}

                <form onSubmit={handleSubmit}>
                    {(isCodeMode || isRegistrationCodeMode) ? (
                        <div className="login__code-inputs-wrapper">
                            <div className="login__code-inputs">
                                {code.map((digit, index) => (
                                    <input
                                        key={index}
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete={index === 0 ? "one-time-code" : "off"}
                                        maxLength={index === 0 ? CODE_LEN : 1}
                                        className="login__code-input"
                                        value={digit}
                                        onChange={(e) => handleCodeChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        ref={(el) => (codeInputRefs.current[index] = el)}
                                        autoFocus={index === 0}
                                        disabled={isLoading || isLocked}
                                        style={{
                                            transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(0,0,0,0.06)";
                                            e.currentTarget.style.borderColor = "rgba(0,0,0,0.35)";
                                            e.currentTarget.style.transform = "translateY(-1px)";
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.boxShadow = "none";
                                            e.currentTarget.style.borderColor = "";
                                            e.currentTarget.style.transform = "none";
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Meta */}
                            <div className="login__code-meta" style={{ marginTop: 12 }}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                                    {isLocked ? (
                                        <span className="login__badge login__badge--danger" style={badgeStyle("danger")}>
                      Блокировка: {formatMMSS(lockLeft || 0)}
                    </span>
                                    ) : (
                                        <span className="login__badge login__badge--info" style={badgeStyle("info")}>
                      Попыток: {attemptsLeft}{attemptsLeft > 0 ? ` / ${DEFAULT_MAX_ATTEMPTS}` : ""}
                    </span>
                                    )}

                                    {!canResend ? (
                                        <span className="login__badge login__badge--muted" style={badgeStyle("muted")}>
                      Повтор через: {formatMMSS(resendLeft || 0)}
                    </span>
                                    ) : (
                                        <span className="login__badge login__badge--muted" style={badgeStyle("muted")}>
                      Код: {CODE_LEN} цифр
                    </span>
                                    )}
                                </div>

                                <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
                                    <button
                                        type="button"
                                        className="login__footer-link"
                                        onClick={resendCode}
                                        disabled={isLoading || isLocked || !canResend}
                                        style={{
                                            padding: 0,
                                            background: "none",
                                            border: "none",
                                            cursor: canResend && !isLocked && !isLoading ? "pointer" : "default",
                                            opacity: canResend && !isLocked && !isLoading ? 1 : 0.55,
                                            transition: "opacity 120ms ease, transform 120ms ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (e.currentTarget.disabled) return;
                                            e.currentTarget.style.transform = "translateY(-1px)";
                                            e.currentTarget.style.opacity = "0.85";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "none";
                                            e.currentTarget.style.opacity = canResend && !isLocked && !isLoading ? "1" : "0.55";
                                        }}
                                    >
                                        Выслать код повторно
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : isPasswordChangeMode ? (
                        <>
                            <div className="login__form-group">
                                <label className="login__label">Новый пароль</label>
                                <div style={fieldWrapStyle(focus.newPassword)}>
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        name="newPassword"
                                        className="login__input"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                        onFocus={() => setFocus((p) => ({ ...p, newPassword: true }))}
                                        onBlur={() => setFocus((p) => ({ ...p, newPassword: false }))}
                                        style={{ border: "none", outline: "none", width: "100%", background: "transparent" }}
                                    />
                                    <button
                                        type="button"
                                        aria-label={showNewPassword ? "Скрыть пароль" : "Показать пароль"}
                                        onClick={() => setShowNewPassword((v) => !v)}
                                        disabled={isLoading}
                                        style={eyeButtonStyle(showNewPassword, focus.newPassword)}
                                    >
                                        <EyeIcon open={showNewPassword} />
                                    </button>
                                </div>
                            </div>

                            <div className="login__form-group">
                                <label className="login__label">Повторить пароль</label>
                                <div style={fieldWrapStyle(focus.confirmPassword)}>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        className="login__input"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                        onFocus={() => setFocus((p) => ({ ...p, confirmPassword: true }))}
                                        onBlur={() => setFocus((p) => ({ ...p, confirmPassword: false }))}
                                        style={{ border: "none", outline: "none", width: "100%", background: "transparent" }}
                                    />
                                    <button
                                        type="button"
                                        aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                                        onClick={() => setShowConfirmPassword((v) => !v)}
                                        disabled={isLoading}
                                        style={eyeButtonStyle(showConfirmPassword, focus.confirmPassword)}
                                    >
                                        <EyeIcon open={showConfirmPassword} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="login__form-group">
                                <label className="login__label">Почта</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="login__input"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            {!isRecoveryMode && !isLoginMode && (
                                <div className="login__form-group">
                                    <label className="login__label">Имя Фамилия</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        className="login__input"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            )}

                            {!isRecoveryMode && (
                                <div className="login__form-group">
                                    <label className="login__label">Пароль</label>
                                    <div style={fieldWrapStyle(focus.password)}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            className="login__input"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required={isLoginMode}
                                            disabled={isLoading}
                                            onFocus={() => setFocus((p) => ({ ...p, password: true }))}
                                            onBlur={() => setFocus((p) => ({ ...p, password: false }))}
                                            style={{ border: "none", outline: "none", width: "100%", background: "transparent" }}
                                        />
                                        <button
                                            type="button"
                                            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                                            onClick={() => setShowPassword((v) => !v)}
                                            disabled={isLoading}
                                            style={eyeButtonStyle(showPassword, focus.password)}
                                        >
                                            <EyeIcon open={showPassword} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isLoginMode && !isRecoveryMode && (
                                <div className="login__policy">
                                    <label className="login__policy-label label">
                                        <input
                                            type="checkbox"
                                            className={`label__checkbox ${checkboxError ? "error" : ""}`}
                                            checked={isPolicyChecked}
                                            onChange={() => {
                                                setIsPolicyChecked((v) => !v);
                                                setCheckboxError(false);
                                            }}
                                            disabled={isLoading}
                                        />
                                        <span className="label__checkbox-custom"></span>
                                        <span className="label__text">
                      Я ознакомлен(а) с Политикой обработки персональных данных и даю согласие на их обработку.
                    </span>
                                    </label>

                                    <label className="login__policy-label label">
                                        <input type="checkbox" className="label__checkbox" disabled={isLoading} />
                                        <span className="label__checkbox-custom"></span>
                                        <span className="label__text">Хочу получать информацию о персональных предложениях и акциях.</span>
                                    </label>
                                </div>
                            )}
                        </>
                    )}

                    <div className="login__group">
                        {(isCodeMode || isRegistrationCodeMode || isPasswordChangeMode) && (
                            <button
                                type="button"
                                className="login__group-btn login__button b-btn b-btn--transparent"
                                onClick={goBack}
                                disabled={isLoading}
                            >
                                Назад
                            </button>
                        )}

                        <button
                            type="submit"
                            className="login__group-btn login__button b-btn"
                            disabled={isLoading || (inCodeStep && isLocked)}
                        >
                            {isLoading
                                ? "Подождите..."
                                : isPasswordChangeMode
                                    ? "Сменить"
                                    : isCodeMode || isRegistrationCodeMode
                                        ? "Продолжить"
                                        : isRecoveryMode
                                            ? "Выслать код"
                                            : isLoginMode
                                                ? "Войти"
                                                : "Зарегистрироваться"}
                        </button>
                    </div>
                </form>

                <div className="login__footer">
                    {!isRecoveryMode && !isCodeMode && !isPasswordChangeMode && !isRegistrationCodeMode && isLoginMode && (
                        <button type="button" className="login__footer-link" onClick={toggleRecoveryMode} disabled={isLoading}>
                            Забыли пароль?
                        </button>
                    )}

                    {(isRecoveryMode || isCodeMode || isPasswordChangeMode) && !isRegistrationCodeMode ? (
                        <p>
                            Вспомнили пароль?{" "}
                            <button
                                type="button"
                                className="login__footer-link"
                                onClick={() => {
                                    setIsRecoveryMode(false);
                                    setIsCodeMode(false);
                                    setIsPasswordChangeMode(false);
                                    setIsLoginMode(true);
                                    clearNotice();
                                    resetCodeStepState();
                                }}
                                disabled={isLoading}
                            >
                                Войти
                            </button>
                        </p>
                    ) : null}

                    {isLoginMode && !isRegistrationCodeMode ? (
                        <p>
                            Нет аккаунта?{" "}
                            <button
                                type="button"
                                className="login__footer-link"
                                onClick={() => {
                                    setIsLoginMode(false);
                                    clearNotice();
                                }}
                                disabled={isLoading}
                            >
                                Зарегистрируйтесь
                            </button>
                        </p>
                    ) : !isLoginMode && !isRegistrationCodeMode ? (
                        <p>
                            Есть аккаунт?{" "}
                            <button
                                type="button"
                                className="login__footer-link"
                                onClick={() => {
                                    setIsLoginMode(true);
                                    clearNotice();
                                }}
                                disabled={isLoading}
                            >
                                Войти
                            </button>
                        </p>
                    ) : null}

                    <p className="login__footer-title">БюроДуши</p>
                </div>
            </div>
        </div>
    );
}

/* ===== styles helpers (inline, чтобы ничего не ломать в scss) ===== */

function badgeStyle(variant) {
    const base = {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: "12px",
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(0,0,0,0.04)",
    };

    if (variant === "danger") return { ...base, background: "rgba(255, 0, 0, 0.08)" };
    if (variant === "info") return { ...base, background: "rgba(0, 0, 0, 0.04)" };
    if (variant === "muted") return { ...base, opacity: 0.75 };
    return base;
}

function noticeBoxStyle(type) {
    const base = {
        marginBottom: 12,
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(0,0,0,0.04)",
    };

    if (type === "error") return { ...base, background: "rgba(255, 0, 0, 0.06)" };
    if (type === "warn") return { ...base, background: "rgba(255, 165, 0, 0.10)" };
    if (type === "info") return { ...base, background: "rgba(0, 0, 0, 0.04)" };
    return base;
}

function noticeDotStyle(type) {
    if (type === "error") return { background: "rgba(255, 0, 0, 0.6)" };
    if (type === "warn") return { background: "rgba(255, 165, 0, 0.9)" };
    return { background: "rgba(0, 0, 0, 0.35)" };
}

function noticeTitle(type) {
    if (type === "error") return "Ошибка";
    if (type === "warn") return "Важно";
    return "Информация";
}

function fieldWrapStyle(isFocused) {
    return {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        border: isFocused ? "1px solid rgba(0,0,0,0.35)" : "1px solid rgba(0,0,0,0.12)",
        boxShadow: isFocused ? "0 0 0 4px rgba(0,0,0,0.06)" : "none",
        transition: "border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
        transform: isFocused ? "translateY(-1px)" : "none",
        background: "rgba(255,255,255,0.6)",
    };
}

function eyeButtonStyle(isOpen, isFocused) {
    return {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 4,
        borderRadius: 10,
        color: isOpen ? "rgba(0,0,0,0.9)" : "rgba(0,0,0,0.55)",
        transition: "transform 120ms ease, opacity 120ms ease, color 120ms ease, background 120ms ease",
        opacity: isFocused ? 0.95 : 0.8,
    };
}
