import React from "react";
import { Link } from "react-router-dom";
import zaglushka from "../assets/img/zaglushka.png";
import { useAuth } from "../auth/authStore";
import { profileApi } from "../api/profileApi";
import { dictApi } from "../api/dictApi";
import { useToast } from "../ui/toast/ToastProvider";
import DictionaryMultiSelect from "../components/DictionaryMultiSelect";

function Settings() {
    const { me, boot } = useAuth();
    const toast = useToast();

    const isPsychologist = (me?.role || "").toString().includes("PSYCHOLOGIST");

    const [showPassword, setShowPassword] = React.useState(false);
    const [showResetPassword, setShowResetPassword] = React.useState(false);

    const [userPhoto, setUserPhoto] = React.useState(null);
    const [fullName, setFullName] = React.useState("");
    const [login, setLogin] = React.useState("");
    const [email, setEmail] = React.useState("");

    const [saving, setSaving] = React.useState(false);
    const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

    // password
    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmNewPassword, setConfirmNewPassword] = React.useState("");
    const [changingPassword, setChangingPassword] = React.useState(false);

    // psychologist profile
    const [psyLoading, setPsyLoading] = React.useState(false);
    const [headline, setHeadline] = React.useState("");
    const [about, setAbout] = React.useState("");
    const [experienceYears, setExperienceYears] = React.useState("");
    const [pricePerSession, setPricePerSession] = React.useState("");
    const [sessionDurationMinutes, setSessionDurationMinutes] = React.useState(50);
    const [isVisible, setIsVisible] = React.useState(true);

    // psychologist dictionaries
    const [psyThemes, setPsyThemes] = React.useState([]); // [{id,title}]
    const [psyMethods, setPsyMethods] = React.useState([]); // [{id,title}]

    // refs (для "ползущего" аватара)
    const contentRef = React.useRef(null);
    const photoRef = React.useRef(null);

    React.useEffect(() => {
        if (!me) return;
        setFullName(me.name || "");
        setLogin(me.login || "");
        setEmail(me.email || "");
        if (me.avatarUrl) setUserPhoto(me.avatarUrl);

        // если бэк отдаёт профиль психолога внутри /api/me
        const p = me.psychologistProfile;
        if (p && isPsychologist) {
            setHeadline(p.headline || "");
            setAbout(p.about || "");
            setExperienceYears(p.experienceYears ?? "");
            setPricePerSession(p.pricePerSession ?? "");
            setSessionDurationMinutes(p.sessionDurationMinutes ?? 50);
            setIsVisible(p.isVisible ?? true);

            // themes/methods can come as objects or ids
            const rawThemes = p.themes || p.themeIds || p.theme_ids || [];
            const rawMethods = p.methods || p.methodIds || p.method_ids || [];
            setPsyThemes(Array.isArray(rawThemes) ? rawThemes : []);
            setPsyMethods(Array.isArray(rawMethods) ? rawMethods : []);
        }
    }, [me, isPsychologist]);

    React.useEffect(() => {
        if (!me || !isPsychologist) return;
        // если профиль уже пришёл в /api/me — лишний запрос не делаем
        if (me.psychologistProfile) return;

        let alive = true;
        setPsyLoading(true);
        (async () => {
            try {
                const p = await profileApi.getMyPsychologistProfile();
                if (!alive || !p) return;
                setHeadline(p.headline || "");
                setAbout(p.about || "");
                setExperienceYears(p.experienceYears ?? "");
                setPricePerSession(p.pricePerSession ?? "");
                setSessionDurationMinutes(p.sessionDurationMinutes ?? 50);
                setIsVisible(p.isVisible ?? true);

                const rawThemes = p.themes || p.themeIds || p.theme_ids || [];
                const rawMethods = p.methods || p.methodIds || p.method_ids || [];
                setPsyThemes(Array.isArray(rawThemes) ? rawThemes : []);
                setPsyMethods(Array.isArray(rawMethods) ? rawMethods : []);
            } catch (e) {
                // не спамим ошибками — профиль может быть ещё не создан
            } finally {
                if (alive) setPsyLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [me, isPsychologist]);

    const fileInputRef = React.useRef(null);

    const togglePasswordVisibility = (e) => {
        e.preventDefault();
        setShowPassword((v) => !v);
    };

    const toggleResetPassword = (e) => {
        e.preventDefault();
        setShowResetPassword((v) => !v);
    };

    const handlePhotoUpload = (e) => {
        e.preventDefault();
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = null; // чтобы можно было выбрать тот же файл снова

        if (!file) return;

        if (!file.type.match("image.*")) {
            toast.error("Пожалуйста, выберите файл изображения");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Файл слишком большой. Максимальный размер: 5MB");
            return;
        }

        // быстрый превью
        try {
            const preview = URL.createObjectURL(file);
            setUserPhoto(preview);
        } catch {}

        setUploadingAvatar(true);
        try {
            const res = await profileApi.uploadAvatar(file);
            if (res?.avatarUrl) setUserPhoto(res.avatarUrl);
            await boot();
            toast.success("Фото профиля обновлено");
        } catch (err) {
            toast.error(err?.message || "Не удалось загрузить фото");
            // откатим на текущий аватар с бэка, если есть
            if (me?.avatarUrl) setUserPhoto(me.avatarUrl);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handlePhotoDelete = async (e) => {
        e.preventDefault();
        if (!me?.id) return;

        setUploadingAvatar(true);
        try {
            await profileApi.deleteAvatar(me.id);
            // обновим профиль (и любые поля, которые бэк меняет при удалении)
            await boot();
            setUserPhoto(null);
            toast.success("Фото профиля удалено");
        } catch (err) {
            toast.error(err?.message || "Не удалось удалить фото");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const saveAll = async (e) => {
        e.preventDefault();
        setSaving(true);

        const extractIds = (arr) => {
            const list = Array.isArray(arr) ? arr : [];
            const ids = [];
            for (const x of list) {
                const v = x?.id ?? x;
                if (v == null) continue;
                const n = Number(v);
                if (!Number.isFinite(n)) continue;
                ids.push(n);
            }
            // unique
            return Array.from(new Set(ids));
        };

        try {
            // email менять нельзя
            await profileApi.updateMe({ name: fullName, login });

            if (isPsychologist) {
                await profileApi.updateMyPsychologistProfile({
                    headline,
                    about,
                    experienceYears: experienceYears === "" ? null : Number(experienceYears),
                    pricePerSession: pricePerSession === "" ? null : Number(pricePerSession),
                    sessionDurationMinutes: Number(sessionDurationMinutes),
                    isVisible: Boolean(isVisible),

                    // NEW: выбранные темы/методы (мультивыбор)
                    themeIds: extractIds(psyThemes),
                    methodIds: extractIds(psyMethods),
                });
            }

            await boot();
            toast.success("Настройки сохранены");
        } catch (err) {
            toast.error(err?.message || "Не удалось сохранить настройки");
        } finally {
            setSaving(false);
        }
    };

    const submitPasswordChange = async (e) => {
        e.preventDefault();

        if (!showResetPassword) return;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            toast.error("Заполни текущий пароль и новый пароль дважды");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            toast.error("Новый пароль и подтверждение не совпадают");
            return;
        }

        setChangingPassword(true);
        try {
            await profileApi.changePassword({
                currentPassword,
                newPassword,
                confirmNewPassword,
            });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setShowResetPassword(false);
            toast.success("Пароль изменён");
        } catch (err) {
            toast.error(err?.message || "Не удалось изменить пароль");
        } finally {
            setChangingPassword(false);
        }
    };

    const canDeletePhoto = !!userPhoto;

    /**
     * ✅ "Аватар ползёт вниз" только на десктопе (>= 981px)
     * Работает через CSS variable: --avatarShift (см. SCSS)
     */
    React.useEffect(() => {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        if (reduce) return;

        const mq = window.matchMedia("(min-width: 981px)");
        let raf = 0;

        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

        const update = () => {
            raf = 0;

            const content = contentRef.current;
            const photo = photoRef.current;
            if (!content || !photo) return;

            // только desktop
            if (!mq.matches) {
                photo.style.removeProperty("--avatarShift");
                return;
            }

            const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

            // верх блока settings__content в координатах документа
            const contentRect = content.getBoundingClientRect();
            const contentTop = contentRect.top + scrollY;

            // начинаем "ползти" чуть раньше
            const start = contentTop - 140;

            // сколько проскроллено от start
            const raw = scrollY - start;

            // ограничение: не опускаемся ниже формы
            const form = content.querySelector(".settings__content-form");
            const formH = form ? form.getBoundingClientRect().height : 0;
            const photoH = photo.getBoundingClientRect().height;

            const maxShift = Math.max(0, formH - photoH);
            const shift = clamp(raw, 0, maxShift);

            photo.style.setProperty("--avatarShift", `${shift}px`);
        };

        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(update);
        };
        const onResize = () => {
            if (!raf) raf = requestAnimationFrame(update);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize);

        if (mq.addEventListener) mq.addEventListener("change", onResize);

        update();

        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onResize);
            if (mq.removeEventListener) mq.removeEventListener("change", onResize);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <div className="b-settings">
            <Link className="settings__button" to="/dashboard">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M15 8L1 8M1 8L8 15M1 8L8 0.999999"
                        stroke="#313235"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <span>Настройки профиля</span>
            </Link>

            <div className="settings__wrapper">
                <div className="settings__content" ref={contentRef}>
                    <div className="settings__content-photo" ref={photoRef}>
                        <div className="settings__content-photo__blur">
                            {canDeletePhoto && (
                                <button
                                    className="settings__content-photo__blur-delete settings__content-photo__blur-btn"
                                    onClick={handlePhotoDelete}
                                    title="Удалить фото"
                                    disabled={uploadingAvatar}
                                    type="button"
                                >
                                    <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            d="M14.3333 4.33333V16C14.3333 16.442 14.1577 16.866 13.8452 17.1785C13.5326 17.4911 13.1087 17.6667 12.6667 17.6667H4.33333C3.89131 17.6667 3.46738 17.4911 3.15482 17.1785C2.84226 16.866 2.66667 16.442 2.66667 16V4.33333M1 4.33333H16M5.16667 4.33333V2.66667C5.16667 2.22464 5.34226 1.80072 5.65482 1.48816C5.96738 1.17559 6.39131 1 6.83333 1H10.1667C10.6087 1 11.0326 1.17559 11.3452 1.48816C11.6577 1.80072 11.8333 2.22464 11.8333 2.66667V4.33333"
                                            stroke="#F26F55"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                            )}

                            <button
                                className="settings__content-photo__blur-load settings__content-photo__blur-btn"
                                onClick={handlePhotoUpload}
                                title={userPhoto ? "Изменить фото" : "Загрузить фото"}
                                disabled={uploadingAvatar}
                                type="button"
                            >
                                <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M10.1666 16.8337H16.8333M16.9783 5.01032C17.4189 4.56984 17.6664 3.97237 17.6665 3.34936C17.6666 2.72635 17.4192 2.12883 16.9787 1.68823C16.5382 1.24764 15.9408 1.00008 15.3177 1C14.6947 0.999922 14.0972 1.24734 13.6566 1.68782L2.53495 12.812C2.34146 13.0049 2.19837 13.2424 2.11828 13.5037L1.01745 17.1303C0.995908 17.2024 0.994282 17.2789 1.01274 17.3519C1.03119 17.4248 1.06905 17.4913 1.12228 17.5445C1.17551 17.5976 1.24213 17.6354 1.31508 17.6537C1.38803 17.6721 1.46458 17.6703 1.53661 17.6487L5.16411 16.5487C5.42509 16.4693 5.66259 16.3271 5.85578 16.1345L16.9783 5.01032Z"
                                        stroke="#313235"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>
                        </div>

                        <img src={userPhoto || zaglushka} alt="Фото профиля" />

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                    </div>

                    <form className="settings__content-form" onSubmit={saveAll}>
                        <div className="login__form-group">
                            <label className="login__label">Имя Фамилия</label>
                            <input
                                type="text"
                                className="login__input"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>

                        <div className="login__form-group">
                            <label className="login__label">Логин</label>
                            <input
                                type="text"
                                className="login__input"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                placeholder="например: maria_ivanova"
                            />
                            <div className="settings__hint">
                                Логин виден в профиле и используется в ссылках/поиске. 3–32 символа: a-z, 0-9, _ - .
                            </div>
                        </div>

                        <div className="login__form-group">
                            <label className="login__label">Почта</label>
                            <input type="email" className="login__input" value={email} disabled readOnly />
                            <div className="settings__hint">Почту изменить нельзя.</div>
                        </div>

                        {isPsychologist && (
                            <div className="settings__section">
                                <div className="settings__section-head">
                                    <div className="settings__section-title">Профиль психолога</div>
                                    <div className="settings__hint">Данные отображаются в карточке психолога и на странице профиля.</div>
                                </div>

                                <div className="login__form-group">
                                    <label className="login__label">Образование</label>
                                    <input
                                        type="text"
                                        className="login__input"
                                        value={headline}
                                        onChange={(e) => setHeadline(e.target.value)}
                                        placeholder="Например: КПТ-психолог, тревожность и выгорание"
                                        disabled={psyLoading}
                                    />
                                </div>

                                <div className="login__form-group">
                                    <label className="login__label">О себе</label>
                                    <textarea
                                        className="login__input login__input--textarea"
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        placeholder="Опиши подход, специализацию, опыт, форматы работы"
                                        disabled={psyLoading}
                                    />
                                </div>

                                <div className="settings__grid settings__grid--dict">
                                    <div className="login__form-group" style={{ marginBottom: 0 }}>
                                        <DictionaryMultiSelect
                                            label="Темы"
                                            value={psyThemes}
                                            onChange={setPsyThemes}
                                            loadOptions={dictApi.themes}
                                            disabled={psyLoading}
                                            emptyText="Тем нет"
                                            searchPlaceholder="Поиск тем…"
                                        />
                                        <div className="settings__hint">Выбери несколько тем, с которыми ты работаешь.</div>
                                    </div>

                                    <div className="login__form-group" style={{ marginBottom: 0 }}>
                                        <DictionaryMultiSelect
                                            label="Методы"
                                            value={psyMethods}
                                            onChange={setPsyMethods}
                                            loadOptions={dictApi.methods}
                                            disabled={psyLoading}
                                            emptyText="Методов нет"
                                            searchPlaceholder="Поиск методов…"
                                        />
                                        <div className="settings__hint">Выбери методы/подходы, которые используешь.</div>
                                    </div>
                                </div>

                                <div className="settings__grid">
                                    <div className="login__form-group">
                                        <label className="login__label">Опыт (лет)</label>
                                        <input
                                            type="number"
                                            className="login__input"
                                            value={experienceYears}
                                            onChange={(e) => setExperienceYears(e.target.value)}
                                            min={0}
                                            disabled={psyLoading}
                                        />
                                    </div>

                                    <div className="login__form-group">
                                        <label className="login__label">Цена за сессию</label>
                                        <input
                                            type="number"
                                            className="login__input"
                                            value={pricePerSession}
                                            onChange={(e) => setPricePerSession(e.target.value)}
                                            min={0}
                                            disabled={psyLoading}
                                        />
                                    </div>
                                </div>

                                <div className="settings__grid">
                                    <div className="login__form-group">
                                        <label className="login__label">Длительность сессии (мин)</label>
                                        <select
                                            className="login__input login__input--select"
                                            value={sessionDurationMinutes}
                                            onChange={(e) => setSessionDurationMinutes(e.target.value)}
                                            disabled={psyLoading}
                                        >
                                            {[30, 45, 50, 60, 75, 90].map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="login__form-group" style={{ justifyContent: "flex-end", margin: "35px 0" }}>
                                        <label className="label" style={{ marginTop: 8 }}>
                                            <input
                                                className="label__checkbox"
                                                type="checkbox"
                                                checked={isVisible}
                                                onChange={(e) => setIsVisible(e.target.checked)}
                                                disabled={psyLoading}
                                            />
                                            <span className="label__checkbox-custom" />
                                            <span>Показывать меня в каталоге</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="settings__hint">График работы и перерывы настраиваются в кабинете в разделе «График работы».</div>
                            </div>
                        )}

                        <div className="settings__section">
                            <div className="settings__section-title">Безопасность</div>

                            <div className="login__form-group login__form-group--password">
                                <label className="login__label">Текущий пароль</label>
                                <div className="login__input-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="login__input"
                                        placeholder="Текущий пароль"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                    <button
                                        className="login__input-button b-btn b-btn--transparent"
                                        onClick={toggleResetPassword}
                                        type="button"
                                    >
                                        {showResetPassword ? "Отменить" : "Сменить"}
                                    </button>
                                </div>

                                <button type="button" className="login__input-visible" onClick={togglePasswordVisibility}>
                                    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        {showPassword ? (
                                            <>
                                                <path
                                                    d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z"
                                                    stroke="#8885FF"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <path
                                                    d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z"
                                                    stroke="#8885FF"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <path
                                                    d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z"
                                                    stroke="#313235"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <path
                                                    d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z"
                                                    stroke="#313235"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </>
                                        )}
                                    </svg>
                                </button>
                            </div>

                            {showResetPassword && (
                                <div className="login__form-group login__form-group--reset">
                                    <label className="login__label">Новый пароль</label>

                                    <div className="settings__grid">
                                        <div className="login__form-group" style={{ marginBottom: 0 }}>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="login__input"
                                                placeholder="Новый пароль"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                        </div>

                                        <div className="login__form-group" style={{ marginBottom: 0 }}>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="login__input"
                                                placeholder="Повторите новый пароль"
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="settings__password-actions">
                                        <button type="button" className="b-btn" disabled={changingPassword} onClick={submitPasswordChange}>
                                            Обновить пароль
                                        </button>

                                        <button
                                            type="button"
                                            className="login__input-link"
                                            onClick={() => (window.location.href = "/login?resetPassword=true")}
                                        >
                                            Забыли пароль?
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className={`b-btn ${saving ? "is-loading" : ""}`}
                            disabled={saving || uploadingAvatar || changingPassword || psyLoading}
                            aria-busy={saving ? "true" : "false"}
                            style={{ marginTop: 18 }}
                        >
                            {saving ? (
                                <>
                                    <span className="b-btn__spinner" aria-hidden="true" />
                                    Сохранение…
                                </>
                            ) : (
                                "Сохранить настройки"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Settings;
