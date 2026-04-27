import { useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, createPost } from '../api';

const MAX_CHARS = 1000;
const postCategories = CATEGORIES.filter(c => c.key !== 'all');

export default function ComposeModal({ isOpen, onClose, onPostCreated }) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('thoughts');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = content.trim().length === 0;

  const handleSubmit = async () => {
    if (isEmpty || isOverLimit || submitting) return;
    setSubmitting(true);
    try {
      const newPost = await createPost(content.trim(), category);
      onPostCreated(newPost);
      setContent('');
      setCategory('thoughts');
      onClose();
    } catch (err) {
      console.error('Failed to post:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const charCountClass = isOverLimit
    ? 'modal__char-count modal__char-count--over'
    : charCount > 800
    ? 'modal__char-count modal__char-count--warning'
    : 'modal__char-count';

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} id="compose-modal-overlay">
      <div className="modal" id="compose-modal">
        <div className="modal__header">
          <h2 className="modal__title">Express Yourself</h2>
          <button className="modal__close" onClick={onClose} id="modal-close">
            <X size={18} />
          </button>
        </div>

        <textarea
          className="modal__textarea"
          id="compose-textarea"
          placeholder="What's on your mind? Share anonymously..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />
        <div className={charCountClass}>
          {charCount} / {MAX_CHARS}
        </div>

        <div className="modal__categories" id="compose-categories">
          {postCategories.map(cat => (
            <button
              key={cat.key}
              className={`category-chip ${category === cat.key ? 'category-chip--active' : ''}`}
              onClick={() => setCategory(cat.key)}
              id={`compose-cat-${cat.key}`}
            >
              <span className="category-chip__emoji">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        <button
          className="modal__submit"
          id="compose-submit"
          disabled={isEmpty || isOverLimit || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Sharing...' : '✨ Share Anonymously'}
        </button>
      </div>
    </div>
  );
}
