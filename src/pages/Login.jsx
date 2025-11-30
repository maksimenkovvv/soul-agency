import React, { useState } from 'react';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Email:', email, 'Password:', password);
    };

    return (
        <div className="login">
            <div className="login__wrapper">
                <h2 className="login__title">Вход</h2>
                <form onSubmit={handleSubmit}>
                    <div className="login__form-group login__form-group-1">
                        <label className="login__label">Почта</label>
                        <input
                            type="email"
                            className="login__input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="login__form-group login__form-group-2">
                        <label className="login__label">Пароль</label>
                        <input
                            type="password"
                            className="login__input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="login__button b-btn">Войти</button>
                </form>
            </div>
        </div>
    );
}

export default Login;
