import { useState, useRef, useEffect } from 'react';
import { User, Copy, Shield, LogOut, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserMenu({ onAdminClick }) {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div className="user-menu" ref={menuRef} id="user-menu">
      <button
        className="user-menu__trigger"
        onClick={() => setOpen(!open)}
        id="user-menu-trigger"
      >
        <div className="user-menu__avatar">
          <User size={16} />
        </div>
        <span className="user-menu__name">{user.username}</span>
        <ChevronDown size={14} className={`user-menu__arrow ${open ? 'user-menu__arrow--open' : ''}`} />
      </button>

      {open && (
        <div className="user-menu__dropdown" id="user-menu-dropdown">
          <div className="user-menu__item user-menu__referral" onClick={handleCopyReferral} id="copy-referral">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <div className="user-menu__referral-info">
              <span className="user-menu__referral-label">My Referral Code</span>
              <span className="user-menu__referral-code">{user.referral_code}</span>
            </div>
          </div>

          {isAdmin && (
            <button className="user-menu__item" onClick={() => { onAdminClick(); setOpen(false); }} id="admin-panel-btn">
              <Shield size={16} />
              Admin Panel
            </button>
          )}

          <button className="user-menu__item user-menu__logout" onClick={logout} id="logout-btn">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
