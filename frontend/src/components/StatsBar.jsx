import { MessageCircle, Heart } from 'lucide-react';

export default function StatsBar({ stats }) {
  return (
    <div className="stats-bar" id="stats-bar">
      <div className="stat-item">
        <MessageCircle size={16} className="stat-item__icon" />
        <span className="stat-item__value">{stats.totalPosts.toLocaleString()}</span>
        <span>expressions</span>
      </div>
      <div className="stat-item">
        <Heart size={16} className="stat-item__icon" />
        <span className="stat-item__value">{stats.totalReactions.toLocaleString()}</span>
        <span>reactions</span>
      </div>
    </div>
  );
}
