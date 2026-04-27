import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import CategoryFilter from './components/CategoryFilter';
import PostFeed from './components/PostFeed';
import ComposeModal from './components/ComposeModal';
import AuthModal from './components/AuthModal';
import ReportModal from './components/ReportModal';
import AdminPanel from './components/AdminPanel';
import ConfirmModal from './components/ConfirmModal';
import { fetchPosts, fetchStats, deletePost } from './api';
import './App.css';

function AppContent() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ totalPosts: 0, totalReactions: 0 });
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal states
  const [showCompose, setShowCompose] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showReport, setShowReport] = useState(null); // postId or null
  const [showAdmin, setShowAdmin] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const loadPosts = useCallback(async (cat, pg, searchParam, append = false) => {
    try {
      setLoading(!append);
      const data = await fetchPosts(cat, pg, searchParam);
      setPosts(prev => append ? [...prev, ...data.posts] : data.posts);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // Reload posts when auth state changes (to get userReaction data)
  useEffect(() => {
    if (!authLoading) {
      loadPosts(category, 1, searchQuery);
      loadStats();
    }
  }, [category, searchQuery, authLoading, isLoggedIn, loadPosts, loadStats]);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setPage(1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(category, nextPage, searchQuery, true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleComposeClick = () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    setShowCompose(true);
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    setStats(prev => ({ ...prev, totalPosts: prev.totalPosts + 1 }));
    showToast('✨ Your expression has been shared!');
  };

  const handleReactionUpdate = (postId, reactions, userReaction) => {
    setPosts(prev =>
      prev.map(p => p.id === postId ? { ...p, reactions, userReaction } : p)
    );
    loadStats(); // Refresh stats
  };

  const triggerDelete = (postId) => {
    setPostToDelete(postId);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    try {
      await deletePost(postToDelete);
      setPosts(prev => prev.filter(p => p.id !== postToDelete));
      setStats(prev => ({ ...prev, totalPosts: prev.totalPosts - 1 }));
      showToast('🗑️ Post deleted');
    } catch (err) {
      showToast('❌ Failed to delete post');
    }
    setPostToDelete(null);
  };

  const handleReport = (postId) => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    setShowReport(postId);
  };

  const handleReported = () => {
    showToast('🚩 Report submitted for admin review');
  };

  // Show admin panel
  if (showAdmin) {
    return (
      <div className="app" id="app">
        <AdminPanel onBack={() => setShowAdmin(false)} />
      </div>
    );
  }

  return (
    <div className="app" id="app">
      <Header
        stats={stats}
        onLoginClick={() => setShowAuth(true)}
        onAdminClick={() => setShowAdmin(true)}
      />
      <CategoryFilter active={category} onChange={handleCategoryChange} />
      
      <div className="search-container" style={{ padding: '0 20px', maxWidth: '800px', margin: '0 auto 20px auto' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search expressions..." 
              className="input-field"
              style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--primary">Search</button>
        </form>
      </div>

      <PostFeed
        posts={posts}
        loading={loading}
        onReactionUpdate={handleReactionUpdate}
        onLoginRequired={() => setShowAuth(true)}
        onReport={handleReport}
        onDelete={triggerDelete}
      />
      {!loading && page < totalPages && (
        <div className="load-more-wrapper">
          <button className="load-more-btn" onClick={handleLoadMore} id="load-more">
            Load More
          </button>
        </div>
      )}
      <button
        className="compose-fab"
        onClick={handleComposeClick}
        id="compose-btn"
        title="Express Yourself"
      >
        <Plus size={28} />
      </button>
      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onPostCreated={handlePostCreated}
      />
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
      />
      <ReportModal
        isOpen={showReport !== null}
        onClose={() => setShowReport(null)}
        postId={showReport}
        onReported={handleReported}
      />
      <ConfirmModal
        isOpen={postToDelete !== null}
        onClose={() => setPostToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Post"
        message="Are you sure you want to permanently delete this expression? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
      {toast && <div className="toast" id="toast">{toast}</div>}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
