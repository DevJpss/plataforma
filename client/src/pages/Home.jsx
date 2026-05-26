import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '../utils/api';
import VideoCard from '../components/VideoCard';
import Particles from '../components/Particles';
import Typewriter from '../components/Typewriter';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
};

const fadeIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  useEffect(() => {
    api.get('/api/videos?limit=24')
      .then(setVideos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleMouse = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
        });
      }
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  return (
    <div className="page home-page">
      <section ref={heroRef} className="hero">
        <Particles />
        <div className="hero-glow" style={{ transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)` }} />
        <div className="hero-glow-2" style={{ transform: `translate(${-mousePos.x * 20}px, ${-mousePos.y * 20}px)` }} />

        <motion.div className="hero-content" variants={stagger} initial="initial" animate="animate">
          <motion.div className="hero-floating-icon" variants={fadeIn}>◆</motion.div>
          <motion.h1 className="hero-title" variants={fadeUp}>
            Conteúdo Adulto <span className="gradient-text"><Typewriter /></span>
          </motion.h1>
          <motion.p className="hero-sub" variants={fadeUp}>
            Explore milhares de vídeos, participe do fórum e conecte-se ao vivo
          </motion.p>
          <motion.div className="hero-actions" variants={fadeUp}>
            <a href="/videos" className="btn btn-primary btn-lg magnetic-btn">
              <span>Explorar Vídeos</span>
            </a>
            <a href="/upload" className="btn btn-ghost btn-lg magnetic-btn">
              <span>Enviar Conteúdo</span>
            </a>
          </motion.div>
          <motion.div className="hero-scroll-indicator" variants={fadeIn}>
            <span className="scroll-mouse"><span className="scroll-dot" /></span>
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="section-header">
          <h2 className="section-title">🔥 Em Destaque</h2>
          <a href="/videos" className="section-link">Ver todos →</a>
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
          <motion.div className="video-grid" variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-50px' }}>
            {videos.map((v, i) => (
              <motion.div key={v.id} variants={fadeUp} style={{ animationDelay: `${i * 0.04}s` }}>
                <VideoCard video={v} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      {videos.length === 0 && !loading && (
        <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="empty-icon">📹</div>
          <h3>Nenhum vídeo ainda</h3>
          <p>Seja o primeiro a enviar conteúdo!</p>
          <a href="/upload" className="btn btn-primary">Enviar Vídeo</a>
        </motion.div>
      )}

      <motion.section
        className="stats-section"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🎬</span>
            <span className="stat-value">{videos.length}+</span>
            <span className="stat-label">Vídeos</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💬</span>
            <span className="stat-value">Fórum</span>
            <span className="stat-label">Discussões</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔴</span>
            <span className="stat-value">Live</span>
            <span className="stat-label">Streaming</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔞</span>
            <span className="stat-value">18+</span>
            <span className="stat-label">Conteúdo Adulto</span>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
