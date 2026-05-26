import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, timeAgo } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VideoCard from '../components/VideoCard';
import MagneticBtn from '../components/MagneticBtn';
import { motion } from 'framer-motion';

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('videos');
  const [following, setFollowing] = useState(false);
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const p = await api.get(`/api/users/${username}`);
        setProfile(p);
        setFollowing(p.isFollowing || false);
        if (user && p.isOwner) {
          try { setPlaylists(await api.get('/api/playlists')); } catch (_) {}
        }
      } catch (_) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const handleFollow = async () => {
    if (!user) return toast('Faça login', 'info');
    try {
      const res = await api.post(`/api/users/${profile.id}/follow`);
      setFollowing(res.following);
      setProfile(prev => ({
        ...prev,
        followers_count: prev.followers_count + (res.following ? 1 : -1)
      }));
      toast(res.following ? 'Seguindo!' : 'Deixou de seguir', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="page profile-page">
        <div className="profile-skeleton">
          <div className="skeleton" style={{ width: 96, height: 96, borderRadius: '50%' }} />
          <div className="skeleton" style={{ width: 200, height: 28, marginTop: 16 }} />
          <div className="skeleton" style={{ width: 150, height: 16, marginTop: 8 }} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page profile-page">
        <div className="empty-state">
          <div className="empty-icon">😕</div>
          <h3>Usuário não encontrado</h3>
          <Link to="/" className="btn btn-primary">Voltar</Link>
        </div>
      </div>
    );
  }

  if (profile.is_private) {
    return (
      <div className="page profile-page">
        <div className="profile-header">
          <div className="profile-avatar-lg">
            {profile.avatar ? <img src={profile.avatar} alt="" /> : <div className="avatar-placeholder-lg">{profile.username?.[0]}</div>}
          </div>
          <h1>{profile.username}</h1>
          <p className="profile-bio">Este perfil é privado 🔒</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page profile-page">
      <motion.div className="profile-header" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <div className="profile-avatar-lg">
          {profile.avatar ? <img src={profile.avatar} alt="" /> : <div className="avatar-placeholder-lg">{profile.username?.[0]}</div>}
        </div>
        <h1>{profile.username}</h1>
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        <div className="profile-stats">
          <span>{profile.video_count || 0} vídeos</span>
          <span className="dot" />
          <span>{profile.post_count || 0} posts</span>
          <span className="dot" />
          <span><strong>{profile.followers_count || 0}</strong> seguidores</span>
          <span className="dot" />
          <span><strong>{profile.following_count || 0}</strong> seguindo</span>
          <span className="dot" />
          <span>Membro desde {timeAgo(profile.created_at)}</span>
        </div>
        {user && !profile.isOwner && (
          <MagneticBtn className={`btn ${following ? 'btn-ghost' : 'btn-primary'}`} onClick={handleFollow}>
            {following ? 'Seguindo' : 'Seguir'}
          </MagneticBtn>
        )}
      </motion.div>

      <div className="profile-tabs">
        <MagneticBtn className={`profile-tab ${tab === 'videos' ? 'active' : ''}`} onClick={() => setTab('videos')}>Vídeos</MagneticBtn>
        <MagneticBtn className={`profile-tab ${tab === 'liked' ? 'active' : ''}`} onClick={() => setTab('liked')}>Curtidos</MagneticBtn>
        <MagneticBtn className={`profile-tab ${tab === 'playlists' ? 'active' : ''}`} onClick={() => setTab('playlists')}>Playlists</MagneticBtn>
      </div>

      {tab === 'videos' && (
        profile.videos?.length > 0 ? (
          <motion.div className="video-grid" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
            {profile.videos.map((v) => <VideoCard key={v.id} video={v} />)}
          </motion.div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📹</div>
            <h3>Nenhum vídeo ainda</h3>
          </div>
        )
      )}

      {tab === 'liked' && (
        profile.likedVideos?.length > 0 ? (
          <motion.div className="video-grid" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
            {profile.likedVideos.map((v) => <VideoCard key={v.id} video={v} />)}
          </motion.div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👍</div>
            <h3>Nenhum vídeo curtido</h3>
          </div>
        )
      )}

      {tab === 'playlists' && (
        playlists.length > 0 ? (
          <motion.div className="playlist-grid" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {playlists.map((pl) => (
              <Link key={pl.id} to={`/playlist/${pl.id}`} className="playlist-card">
                <div className="playlist-card-icon">📁</div>
                <div className="playlist-card-info">
                  <strong>{pl.name}</strong>
                  <span>{pl.video_count} vídeos</span>
                </div>
              </Link>
            ))}
          </motion.div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>Nenhuma playlist</h3>
          </div>
        )
      )}
    </div>
  );
}
