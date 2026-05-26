import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDuration, formatViews, timeAgo } from '../utils/api';

export default function VideoCard({ video }) {
  const hasThumb = video.thumbnail && !video.thumbnail.includes('undefined');

  return (
    <Link to={`/watch/${video.id}`} className="video-card">
      <div className="video-thumb">
        <div className="video-thumb-inner">
          {hasThumb ? (
            <div className="thumb-reveal">
              <img src={video.thumbnail} alt={video.title} loading="lazy" />
            </div>
          ) : (
            <div className="no-thumb">▶</div>
          )}
        </div>
        {video.duration ? <div className="video-duration">{formatDuration(video.duration)}</div> : null}
        {video.category && video.category !== 'Geral' ? <div className="video-hd">{video.category}</div> : null}
        <div className="video-thumb-overlay">
          <span className="play-icon">▶</span>
        </div>
      </div>
      <div className="video-info">
        <div className="video-title">{video.title}</div>
        <div className="video-author">@{video.username}</div>
        <div className="video-meta">
          <span>{formatViews(video.views)} views</span>
          <span className="dot"></span>
          <span>{timeAgo(video.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
