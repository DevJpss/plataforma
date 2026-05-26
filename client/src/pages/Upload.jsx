import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MagneticBtn from '../components/MagneticBtn';
import { motion } from 'framer-motion';
import RevealText from '../components/RevealText';

const CATEGORIES = [
  'Geral', 'Amador', 'Profissional', 'Animação', 'Hentai', 'Fetiche', 'Lésbico', 'Gay', 'Trans', 'Casais', 'Masturbação', 'Sexo Oral', 'Anal', 'Grupo', 'Orgía', 'BDSM', 'Roleplay', 'Cosplay', 'Soft', 'Hardcore'
];

export default function Upload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    tags: '',
    category: 'Geral',
    is_private: false,
  });
  const [video, setVideo] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef(null);

  if (!user) {
    return (
      <div className="page upload-page">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h3>Faça login para enviar vídeos</h3>
          <p>Você precisa estar logado para fazer upload</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!video) return toast('Selecione um vídeo', 'error');
    if (!form.title.trim()) return toast('Título obrigatório', 'error');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('video', video);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('tags', form.tags);
      fd.append('category', form.category);
      fd.append('is_private', form.is_private ? '1' : '0');
      if (thumbnail) fd.append('thumbnail_file', thumbnail);

      const data = await api.post('/api/videos/upload', fd, true);
      toast('Vídeo enviado com sucesso!', 'success');
      navigate(`/watch/${data.id}`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page upload-page">
      <div className="page-header">
        <RevealText as="h1">Enviar Vídeo</RevealText>
      </div>
      <motion.div className="upload-form-container" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <form className="upload-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Vídeo *</label>
            <div className="file-dropzone" onClick={() => videoInputRef.current?.click()}>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/x-matroska"
                onChange={(e) => setVideo(e.target.files[0])}
              />
              {video ? <p>{video.name}</p> : <p>Arraste ou clique para selecionar</p>}
            </div>
          </div>

          <div className="form-group">
            <label>Thumbnail (opcional)</label>
            <input type="file" accept="image/*" onChange={(e) => setThumbnail(e.target.files[0])} />
          </div>

          <div className="form-group">
            <label>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Categoria</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="ex: amador, casal, br"
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={form.is_private}
                onChange={(e) => setForm({ ...form, is_private: e.target.checked })}
              />
              Privado
            </label>
          </div>

          <MagneticBtn className="btn btn-primary btn-lg btn-full" disabled={uploading}>
            {uploading ? 'Enviando...' : 'Enviar Vídeo'}
          </MagneticBtn>
        </form>
      </motion.div>
    </div>
  );
}
