import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import VideoCard from '../components/VideoCard';

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/videos?limit=24')
      .then(setVideos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1 className="hero-title">Conteúdo Adulto <span className="gradient-text">Sem Limites</span></h1>
          <p className="hero-sub">Explore milhares de vídeos, participe do fórum e conecte-se ao vivo</p>
          <div className="hero-actions">
            <a href="/videos" className="btn btn-primary btn-lg">Explorar Vídeos</a>
            <a href="/upload" className="btn btn-ghost btn-lg">Enviar Conteúdo</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">🔥 Em Destaque</h2>
          <a href="/videos" className="section-link">Ver todos</a>
        </div>
        {loading ? (
          <div className="grid-loader">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-thumb skeleton" />
                <div className="skeleton-line skeleton" />
                <div className="skeleton-line short skeleton" />
                <div className="skeleton-line shorter skeleton" />
              </div>
            ))}
          </div>
        ) : (
          <div className="video-grid">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </section>

      {videos.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📹</div>
          <h3>Nenhum vídeo ainda</h3>
          <p>Seja o primeiro a enviar conteúdo!</p>
          <a href="/upload" className="btn btn-primary">Enviar Vídeo</a>
        </div>
      )}
    </div>
  );
}
