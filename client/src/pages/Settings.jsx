import { useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MagneticBtn from '../components/MagneticBtn';
import { motion } from 'framer-motion';
import RevealText from '../components/RevealText';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [bio, setBio] = useState(user?.bio || '');
  const [isPrivate, setIsPrivate] = useState(user?.is_private === 1);
  const [showLikes, setShowLikes] = useState(user?.show_likes !== 0);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  if (!user) {
    return (
      <div className="page settings-page">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <h3>Faça login para acessar configurações</h3>
        </div>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('bio', bio);
      fd.append('is_private', isPrivate ? 'true' : 'false');
      fd.append('show_likes', showLikes ? 'true' : 'false');
      if (avatarFile) fd.append('avatar', avatarFile);
      await api.put('/api/me', fd, true);
      const updated = await api.get('/api/me');
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      toast('Configurações salvas!', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page settings-page">
      <div className="page-header">
        <RevealText as="h1">Configurações</RevealText>
      </div>
      <motion.div className="settings-form-container" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <form className="settings-form" onSubmit={handleSave}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user.email} disabled style={{ opacity: 0.6 }} />
          </div>

          <div className="form-group">
            <label>Avatar</label>
            <div className="avatar-upload">
              {user.avatar && <img src={user.avatar} alt="" className="avatar-preview" />}
              <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} />
            </div>
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              Perfil Privado
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" checked={showLikes} onChange={(e) => setShowLikes(e.target.checked)} />
              Mostrar vídeos curtidos no perfil
            </label>
          </div>

          {user.email_verified === 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px solid var(--border)', marginTop: 16 }}>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 8 }}>
                📧 Email não verificado. Clique no link que enviamos para <strong>{user.email}</strong>.
              </p>
              <button
                className="btn btn-ghost btn-sm"
                disabled={resending}
                onClick={async () => {
                  setResending(true);
                  try {
                    await api.post('/api/auth/resend-verification', { email: user.email });
                    toast('Email de verificação reenviado!', 'success');
                  } catch (e) {
                    toast(e.message, 'error');
                  } finally {
                    setResending(false);
                  }
                }}
              >
                {resending ? 'Enviando...' : 'Reenviar Email'}
              </button>
            </div>
          )}

          <MagneticBtn className="btn btn-primary btn-full" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </MagneticBtn>
        </form>
      </motion.div>
    </div>
  );
}
