import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatViews, formatDuration, timeAgo } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VideoCard from '../components/VideoCard';
import MagneticBtn from '../components/MagneticBtn';
import Hls from 'hls.js';
import { motion } from 'framer-motion';

export default function Watch() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [video, setVideo] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    if (!video || !video.has_hls || !videoRef.current) return;
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(video.hls_url);
      hls.attachMedia(videoRef.current);
      return () => hls.destroy();
    }
  }, [video?.id, video?.has_hls]);

  const loadComments = async () => {
    try {
      const c = await api.get(`/api/videos/${id}/comments`);
      setComments(c || []);
    } catch (_) {}
  };

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const v = await api.get(`/api/videos/${id}`);
        setVideo(v);
        await loadComments();
        const cat = v.category ? `&category=${encodeURIComponent(v.category)}` : '';
        const r = await api.get(`/api/videos?limit=12${cat}`);
        const list = r.videos || r;
        setRelated(list.filter((x) => x.id !== v.id).slice(0, 12));
        if (user) {
          try { setPlaylists(await api.get('/api/playlists')); } catch (_) {}
        }
      } catch (e) {
        toast('Erro ao carregar vídeo', 'error');
      } finally {
        setLoading(false);
      }
    })();
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
      const body = { content: comment };
      if (replyTo) body.parent_id = replyTo;
      await api.post(`/api/videos/${id}/comments`, body);
      setComment('');
      setReplyTo(null);
      await loadComments();
      toast('Comentário enviado!', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/api/comments/${commentId}`);
      await loadComments();
      toast('Comentário removido', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    try {
      await api.post(`/api/playlists/${playlistId}/videos`, { video_id: parseInt(id) });
      toast('Adicionado à playlist!', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const pl = await api.post('/api/playlists', { name: newPlaylistName });
      setPlaylists([...playlists, pl]);
      setNewPlaylistName('');
      toast('Playlist criada!', 'success');
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
      <motion.div className="watch-layout" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <div className="watch-main">
          <div className="player-wrapper">
            {video.filename ? (
              <video ref={videoRef} controls poster={video.thumbnail} className="video-player" autoPlay>
                {(!video.has_hls || !Hls.isSupported()) && (
                  <source src={`/api/stream/${video.filename.replace('/uploads/videos/', '')}`} type="video/mp4" />
                )}
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
                <MagneticBtn className="action-btn" onClick={() => handleLike('like')}>
                  👍 {video.likes || 0}
                </MagneticBtn>
                <MagneticBtn className="action-btn" onClick={() => handleLike('dislike')}>
                  👎 {video.dislikes || 0}
                </MagneticBtn>
                <MagneticBtn className={`action-btn ${video.is_favorite ? 'active' : ''}`} onClick={handleFavorite}>
                  {video.is_favorite ? '❤️' : '🤍'} Favorito
                </MagneticBtn>
                {user && (
                  <MagneticBtn className="action-btn" onClick={() => setShowPlaylistModal(true)}>
                    📋 Playlist
                  </MagneticBtn>
                )}
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
            <h3>Comentários ({comments.length})</h3>
            {user ? (
              <form className="comment-form" onSubmit={handleComment}>
                {replyTo && (
                  <div className="reply-indicator">
                    Respondendo a um comentário
                    <button type="button" className="cancel-reply" onClick={() => setReplyTo(null)}>×</button>
                  </div>
                )}
                <textarea
                  placeholder="Escreva um comentário..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                />
                <MagneticBtn className="btn btn-primary" disabled={!comment.trim()}>Enviar</MagneticBtn>
              </form>
            ) : (
              <p className="comment-login-msg">Faça login para comentar</p>
            )}
            <div className="comments-list">
              {comments.map((c) => (
                <div key={c.id} className="comment">
                  <div className="comment-avatar">
                    {c.avatar ? <img src={c.avatar} alt="" /> : <div className="avatar-placeholder-sm">{c.username?.[0]}</div>}
                  </div>
                  <div className="comment-body">
                    <div className="comment-meta">
                      <Link to={`/profile/${c.username}`} className="comment-author">@{c.username}</Link>
                      <span className="comment-time">{timeAgo(c.created_at)}</span>
                      {user && (user.id === c.user_id || video.isOwner) && (
                        <button className="comment-delete" onClick={() => handleDeleteComment(c.id)}>×</button>
                      )}
                    </div>
                    <p>{c.content}</p>
                    {user && (
                      <button className="comment-reply-btn" onClick={() => setReplyTo(c.id)}>Responder</button>
                    )}
                    {c.replies?.length > 0 && (
                      <div className="comment-replies">
                        {c.replies.map((r) => (
                          <div key={r.id} className="comment reply">
                            <div className="comment-avatar">
                              {r.avatar ? <img src={r.avatar} alt="" /> : <div className="avatar-placeholder-sm">{r.username?.[0]}</div>}
                            </div>
                            <div className="comment-body">
                              <div className="comment-meta">
                                <Link to={`/profile/${r.username}`} className="comment-author">@{r.username}</Link>
                                <span className="comment-time">{timeAgo(r.created_at)}</span>
                                {user && (user.id === r.user_id || video.isOwner) && (
                                  <button className="comment-delete" onClick={() => handleDeleteComment(r.id)}>×</button>
                                )}
                              </div>
                              <p>{r.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Playlist Modal */}
          {showPlaylistModal && (
            <div className="modal-overlay" onClick={() => setShowPlaylistModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>Adicionar à Playlist</h3>
                <div className="playlist-list-modal">
                  {playlists.map((pl) => (
                    <button key={pl.id} className="playlist-select-btn" onClick={() => handleAddToPlaylist(pl.id)}>
                      📁 {pl.name} <span className="playlist-count">{pl.video_count} vídeos</span>
                    </button>
                  ))}
                </div>
                <div className="new-playlist-form">
                  <input
                    type="text"
                    placeholder="Nova playlist..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                  <MagneticBtn className="btn btn-primary btn-sm" onClick={handleCreatePlaylist}>Criar</MagneticBtn>
                </div>
                <button className="modal-close" onClick={() => setShowPlaylistModal(false)}>Fechar</button>
              </div>
            </div>
          )}
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
      </motion.div>
    </div>
  );
}
