import { Link } from 'react-router-dom';
import { formatDuration, formatViews, timeAgo } from '../utils/api';

export default function VideoCard({ video }) {
  const hasThumb = video.thumbnail && !video.thumbnail.includes('undefined');
  const thumb = hasThumb
    ? `<img src="${video.thumbnail}" alt="${video.title}" loading="lazy" />`
    : '<div class="no-thumb">▶</div>';

  return (
    <Link to={`/watch/${video.id}`} className="video-card">
      <div className="video-thumb" dangerouslySetInnerHTML={{ __html: thumb }} />
      {video.duration ? <div className="video-duration">{formatDuration(video.duration)}</div> : null}
      {video.category && video.category !== 'Geral' ? <div className="video-hd">{video.category}</div> : null}
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
