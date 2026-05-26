import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/videos?search=${encodeURIComponent(search.trim())}`);
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
    </>
  );
}

function AuthModal({ onClose }) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

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
      toast(tab === 'login' ? 'Bem-vindo de volta!' : 'Conta criada com sucesso!', 'success');
      onClose();
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
          <button className="btn btn-primary btn-full" disabled={loading}>
            {loading ? '...' : tab === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
