import { useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [bio, setBio] = useState(user?.bio || '');
  const [isPrivate, setIsPrivate] = useState(user?.is_private === 1);
  const [showLikes, setShowLikes] = useState(user?.show_likes !== 0);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

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
        <h1>Configurações</h1>
      </div>
      <div className="settings-form-container">
        <form className="settings-form" onSubmit={handleSave}>
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

          <button className="btn btn-primary btn-full" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  );
}
