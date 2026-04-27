import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { reportPost } from '../api';

const REASONS = [
  { key: 'spam', label: '🚫 Spam' },
  { key: 'harassment', label: '😡 Harassment' },
  { key: 'inappropriate', label: '⚠️ Inappropriate Content' },
  { key: 'other', label: '📝 Other' },
];

export default function ReportModal({ isOpen, onClose, postId, onReported }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a reason');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await reportPost(postId, reason, details);
      onReported();
      setReason(''); setDetails('');
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
    <div className="modal-overlay" onClick={handleOverlayClick} id="report-modal-overlay">
      <div className="modal" id="report-modal">
        <div className="modal__header">
          <h2 className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} /> Report Post
          </h2>
          <button className="modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <p className="report-desc">Why are you reporting this post?</p>

        <div className="report-reasons" id="report-reasons">
          {REASONS.map(r => (
            <button
              key={r.key}
              className={`category-chip ${reason === r.key ? 'category-chip--active' : ''}`}
              onClick={() => setReason(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          className="modal__textarea"
          id="report-details"
          placeholder="Additional details (optional)..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          style={{ minHeight: '80px' }}
        />

        <button
          className="modal__submit report-submit"
          onClick={handleSubmit}
          disabled={!reason || loading}
          id="report-submit"
        >
          {loading ? 'Submitting...' : '🚩 Submit Report'}
        </button>
      </div>
    </div>
  );
}
