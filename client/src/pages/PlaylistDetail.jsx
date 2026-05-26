import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VideoCard from '../components/VideoCard';
import { motion } from 'framer-motion';

export default function PlaylistDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/playlists/${id}`)
      .then(setPlaylist)
      .catch(() => setPlaylist(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton" style={{ width: '40%', height: 28, margin: '40px auto 20px' }} />
        <div className="video-grid">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ aspectRatio: '16/9', borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>Playlist não encontrada</h3>
          <Link to="/" className="btn btn-primary">Voltar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="playlist-detail-header">
          <div className="playlist-detail-icon">📁</div>
          <div>
            <h1>{playlist.name}</h1>
            <p className="playlist-meta">
              por <Link to={`/profile/${playlist.username}`}>@{playlist.username}</Link> · {playlist.videos?.length || 0} vídeos
            </p>
            {playlist.description && <p className="playlist-desc">{playlist.description}</p>}
          </div>
        </div>
        {playlist.videos?.length > 0 ? (
          <div className="video-grid">
            {playlist.videos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <h3>Nenhum vídeo nesta playlist</h3>
          </div>
        )}
      </motion.div>
    </div>
  );
}
