import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatViews, formatDuration, timeAgo } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VideoCard from '../components/VideoCard';

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👀', '💯', '🙄', '🤔', '😈', '🥵'];

export default function Watch() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [video, setVideo] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/videos/${id}`),
      api.get('/api/videos?limit=12')
    ])
      .then(([v, r]) => {
        setVideo(v);
        setRelated(r.filter((x) => x.id !== v.id).slice(0, 12));
      })
      .catch(() => toast('Erro ao carregar vídeo', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async (type) => {
    if (!user) return toast('Faça login para curtir', 'info');
    try {
      await api.post(`/api/videos/${id}/like`, { type });
      const v = await api.get(`/api/videos/${id}`);
      setVideo(v);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleFavorite = async () => {
    if (!user) return toast('Faça login', 'info');
    try {
      const data = await api.post(`/api/videos/${id}/favorite`);
      setVideo({ ...video, is_favorite: data.is_favorite });
      toast(data.message, 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.post(`/api/videos/${id}/comments`, { content: comment });
      setComment('');
      const v = await api.get(`/api/videos/${id}`);
      setVideo(v);
      toast('Comentário enviado!', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="page watch-page">
        <div className="watch-container" style={{ padding: '40px' }}>
          <div className="skeleton" style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px' }} />
          <div className="skeleton" style={{ width: '60%', height: '24px', marginTop: '20px' }} />
          <div className="skeleton" style={{ width: '40%', height: '16px', marginTop: '12px' }} />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="page watch-page">
        <div className="empty-state">
          <div className="empty-icon">😕</div>
          <h3>Vídeo não encontrado</h3>
          <Link to="/" className="btn btn-primary">Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page watch-page">
      <div className="watch-layout">
        <div className="watch-main">
          <div className="player-wrapper">
            {video.has_hls ? (
              <video controls poster={video.thumbnail} className="video-player" autoPlay>
                <source src={video.hls_url} type="application/x-mpegURL" />
              </video>
            ) : video.filename ? (
              <video controls poster={video.thumbnail} className="video-player" autoPlay>
                <source src={`/api/stream/${video.filename.replace('/uploads/videos/', '')}`} type="video/mp4" />
              </video>
            ) : (
              <div className="no-video">Vídeo não disponível</div>
            )}
          </div>

          <div className="video-details">
            <h1 className="video-title-lg">{video.title}</h1>
            <div className="video-actions-bar">
              <div className="video-stats">
                <span>{formatViews(video.views)} views</span>
                <span className="dot" />
                <span>{timeAgo(video.created_at)}</span>
              </div>
              <div className="video-actions">
                <button className="action-btn" onClick={() => handleLike('like')}>
                  👍 {video.likes || 0}
                </button>
                <button className="action-btn" onClick={() => handleLike('dislike')}>
                  👎 {video.dislikes || 0}
                </button>
                <button className={`action-btn ${video.is_favorite ? 'active' : ''}`} onClick={handleFavorite}>
                  {video.is_favorite ? '❤️' : '🤍'} Favorito
                </button>
              </div>
            </div>

            {video.description && (
              <div className="video-description">
                <p>{video.description}</p>
                {video.tags && <div className="video-tags">
                  {video.tags.split(',').map((tag, i) => (
                    <Link key={i} to={`/videos?search=${encodeURIComponent(tag.trim())}`} className="tag">#{tag.trim()}</Link>
                  ))}
                </div>}
              </div>
            )}

            <div className="video-author-card">
              <Link to={`/profile/${video.username}`} className="author-avatar">
                {video.avatar ? <img src={video.avatar} alt="" /> : <div className="avatar-placeholder-sm">{video.username?.[0]}</div>}
              </Link>
              <div className="author-info">
                <Link to={`/profile/${video.username}`} className="author-name">@{video.username}</Link>
              </div>
            </div>
          </div>

          <div className="comments-section">
            <h3>Comentários ({video.comments?.length || 0})</h3>
            {user ? (
              <form className="comment-form" onSubmit={handleComment}>
                <textarea
                  placeholder="Escreva um comentário..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                />
                <button className="btn btn-primary" disabled={!comment.trim()}>Enviar</button>
              </form>
            ) : (
              <p className="comment-login-msg">Faça login para comentar</p>
            )}
            <div className="comments-list">
              {(video.comments || []).map((c) => (
                <div key={c.id} className="comment">
                  <div className="comment-avatar">
                    {c.avatar ? <img src={c.avatar} alt="" /> : <div className="avatar-placeholder-sm">{c.username?.[0]}</div>}
                  </div>
                  <div className="comment-body">
                    <div className="comment-meta">
                      <Link to={`/profile/${c.username}`} className="comment-author">@{c.username}</Link>
                      <span className="comment-time">{timeAgo(c.created_at)}</span>
                    </div>
                    <p>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="watch-sidebar">
          <h3>Relacionados</h3>
          <div className="related-list">
            {related.map((v) => (
              <Link key={v.id} to={`/watch/${v.id}`} className="related-card">
                <div className="related-thumb">
                  {v.thumbnail && !v.thumbnail.includes('undefined') ? (
                    <img src={v.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <div className="no-thumb-sm">▶</div>
                  )}
                  {v.duration ? <span className="related-duration">{formatDuration(v.duration)}</span> : null}
                </div>
                <div className="related-info">
                  <div className="related-title">{v.title}</div>
                  <div className="related-author">@{v.username}</div>
                  <div className="related-meta">{formatViews(v.views)} views</div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
