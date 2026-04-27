import { useState } from 'react';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const reset = () => {
    setUsername(''); setPassword(''); setReferralCode(''); setError('');
  };

  const handleTabSwitch = (t) => {
    setTab(t); reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register(username, password, referralCode);
      }
      reset();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} id="auth-modal-overlay">
      <div className="modal auth-modal" id="auth-modal">
        <div className="modal__header">
          <h2 className="modal__title">
            {tab === 'login' ? 'Welcome Back' : 'Join the Space'}
          </h2>
          <button className="modal__close" onClick={onClose} id="auth-close">
            <X size={18} />
          </button>
        </div>

        <div className="auth-tabs" id="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => handleTabSwitch('login')}
            id="auth-tab-login"
          >
            <LogIn size={16} /> Login
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => handleTabSwitch('register')}
            id="auth-tab-register"
          >
            <UserPlus size={16} /> Register
          </button>
        </div>

        {error && <div className="auth-error" id="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="auth-username">Username</label>
            <input
              className="form-input"
              id="auth-username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              className="form-input"
              id="auth-password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-referral">Referral Code</label>
              <input
                className="form-input"
                id="auth-referral"
                type="text"
                placeholder="Enter referral code from an existing user"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                required
              />
              <span className="form-hint">You need an invite from an existing user to join</span>
            </div>
          )}

          <button
            className="modal__submit"
            id="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : tab === 'login'
                ? '🔑 Login'
                : '✨ Create Account'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
