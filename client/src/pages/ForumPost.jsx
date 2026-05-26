import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, timeAgo } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MagneticBtn from '../components/MagneticBtn';
import { motion } from 'framer-motion';

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👀', '💯', '🙄', '🤔', '😈', '🥵'];

export default function ForumPost() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [showPicker, setShowPicker] = useState(null);

  const fetchPost = () => {
    api.get(`/api/forum/posts/${id}`)
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPost(); }, [id]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!user) return toast('Faça login', 'info');
    if (!replyContent.trim()) return;
    try {
      await api.post(`/api/forum/posts/${id}/replies`, { content: replyContent });
      setReplyContent('');
      toast('Resposta enviada!', 'success');
      fetchPost();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleReaction = async (type, targetId, emoji) => {
    if (!user) return toast('Faça login', 'info');
    try {
      const endpoint = type === 'post'
        ? `/api/forum/posts/${targetId}/react`
        : `/api/forum/replies/${targetId}/react`;
      await api.post(endpoint, { emoji });
      fetchPost();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDelete = async (type, targetId) => {
    if (!confirm('Tem certeza?')) return;
    try {
      await api.delete(`/api/forum/${type}s/${targetId}`);
      toast('Deletado!', 'success');
      if (type === 'post') window.location.href = '/forum';
      else fetchPost();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="page forum-post-page">
        <div className="skeleton" style={{ width: '60%', height: 28 }} />
        <div className="skeleton" style={{ width: '100%', height: 200, marginTop: 20 }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page forum-post-page">
        <div className="empty-state">
          <div className="empty-icon">😕</div>
          <h3>Post não encontrado</h3>
          <Link to="/forum" className="btn btn-primary">Voltar ao Fórum</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page forum-post-page">
      <Link to="/forum" className="back-link">← Voltar ao Fórum</Link>

      <motion.div className="forum-post-detail" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <div className="forum-post-header">
          <h1>{post.title}</h1>
          <div className="forum-post-meta">
            <span className="forum-category-badge">{post.category_name}</span>
            <span className="dot" />
            <Link to={`/profile/${post.username}`}>@{post.username}</Link>
            <span className="dot" />
            <span>{timeAgo(post.created_at)}</span>
            <span className="dot" />
            <span>{post.views} views</span>
          </div>
        </div>

        <div className="forum-post-content">
          <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
        </div>

        <div className="forum-post-actions">
          <div className="reaction-bar">
            {(post.reactions || []).map((r) => {
              const isActive = post.my_reactions?.includes(r.emoji);
              return (
                <button
                  key={r.emoji}
                  className={`reaction-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleReaction('post', post.id, r.emoji)}
                >
                  <span className="reaction-emoji">{r.emoji}</span>
                  <span className="reaction-count">{r.count}</span>
                </button>
              );
            })}
            {user && (
              <button className="reaction-btn reaction-add" onClick={() => setShowPicker(showPicker === 'post' ? null : 'post')}>
                <span className="reaction-plus">+</span>
              </button>
            )}
          </div>
          {showPicker === 'post' && (
            <div className="reaction-picker-inline">
              {ALLOWED_EMOJIS.map((e) => (
                <button key={e} className="reaction-picker-item" onClick={() => { handleReaction('post', post.id, e); setShowPicker(null); }}>
                  {e}
                </button>
              ))}
            </div>
          )}
          {post.can_delete && (
            <MagneticBtn className="btn btn-ghost btn-sm" onClick={() => handleDelete('post', post.id)}>Deletar</MagneticBtn>
          )}
        </div>
        </motion.div>

      <div className="forum-replies-section">
        <h3>{post.replies?.length || 0} Respostas</h3>

        {user ? (
          <form className="reply-form" onSubmit={handleReply}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Escreva sua resposta..."
              rows={4}
            />
            <MagneticBtn className="btn btn-primary" disabled={!replyContent.trim()}>Responder</MagneticBtn>
          </form>
        ) : (
          <p className="reply-login-msg">Faça login para responder</p>
        )}

        <div className="forum-replies-list">
          {(post.replies || []).map((r) => (
            <div key={r.id} className="forum-reply-card">
              <div className="reply-header">
                <Link to={`/profile/${r.username}`}>@{r.username}</Link>
                <span className="reply-time">{timeAgo(r.created_at)}</span>
              </div>
              <p className="reply-content">{r.content}</p>
              <div className="reply-actions">
                <div className="reaction-bar">
                  {(r.reactions || []).map((rr) => {
                    const isActive = r.my_reactions?.some((m) => m.reply_id === r.id && m.emoji === rr.emoji) || r.my_reactions?.includes(rr.emoji);
                    return (
                      <button
                        key={rr.emoji}
                        className={`reaction-btn ${isActive ? 'active' : ''}`}
                        onClick={() => handleReaction('reply', r.id, rr.emoji)}
                      >
                        <span className="reaction-emoji">{rr.emoji}</span>
                        <span className="reaction-count">{rr.count}</span>
                      </button>
                    );
                  })}
                  {user && (
                    <button className="reaction-btn reaction-add" onClick={() => setShowPicker(showPicker === `reply-${r.id}` ? null : `reply-${r.id}`)}>
                      <span className="reaction-plus">+</span>
                    </button>
                  )}
                </div>
                {showPicker === `reply-${r.id}` && (
                  <div className="reaction-picker-inline">
                    {ALLOWED_EMOJIS.map((e) => (
                      <button key={e} className="reaction-picker-item" onClick={() => { handleReaction('reply', r.id, e); setShowPicker(null); }}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
                {r.can_delete && (
                  <MagneticBtn className="btn btn-ghost btn-sm" onClick={() => handleDelete('reply', r.id)}>Deletar</MagneticBtn>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
