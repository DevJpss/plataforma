import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import MagneticBtn from './MagneticBtn';

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

      {user && user.email_verified === 0 && (
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
