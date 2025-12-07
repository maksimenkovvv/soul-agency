import React, { useState, useRef } from 'react';

function Login() {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [isCodeMode, setIsCodeMode] = useState(false);
    const [isPasswordChangeMode, setIsPasswordChangeMode] = useState(false);
    const [isRegistrationCodeMode, setIsRegistrationCodeMode] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [code, setCode] = useState(['', '', '', '', '']);
    const [isPolicyChecked, setIsPolicyChecked] = useState(false);
    const [checkboxError, setCheckboxError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const codeInputRefs = useRef([]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            email: formData.email,
            password: '',
            fullName: '',
            newPassword: '',
            confirmPassword: '',
        });
        setCode(['', '', '', '', '']);
        setIsPolicyChecked(false);
        setCheckboxError(false);
    };

    const handleCodeChange = (index, value) => {
        if (value.length > 1) {
            value = value.slice(0, 1);
        }
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        if (value && index < code.length - 1) {
            codeInputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            codeInputRefs.current[index - 1].focus();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (isPasswordChangeMode) {
            if (formData.newPassword !== formData.confirmPassword) {
                alert('Пароли не совпадают');
                return;
            }
            alert('Пароль успешно изменен');
            setIsPasswordChangeMode(false);
            setIsLoginMode(true);
            resetForm();
            return;
        }

        if (isCodeMode || isRegistrationCodeMode) {
            const fullCode = code.join('');
            if (fullCode.length === 5) {
                if (isRegistrationCodeMode) {
                    alert('Регистрация успешно завершена');
                    setIsRegistrationCodeMode(false);
                    setIsLoginMode(true);
                } else {
                    setIsPasswordChangeMode(true);
                    setIsCodeMode(false);
                }
            } else {
                alert('Пожалуйста, введите полный код');
            }
            return;
        }

        if (!isRecoveryMode) {
            if (!isLoginMode && !isPolicyChecked) {
                setCheckboxError(true);
                return;
            }
            setCheckboxError(false);
            if (isLoginMode) {
                console.log('Вход:', formData.email, formData.password);
            } else {
                console.log('Регистрационные данные:', formData.fullName, formData.email, formData.password);
                setIsRegistrationCodeMode(true);
            }
        } else {
            console.log('Запрос на восстановление пароля для:', formData.email);
            setIsCodeMode(true);
            setIsRecoveryMode(false);
        }
    };

    const toggleRecoveryMode = () => {
        setIsRecoveryMode(!isRecoveryMode);
        setIsCodeMode(false);
        setIsPasswordChangeMode(false);
        setIsRegistrationCodeMode(false);
        setCheckboxError(false);
    };

    const goBack = () => {
        if (isPasswordChangeMode) {
            setIsPasswordChangeMode(false);
            setIsCodeMode(true);
        } else if (isCodeMode) {
            setIsCodeMode(false);
            setIsRecoveryMode(true);
        } else if (isRegistrationCodeMode) {
            setIsRegistrationCodeMode(false);
            setIsLoginMode(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleNewPasswordVisibility = () => {
        setShowNewPassword(!showNewPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    return (
        <div className="login">
            <div className="login__wrapper">
                <h2 className="login__title">
                    {isPasswordChangeMode ? 'Смена пароля' :
                        isCodeMode ? 'Сброс пароля' :
                            isRegistrationCodeMode ? 'Регистрация' :
                                isRecoveryMode ? 'Забыли пароль?' :
                                    isLoginMode ? 'Вход' : 'Регистрация'}
                </h2>
                {isCodeMode && !isPasswordChangeMode ? (
                    <p className="login__subtitle">
                        Письмо уже в пути. Как только введёте код, можно будет вернуться к самому важному — поиску поддержки
                    </p>
                ) : isRegistrationCodeMode ? (
                    <p className="login__subtitle">
                        Письмо уже в пути. Как только введёте код, можно будет вернуться к самому важному — поиску поддержки
                    </p>
                ) : isRecoveryMode && !isCodeMode ? (
                    <p className="login__subtitle">
                        Ещё немного — и вы снова сможете продолжить свой путь к поиску психолога. Введите e-mail, и мы отправим код для входа и восстановления доступа
                    </p>
                ) : null}
                <form onSubmit={handleSubmit}>
                    {(isCodeMode || isRegistrationCodeMode) ? (
                        <div className="login__code-inputs-wrapper">
                            <div className="login__code-inputs">
                                {code.map((digit, index) => (
                                    <input
                                        key={index}
                                        type="text"
                                        maxLength="1"
                                        className="login__code-input"
                                        value={digit}
                                        onChange={(e) => handleCodeChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        ref={(el) => (codeInputRefs.current[index] = el)}
                                        autoFocus={index === 0}
                                    />
                                ))}
                            </div>
                            <p className="login__resend-code">Выслать код повторно через 00:12</p>
                        </div>
                    ) : isPasswordChangeMode ? (
                        <>
                            <div className="login__form-group">
                                <label className="login__label">Новый пароль</label>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    name="newPassword"
                                    className="login__input"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    required
                                />
                                <span className="login__input-visible" onClick={toggleNewPasswordVisibility}>
                                    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z" stroke="#313235" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                        <path d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            </div>
                            <div className="login__form-group">
                                <label className="login__label">Повторить пароль</label>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    className="login__input"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                                <span className="login__input-visible" onClick={toggleConfirmPasswordVisibility}>
                                    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z" stroke="#313235" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                        <path d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
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
                                    />
                                </div>
                            )}
                            {!isRecoveryMode && (
                                <div className="login__form-group">
                                    <label className="login__label">Пароль</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        className="login__input"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required={isLoginMode}
                                    />
                                    <span className="login__input-visible" onClick={togglePasswordVisibility}>
                                        <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34733Z" stroke="#313235" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                            <path d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </div>
                            )}
                            {!isLoginMode && !isRecoveryMode && (
                                <div className="login__policy">
                                    <label className="login__policy-label label">
                                        <input
                                            type="checkbox"
                                            className={`label__checkbox ${checkboxError ? 'error' : ''}`}
                                            checked={isPolicyChecked}
                                            onChange={() => {
                                                setIsPolicyChecked(!isPolicyChecked);
                                                setCheckboxError(false);
                                            }}
                                        />
                                        <span className="label__checkbox-custom"></span>
                                        <span className="label__text">Я ознакомлен(а) с Политикой обработки персональных данных и даю согласие на их обработку.</span>
                                    </label>
                                    <label className="login__policy-label label">
                                        <input
                                            type="checkbox"
                                            className="label__checkbox"
                                        />
                                        <span className="label__checkbox-custom"></span>
                                        <span className="label__text">Хочу получать информацию о персональных предложениях и акциях.</span>
                                    </label>
                                </div>
                            )}
                        </>
                    )}
                    <div className="login__group">
                        {(isCodeMode || isRegistrationCodeMode || isPasswordChangeMode) && (
                            <button type="button" className="login__group-btn login__button b-btn b-btn--transparent" onClick={goBack}>
                                Назад
                            </button>
                        )}
                        <button type="submit" className="login__group-btn login__button b-btn">
                            {isPasswordChangeMode ? 'Сменить' :
                                isCodeMode || isRegistrationCodeMode ? 'Продолжить' :
                                    isRecoveryMode ? 'Выслать код' :
                                        isLoginMode ? 'Войти' : 'Зарегистрироваться'}
                        </button>
                    </div>
                </form>
                <div className="login__footer">
                    {!isRecoveryMode && !isCodeMode && !isPasswordChangeMode && !isRegistrationCodeMode && isLoginMode && (
                        <button type="button" className="login__footer-link" onClick={toggleRecoveryMode}>
                            Забыли пароль?
                        </button>
                    )}
                    {(isRecoveryMode || isCodeMode || isPasswordChangeMode) && !isRegistrationCodeMode ? (
                        <p>
                            Вспомнили пароль?{' '}
                            <button
                                type="button"
                                className="login__footer-link"
                                onClick={() => {
                                    setIsRecoveryMode(false);
                                    setIsCodeMode(false);
                                    setIsPasswordChangeMode(false);
                                    setIsLoginMode(true);
                                }}
                            >
                                Войти
                            </button>
                        </p>
                    ) : null}
                    {isLoginMode && !isRegistrationCodeMode ? (
                        <p>
                            Нет аккаунта?{' '}
                            <button
                                type="button"
                                className="login__footer-link"
                                onClick={() => setIsLoginMode(false)}
                            >
                                Зарегистрируйтесь
                            </button>
                        </p>
                    ) : !isLoginMode && !isRegistrationCodeMode ? (
                        <p>
                            Есть аккаунт?{' '}
                            <button
                                type="button"
                                className="login__footer-link"
                                onClick={() => setIsLoginMode(true)}
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

export default Login;
