// src/pages/auth/AuthPage.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faSignInAlt, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import './auth.css';
import LoadingComponent from '../../component/loading/LoadingComponent';
import Toaster from '../../component/toast/Toaster';
import { loginUser, registerUser, checkUnique, preVerifyEmail } from '../../features/auth/authActions';
import { startGoogleOAuth } from '../../features/auth/oauthActions';

import OtpModal from '../../component/otp/OtpModal';
import ForgotPasswordModal from '../../component/auth/ForgotPasswordModal';

/* ================= Illustrations web (SVG libres) ================= */
const THEME = 'securite';
const THEMES = {
  securite: {
    login:    'https://illustrations.popsy.co/white/security.svg',
    register: 'https://illustrations.popsy.co/white/user-account.svg',
  },
  ecommerce: {
    login:    'https://illustrations.popsy.co/white/online-shopping.svg',
    register: 'https://illustrations.popsy.co/white/creation-process.svg',
  },
  productivite: {
    login:    'https://illustrations.popsy.co/white/creation-process.svg',
    register: 'https://illustrations.popsy.co/white/rocket-launch.svg',
  }
};
const LOGIN_ILLU    = THEMES[THEME].login;
const REGISTER_ILLU = THEMES[THEME].register;

/* Icône Google */
const GoogleIcon = () => ( 
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ================== Messages UI utilitaires ================== */
const ErrorMessage = ({ id, children, visible }) => visible ? (
  <div id={id} className="field-pop error" role="alert">{children}</div>
) : null;

const SuccessMessage = ({ id, children, visible }) => visible ? (
  <div id={id} className="field-pop success" role="status">{children}</div>
) : null;

// forwardRef pour pouvoir gérer le drag depuis le parent
const HintMessage = React.forwardRef(
  (
    {
      id,
      type = 'hint',
      children,
      visible,
      placement = 'bottom',
      closable = false,
      onClose,
      draggable = false,
      onDragHandleMouseDown,
      style
    },
    ref
  ) => visible ? (
    <div
      id={id}
      ref={ref}
      role="status"
      className={`field-pop ${type} ${placement || ''} ${draggable ? 'is-draggable' : ''}`}
      style={style}
      onKeyDown={(e)=>{ if (closable && (e.key === 'Escape' || e.key === 'Esc')) onClose?.(); }}
      tabIndex={-1}
    >
      {closable && (
        <button
          type="button"
          aria-label="Fermer"
          title="Fermer"
          onClick={onClose}
          style={{
            position:'absolute', top:6, right:6, width:28, height:28,
            border:'none', borderRadius:6, cursor:'pointer', fontSize:16,
            background:'rgba(0,0,0,0.08)'
          }}
        >
          ×
        </button>
      )}
      {draggable && (
        <div
          role="button"
          aria-label="Déplacer (maintenir)"
          title="Déplacer (maintenir)"
          onMouseDown={onDragHandleMouseDown}
          style={{
            position:'absolute', left:6, top:6, padding:'4px 6px',
            cursor:'grab', userSelect:'none', fontWeight:600, letterSpacing:1
          }}
        >
          ⋮⋮
        </div>
      )}
      {children}
    </div>
  ) : null
);

const InlineError = ({ id, children, visible }) => visible ? (
  <div id={id} className="inline-error" role="alert">{children}</div>
) : null;

/* ================== Password helpers ================== */
const PasswordStrength = ({ value = '', t }) => {
  const tests = [(v)=>v.length>=8,(v)=>/[A-Z]/.test(v)&&/[a-z]/.test(v),(v)=>/\d/.test(v),(v)=>/[^A-Za-z0-9]/.test(v)];
  const score = tests.reduce((a,t)=>a+(t(value)?1:0),0);
  const label = value.length===0 ? t('auth.passwordStrength.start', 'Start typing your password')
    : (score<=1?t('auth.passwordStrength.veryWeak', 'Very weak')
      : score===2?t('auth.passwordStrength.weak', 'Weak')
      : score===3?t('auth.passwordStrength.good', 'Good')
      : t('auth.passwordStrength.strong', 'Strong'));
  return (
    <div className="strength" aria-live="polite">
      <div className="bars" aria-hidden="true">
        {[0,1,2,3].map(i => <span key={i} className={`bar ${value.length===0?'':(i<score?`on-${score}`:'')}`} />)}
      </div>
      <small className={`strength-label ${value.length===0?'s-0':`s-${score}`}`}>{label}</small>
    </div>
  );
};

const PasswordHints = ({ value = '', t }) => {
  const rules = [
    { id:'len',  label:t('auth.passwordHints.minLength', 'At least 8 characters'), test:v=>v.length>=8 },
    { id:'case', label:t('auth.passwordHints.mixedCase', 'Uppercase & lowercase letters'), test:v=>/[A-Z]/.test(v)&&/[a-z]/.test(v) },
    { id:'num',  label:t('auth.passwordHints.number', 'At least one number'), test:v=>/\d/.test(v) },
    { id:'spec', label:t('auth.passwordHints.specialChar', 'At least one special character (!@#)'), test:v=>/[^A-Za-z0-9]/.test(v) }
  ];
  return <ul className="pw-hints" aria-live="polite">
    {rules.map(r => <li key={r.id} className={r.test(value)?'ok':''}><i aria-hidden="true" /> {r.label}</li>)}
  </ul>;
};

/* ================== Utils ================== */
const slugify = (s='') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/[^a-z0-9\s]/g,'').trim().replace(/\s+/g,'');

