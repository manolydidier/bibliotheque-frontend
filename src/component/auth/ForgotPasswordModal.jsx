import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch } from 'react-redux';
import LoadingComponent from '../loading/LoadingComponent';
import { requestPasswordReset } from '../../features/auth/passwordActions';

const ForgotPasswordModal = ({ open, onClose, defaultEmail = '', langue = 'fr' }) => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState(defaultEmail || '');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  // réinitialise champs à chaque ouverture
  useEffect(() => {
    if (open) { setEmail(defaultEmail || ''); setInfo(''); setError(''); }
  }, [open, defaultEmail]);

  // fermeture via ESC
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape' && open) onClose?.(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setInfo(''); setError('');
    if (!email.trim()) { setError('Veuillez saisir votre email.'); return; }
    try {
      setLoading(true);
      await dispatch(requestPasswordReset({ email, langue })).unwrap();
      setInfo("Si un compte existe, un lien de réinitialisation vous a été envoyé.");
    } catch (err) {
      setError(err?.message || 'Erreur inattendue.');
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      aria-hidden="false"
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="fp-title">
        <div className="modal-header">
          <h3 id="fp-title">Mot de passe oublié</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="input-group has-icon">
            <input
              type="email"
              placeholder=" "
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
            <label>Email</label>
            <span className="input-icon">@</span>
          </div>

          {info && <div className="field-pop success" role="status">{info}</div>}
          {error && <div className="inline-error" role="alert">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading
              ? <span className="flex items-center justify-center gap-3">
                  <LoadingComponent size={8} color="border-white"/> Envoi…
                </span>
              : "Envoyer le lien"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ForgotPasswordModal;
