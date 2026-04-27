import { LogIn } from 'lucide-react';
import StatsBar from './StatsBar';
import UserMenu from './UserMenu';
import { useAuth } from '../contexts/AuthContext';

export default function Header({ stats, onLoginClick, onAdminClick }) {
  const { isLoggedIn } = useAuth();

  return (
    <header className="header" id="header">
      <div className="header__top-row">
        <div className="header__brand">
          <div className="header__logo">✍️</div>
          <h1 className="header__title">ExpressInEase</h1>
        </div>
        <div className="header__actions">
          {isLoggedIn ? (
            <UserMenu onAdminClick={onAdminClick} />
          ) : (
            <button className="header__login-btn" onClick={onLoginClick} id="login-btn">
              <LogIn size={16} /> Login
            </button>
          )}
        </div>
      </div>
      <p className="header__subtitle">A safe space to express your thoughts — anonymously</p>
      <StatsBar stats={stats} />
    </header>
  );
}
