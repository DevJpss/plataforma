import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import VideoCard from '../components/VideoCard';
import MagneticBtn from '../components/MagneticBtn';
import { motion } from 'framer-motion';
import RevealText from '../components/RevealText';

const CATEGORIES = [
  'Geral', 'Amador', 'Profissional', 'Animação', 'Hentai', 'Fetiche', 'Lésbico', 'Gay', 'Trans', 'Casais', 'Masturbação', 'Sexo Oral', 'Anal', 'Grupo', 'Orgía', 'BDSM', 'Roleplay', 'Cosplay', 'Soft', 'Hardcore'
];

export default function Videos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [inputSearch, setInputSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);

  const fetchVideos = () => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: '24', page: String(page) });
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    api.get(`/api/videos?${params}`)
      .then(setVideos)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVideos();
  }, [sort, category, search, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputSearch);
    setPage(1);
    setSearchParams(inputSearch ? { search: inputSearch } : {});
  };

  return (
    <div className="page videos-page">
      <div className="page-header">
        <RevealText as="h1">Vídeos</RevealText>
        <div className="page-controls">
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Buscar..."
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
            />
            <MagneticBtn type="submit" className="btn btn-primary btn-sm">Buscar</MagneticBtn>
          </form>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            <option value="newest">Mais Recentes</option>
            <option value="popular">Mais Vistos</option>
            <option value="liked">Mais Curtidos</option>
          </select>
        </div>
      </div>

      <div className="category-chips">
        <button
          className={`chip ${!category ? 'active' : ''}`}
          onClick={() => { setCategory(''); setPage(1); }}
        >Todas</button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? 'active' : ''}`}
            onClick={() => { setCategory(c); setPage(1); }}
          >{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="video-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-thumb skeleton" />
              <div className="skeleton-line skeleton" />
              <div className="skeleton-line short skeleton" />
              <div className="skeleton-line shorter skeleton" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Nenhum vídeo encontrado</h3>
          <p>Tente outros filtros ou busque por outro termo</p>
        </div>
      ) : (
        <motion.div
          className="video-grid"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </motion.div>
      )}

      <div className="pagination">
        <MagneticBtn className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</MagneticBtn>
        <span className="page-info">Página {page}</span>
        <MagneticBtn className="btn btn-ghost" disabled={videos.length < 24} onClick={() => setPage(page + 1)}>Próxima</MagneticBtn>
      </div>
    </div>
  );
}
