import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, FileText, Users, AlertTriangle, Trash2, Eye, Check, X as XIcon } from 'lucide-react';
import { adminGetPosts, adminGetReports, adminGetUsers, adminReviewReport, adminGetPostDetail, deletePost } from '../api';
import { CATEGORIES } from '../api';
import ConfirmModal from './ConfirmModal';

export default function AdminPanel({ onBack }) {
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postDetail, setPostDetail] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'reports') {
        const data = await adminGetReports('pending');
        setReports(data.reports);
      } else if (activeTab === 'posts') {
        const data = await adminGetPosts();
        setPosts(data.posts);
      } else if (activeTab === 'users') {
        const data = await adminGetUsers();
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReport = async (reportId, status, shouldDelete) => {
    try {
      await adminReviewReport(reportId, status, null, shouldDelete);
      loadData();
    } catch (err) {
      console.error('Review error:', err);
    }
  };

  const triggerDeletePost = (postId) => {
    setPostToDelete(postId);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    try {
      await deletePost(postToDelete);
      loadData();
    } catch (err) {
      console.error('Delete error:', err);
    }
    setPostToDelete(null);
  };

  const handleViewPostDetail = async (postId) => {
    try {
      const data = await adminGetPostDetail(postId);
      setPostDetail(data);
      setSelectedPost(postId);
    } catch (err) {
      console.error('Post detail error:', err);
    }
  };

  const formatDate = (d) => new Date(d + 'Z').toLocaleString();

  return (
    <div className="admin-panel" id="admin-panel">
      <div className="admin-header">
        <button className="admin-back" onClick={onBack} id="admin-back">
          <ArrowLeft size={20} /> Back to Feed
        </button>
        <h2 className="admin-title"><Shield size={24} /> Admin Panel</h2>
      </div>

      <div className="admin-tabs" id="admin-tabs">
        <button className={`admin-tab ${activeTab === 'reports' ? 'admin-tab--active' : ''}`}
          onClick={() => setActiveTab('reports')}>
          <AlertTriangle size={16} /> Reports
        </button>
        <button className={`admin-tab ${activeTab === 'posts' ? 'admin-tab--active' : ''}`}
          onClick={() => setActiveTab('posts')}>
          <FileText size={16} /> Posts
        </button>
        <button className={`admin-tab ${activeTab === 'users' ? 'admin-tab--active' : ''}`}
          onClick={() => setActiveTab('users')}>
          <Users size={16} /> Users
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="admin-content">
          {/* ─── Reports Tab ──────────────────────────── */}
          {activeTab === 'reports' && (
            <div className="admin-list">
              {reports.length === 0 ? (
                <div className="admin-empty">✅ No pending reports</div>
              ) : reports.map(report => (
                <div key={report.id} className="admin-card" id={`report-${report.id}`}>
                  <div className="admin-card__header">
                    <span className="admin-card__badge admin-card__badge--warning">{report.reason}</span>
                    <span className="admin-card__meta">{formatDate(report.created_at)}</span>
                  </div>
                  <div className="admin-card__body">
                    <div className="admin-card__label">Reported post ({report.post_category}):</div>
                    <div className="admin-card__content">"{report.post_content}"</div>
                    {report.details && (
                      <div className="admin-card__details">
                        <span className="admin-card__label">Details:</span> {report.details}
                      </div>
                    )}
                    <div className="admin-card__meta-row">
                      <span>Posted by: <strong>{report.post_author}</strong></span>
                      <span>Reported by: <strong>{report.reporter}</strong></span>
                    </div>
                  </div>
                  <div className="admin-card__actions">
                    <button className="admin-btn admin-btn--danger" onClick={() => handleReviewReport(report.id, 'reviewed', true)}>
                      <Trash2 size={14} /> Delete Post
                    </button>
                    <button className="admin-btn admin-btn--secondary" onClick={() => handleReviewReport(report.id, 'dismissed', false)}>
                      <XIcon size={14} /> Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Posts Tab ──────────────────────────────── */}
          {activeTab === 'posts' && (
            <div className="admin-list">
              {posts.map(post => {
                const cat = CATEGORIES.find(c => c.key === post.category) || {};
                return (
                  <div key={post.id} className="admin-card" id={`admin-post-${post.id}`}>
                    <div className="admin-card__header">
                      <span className="admin-card__badge">{cat.emoji} {cat.label}</span>
                      <span className="admin-card__meta">by <strong>{post.author}</strong> · {formatDate(post.created_at)}</span>
                    </div>
                    <div className="admin-card__body">
                      <div className="admin-card__content">{post.content}</div>
                      {post.pending_reports > 0 && (
                        <span className="admin-card__badge admin-card__badge--warning" style={{ marginTop: '8px', display: 'inline-block' }}>
                          ⚠️ {post.pending_reports} pending report(s)
                        </span>
                      )}
                    </div>
                    <div className="admin-card__actions">
                      <button className="admin-btn" onClick={() => handleViewPostDetail(post.id)}>
                        <Eye size={14} /> View Details
                      </button>
                      <button className="admin-btn admin-btn--danger" onClick={() => triggerDeletePost(post.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>

                    {selectedPost === post.id && postDetail && (
                      <div className="admin-detail">
                        <div className="admin-detail__section">
                          <h4>Author: {postDetail.post.author}</h4>
                        </div>
                        <div className="admin-detail__section">
                          <h4>Reactions ({postDetail.reactors.length})</h4>
                          {postDetail.reactors.length === 0 ? <p className="admin-card__meta">No reactions yet</p> : (
                            <div className="admin-detail__reactors">
                              {postDetail.reactors.map((r, i) => (
                                <span key={i} className="admin-detail__reactor">
                                  {r.emoji} <strong>{r.username}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button className="admin-btn admin-btn--secondary" onClick={() => setSelectedPost(null)} style={{ marginTop: '8px' }}>
                          Close Details
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Users Tab ──────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Referral Code</th>
                    <th>Referred By</th>
                    <th>Posts</th>
                    <th>Referrals</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong></td>
                      <td><span className={`admin-card__badge ${u.role === 'admin' ? 'admin-card__badge--admin' : ''}`}>{u.role}</span></td>
                      <td><code>{u.referral_code}</code></td>
                      <td>{u.referred_by_username || '—'}</td>
                      <td>{u.post_count}</td>
                      <td>{u.referral_count}</td>
                      <td>{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={postToDelete !== null}
        onClose={() => setPostToDelete(null)}
        onConfirm={confirmDeletePost}
        title="Delete Post"
        message="Are you sure you want to permanently delete this expression? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
}
