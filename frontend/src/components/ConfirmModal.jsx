import { X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', isDestructive = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal__header">
          <h2 style={{ fontSize: '1.25rem' }}>{title}</h2>
          <button className="modal__close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal__body" style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            className="btn" 
            onClick={onClose} 
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <button 
            className="btn" 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={isDestructive ? { background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' } : {}}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
