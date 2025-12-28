// Компонент настроек ЛК
import React from 'react';
import { Link } from 'react-router-dom';
import zaglushka from '../assets/img/zaglushka.png'

function Settings() {
    const [showPassword, setShowPassword] = React.useState(false);
    const [showResetPassword, setShowResetPassword] = React.useState(false);
    const [userPhoto, setUserPhoto] = React.useState(null);
    const fileInputRef = React.useRef(null);

    const togglePasswordVisibility = (e) => {
        e.preventDefault();
        setShowPassword(!showPassword);
    };

    const toggleResetPassword = (e) => {
        e.preventDefault();
        setShowResetPassword(!showResetPassword);
    };

    // Обработчик загрузки фото
    const handlePhotoUpload = (e) => {
        e.preventDefault();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Проверяем тип файла
            if (!file.type.match('image.*')) {
                alert('Пожалуйста, выберите файл изображения');
                return;
            }

            // Проверяем размер файла (например, максимум 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Файл слишком большой. Максимальный размер: 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setUserPhoto(e.target.result);
            };
            reader.readAsDataURL(file);
        }

        // Сброс input, чтобы можно было выбрать тот же файл снова
        event.target.value = null;
    };

    // Обработчик удаления фото
    const handlePhotoDelete = (e) => {
        e.preventDefault();
        if (userPhoto) {
            // Подтверждение удаления
            if (window.confirm('Вы уверены, что хотите удалить фотографию?')) {
                setUserPhoto(null);
            }
        }
    };

    // Определяем, можно ли удалять фото
    const canDeletePhoto = !!userPhoto;

    return (
        <div className="b-settings">
            <Link className="settings__button" to="/dashboard">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 8L1 8M1 8L8 15M1 8L8 0.999999" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Настройки профиля</span>
            </Link>
            <div className="settings__wrapper">
                <div className="settings__content">
                    <div className="settings__content-photo">
                        <div className="settings__content-photo__blur">
                            {canDeletePhoto && (
                                <button
                                    className="settings__content-photo__blur-delete settings__content-photo__blur-btn"
                                    onClick={handlePhotoDelete}
                                    title="Удалить фото"
                                >
                                    <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14.3333 4.33333V16C14.3333 16.442 14.1577 16.866 13.8452 17.1785C13.5326 17.4911 13.1087 17.6667 12.6667 17.6667H4.33333C3.89131 17.6667 3.46738 17.4911 3.15482 17.1785C2.84226 16.866 2.66667 16.442 2.66667 16V4.33333M1 4.33333H16M5.16667 4.33333V2.66667C5.16667 2.22464 5.34226 1.80072 5.65482 1.48816C5.96738 1.17559 6.39131 1 6.83333 1H10.1667C10.6087 1 11.0326 1.17559 11.3452 1.48816C11.6577 1.80072 11.8333 2.22464 11.8333 2.66667V4.33333" stroke="#F26F55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            )}
                            <button
                                className="settings__content-photo__blur-load settings__content-photo__blur-btn"
                                onClick={handlePhotoUpload}
                                title={userPhoto ? "Изменить фото" : "Загрузить фото"}
                            >
                                <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.1666 16.8337H16.8333M16.9783 5.01032C17.4189 4.56984 17.6664 3.97237 17.6665 3.34936C17.6666 2.72635 17.4192 2.12883 16.9787 1.68823C16.5382 1.24764 15.9408 1.00008 15.3177 1C14.6947 0.999922 14.0972 1.24734 13.6566 1.68782L2.53495 12.812C2.34146 13.0049 2.19837 13.2424 2.11828 13.5037L1.01745 17.1303C0.995908 17.2024 0.994282 17.2789 1.01274 17.3519C1.03119 17.4248 1.06905 17.4913 1.12228 17.5445C1.17551 17.5976 1.24213 17.6354 1.31508 17.6537C1.38803 17.6721 1.46458 17.6703 1.53661 17.6487L5.16411 16.5487C5.42509 16.4693 5.66259 16.3271 5.85578 16.1345L16.9783 5.01032Z" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                        <img
                            src={userPhoto || zaglushka}
                            alt="Фото профиля"
                        />
                        {/* Скрытый input для выбора файла */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                    </div>
                    <form className="settings__content-form">
                        <div className="login__form-group">
                            <label className="login__label">Имя Фамилия</label>
                            <input
                                type="text"
                                className="login__input"
                                placeholder="Имя Фамилия"
                            />
                        </div>
                        <div className="login__form-group">
                            <label className="login__label">Почта</label>
                            <input
                                type="email"
                                className="login__input"
                                placeholder="example@google.com"
                            />
                        </div>
                        <div className="login__form-group login__form-group--password">
                            <label className="login__label">Текущий пароль</label>
                            <div className="login__input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="login__input"
                                    placeholder="Текущий пароль"
                                />
                                <button className="login__input-button b-btn b-btn--transparent" onClick={toggleResetPassword}>
                                    {showResetPassword ? 'Отменить' : 'Сменить'}
                                </button>
                            </div>
                            <button
                                type="button"
                                className="login__input-visible"
                                onClick={togglePasswordVisibility}
                            >
                                <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {showPassword ? (
                                        <>
                                            <path d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z" stroke="#8885FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z" stroke="#8885FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </>
                                    ) : (
                                        <>
                                            <path d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </>
                                    )}
                                </svg>
                            </button>
                        </div>
                        {showResetPassword && (
                            <div className={`login__form-group login__form-group--reset`}>
                                <label className="login__label">Новый пароль</label>
                                <div className="login__input-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="login__input"
                                        placeholder="Новый пароль"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="login__input-visible"
                                    onClick={togglePasswordVisibility}
                                >
                                    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        {showPassword ? (
                                            <>
                                                <path d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z" stroke="#8885FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z" stroke="#8885FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </>
                                        ) : (
                                            <>
                                                <path d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z" stroke="#313235" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </>
                                        )}
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    className="login__input-link"
                                    onClick={() => window.location.href = '/login?resetPassword=true'}
                                >
                                    Забыли пароль?
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Settings;