import React, { useState, useRef, useEffect } from 'react';

function Login() {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [isCodeMode, setIsCodeMode] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
    });
    const [code, setCode] = useState(['', '', '', '', '']);
    const [isPolicyChecked, setIsPolicyChecked] = useState(false);
    const [checkboxError, setCheckboxError] = useState(false);
    const codeInputRefs = useRef([]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCodeChange = (index, value) => {
        if (value.length > 1) {
            value = value.slice(0, 1);
        }

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Переход к следующему полю при вводе символа
        if (value && index < code.length - 1) {
            codeInputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Переход к предыдущему полю при удалении символа
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            codeInputRefs.current[index - 1].focus();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (isCodeMode) {
            const fullCode = code.join('');
            if (fullCode.length === 5) {
                console.log('Введен код:', fullCode);
                // Здесь будет логика проверки кода
            } else {
                console.log('Пожалуйста, введите полный код');
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
                console.log('Регистрация:', formData.fullName, formData.email, formData.password);
            }
        } else {
            console.log('Запрос на восстановление пароля для:', formData.email);
            setIsCodeMode(true);
        }
    };

    const toggleRecoveryMode = () => {
        setIsRecoveryMode(!isRecoveryMode);
        setIsCodeMode(false);
        setCheckboxError(false);
    };

    const goBack = () => {
        setIsCodeMode(false);
    };

    return (
        <div className="login">
            <div className="login__wrapper">
                <h2 className="login__title">
                    {isCodeMode ? 'Сброс пароля' : isRecoveryMode ? 'Забыли пароль?' : isLoginMode ? 'Вход' : 'Регистрация'}
                </h2>
                {isCodeMode ? (
                    <p className="login__subtitle">
                        Письмо уже в пути. Как только введёте код, можно будет вернуться к самому важному — поиску поддержки
                    </p>
                ) : isRecoveryMode ? (
                    <p className="login__subtitle">
                        Ещё немного — и вы снова сможете продолжить свой путь к поиску психолога. Введите e-mail, и мы отправим код для входа и восстановления доступа
                    </p>
                ) : null}
                <form onSubmit={handleSubmit}>
                    {isCodeMode ? (
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
                                <>
                                    <div className="login__form-group">
                                        <label className="login__label">Пароль</label>
                                        <input
                                            type="password"
                                            name="password"
                                            className="login__input"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required={isLoginMode}
                                        />
                                    </div>
                                    {!isLoginMode && (
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
                        </>
                    )}
                    <div className="login__group">
                        {isCodeMode && (
                            <button type="button" className="login__group-btn login__button b-btn b-btn--transparent" onClick={goBack}>
                                Назад
                            </button>
                        )}
                        <button type="submit" className="login__group-btn login__button b-btn">
                            {isCodeMode ? 'Продолжить' : isRecoveryMode ? 'Выслать код' : isLoginMode ? 'Войти' : 'Зарегистрироваться'}
                        </button>
                    </div>
                </form>
                <div className="login__footer">
                    {!isRecoveryMode && !isCodeMode && isLoginMode && (
                        <button type="button" className="login__footer-link" onClick={toggleRecoveryMode}>
                            Забыли пароль?
                        </button>
                    )}
                    {isRecoveryMode || isCodeMode ? (
                        <p>
                            Вспомнили пароль?{' '}
                            <button
                                type="button"
                                className="login__footer-link"
                                onClick={() => {
                                    setIsRecoveryMode(false);
                                    setIsCodeMode(false);
                                }}
                            >
                                Войти
                            </button>
                        </p>
                    ) : isLoginMode ? (
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
                    ) : (
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
                    )}
                    <p className="login__footer-title">БюроДуши</p>
                </div>
            </div>
        </div>
    );
}

export default Login;
