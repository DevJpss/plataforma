import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, timeAgo } from '../utils/api';
import VideoCard from '../components/VideoCard';

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('videos');

  useEffect(() => {
    setLoading(true);
    api.get(`/api/users/${username}`)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [username]);

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
      <div className="profile-header">
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
          <span>Membro desde {timeAgo(profile.created_at)}</span>
        </div>
      </div>

      <div className="profile-tabs">
        <button className={`profile-tab ${tab === 'videos' ? 'active' : ''}`} onClick={() => setTab('videos')}>Vídeos</button>
        <button className={`profile-tab ${tab === 'liked' ? 'active' : ''}`} onClick={() => setTab('liked')}>Curtidos</button>
      </div>

      {tab === 'videos' && (
        profile.videos?.length > 0 ? (
          <div className="video-grid">
            {profile.videos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📹</div>
            <h3>Nenhum vídeo ainda</h3>
          </div>
        )
      )}

      {tab === 'liked' && (
        profile.likedVideos?.length > 0 ? (
          <div className="video-grid">
            {profile.likedVideos.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👍</div>
            <h3>Nenhum vídeo curtido</h3>
          </div>
        )
      )}
    </div>
  );
}
