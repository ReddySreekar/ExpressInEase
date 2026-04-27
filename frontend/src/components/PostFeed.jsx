import PostCard from './PostCard';

export default function PostFeed({ posts, loading, onReactionUpdate, onLoginRequired, onReport, onDelete }) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="post-feed post-feed--empty">
        <div className="post-feed__empty-icon">✨</div>
        <div className="post-feed__empty-text">No expressions yet</div>
        <div className="post-feed__empty-hint">Be the first to share your thoughts</div>
      </div>
    );
  }

  return (
    <div className="post-feed" id="post-feed">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onReactionUpdate={onReactionUpdate}
          onLoginRequired={onLoginRequired}
          onReport={onReport}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
