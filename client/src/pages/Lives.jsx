import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, timeAgo } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MagneticBtn from '../components/MagneticBtn';
import { motion } from 'framer-motion';
import RevealText from '../components/RevealText';

export default function Lives() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');

  useEffect(() => {
    api.get('/api/lives')
      .then(setLives)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreateLive = async (e) => {
    e.preventDefault();
    if (!liveTitle.trim()) return;
    try {
      const data = await api.post('/api/lives/create', { title: liveTitle });
      toast('Live criada! Use o OBS com os dados abaixo.', 'success');
      setShowCreate(false);
      setLiveTitle('');
      navigator.clipboard?.writeText(`RTMP: ${data.rtmp_url}\nKey: ${data.stream_key}`);
      toast('Stream key copiada!', 'info');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page lives-page">
      <div className="page-header">
        <RevealText as="h1">🔴 Lives</RevealText>
        {user && (
          <MagneticBtn className="btn btn-primary" onClick={() => setShowCreate(true)}>Criar Live</MagneticBtn>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            <h2>Criar Live</h2>
            <form onSubmit={handleCreateLive}>
              <div className="form-group">
                <label>Título da Live</label>
                <input type="text" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} required />
              </div>
              <MagneticBtn className="btn btn-primary btn-full">Criar Live</MagneticBtn>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="video-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-thumb skeleton" />
              <div className="skeleton-line skeleton" />
              <div className="skeleton-line short skeleton" />
            </div>
          ))}
        </div>
      ) : lives.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔴</div>
          <h3>Nenhuma live no momento</h3>
          <p>Ninguém está transmitindo ao vivo agora</p>
        </div>
      ) : (
        <motion.div className="video-grid" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
          {lives.map((l) => (
            <Link key={l.id} to={`/profile/${l.username}`} className="live-card">
              <div className="live-thumb">
                <div className="live-badge">🔴 AO VIVO</div>
                {l.thumbnail ? <img src={l.thumbnail} alt="" /> : <div className="no-thumb">📺</div>}
              </div>
              <div className="live-info">
                <div className="live-title">{l.title}</div>
                <div className="live-author">@{l.username}</div>
                <div className="live-meta">
                  <span>👁️ {l.viewer_count || 0} viewers</span>
                  <span className="dot" />
                  <span>{timeAgo(l.created_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
