// src/pages/auth/AuthPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faSignInAlt, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import './auth.css';
import LoadingComponent from '../../component/loading/LoadingComponent';
import Toaster from '../../component/toast/Toaster';
import { loginUser, registerUser, checkUnique } from '../../features/auth/authActions';
import { startGoogleOAuth } from '../../features/auth/oauthActions';

/* Google icon */
const GoogleIcon = () => ( 
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* Messages d'erreur modernisés avec icônes */
const ErrorMessage = ({ id, children, visible }) => {
  if (!visible) return null;
  return (
    <div id={id} className="field-pop error" role="alert">
      {children}
    </div>
  );
};

/* Messages de succès */
const SuccessMessage = ({ id, children, visible }) => {
  if (!visible) return null;
  return (
    <div id={id} className="field-pop success" role="status">
      {children}
    </div>
  );
};

/* Messages d'information/hint */
const HintMessage = ({ id, type = 'hint', children, visible, placement = 'bottom' }) => {
  if (!visible) return null;
  return (
    <div
      id={id}
      role="status"
      className={`field-pop ${type} ${placement}`}
    >
      {children}
    </div>
  );
};

/* Messages inline pour erreurs de validation */
const InlineError = ({ id, children, visible }) => {
  if (!visible) return null;
  return <div id={id} className="inline-error" role="alert">{children}</div>;
};

/* Password helpers */
const PasswordStrength = ({ value = '' }) => {
  const tests = [
    (v) => v.length >= 8,
    (v) => /[A-Z]/.test(v) && /[a-z]/.test(v),
    (v) => /\d/.test(v),
    (v) => /[^A-Za-z0-9]/.test(v)
  ];
  const score = tests.reduce((acc, t) => acc + (t(value) ? 1 : 0), 0);
  const label =
    value.length === 0
      ? 'Commencez à taper votre mot de passe'
      : (score <= 1 ? 'Très faible' : score === 2 ? 'Faible' : score === 3 ? 'Bon' : 'Fort');
  return (
    <div className="strength" aria-live="polite">
      <div className="bars" aria-hidden="true">
        {[0,1,2,3].map(i => <span key={i} className={`bar ${value.length === 0 ? '' : (i < score ? `on-${score}` : '')}`} />)}
      </div>
      <small className={`strength-label ${value.length === 0 ? 's-0' : `s-${score}`}`}>{label}</small>
    </div>
  );
};

const PasswordHints = ({ value = '' }) => {
  const rules = [
    { id: 'len',  label: 'Au moins 8 caractères',               test: v => v.length >= 8 },
    { id: 'case', label: 'Majuscules & minuscules',              test: v => /[A-Z]/.test(v) && /[a-z]/.test(v) },
    { id: 'num',  label: 'Au moins un chiffre',                  test: v => /\d/.test(v) },
    { id: 'spec', label: 'Au moins un caractère spécial (!@#)',  test: v => /[^A-Za-z0-9]/.test(v) }
  ];
  return (
    <ul className="pw-hints" aria-live="polite">
      {rules.map(r => <li key={r.id} className={r.test(value) ? 'ok' : ''}><i aria-hidden="true" /> {r.label}</li>)}
    </ul>
  );
};

/* Utils */
const isLaravelUnique = (msg = '') =>
  /(already been taken|déjà.*pris|déjà.*utilisé|déjà.*utilisée|unique)/i.test(msg);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { auth: { isAuthenticated }, langue } = useSelector(state => state.library);

  const [isLoginActive, setIsLoginActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '', firstName: '', lastName: '',
    email: '', password: '', confirmPassword: '',
    rememberMe: false, acceptTerms: false
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState({ login: false, register: false, confirm: false });
  const [caps, setCaps] = useState({ login: false, register: false, confirm: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [focusField, setFocusField] = useState(null);

  // vérification d'unicité
  const [uniqueStatus, setUniqueStatus] = useState({ email: 'idle', username: 'idle' });
  const [uniqueMsg, setUniqueMsg] = useState({ email: '', username: '' });

  useEffect(() => { if (isAuthenticated) navigate('/dashboard'); }, [isAuthenticated, navigate]);

  const toggleAuthMode = () => {
    setIsLoginActive(!isLoginActive);
    setErrors({});
    setFormData({
      username: '', firstName: '', lastName: '',
      email: '', password: '', confirmPassword: '',
      rememberMe: false, acceptTerms: false
    });
    setSubmitAttempted(false);
    setFocusField(null);
    setUniqueStatus({ email: 'idle', username: 'idle' });
    setUniqueMsg({ email: '', username: '' });
  };

  const handleFocus = (e) => setFocusField(e.target.name);
  const handleBlur  = () => setFocusField(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'email' || name === 'username') {
      setUniqueStatus(prev => ({ ...prev, [name]: 'idle' }));
      setUniqueMsg(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = t('email_required');
    else if (!emailRegex.test(formData.email)) newErrors.email = t('invalid_email');

    if (!formData.password.trim()) newErrors.password = t('password_required');
    else if (formData.password.length < 8) newErrors.password = t('password_min_length');

    if (!isLoginActive) {
      if (!formData.username.trim()) newErrors.username = t('username_required');
      else if (formData.username.length < 3) newErrors.username = t('username_too_short');
      if (!formData.firstName.trim()) newErrors.firstName = t('field_required');
      if (!formData.lastName.trim()) newErrors.lastName = t('field_required');
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('password_mismatch');
      if (!formData.acceptTerms) newErrors.acceptTerms = t('acceptTermsRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Debounced unique checks
  const debounceMs = 450;
  const debouncedEmail = useMemo(() => formData.email, [formData.email]);
  const debouncedUsername = useMemo(() => formData.username, [formData.username]);

  useEffect(() => {
    if (isLoginActive) return;
    if (!debouncedEmail || !emailRegex.test(debouncedEmail)) return;

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setUniqueStatus(s => ({ ...s, email: 'checking' }));
        const res = await checkUnique('email', debouncedEmail, undefined, langue);
        if (ctrl.signal.aborted) return;
        if (res?.unique) {
          setUniqueStatus(s => ({ ...s, email: 'ok' }));
          setUniqueMsg(m => ({ ...m, email: '' }));
        } else {
          const msg = res?.message || (langue === 'fr' ? 'Cet email est déjà utilisé.' : 'Email already taken');
          setUniqueStatus(s => ({ ...s, email: 'taken' }));
          setUniqueMsg(m => ({ ...m, email: msg }));
        }
      } catch {
        if (!ctrl.signal.aborted) {
          setUniqueStatus(s => ({ ...s, email: 'error' }));
          setUniqueMsg(m => ({ ...m, email: langue === 'fr' ? 'Vérification indisponible.' : 'Check unavailable.' }));
        }
      }
    }, debounceMs);

    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [debouncedEmail, isLoginActive, langue]);

  useEffect(() => {
    if (isLoginActive) return;
    if (!debouncedUsername || debouncedUsername.trim().length < 3) return;

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setUniqueStatus(s => ({ ...s, username: 'checking' }));
        const res = await checkUnique('username', debouncedUsername.trim(), undefined, langue);
        if (ctrl.signal.aborted) return;
        if (res?.unique) {
          setUniqueStatus(s => ({ ...s, username: 'ok' }));
          setUniqueMsg(m => ({ ...m, username: '' }));
        } else {
          const msg = res?.message || (langue === 'fr' ? "Nom d'utilisateur déjà pris." : 'Username already taken');
          setUniqueStatus(s => ({ ...s, username: 'taken' }));
          setUniqueMsg(m => ({ ...m, username: msg }));
        }
      } catch {
        if (!ctrl.signal.aborted) {
          setUniqueStatus(s => ({ ...s, username: 'error' }));
          setUniqueMsg(m => ({ ...m, username: langue === 'fr' ? 'Vérification indisponible.' : 'Check unavailable.' }));
        }
      }
    }, debounceMs);

    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [debouncedUsername, isLoginActive, langue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!validateForm()) return;

    // si uniqueness dit "taken" → on bloque l'inscription
    if (!isLoginActive && (uniqueStatus.email === 'taken' || uniqueStatus.username === 'taken')) {
      return;
    }

    setSubmitting(true);
    try {
      if (isLoginActive) {
        await dispatch(loginUser({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
          langue
        }));
      } else {
        const result = await dispatch(registerUser({
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.confirmPassword,
          langue
        }));

        if (result?.error) {
          const apiErrors = result.payload?.errors || {};
          const formatted = {};
          const mapUnique = (arr = []) => arr.find(isLaravelUnique);

          if (apiErrors.email?.length) {
            if (!mapUnique(apiErrors.email)) formatted.email = apiErrors.email[0];
          }
          if (apiErrors.username?.length || apiErrors.name?.length) {
            const arr = apiErrors.username || apiErrors.name;
            if (!mapUnique(arr)) formatted.username = arr[0];
          }
          if (apiErrors.first_name?.length) formatted.firstName = apiErrors.first_name[0];
          if (apiErrors.last_name?.length)  formatted.lastName  = apiErrors.last_name[0];
          if (apiErrors.password?.length)   formatted.password  = apiErrors.password[0];
          if (apiErrors.password_confirmation?.length) formatted.confirmPassword = apiErrors.password_confirmation[0];

          setErrors(formatted);
        }
      }
    } catch {
      setErrors(prev => ({ ...prev, general: prev.general || t('an_error_has_occurred') }));
    } finally {
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = (field) =>
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));

  // helpers pour la visibilité des messages
  const getInputClassName = (fieldName) => {
    if (errors[fieldName]) return 'invalid';
    if (fieldName === 'email' && uniqueStatus.email === 'ok') return 'valid';
    if (fieldName === 'username' && uniqueStatus.username === 'ok') return 'valid';
    return '';
  };

  const showEmailHint = !isLoginActive && !!formData.email && 
    (uniqueStatus.email === 'checking' || uniqueStatus.email === 'taken' || uniqueStatus.email === 'error');

  const showUsernameHint = !isLoginActive && !!formData.username && 
    (uniqueStatus.username === 'checking' || uniqueStatus.username === 'taken' || uniqueStatus.username === 'error');

  return (
    <>
      <Toaster />
      <div className="min-h-screen flex items-center justify-center p-4 bg-bleu-pale">
        <div className="auth-container card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <button
            onClick={toggleAuthMode}
            className="floating-btn"
            title={isLoginActive ? t("signup") : t("login")}
            aria-label={isLoginActive ? t("signup") : t("login")}
          >
            <FontAwesomeIcon icon={isLoginActive ? faUserPlus : faSignInAlt} className="text-xl" />
          </button>

          {/* LOGIN */}
          <div className={`auth-page ${isLoginActive ? 'active' : 'hidden'}`}>
            <div className="form-header">
              <h1 id="auth-title" className="form-title">{t('welcome_back')}</h1>
              <p className="form-subtitle">{t('login_to_account')}</p>
            </div>

            {errors.general && <div className="api-notice">{errors.general}</div>}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-busy={submitting}>
              <div className="input-group">
                <input
                  type="email" name="email" value={formData.email} onChange={handleChange}
                  onFocus={handleFocus} onBlur={handleBlur} placeholder=" "
                  className={getInputClassName('email')} autoComplete="username"
                  aria-invalid={!!errors.email} aria-describedby={errors.email ? 'err-email-login' : undefined}
                />
                <label>{t("email")}</label>
                <ErrorMessage id="err-email-login" visible={!!errors.email}>{errors.email}</ErrorMessage>
              </div>

              <div className="input-group">
                <input
                  type={showPassword.login ? "text" : "password"} name="password" value={formData.password}
                  onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur}
                  onKeyUp={(e) => setCaps(prev => ({ ...prev, login: e.getModifierState('CapsLock') }))}
                  placeholder=" " className={getInputClassName('password')} autoComplete="current-password"
                  aria-invalid={!!errors.password} aria-describedby={errors.password ? 'err-pass-login' : undefined}
                />
                <label>{t("password")}</label>
                <button type="button" className="password-toggle" onClick={() => togglePasswordVisibility('login')}
                  aria-label={showPassword.login ? t('hide_password') : t('show_password')}>
                  <FontAwesomeIcon icon={showPassword.login ? faEyeSlash : faEye} />
                </button>
                <ErrorMessage id="err-pass-login" visible={!!errors.password}>{errors.password}</ErrorMessage>
                {caps.login && (
                  <div className="helper-text warning">
                    Verr. Maj activée
                  </div>
                )}
              </div>

              <div className="form-row between">
                <label className="checkbox">
                  <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} />
                  <span>{t("remember_me")}</span>
                </label>
                <button type="button" className="link">{t("forgot_password")}</button>
              </div>

              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting
                  ? <div className='flex items-center justify-center gap-4'><LoadingComponent size={5} color="border-white"/>{t("loading")}</div>
                  : t("connect")}
              </button>
            </form>

            <div className="or-line"><span>{t("login_with")}</span></div>
            <button
              type="button"
              className="google-btn"
              onClick={() => dispatch(startGoogleOAuth(langue))}
              disabled={submitting}
            >
              <GoogleIcon /><span>{t("continue_with_google")}</span>
            </button>

            <div className="switch-ask">
              <p>{t("no_account")} <button onClick={toggleAuthMode} className="link-strong">{t("register")}?</button></p>
            </div>
          </div>

          {/* REGISTER */}
          <div className={`auth-page ${!isLoginActive ? 'active' : 'hidden'}`}>
            <div className="form-header">
              <h1 className="form-title">{t("create_account")}</h1>
              <p className="form-subtitle">{t("join_community")}</p>
            </div>

            {errors.general && <div className="api-notice">{errors.general}</div>}

            <form onSubmit={handleSubmit} className="form-grid" noValidate aria-busy={submitting}>
              {/* USERNAME */}
              <div className="input-group">
                <input
                  type="text" name="username" value={formData.username} onChange={handleChange}
                  onFocus={handleFocus} onBlur={handleBlur} placeholder=" "
                  className={getInputClassName('username')} aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'err-username' : undefined}
                />
                <label>{t("username")}</label>
                <ErrorMessage id="err-username" visible={!!errors.username}>{errors.username}</ErrorMessage>
                <SuccessMessage id="success-username" visible={uniqueStatus.username === 'ok'}>
                  Nom d'utilisateur disponible
                </SuccessMessage>

                {/* Hint pour unicité */}
                <HintMessage id="hint-username" type="hint" placement="right" visible={showUsernameHint}>
                  {uniqueStatus.username === 'checking' && (
                    <span className="hint-row"><span className="mini-spinner" /> Vérification…</span>
                  )}
                  {uniqueStatus.username === 'taken' && (
                    <span>{uniqueMsg.username || "Ce nom d'utilisateur est déjà pris."}</span>
                  )}
                  {uniqueStatus.username === 'error' && (
                    <span>{uniqueMsg.username}</span>
                  )}
                </HintMessage>
              </div>

              {/* FIRST / LAST */}
              <div className="two-cols">
                <div className="input-group">
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                    placeholder=" " className={getInputClassName('firstName')} aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? 'err-first' : undefined}/>
                  <label>{t("first_name")}</label>
                  <ErrorMessage id="err-first" visible={!!errors.firstName}>{errors.firstName}</ErrorMessage>
                </div>

                <div className="input-group">
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                    placeholder=" " className={getInputClassName('lastName')} aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? 'err-last' : undefined}/>
                  <label>{t("last_name")}</label>
                  <ErrorMessage id="err-last" visible={!!errors.lastName}>{errors.lastName}</ErrorMessage>
                </div>
              </div>

              {/* EMAIL */}
              <div className="input-group">
                <input
                  type="email" name="email" value={formData.email} onChange={handleChange}
                  onFocus={handleFocus} onBlur={handleBlur} placeholder=" "
                  className={getInputClassName('email')} aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'err-email' : undefined}
                />
                <label>{t("email")}</label>
                <ErrorMessage id="err-email" visible={!!errors.email}>{errors.email}</ErrorMessage>
                <SuccessMessage id="success-email" visible={uniqueStatus.email === 'ok'}>
                  Email disponible
                </SuccessMessage>

                {/* Hint pour unicité */}
                <HintMessage id="hint-email" type="hint" placement="right" visible={showEmailHint}>
                  {uniqueStatus.email === 'checking' && (
                    <span className="hint-row"><span className="mini-spinner" /> Vérification…</span>
                  )}
                  {uniqueStatus.email === 'taken' && (
                    <span>{uniqueMsg.email || 'Cet email est déjà utilisé.'}</span>
                  )}
                  {uniqueStatus.email === 'error' && (
                    <span>{uniqueMsg.email}</span>
                  )}
                </HintMessage>
              </div>

              {/* PASSWORD */}
              <div className="input-group">
                <input
                  type={showPassword.register ? "text" : "password"} name="password" value={formData.password}
                  onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur}
                  onKeyUp={(e) => setCaps(prev => ({ ...prev, register: e.getModifierState('CapsLock') }))}
                  placeholder=" " className={getInputClassName('password')} aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'err-pass' : 'pw-pop'}
                />
                <label>{t("password")}</label>
                <button type="button" className="password-toggle" onClick={() => togglePasswordVisibility('register')}
                  aria-label={showPassword.register ? t('hide_password') : t('show_password')}>
                  <FontAwesomeIcon icon={showPassword.register ? faEyeSlash : faEye} />
                </button>

                <ErrorMessage id="err-pass" visible={!!errors.password}>{errors.password}</ErrorMessage>
                <HintMessage id="pw-pop" type="info" visible={!errors.password && (focusField === 'password' || !!formData.password)} placement="right">
                  {caps.register && <div className="helper-text warning">Verr. Maj activée</div>}
                  <PasswordStrength value={formData.password} />
                  <PasswordHints value={formData.password} />
                </HintMessage>
              </div>

              {/* CONFIRM */}
              <div className="input-group">
                <input
                  type={showPassword.confirm ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword}
                  onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur}
                  onKeyUp={(e) => setCaps(prev => ({ ...prev, confirm: e.getModifierState('CapsLock') }))}
                  placeholder=" " className={getInputClassName('confirmPassword')} aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'err-pass2' : undefined}
                />
                <label>{t("confirm_password")}</label>
                <button type="button" className="password-toggle" onClick={() => togglePasswordVisibility('confirm')}
                  aria-label={showPassword.confirm ? t('hide_password') : t('show_password')}>
                  <FontAwesomeIcon icon={showPassword.confirm ? faEyeSlash : faEye} />
                </button>
                <ErrorMessage id="err-pass2" visible={!!errors.confirmPassword}>{errors.confirmPassword}</ErrorMessage>
                {caps.confirm && (
                  <div className="helper-text warning">
                    Verr. Maj activée
                  </div>
                )}
              </div>

              {/* TERMS */}
              <div className="terms-block">
                <label className="checkbox">
                  <input
                    type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange}
                    aria-invalid={!!errors.acceptTerms || (submitAttempted && !formData.acceptTerms)}
                    aria-describedby={(errors.acceptTerms || (submitAttempted && !formData.acceptTerms)) ? 'err-terms' : undefined}
                  />
                  <span>{t("accept_terms")}</span>
                </label>
                <InlineError id="err-terms" visible={!!errors.acceptTerms || (submitAttempted && !formData.acceptTerms)}>
                  {t('acceptTermsRequired')}
                </InlineError>
              </div>

              <button type="submit" className="submit-btn" disabled={submitting || (submitAttempted && !formData.acceptTerms)}>
                {submitting
                  ? <div className='flex items-center justify-center gap-4'><LoadingComponent size={10} color="border-white"/>{t("loading")}</div>
                  : t("register")}
              </button>
            </form>

            <div className="switch-ask">
              <p>{t("have_account")} <button onClick={toggleAuthMode} className="link-strong">{t("connect")}</button></p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;