const isLaravelUnique = (msg='') => /(already been taken|déjà.*pris|déjà.*utilisé|déjà.*utilisée|unique)/i.test(msg);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ===== Détection du "fixed containing block" pour corriger le décalage au drag ===== */
function getFixedContainingBlock(node) {
  let el = node?.parentElement;
  while (el && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    if (
      cs.transform !== 'none' ||
      cs.filter !== 'none' ||
      cs.perspective !== 'none' ||
      (cs.contain && /paint|layout|strict|content/.test(cs.contain))
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null; // sinon: viewport
}

const AuthPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { auth: { isAuthenticated }, langue } = useSelector(s => s.library);

  const [isLoginActive, setIsLoginActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username:'', firstName:'', lastName:'',
    email:'', password:'', confirmPassword:'',
    rememberMe:false, acceptTerms:false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState({ login:false, register:false, confirm:false });
  const [caps, setCaps] = useState({ login:false, register:false, confirm:false });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [focusField, setFocusField] = useState(null);
  const [uniqueStatus, setUniqueStatus] = useState({ email:'idle', username:'idle' });
  const [uniqueMsg, setUniqueMsg] = useState({ email:'', username:'' });
  const [uSuggest, setUSuggest] = useState('');

  // Contrôle bulle d'aide
  const [pwHintsOpen, setPwHintsOpen] = useState(true);
  const [pwHintFloating, setPwHintFloating] = useState(false);
  const [pwHintPos, setPwHintPos] = useState({ left: 0, top: 0 });
  const pwHintRef = useRef(null);

  // OTP modal & pending payloads
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCtx, setOtpCtx] = useState({ email: '', ttl: 120, intent: 'login' });
  const [pendingLogin, setPendingLogin] = useState(null);
  const [pendingRegister, setPendingRegister] = useState(null);

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false);

  // useEffect(()=>{ if(isAuthenticated) navigate('/'); },[isAuthenticated,navigate]);

  // ✅ Pré-remplir email si mémorisé (remember_email en localStorage)
  useEffect(() => {
    try {
      const remembered = localStorage.getItem('remember_email');
      if (remembered) {
        setFormData(p => ({ ...p, email: remembered, rememberMe: true }));
      }
    } catch {}
  }, []);

  const progress = useMemo(()=>{
    if(isLoginActive){
      let c = 0;
      if(formData.email && emailRegex.test(formData.email)) c++;
      if(formData.password && formData.password.length>=8) c++;
      return Math.round((c/2)*100);
    } else {
      let c = 0, total = 7;
      if(formData.firstName.trim()) c++;
      if(formData.lastName.trim()) c++;
      if(formData.username.trim().length>=3) c++;
      if(formData.email && emailRegex.test(formData.email)) c++;
      if(formData.password.length>=8) c++;
      if(formData.confirmPassword && formData.confirmPassword===formData.password) c++;
      if(formData.acceptTerms) c++;
      return Math.round((c/total)*100);
    }
  }, [isLoginActive, formData]);

  useEffect(()=>{
    if(isLoginActive) return;
    if(formData.username.trim()) { setUSuggest(''); return; }
    const base = slugify(`${formData.firstName} ${formData.lastName}`);
    if(base.length>=3) setUSuggest(base.slice(0,18));
    else setUSuggest('');
  }, [isLoginActive, formData.firstName, formData.lastName, formData.username]);

  const toggleAuthMode = () => {
    setIsLoginActive(v => !v);
    setErrors({});
    setFormData({
      username:'', firstName:'', lastName:'',
      email:'', password:'', confirmPassword:'',
      rememberMe:false, acceptTerms:false
    });
    setSubmitAttempted(false);
    setFocusField(null);
    setUniqueStatus({ email:'idle', username:'idle' });
    setUniqueMsg({ email:'', username:'' });
    setUSuggest('');
    // reset bulle
    setPwHintsOpen(true);
    setPwHintFloating(false);
  };

  const handleFocus = (e)=>{
    setFocusField(e.target.name);
    if(e.target.name === 'password') setPwHintsOpen(true);
  };
  const handleBlur  = ()=>setFocusField(null);

  const handleChange = (e)=>{
    const { name, value, type, checked } = e.target;
    setFormData(p=>({ ...p, [name]: type==='checkbox'?checked:value }));
    if(errors[name]) setErrors(p=>({ ...p, [name]:'' }));
    if(name==='email'||name==='username'){
      setUniqueStatus(p=>({ ...p, [name]:'idle' }));
      setUniqueMsg   (p=>({ ...p, [name]:'' }));
    }
  };

  const validateForm = ()=>{
    const ne = {};
    if(!formData.email.trim()) ne.email=t('email_required');
    else if(!emailRegex.test(formData.email)) ne.email=t('invalid_email');
    if(!formData.password.trim()) ne.password=t('password_required');
    else if(formData.password.length<8) ne.password=t('password_min_length');
    if(!isLoginActive){
      if(!formData.username.trim()) ne.username=t('username_required');
      else if(formData.username.length<3) ne.username=t('username_too_short');
      if(!formData.firstName.trim()) ne.firstName=t('field_required');
      if(!formData.lastName.trim())  ne.lastName=t('field_required');
      if(formData.password!==formData.confirmPassword) ne.confirmPassword=t('password_mismatch');
      if(!formData.acceptTerms) ne.acceptTerms=t('acceptTermsRequired');
    }
    setErrors(ne);
    return Object.keys(ne).length===0;
  };

  const debounceMs = 450;
  const debouncedEmail = useMemo(()=>formData.email,[formData.email]);
  const debouncedUsername = useMemo(()=>formData.username,[formData.username]);

  useEffect(()=>{
    if(isLoginActive) return;
    if(!debouncedEmail || !emailRegex.test(debouncedEmail)) return;
    const ctrl=new AbortController();
    const tmr=setTimeout(async()=>{
      try{
        setUniqueStatus(s=>({ ...s, email:'checking' }));
        const res=await checkUnique('email', debouncedEmail, undefined, langue);
        if(ctrl.signal.aborted) return;
        if(res?.unique){ setUniqueStatus(s=>({ ...s, email:'ok' })); setUniqueMsg(m=>({ ...m, email:'' })); }
        else { setUniqueStatus(s=>({ ...s, email:'taken' })); setUniqueMsg(m=>({ ...m, email:res?.message || t('auth.unique.emailTaken', 'Email already taken') })); }
      }catch{ if(!ctrl.signal.aborted){ setUniqueStatus(s=>({ ...s, email:'error' })); setUniqueMsg(m=>({ ...m, email: t('auth.unique.checkUnavailable', 'Check unavailable') })); } }
    },debounceMs);
    return ()=>{ ctrl.abort(); clearTimeout(tmr); };
  },[debouncedEmail,isLoginActive,langue,t]);

  useEffect(()=>{
    if(isLoginActive) return;
    if(!debouncedUsername || debouncedUsername.trim().length<3) return;
    const ctrl=new AbortController();
    const tmr=setTimeout(async()=>{
      try{
        setUniqueStatus(s=>({ ...s, username:'checking' }));
        const res=await checkUnique('username', debouncedUsername.trim(), undefined, langue);
        if(ctrl.signal.aborted) return;
        if(res?.unique){ setUniqueStatus(s=>({ ...s, username:'ok' })); setUniqueMsg(m=>({ ...m, username:'' })); }
        else { setUniqueStatus(s=>({ ...s, username:'taken' })); setUniqueMsg(m=>({ ...m, username:res?.message || t('auth.unique.usernameTaken', 'Username already taken') })); }
      }catch{ if(!ctrl.signal.aborted){ setUniqueStatus(s=>({ ...s, username:'error' })); setUniqueMsg(m=>({ ...m, username: t('auth.unique.checkUnavailable', 'Check unavailable') })); } }
    },debounceMs);
    return ()=>{ ctrl.abort(); clearTimeout(tmr); };
  },[debouncedUsername,isLoginActive,langue,t]);

  const handleSubmit = async (e)=>{
    e.preventDefault();
    setSubmitAttempted(true);
    if(!validateForm()) return;

    if(isLoginActive){
      try{
        setSubmitting(true);
        const pre = await dispatch(preVerifyEmail(formData.email, langue, 'login'));
        setPendingLogin({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
          langue
        });
        setOtpCtx({ email: formData.email, ttl: Math.max(30, pre?.ttl || 120), intent: 'login' });
        setOtpOpen(true);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if(!isLoginActive){
      if(uniqueStatus.email==='taken'||uniqueStatus.username==='taken') return;
      setSubmitting(true);
      try{
        const pre = await dispatch(preVerifyEmail(formData.email, langue, 'register'));
        setPendingRegister({
          username:formData.username,
          first_name:formData.firstName,
          last_name:formData.lastName,
          email:formData.email,
          password:formData.password,
          password_confirmation:formData.confirmPassword,
          langue
        });
        setOtpCtx({ email: formData.email, ttl: Math.max(30, pre?.ttl || 120), intent: 'register' });
        setOtpOpen(true);
      } finally { setSubmitting(false); }
      return;
    }
  };

  const onOtpVerified = async () => {
    setOtpOpen(false);
    setSubmitting(true);
    try {
      if (otpCtx.intent === 'login' && pendingLogin) {
        await dispatch(loginUser(pendingLogin));
        setPendingLogin(null);
      } else if (otpCtx.intent === 'register' && pendingRegister) {
        await dispatch(registerUser(pendingRegister));
        setPendingRegister(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = (field)=> setShowPassword(p=>({ ...p, [field]: !p[field] }));
  const getInputClassName = (name)=>{
    if(errors[name]) return 'invalid';
    if(name==='email' && uniqueStatus.email==='ok') return 'valid';
    if(name==='username' && uniqueStatus.username==='ok') return 'valid';
    if(name==='confirmPassword' && formData.confirmPassword && formData.confirmPassword===formData.password) return 'valid';
    return '';
  };

  /* ===== Drag corrigé: soustraction du rect de l'ancêtre transformé ===== */
  const startPwHintDrag = useCallback((e) => {
    const el = pwHintRef.current;
    if (!el || (e.button !== undefined && e.button !== 0)) return; // click gauche uniquement
    e.preventDefault();

    const rect = el.getBoundingClientRect();
    const fcb  = getFixedContainingBlock(el); // ancêtre transformé, ou null
    const base = fcb ? fcb.getBoundingClientRect() : { left: 0, top: 0 };

    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    setPwHintFloating(true);
    setPwHintPos({ left: rect.left - base.left, top: rect.top - base.top });

    const onMove = (ev) => {
      setPwHintPos({
        left: Math.max(8, ev.clientX - offsetX - base.left),
        top:  Math.max(8, ev.clientY - offsetY - base.top),
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <>
      <div className='z-50'>
        <Toaster />
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        open={forgotOpen}
        onClose={()=>setForgotOpen(false)}
        defaultEmail={formData.email}
        langue={langue}
      />

      {/* OTP Modal */}
      <OtpModal
        open={otpOpen}
        email={otpCtx.email}
        langue={langue}
        intent={otpCtx.intent}
        initialTtlSec={otpCtx.ttl}
        onVerified={onOtpVerified}
        onClose={()=>setOtpOpen(false)}
      />

      <div className="min-h-screen flex items-center justify-center p-4 bg-bleu-pale">
        <div className="auth-container card flat" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <button
            onClick={toggleAuthMode}
            className="floating-btn"
            title={isLoginActive ? t("signup") : t("login")}
            aria-label={isLoginActive ? t("signup") : t("login")}
          >
            <FontAwesomeIcon icon={isLoginActive ? faUserPlus : faSignInAlt} className="text-xl" />
          </button>

          {/* LOGIN */}
          <div className={`auth-page login ${isLoginActive ? 'active slide-left' : 'hidden'}`}>
            <div className="auth-layout auth-layout--media-left">
              <aside className="auth-media" aria-hidden="true">
                <img src={LOGIN_ILLU} alt="" className="auth-media-img img-fade" onError={(e)=>{ e.currentTarget.style.display='none'; }} loading="eager"/>
                <div className="auth-media-overlay">
                  <h3>{t('auth.media.login.title', 'Login')}</h3>
                  <p>{t('auth.media.login.subtitle', 'Access your space securely')}</p>
                </div>
                <div className="auth-media-fallback">
                  <span className="badge">UI</span>
                  <h4>{t('auth.media.fallback.title', 'Printing consumables sales')}</h4>
                  <ul>
                    <li>{t('auth.media.fallback.dtf', 'DTF — Powders & Films')}</li>
                    <li>{t('auth.media.fallback.eco', 'Eco-solvent — DX5/DX7')}</li>
                    <li>{t('auth.media.fallback.sub', 'Sublimation — Textile & transfer')}</li>
                  </ul>
                </div>
              </aside>

              <div className="auth-form ">
                <div className="form-header">
                  <h1 id="auth-title" className="form-title">{t('welcome_back')}</h1>
                  <p className="form-subtitle">{t('login_to_account')}</p>
                  <div className="form-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <span style={{'--p': `${progress}%`}} />
                  </div>
                </div>

                {errors.general && <div className="api-notice">{errors.general}</div>}

                <form onSubmit={handleSubmit} className="space-y-6 w-2xl" noValidate aria-busy={submitting}>
                  <div className="input-group has-icon">
                    <input type="email" name="email" value={formData.email} onChange={handleChange}
                      onFocus={handleFocus} onBlur={handleBlur} placeholder=" "
                      className={getInputClassName('email')} autoComplete="username"
                      aria-invalid={!!errors.email} aria-describedby={errors.email ? 'err-email-login' : undefined}/>
                    <label>{t("email")}</label>
                    <span className="input-icon">@</span>
                    <span className="right-mark">✓</span>
                    <ErrorMessage id="err-email-login" visible={!!errors.email}>{errors.email}</ErrorMessage>
                  </div>

                  <div className="input-group has-icon">
                    <input type={showPassword.login ? "text" : "password"} name="password" value={formData.password}
                      onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur}
                      onKeyUp={(e)=>setCaps(p=>({ ...p, login: e.getModifierState('CapsLock') }))}
                      placeholder=" " className={getInputClassName('password')} autoComplete="current-password"
                      aria-invalid={!!errors.password} aria-describedby={errors.password ? 'err-pass-login' : undefined}/>
                    <label>{t("password")}</label>
                    <span className="input-icon">🔒</span>
                    <button type="button" className="password-toggle" onClick={()=>togglePasswordVisibility('login')}
                      aria-label={showPassword.login ? t('auth.hidePassword') : t('auth.showPassword')}>
                      <FontAwesomeIcon icon={showPassword.login ? faEyeSlash : faEye} />
                    </button>
                    <ErrorMessage id="err-pass-login" visible={!!errors.password}>{errors.password}</ErrorMessage>
                    {caps.login && <div className="helper-text warning">{t('auth.capsLock', 'Caps Lock is on')}</div>}
                  </div>

                  <div className="form-row justify-between w-full  flex items-center px-2 py-1 rounded">
                    <label className="checkbox">
                      <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} />
                      <span>{t("remember_me")}</span>
                    </label>
                    <button type="button" className="link" onClick={()=>setForgotOpen(true)}>
                      {t("forgot_password")}
                    </button>
                  </div>

                  <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting
                      ? <div className='flex items-center justify-center gap-4'><LoadingComponent size={5} color="border-white"/>{t("loading")}</div>
                      : t("connect")}
                  </button>
                </form>

                <div className="or-line"><span>{t("login_with")}</span></div>
                <button type="button" className="google-btn" onClick={()=>dispatch(startGoogleOAuth(langue))} disabled={submitting}>
                  <GoogleIcon /><span>{t("continue_with_google")}</span>
                </button>

                <div className="switch-ask">
                  <p>{t("no_account")} <button onClick={toggleAuthMode} className="link-strong">{t("register")}?</button></p>
                </div>
              </div>
            </div>
          </div>

          {/* REGISTER */}
          <div className={`auth-page register ${!isLoginActive ? 'active slide-right' : 'hidden'}`}>
            <div className="auth-layout auth-layout--media-right">
              <div className="auth-form ">
                <div className="form-header">
                  <h1 className="form-title">{t("create_account")}</h1>
                  <p className="form-subtitle">{t("join_community")}</p>
                  <div className="form-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <span style={{'--p': `${progress}%`}} />
                  </div>
                </div>

                {errors.general && <div className="api-notice">{errors.general}</div>}

                <form onSubmit={handleSubmit} className="form-grid" noValidate aria-busy={submitting}>
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

                  <div className="two-cols">
                    <div className="input-group has-icon">
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder=" "
                        maxLength={20}
                        className={getInputClassName('username')}
                        aria-invalid={!!errors.username}
                        aria-describedby={errors.username ? 'err-username' : undefined}
                      />
                      <label>{t("username")}</label>
                      <span className="input-icon">👤</span>
                      <span className="right-mark">✓</span>
                      {uSuggest && !formData.username && (
                        <button type="button" className="suggest-pill" onClick={()=>setFormData(p=>({...p, username: uSuggest}))}
                          title={t('auth.useSuggestion', 'Use suggestion')}>@{uSuggest}</button>
                      )}
                      <small className="char-counter">{formData.username.length}/20</small>

                      <ErrorMessage id="err-username" visible={!!errors.username}>{errors.username}</ErrorMessage>
                      <SuccessMessage id="success-username" visible={uniqueStatus.username === 'ok'}>
                        {t('auth.unique.usernameAvailable', 'Username available')}
                      </SuccessMessage>
                      <HintMessage id="hint-username" type="hint" placement="right" visible={!!formData.username && (['checking','taken','error'].includes(uniqueStatus.username))}>
                        {uniqueStatus.username === 'checking' && <span className="hint-row"><span className="mini-spinner" /> {t('auth.unique.checking', 'Checking...')}</span>}
                        {uniqueStatus.username === 'taken' && <span>{uniqueMsg.username || t('auth.unique.usernameTaken', 'Username already taken')}</span>}
                        {uniqueStatus.username === 'error' && <span>{uniqueMsg.username}</span>}
                      </HintMessage>
                    </div>

                    <div className="input-group has-icon">
                      <input type="email" name="email" value={formData.email} onChange={handleChange}
                        onFocus={handleFocus} onBlur={handleBlur} placeholder=" "
                        className={getInputClassName('email')} aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'err-email' : undefined}/>
                      <label>{t("email")}</label>
                      <span className="input-icon">@</span>
                      <span className="right-mark">✓</span>
                      <ErrorMessage id="err-email" visible={!!errors.email}>{errors.email}</ErrorMessage>
                      <SuccessMessage id="success-email" visible={uniqueStatus.email === 'ok'}>
                        {t('auth.unique.emailAvailable', 'Email available')}
                      </SuccessMessage>
                      <HintMessage id="hint-email" type="hint" placement="right" visible={!!formData.email && (['checking','taken','error'].includes(uniqueStatus.email))}>
                        {uniqueStatus.email === 'checking' && <span className="hint-row"><span className="mini-spinner" /> {t('auth.unique.checking', 'Checking...')}</span>}
                        {uniqueStatus.email === 'taken' && <span>{uniqueMsg.email || t('auth.unique.emailTaken', 'Email already taken')}</span>}
                        {uniqueStatus.email === 'error' && <span>{uniqueMsg.email}</span>}
                      </HintMessage>
                    </div>
                  </div>

                  <div className="two-cols">
                    <div className="input-group has-icon">
                      <input type={showPassword.register ? "text" : "password"} name="password" value={formData.password}
                        onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur}
                        onKeyUp={(e)=>setCaps(p=>({ ...p, register: e.getModifierState('CapsLock') }))}
                        placeholder=" " className={getInputClassName('password')} aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'err-pass' : 'pw-pop'}/>
                      <label>{t("password")}</label>
                      <span className="input-icon">🔒</span>
                      <button type="button" className="password-toggle" onClick={()=>togglePasswordVisibility('register')}
                        aria-label={showPassword.register ? t('auth.hidePassword') : t('auth.showPassword')}>
                        <FontAwesomeIcon icon={showPassword.register ? faEyeSlash : faEye} />
                      </button>
                      <ErrorMessage id="err-pass" visible={!!errors.password}>{errors.password}</ErrorMessage>

                      {/* Bulle d'aide: fermable + draggable (corrigée pour offset) */}
                      <HintMessage
                        ref={pwHintRef}
                        id="pw-pop"
                        type="info"
                        visible={!errors.password && pwHintsOpen && (focusField==='password'||!!formData.password)}
                        placement={pwHintFloating ? '' : 'right'}
                        closable
                        onClose={()=>setPwHintsOpen(false)}
                        draggable
                        onDragHandleMouseDown={startPwHintDrag}
                        style={pwHintFloating ? {
                          position:'fixed',
                          left: pwHintPos.left,
                          top: pwHintPos.top,
                          zIndex: 1000,
                          maxWidth: 'min(360px, 85vw)'
                        } : undefined}
                      >
                        {caps.register && <div className="helper-text warning" style={{paddingTop:26}}>{t('auth.capsLock', 'Caps Lock is on')}</div>}
                        <div style={{paddingTop: pwHintFloating ? 28 : 0}}>
                          <PasswordStrength value={formData.password} t={t} />
                          <PasswordHints value={formData.password} t={t} />
                          {pwHintFloating && (
                            <button
                              type="button"
                              onClick={()=>{ setPwHintFloating(false); }}
                              className="mini-link"
                              style={{ marginTop: 8, background:'none', border:'none', textDecoration:'underline', cursor:'pointer' }}
                            >
                              {t('auth.resetPosition', 'Reset to default position')}
                            </button>
                          )}
                        </div>
                      </HintMessage>
                    </div>

                    <div className="input-group has-icon">
                      <input type={showPassword.confirm ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword}
                        onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur}
                        onKeyUp={(e)=>setCaps(p=>({ ...p, confirm: e.getModifierState('CapsLock') }))}
                        placeholder=" " className={getInputClassName('confirmPassword')} aria-invalid={!!errors.confirmPassword}
                        aria-describedby={errors.confirmPassword ? 'err-pass2' : undefined}/>
                      <label>{t("confirm_password")}</label>
                      <span className="input-icon">🔒</span>
                      <button type="button" className="password-toggle" onClick={()=>togglePasswordVisibility('confirm')}
                        aria-label={showPassword.confirm ? t('auth.hidePassword') : t('auth.showPassword')}>
                        <FontAwesomeIcon icon={showPassword.confirm ? faEyeSlash : faEye} />
                      </button>
                      {formData.confirmPassword && formData.confirmPassword===formData.password && (
                        <span className="right-mark">✓</span>
                      )}
                      <ErrorMessage id="err-pass2" visible={!!errors.confirmPassword}>{errors.confirmPassword}</ErrorMessage>
                    </div>
                  </div>

                  <div className="terms-block">
                    <label className="checkbox">
                      <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange}/>
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

              <aside className="auth-media" aria-hidden="true">
                <img src={REGISTER_ILLU} alt="" className="auth-media-img img-fade" onError={(e)=>{ e.currentTarget.style.display='none'; }} loading="eager"/>
                <div className="auth-media-overlay">
                  <h3>{t('auth.media.register.title', 'Registration')}</h3>
                  <p>{t('auth.media.register.subtitle', 'Join the community and get started')}</p>
                </div>
                <div className="auth-media-fallback">
                  <span className="badge">UI</span>
                  <h4>{t('auth.media.fallback.createAccount', 'Create an account')}</h4>
                  <ul>
                    <li>{t('auth.media.fallback.nameEmail', 'Name, first name, email')}</li>
                    <li>{t('auth.media.fallback.uniqueUsername', 'Unique username')}</li>
                    <li>{t('auth.media.fallback.strongPassword', 'Strong password')}</li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;