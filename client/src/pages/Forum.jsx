import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, timeAgo } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Forum() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category_id: '' });

  useEffect(() => {
    Promise.all([
      api.get('/api/forum/categories'),
      api.get('/api/forum/posts'),
    ])
      .then(([cats, ps]) => {
        setCategories(cats);
        setPosts(ps);
      })
      .catch(() => toast('Erro ao carregar fórum', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const loadPosts = (catId) => {
    setLoading(true);
    const url = catId ? `/api/forum/posts?category_id=${catId}` : '/api/forum/posts';
    api.get(url)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleCategoryClick = (id) => {
    setCategoryId(id);
    loadPosts(id);
  };

  const handleNewPost = async (e) => {
    e.preventDefault();
    if (!user) return toast('Faça login para postar', 'info');
    try {
      await api.post('/api/forum/posts', newPost);
      toast('Post criado!', 'success');
      setShowNewPost(false);
      setNewPost({ title: '', content: '', category_id: '' });
      loadPosts(categoryId);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page forum-page">
      <div className="page-header">
        <h1>Fórum</h1>
        <button className="btn btn-primary" onClick={() => user ? setShowNewPost(true) : toast('Faça login', 'info')}>
          Novo Tópico
        </button>
      </div>

      <div className="forum-categories">
        <button className={`chip ${!categoryId ? 'active' : ''}`} onClick={() => handleCategoryClick('')}>Todos</button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`chip ${categoryId === String(c.id) ? 'active' : ''}`}
            onClick={() => handleCategoryClick(c.id)}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {showNewPost && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowNewPost(false)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <button className="modal-close" onClick={() => setShowNewPost(false)}>×</button>
            <h2>Novo Tópico</h2>
            <form onSubmit={handleNewPost}>
              <div className="form-group">
                <label>Categoria</label>
                <select value={newPost.category_id} onChange={(e) => setNewPost({ ...newPost, category_id: e.target.value })} required>
                  <option value="">Selecione...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Título</label>
                <input type="text" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} maxLength={200} required />
              </div>
              <div className="form-group">
                <label>Conteúdo</label>
                <textarea value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} style={{ minHeight: 200 }} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewPost(false)}>Cancelar</button>
                <button className="btn btn-primary">Publicar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="forum-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ width: '50%', height: 20 }} />
              <div className="skeleton" style={{ width: '30%', height: 14, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3>Nenhum tópico ainda</h3>
          <p>Seja o primeiro a postar!</p>
        </div>
      ) : (
        <div className="forum-list">
          {posts.map((p) => (
            <div key={p.id} className={`forum-post-card ${p.pinned ? 'pinned' : ''}`}>
              {p.pinned ? <span className="pinned-badge">📌 Fixado</span> : null}
              <Link to={`/forum/${p.id}`} className="forum-post-link">
                <div className="forum-post-main">
                  <div className="forum-post-title">{p.title}</div>
                  <div className="forum-post-meta">
                    <span className="forum-post-category">{p.category_name}</span>
                    <span className="dot" />
                    <span>@{p.username}</span>
                    <span className="dot" />
                    <span>{timeAgo(p.created_at)}</span>
                    <span className="dot" />
                    <span>{p.reply_count || 0} respostas</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
