import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, timeAgo } from '../utils/api';
import MagneticBtn from './MagneticBtn';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef();

  useEffect(() => {
    if (!user) return;
    const load = () => {
      api.get('/api/notifications').then((d) => {
        setNotifications(d.notifications || []);
        setUnread(d.unread || 0);
      }).catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/videos?search=${encodeURIComponent(search.trim())}`);
  };

  const markRead = async (id, link) => {
    try { await api.post(`/api/notifications/${id}/read`); } catch (_) {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    setUnread(prev => Math.max(0, prev - 1));
    if (link) navigate(link);
    setNotifOpen(false);
  };

  const markAllRead = async () => {
    try { await api.post('/api/notifications/read-all'); } catch (_) {}
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    setUnread(0);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">◆</span>
            <span className="brand-text">AdultHub</span>
          </Link>

          <form className="navbar-search" onSubmit={handleSearch}>
            <input
              id="search-input"
              type="text"
              placeholder="Buscar vídeos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="search-hint">/</span>
          </form>

          <button
            className="nav-toggle"
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span><span></span><span></span>
          </button>

          <div className={`navbar-nav ${menuOpen ? 'open' : ''}`}>
            <Link to="/videos" className="nav-link" onClick={() => setMenuOpen(false)}>Vídeos</Link>
            <Link to="/forum" className="nav-link" onClick={() => setMenuOpen(false)}>Fórum</Link>
            <Link to="/lives" className="nav-link" onClick={() => setMenuOpen(false)}>Lives</Link>

            {user ? (
              <>
                <div className="nav-notif" ref={notifRef}>
                  <button className="nav-notif-btn" onClick={() => setNotifOpen(!notifOpen)} aria-label="Notificações">
                    🔔{unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
                  </button>
                  {notifOpen && (
                    <div className="notif-dropdown">
                      <div className="notif-header">
                        <strong>Notificações</strong>
                        {unread > 0 && <button className="btn btn-ghost btn-xs" onClick={markAllRead}>Ler todas</button>}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="notif-empty">Nenhuma notificação</div>
                      ) : (
                        notifications.map((n) => (
                          <button key={n.id} className={`notif-item ${n.read ? '' : 'notif-unread'}`} onClick={() => markRead(n.id, n.link)}>
                            <div className="notif-actor">
                              {n.actor_avatar ? <img src={n.actor_avatar} alt="" /> : <div className="avatar-placeholder-sm">{(n.actor_username || '?')[0]}</div>}
                            </div>
                            <div className="notif-body">
                              <p>{n.message}</p>
                              <span className="notif-time">{timeAgo(n.created_at)}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <Link to="/upload" className="nav-link nav-upload-btn" onClick={() => setMenuOpen(false)}>
                  ＋ Upload
                </Link>
                <div className="nav-user">
                  <Link to={`/profile/${user.username}`} className="nav-avatar" onClick={() => setMenuOpen(false)}>
                    {user.avatar ? (
                      <img src={user.avatar} alt="" />
                    ) : (
                      <div className="avatar-placeholder-sm">{user.username[0]}</div>
                    )}
                  </Link>
                  <div className="nav-user-dropdown">
                    <Link to={`/profile/${user.username}`} onClick={() => setMenuOpen(false)}>Perfil</Link>
                    <Link to="/settings" onClick={() => setMenuOpen(false)}>Configurações</Link>
                    <button onClick={logout}>Sair</button>
                  </div>
                </div>
              </>
            ) : (
              <button className="nav-link nav-login-btn" onClick={() => setShowAuth(true)}>Entrar</button>
            )}
          </div>
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {user && !user.email_verified && (
        <div className="verify-banner">
          <span>📧 Verifique seu email para ativar sua conta.</span>
          <Link to="/settings" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 12 }}>
            Reenviar email
          </Link>
        </div>
      )}
    </>
  );
}

function AuthModal({ onClose }) {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/api/login' : '/api/register';
      const body = tab === 'login'
        ? { username: form.username, password: form.password }
        : { username: form.username, email: form.email, password: form.password };
      const data = await api.post(endpoint, body);
      login(data.token, data.user);
      if (tab === 'register') {
        setRegistered(true);
        toast('Conta criada! Verifique seu email para ativar.', 'success');
      } else {
        toast('Bem-vindo de volta!', 'success');
        onClose();
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        {registered ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <h3 style={{ marginBottom: 8 }}>Verifique seu Email</h3>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Enviamos um link de confirmação para <strong>{form.email}</strong>.
              Clique no link para ativar sua conta.
            </p>
            <MagneticBtn className="btn btn-primary" onClick={onClose}>
              Ok, entendi
            </MagneticBtn>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Entrar</button>
              <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Cadastrar</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Usuário</label>
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
              {tab === 'register' && (
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              )}
              <div className="form-group">
                <label>Senha</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <MagneticBtn className="btn btn-primary btn-full" disabled={loading}>
                {loading ? '...' : tab === 'login' ? 'Entrar' : 'Criar Conta'}
              </MagneticBtn>
              {tab === 'login' && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { onClose(); navigate('/forgot-password'); }}
                    style={{ fontSize: 12, color: 'var(--text3)' }}
                  >
                    Esqueci a senha
                  </button>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
