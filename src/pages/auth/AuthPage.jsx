import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faSignInAlt, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loginUser, registerUser } from '../../features/auth/authActions';
import './auth.css';
import LoadingComponent from '../../component/loading/LoadingComponent';
import Toaster from '../../component/toast/Toaster';

const AuthPage = () => {
  const GoogleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      <path d="M1 1h22v22H1z" fill="none"/>
    </svg>
  );
  
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { auth: { isAuthenticated, loading, error: authError }, langue } = useSelector(state => state.library);
  
  const [isLoginActive, setIsLoginActive] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
    acceptTerms: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState({
    login: false,
    register: false,
    confirm: false
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const toggleAuthMode = () => {
    setIsLoginActive(!isLoginActive);
    setErrors({});
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      rememberMe: false,
      acceptTerms: false
    });
    setSubmitAttempted(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = t('email_required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('invalid_email');
    }

    if (!formData.password.trim()) {
      newErrors.password = t('password_required');
    } else if (formData.password.length < 8) {
      newErrors.password = t('password_min_length');
    }

    if (!isLoginActive) {
      if (!formData.username.trim()) {
        newErrors.username = t('username_required');
      } else if (formData.username.length < 3) {
        newErrors.username = t('username_too_short');
      }

      if (!formData.firstName.trim()) {
        newErrors.firstName = t('field_required');
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = t('field_required');
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('password_mismatch');
      }
      if (!formData.acceptTerms) {
        newErrors.acceptTerms = t('acceptTermsRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
    
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    if (!validateForm()) return;

    try {
      if (isLoginActive) {
        await dispatch(loginUser({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
          langue: langue
        }));
      } else {
        const result = await dispatch(registerUser({
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.confirmPassword,
          acceptTerms: formData.acceptTerms,
          langue: langue,
        }));

        if (result.error) {
          const apiErrors = result.payload?.errors || {};
          const formattedErrors = {};
          
          if (apiErrors.email && apiErrors.email.some(err => err.includes('already been taken'))) {
            formattedErrors.email = t('email_taken');
          }
          
          Object.keys(apiErrors).forEach(key => {
            if (!formattedErrors[key]) {
              const errorMessage = apiErrors[key][0];
              
              switch(key) {
                case 'username':
                  formattedErrors.username = errorMessage.includes('required') 
                    ? t('username_required')
                    : errorMessage.includes('already been taken')
                    ? t('username_taken')
                    : t('username_invalid');
                  break;
                  
                case 'password':
                  formattedErrors.password = errorMessage.includes('required')
                    ? t('password_required')
                    : errorMessage.includes('least 8 characters')
                    ? t('password_min_length')
                    : t('password_invalid');
                  break;
                  
                case 'first_name':
                case 'last_name':
                  formattedErrors[key] = errorMessage.includes('required')
                    ? t('field_required')
                    : t('field_invalid');
                  break;
                  
                case 'password_confirmation':
                  formattedErrors.confirmPassword = errorMessage.includes('match')
                    ? t('password_mismatch')
                    : t('confirmation_required');
                  break;
                  
                default:
                  formattedErrors[key] = errorMessage;
              }
            }
          });
          
          setErrors(formattedErrors);
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      setErrors({ general: t('an_error_has_occurred') });
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen flex items-center justify-center p-4 bg-bleu-pale">
        <div className="auth-container">
          <button
            onClick={toggleAuthMode}
            className="floating-btn"
            title={isLoginActive ? t("signup") : t("login")}
            disabled={loading}
          >
            <FontAwesomeIcon 
              icon={isLoginActive ? faUserPlus : faSignInAlt} 
              className="text-xl" 
            />
          </button>

          {/* Login Page */}
          <div className={`auth-page login-page ${isLoginActive ? 'active' : ''}`}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-bleu-fonce mb-2">
                {t('welcome_back')}
              </h1>
              <p className="text-bleu-moyen">{t('login_to_account')}</p>
            </div>

            {(errors.general || authError) && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {errors.general || authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="input-group">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder=" "
                  className={errors.email ? 'invalid' : ''}
                  disabled={loading}
                />
                <label>{t("email")}</label>
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="input-group">
                <input
                  type={showPassword.login ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder=" "
                  className={errors.password ? 'invalid' : ''}
                  disabled={loading}
                />
                <label>{t("password")}</label>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('login')}
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={showPassword.login ? faEyeSlash : faEye} />
                </button>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 text-bleu-accent rounded focus:ring-bleu-accent border-bleu-pale"
                    disabled={loading}
                  />
                  <label htmlFor="rememberMe" className="ml-2 text-sm text-bleu-moyen">
                    {t("remember_me")}
                  </label>
                </div>
                <button 
                  type="button" 
                  className="text-sm text-bleu-accent hover:text-bleu-fonce transition-all"
                  disabled={loading}
                >
                  {t("forgot_password")}
                </button>
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <div className='flex items-center justify-center gap-4'>
                    <LoadingComponent size={5} color="border-white"/>  
                    {t("loading")} 
                  </div>
                ) : (
                  t("connect")
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-bleu-moyen">
                {t("no_account")}{' '}
                <button
                  onClick={toggleAuthMode}
                  className="text-bleu-accent font-medium hover:text-bleu-fonce transition-all"
                  disabled={loading}
                >
                  {t("register")}?
                </button>
              </p>
            </div>

            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-gray-300 opacity-50"></div>
              <span className="mx-4 text-bleu-moyen">{t("login_with")}</span>
              <div className="flex-grow border-t border-gray-300 opacity-50"></div>
            </div>

            <button 
              className="google-btn"
              disabled={loading}
            >
              <GoogleIcon />
              <span>{t("continue_with_google")}</span>
            </button>
          </div>

          {/* Register Page */}
          <div className={`auth-page register-page ${!isLoginActive ? 'active' : ''}`}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-bleu-fonce mb-2">{t("create_account")}</h1>
              <p className="text-bleu-moyen">{t("join_community")}</p>
            </div>

            {(errors.general || authError) && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {errors.general || authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="input-group">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder=" "
                  className={errors.username ? 'invalid' : ''}
                  disabled={loading}
                />
                <label>{t("username")}</label>
                {errors.username && (
                  <span className="error-message">{errors.username}</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <div className="input-group">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder=" "
                    className={errors.firstName ? 'invalid' : ''}
                    disabled={loading}
                  />
                  <label>{t("first_name")}</label>
                  {errors.firstName && (
                    <span className="error-message">{errors.firstName}</span>
                  )}
                </div>

                <div className="input-group">
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder=" "
                    className={errors.lastName ? 'invalid' : ''}
                    disabled={loading}
                  />
                  <label>{t("last_name")}</label>
                  {errors.lastName && (
                    <span className="error-message">{errors.lastName}</span>
                  )}
                </div>
              </div>

              <div className="input-group">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder=" "
                  className={errors.email ? 'invalid' : ''}
                  disabled={loading}
                />
                <label>{t("email")}</label>
                {errors.email && (
                  <span className="error-message">
                    {errors.email}
                    {errors.email === t('email_taken') && (
                      <button 
                        onClick={toggleAuthMode}
                        className="ml-2 text-bleu-accent hover:underline"
                      >
                        {t("login_instead")}
                      </button>
                    )}
                  </span>
                )}
              </div>

              <div className="input-group">
                <input
                  type={showPassword.register ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder=" "
                  className={errors.password ? 'invalid' : ''}
                  disabled={loading}
                />
                <label>{t("password")}</label>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('register')}
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={showPassword.register ? faEyeSlash : faEye} />
                </button>
                {errors.password && (
                  <span className="error-message">{errors.password}</span>
                )}
              </div>

              <div className="input-group">
                <input
                  type={showPassword.confirm ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder=" "
                  className={errors.confirmPassword ? 'invalid' : ''}
                  disabled={loading}
                />
                <label>{t("confirm_password")}</label>
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={showPassword.confirm ? faEyeSlash : faEye} />
                </button>
                {errors.confirmPassword && (
                  <span className="error-message">{errors.confirmPassword}</span>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className={`w-4 h-4 text-bleu-accent rounded focus:ring-bleu-accent border-bleu-pale ${
                    (errors.acceptTerms || (submitAttempted && !formData.acceptTerms)) ? 'border-red-500' : ''
                  }`}
                  disabled={loading}
                />
                <label htmlFor="acceptTerms" className="ml-2 text-sm text-bleu-moyen">
                  {t("accept_terms")}
                </label>
              </div>
              {(errors.acceptTerms || (submitAttempted && !formData.acceptTerms)) && (
                <div className="error-message mt-2">{t('acceptTermsRequired')}</div>
              )}

              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading || (submitAttempted && !formData.acceptTerms)}
              >
                {loading ? (
                  <div className='flex items-center justify-center gap-4'>
                    <LoadingComponent size={10} color="border-white"/> 
                    {t("loading")}
                  </div>
                ) : (
                  t("register")
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-bleu-moyen">
                {t("have_account")}{' '}
                <button
                  onClick={toggleAuthMode}
                  className="text-bleu-accent font-medium hover:text-bleu-fonce transition-all"
                  disabled={loading}
                >
                  {t("connect")}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;