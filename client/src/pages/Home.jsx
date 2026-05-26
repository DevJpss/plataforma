import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { api } from '../utils/api';
import VideoCard from '../components/VideoCard';
import Particles from '../components/Particles';
import Typewriter from '../components/Typewriter';
import MagneticBtn from '../components/MagneticBtn';
import RevealText from '../components/RevealText';

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    api.get('/api/videos?limit=24')
      .then(setVideos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page home-page">
      {/* ─── HERO ─── */}
      <section ref={heroRef} className="hero">
        <Particles />

        {/* Decorative geometric shapes */}
        <motion.div
          className="geo-shape geo-diamond"
          animate={{ rotate: 360, y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="geo-shape geo-circle"
          animate={{ rotate: -360, scale: [1, 1.1, 1], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="geo-shape geo-triangle"
          animate={{ rotate: 360, x: [0, -20, 0], y: [0, 15, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="geo-shape geo-dot-grid"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="geo-ring"
          animate={{ rotate: 360, scale: [1, 1.05, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="geo-ring-2"
          animate={{ rotate: -360, scale: [1, 1.08, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />

        <motion.div className="hero-glow" style={{ y: heroY }} />
        <motion.div className="hero-glow-2" />

        <motion.div className="hero-content" style={{ y: heroY, opacity: heroOpacity }} variants={stagger} initial="initial" animate="animate">
          <motion.div className="hero-badge" variants={scaleIn}>
            <span className="hero-badge-dot" />
            Plataforma Premium 18+
          </motion.div>

          <motion.h1 className="hero-title" variants={fadeUp}>
            Conteúdo Adulto{' '}
            <span className="gradient-text"><Typewriter /></span>
          </motion.h1>

          <motion.p className="hero-sub" variants={fadeUp}>
            Explore milhares de vídeos, participe do fórum e conecte-se ao vivo
          </motion.p>

          <motion.div className="hero-actions" variants={fadeUp}>
            <MagneticBtn href="/videos" className="btn btn-primary btn-hero">
              Explorar Vídeos
            </MagneticBtn>
            <MagneticBtn href="/upload" className="btn btn-ghost btn-hero">
              Enviar Conteúdo
            </MagneticBtn>
          </motion.div>

          <motion.div className="hero-stats-bar" variants={scaleIn}>
            <span>🔥 <strong>{videos.length}</strong> vídeos</span>
            <span className="dot" />
            <span>💬 Fórum ativo</span>
            <span className="dot" />
            <span>🔴 Lives ao vivo</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── FEATURED VIDEOS ─── */}
      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="section-header">
          <RevealText className="section-title">🔥 Em Destaque</RevealText>
          <MagneticBtn to="/videos" className="section-link">Ver todos →</MagneticBtn>
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
          <motion.div
            className="video-grid"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-50px' }}
          >
            {videos.map((v, i) => (
              <motion.div key={v.id} variants={fadeUp}>
                <div className="video-card-wrap" style={{ animationDelay: `${i * 0.04}s` }}>
                  <VideoCard video={v} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      {/* ─── STATS ─── */}
      <motion.section
        className="stats-section"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="stats-grid">
          {[
            { icon: '🎬', value: `${videos.length}+`, label: 'Vídeos' },
            { icon: '💬', value: 'Fórum', label: 'Discussões' },
            { icon: '🔴', value: 'Live', label: 'Streaming' },
            { icon: '🔞', value: '18+', label: 'Conteúdo Adulto' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className="stat-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ─── EMPTY ─── */}
      {videos.length === 0 && !loading && (
        <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="empty-icon">📹</div>
          <h3>Nenhum vídeo ainda</h3>
          <p>Seja o primeiro a enviar conteúdo!</p>
          <MagneticBtn href="/upload" className="btn btn-primary">Enviar Vídeo</MagneticBtn>
        </motion.div>
      )}
    </div>
  );
}
