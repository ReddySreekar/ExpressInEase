import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2, Flag } from 'lucide-react';
import { CATEGORIES, REACTION_EMOJIS, addReaction } from '../api';
import { useAuth } from '../contexts/AuthContext';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + 'Z');
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function PostCard({ post, onReactionUpdate, onLoginRequired, onReport, onDelete }) {
  const { isLoggedIn, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const cat = CATEGORIES.find(c => c.key === post.category) || CATEGORIES[1];

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReact = async (emoji) => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    try {
      const data = await addReaction(post.id, emoji);
      onReactionUpdate(post.id, data.reactions, data.userReaction);
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  };

  const accentHue = post.color_seed || 270;
  const cardStyle = {
    '--card-accent': `linear-gradient(90deg, hsl(${accentHue}, 70%, 60%), hsl(${(accentHue + 40) % 360}, 70%, 65%))`,
    animationDelay: `${(post.id % 10) * 0.05}s`,
  };

  const canDelete = post.isOwner || isAdmin;
  const canReport = isLoggedIn && !post.isOwner;

  return (
    <div className="post-card" style={cardStyle} id={`post-${post.id}`}>
      <div className="post-card__header">
        <span className="post-card__category">
          {cat.emoji} {cat.label}
          {post.isOwner && <span className="post-card__yours">· yours</span>}
        </span>
        <div className="post-card__header-right">
          <span className="post-card__time">{timeAgo(post.created_at)}</span>
          {isLoggedIn && (canDelete || canReport) && (
            <div className="post-card__menu" ref={menuRef}>
              <button className="post-card__menu-btn" onClick={() => setMenuOpen(!menuOpen)} id={`menu-${post.id}`}>
                <MoreVertical size={16} />
              </button>
              {menuOpen && (
                <div className="post-card__dropdown">
                  {canDelete && (
                    <button className="post-card__dropdown-item post-card__dropdown-item--danger"
                      onClick={() => { onDelete(post.id); setMenuOpen(false); }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                  {canReport && (
                    <button className="post-card__dropdown-item"
                      onClick={() => { onReport(post.id); setMenuOpen(false); }}>
                      <Flag size={14} /> Report
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="post-card__content">{post.content}</div>
      <div className="post-card__reactions">
        {REACTION_EMOJIS.map(emoji => {
          const count = post.reactions?.[emoji] || 0;
          const isUserReaction = post.userReaction === emoji;
          return (
            <button
              key={emoji}
              className={`reaction-btn ${count > 0 ? 'reaction-btn--active' : ''} ${isUserReaction ? 'reaction-btn--user' : ''}`}
              onClick={() => handleReact(emoji)}
              id={`react-${post.id}-${emoji}`}
            >
              <span className="reaction-btn__emoji">{emoji}</span>
              {count > 0 && <span className="reaction-btn__count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
