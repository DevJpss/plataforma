require('dotenv').config(); // 🔒 Carrega variáveis de ambiente primeiro
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const helmet = require('helmet'); // 🛡️ Segurança HTTP
const rateLimit = require('express-rate-limit'); // 🚦 Limitador de requisições
const xss = require('xss'); // 🧹 Filtro anti-injeção de scripts
const { sendVerificationEmail, sendPasswordResetEmail } = require('./email'); // 📧

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const ffmpegDir = path.dirname(ffmpegInstaller.path);
const ffprobePath = path.join(ffmpegDir, 'ffprobe' + (process.platform === 'win32' ? '.exe' : ''));
if (fs.existsSync(ffprobePath)) {
  ffmpeg.setFfprobePath(ffprobePath);
}

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata?.format?.duration;
      resolve(duration ? Math.round(duration) : 0);
    });
  });
}

function generateThumbnail(videoPath, outputPath, seekTime = 2) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seek(seekTime)
      .frames(1)
      .size('640x360')
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

function getAdsConfig() {
  return {
    enabled: process.env.ADS_ENABLED === 'true',
    header: process.env.ADS_HEADER_BANNER || '',
    footer: process.env.ADS_FOOTER_BANNER || '',
    sidebar: process.env.ADS_SIDEBAR_BANNER || '',
    video: process.env.ADS_VIDEO_BANNER || ''
  };
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ─── BLINDAGEM DE REDE (HELMET & CORS) ────────────────────────────────────────
// Desativamos algumas políticas estritas temporariamente para não quebrar o player HLS
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CLIENT_URL || '*', // Em produção, aceite apenas do seu domínio
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Protege contra payloads JSON gigantes
// Serve React built files (SPA)
app.use(express.static(path.join(__dirname, 'client/dist')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ─── RATE LIMITING (ANTI BRUTE-FORCE / DDOS) ──────────────────────────────────
// Limite global: 1000 requisições a cada 15 minutos por IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: { error: 'Muitas requisições deste IP, tente novamente mais tarde.' }
});
app.use('/api/', globalLimiter);

// Limite estrito para autenticação: 10 tentativas por hora
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: { error: 'Muitas tentativas de login ou registro. Bloqueado por 1 hora.' }
});

// Limite para ações (like, react, etc): 60 por minuto
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Muitas ações, aguarde um momento.' }
});

// Limite para criar conteúdo (posts, respostas, comentários): 10 por minuto
const contentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Muito conteúdo criado rapidamente. Aguarde um momento.' }
});

// Limite para denúncias: 5 por minuto
const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Muitas denúncias. Aguarde um momento.' }
});

// Limite para uploads: 5 por minuto
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Muitos uploads. Aguarde um momento.' }
});

// ─── GARANTIA DE PASTAS ───────────────────────────────────────────────────────
['public/uploads/videos', 'public/uploads/thumbnails', 'public/uploads/forum'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// A chave agora vem do .env de forma segura
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('❌ ERRO FATAL: JWT_SECRET não definido no arquivo .env!');
  process.exit(1); // Mata o servidor se não estiver seguro
}
// ─── DATABASE ────────────────────────────────────────────────────────────────

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT NULL,
    bio TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    is_private INTEGER DEFAULT 0,
    show_likes INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    // ALTER TABLE garante que bancos existentes também recebam as colunas
    db.run(`ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN show_likes INTEGER DEFAULT 1`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN verification_token TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN verification_token_expires DATETIME DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN reset_token TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN reset_token_expires DATETIME DEFAULT NULL`, () => {});
  });

  db.run(`CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    filename TEXT NOT NULL,
    thumbnail TEXT DEFAULT NULL,
    duration INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    tags TEXT DEFAULT '',
    category TEXT DEFAULT 'geral',
    is_private INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS video_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    UNIQUE(video_id, user_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS video_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(video_id) REFERENCES videos(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS forum_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '💬',
    post_count INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS forum_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    pinned INTEGER DEFAULT 0,
    locked INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES forum_categories(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`, () => {
    db.run(`ALTER TABLE forum_posts ADD COLUMN is_deleted INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE forum_posts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});
    db.run(`ALTER TABLE forum_posts ADD COLUMN locked INTEGER DEFAULT 0`, () => {});
  });

  db.run(`CREATE TABLE IF NOT EXISTS forum_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES forum_posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`, () => {
    db.run(`ALTER TABLE forum_replies ADD COLUMN is_deleted INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE forum_replies ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});
  });

  db.run(`CREATE TABLE IF NOT EXISTS forum_post_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id, emoji),
    FOREIGN KEY(post_id) REFERENCES forum_posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS forum_reply_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reply_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reply_id, user_id, emoji),
    FOREIGN KEY(reply_id) REFERENCES forum_replies(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    stream_key TEXT UNIQUE NOT NULL,
    is_live INTEGER DEFAULT 0,
    viewer_count INTEGER DEFAULT 0,
    thumbnail TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS video_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, user_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS video_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_id, user_id)
  )`);

  // Suporte a replies nos comentários
  db.run(`ALTER TABLE video_comments ADD COLUMN parent_id INTEGER DEFAULT NULL`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS follows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    FOREIGN KEY(follower_id) REFERENCES users(id),
    FOREIGN KEY(following_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT DEFAULT NULL,
    actor_id INTEGER DEFAULT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS playlist_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    position INTEGER DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, video_id),
    FOREIGN KEY(playlist_id) REFERENCES playlists(id),
    FOREIGN KEY(video_id) REFERENCES videos(id)
  )`);


  // Seed forum categories
  db.get('SELECT COUNT(*) as c FROM forum_categories', (err, row) => {
    if (row && row.c === 0) {
      const cats = [
        ['Geral', 'Discussões gerais da comunidade', '🌐'],
        ['Apresentações', 'Apresente-se para a comunidade', '👋'],
        ['Conteúdo & Criadores', 'Fale sobre criadores e conteúdos', '🎬'],
        ['Pedidos', 'Peça conteúdos específicos', '🙏'],
        ['Tecnologia', 'Suporte técnico e dicas', '⚙️'],
        ['Off-topic', 'Qualquer assunto', '💬'],
      ];
      cats.forEach(([name, description, icon]) => {
        db.run('INSERT INTO forum_categories (name, description, icon) VALUES (?,?,?)', [name, description, icon]);
      });
    }
  });
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────



function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token necessário' });
  try {
    const decoded = jwt.verify(token, SECRET);
    db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err || !user) return res.status(401).json({ error: 'Usuário não encontrado' });
      if (user.is_banned === 1) {
        return res.status(403).json({ error: user.ban_reason ? 'Conta banida: ' + xss(user.ban_reason) : 'Conta banida' });
      }
      req.user = user;
      next();
    });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, user) => {
        if (user && user.is_banned !== 1) req.user = user;
        next();
      });
      return;
    } catch {}
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Token necessário' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Apenas administradores' });
  next();
}

function isMod(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Token necessário' });
  if (req.user.role !== 'admin' && req.user.role !== 'mod') 
    return res.status(403).json({ error: 'Apenas moderadores' });
  next();
}

function isOwnerOrMod(resourceUserId, req) {
  if (!req.user) return false;
  if (req.user.role === 'admin' || req.user.role === 'mod') return true;
  return req.user.id === resourceUserId;
}

// ─── UPLOAD CONFIG ────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'public/uploads');

const combinedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') cb(null, path.join(UPLOADS_DIR, 'videos'));
    else cb(null, path.join(UPLOADS_DIR, 'thumbnails'));
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const avatarStorage = multer.diskStorage({
  destination: path.join(UPLOADS_DIR, 'thumbnails'),
  filename: (req, file, cb) => cb(null, 'avatar_' + Date.now() + path.extname(file.originalname))
});

const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/avi', 'video/quicktime'];

function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.includes(ext)) {
    return cb(new Error('Tipo de arquivo não permitido. Apenas: ' + ALLOWED_IMAGE_EXTS.join(', ')));
  }
  if (file.mimetype && !ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    return cb(new Error('MIME type não permitido'));
  }
  cb(null, true);
}

const uploadMedia = multer({
  storage: combinedStorage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_VIDEO_EXTS.includes(ext)) {
        return cb(new Error('Tipo de vídeo não permitido'));
      }
      if (file.mimetype && !ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
        return cb(new Error('MIME type de vídeo não permitido'));
      }
      cb(null, true);
    } else {
      imageFileFilter(req, file, cb);
    }
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter
});

const forumMediaStorage = multer.diskStorage({
  destination: path.join(UPLOADS_DIR, 'forum'),
  filename: (req, file, cb) => cb(null, 'forum_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + path.extname(file.originalname))
});

const uploadForumMedia = multer({
  storage: forumMediaStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter
});

// ─── ADS ROUTE ──────────────────────────────────────────────────────────────

app.get('/api/ads', (req, res) => {
  res.json(getAdsConfig());
});

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

app.post('/api/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;
  
  // Regex para validação robusta
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const userRegex = /^[a-zA-Z0-9_]{3,20}$/; // Apenas letras, números e underline (3 a 20 chars)

  if (!username || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (!userRegex.test(username)) return res.status(400).json({ error: 'Usuário deve ter entre 3 e 20 caracteres (sem espaços ou símbolos)' });
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Formato de email inválido' });
  if (password.length < 8) return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];
    db.run('INSERT INTO users (username, email, password, verification_token, verification_token_expires) VALUES (?,?,?,?,?)',
      [username.toLowerCase(), email.toLowerCase(), hash, verificationToken, expires],
      async function(err) {
        if (err) return res.status(400).json({ error: 'Usuário ou email já cadastrado' });
        const token = jwt.sign({ id: this.lastID, username: username.toLowerCase(), role: 'user' }, SECRET, { expiresIn: '7d' });
        sendVerificationEmail(email, verificationToken, username.toLowerCase()).catch((e) => {
          console.error('❌ Erro ao enviar email de verificação:', e.message);
        });
        res.json({
          token,
          user: { id: this.lastID, username: username.toLowerCase(), email, role: 'user', email_verified: 0 },
          email_sent: true,
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// ─── EMAIL VERIFICATION ─────────────────────────────────────

app.get('/api/auth/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token ausente' });

  db.get('SELECT id, email, username FROM users WHERE verification_token = ? AND verification_token_expires > datetime(\'now\')', [token], (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro no banco de dados' });
    if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

    db.run('UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?', [user.id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Erro ao verificar email' });
      res.json({ success: true, message: 'Email verificado com sucesso!' });
    });
  });
});

app.post('/api/auth/resend-verification', authLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatório' });

  db.get('SELECT id, username, email_verified FROM users WHERE email = ?', [email.toLowerCase()], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro no banco de dados' });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.email_verified) return res.status(400).json({ error: 'Email já verificado' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];
    db.run('UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
      [verificationToken, expires, user.id], async (err2) => {
        if (err2) return res.status(500).json({ error: 'Erro ao gerar token' });
        sendVerificationEmail(email, verificationToken, user.username).catch((e) => {
          console.error('❌ Erro ao reenviar email:', e.message);
        });
        res.json({ success: true, message: 'Email de verificação reenviado!' });
      }
    );
  });
});

// ─── PASSWORD RESET ─────────────────────────────────────────

app.post('/api/auth/forgot-password', authLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatório' });

  db.get('SELECT id, username FROM users WHERE email = ?', [email.toLowerCase()], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro no banco de dados' });
    if (!user) return res.json({ success: true, message: 'Se o email existir, você receberá um link de redefinição.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];
    db.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, expires, user.id], async (err2) => {
        if (err2) return res.status(500).json({ error: 'Erro ao gerar token' });
        sendPasswordResetEmail(email, resetToken, user.username).catch((e) => {
          console.error('❌ Erro ao enviar email de redefinição:', e.message);
        });
        res.json({ success: true, message: 'Se o email existir, você receberá um link de redefinição.' });
      }
    );
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token e nova senha obrigatórios' });
  if (password.length < 8) return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres' });

  db.get('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > datetime(\'now\')', [token], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro no banco de dados' });
    if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

    try {
      const hash = await bcrypt.hash(password, 10);
      db.run('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hash, user.id], (err2) => {
        if (err2) return res.status(500).json({ error: 'Erro ao redefinir senha' });
        res.json({ success: true, message: 'Senha redefinida com sucesso!' });
      });
    } catch (e) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });
});

app.post('/api/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Preencha todos os campos' });

  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username.toLowerCase(), username.toLowerCase()], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro no banco de dados' });
    if (!user) return res.status(400).json({ error: 'Credenciais inválidas' });
    
    if (user.is_banned === 1) {
      return res.status(403).json({ error: user.ban_reason ? 'Conta banida: ' + xss(user.ban_reason) : 'Conta banida' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });
    
    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '7d' });
    const email_verified = user.email_verified === 1;
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, role: user.role, email_verified } });
  });
});

app.get('/api/me', auth, (req, res) => {
  db.get('SELECT id, username, email, avatar, bio, role, is_private, show_likes, email_verified, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    db.get('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?', [req.user.id], (err, following) => {
      db.get('SELECT COUNT(*) as c FROM follows WHERE following_id = ?', [req.user.id], (err, followers) => {
        res.json({ ...user, following_count: following.c, followers_count: followers.c });
      });
    });
  });
});

app.put('/api/me', auth, uploadLimiter, uploadAvatar.single('avatar'), (req, res) => {
  // Limpa a bio antes de salvar no banco
  const bio = req.body.bio !== undefined ? xss(req.body.bio) : undefined;
  const { is_private, show_likes } = req.body;
  const avatar = req.file ? '/uploads/thumbnails/' + req.file.filename : undefined;
  
  const updates = [];
  const values = [];

  if (bio !== undefined) { updates.push('bio = ?'); values.push(bio); }
  // ... resto da rota continua igual
  if (avatar) { updates.push('avatar = ?'); values.push(avatar); }
  
  // Converte os valores do checkbox (que chegam como string ou boolean) para 0 ou 1
  if (is_private !== undefined) { 
    updates.push('is_private = ?'); 
    values.push(is_private === 'true' || is_private === '1' ? 1 : 0); 
  }
  if (show_likes !== undefined) { 
    updates.push('show_likes = ?'); 
    values.push(show_likes === 'true' || show_likes === '1' ? 1 : 0); 
  }

  if (!updates.length) return res.json({ message: 'Nada atualizado' });

  values.push(req.user.id);
  
  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, function(err) {
    if (err) {
      console.error('❌ ERRO NO SQL:', err.message);
      return res.status(500).json({ error: 'Erro ao salvar no banco' });
    }
    res.json({ message: 'Perfil atualizado com sucesso!' });
  });
});

app.get('/api/users/:username', optionalAuth, (req, res) => {
  const sqlUser = `
    SELECT id, username, avatar, bio, created_at, is_private, show_likes,
    (SELECT COUNT(*) FROM videos WHERE user_id = users.id) as video_count,
    (SELECT COUNT(*) FROM forum_posts WHERE user_id = users.id) as post_count,
    (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count,
    (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following_count
    FROM users WHERE username = ?`;

  db.get(sqlUser, [req.params.username], (err, user) => {
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const isOwner = req.user && req.user.id === user.id;

    // Bloqueio de Perfil Privado
    if (user.is_private && !isOwner) {
      return res.json({ 
        username: user.username, 
        avatar: user.avatar, 
        is_private: true, 
        message: "Este perfil é privado" 
      });
    }

    // ─── A CORREÇÃO ESTÁ AQUI ───
    // Se for o dono, busca TODOS os vídeos. Se for visitante, apenas is_private = 0 (Públicos).
    const videoQuery = isOwner 
      ? 'SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM videos WHERE user_id = ? AND is_private = 0 ORDER BY created_at DESC';

      db.all(videoQuery, [user.id], (err, videos) => {
        // Follow status
        let isFollowing = false;
        const finishProfile = (likedVideos) => {
          res.json({ ...user, videos, likedVideos, isOwner, isFollowing });
        };
        if (req.user && !isOwner) {
          db.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, user.id], (err, row) => {
            isFollowing = !!row;
            if (user.show_likes || isOwner) {
              const sqlLikes = `
                SELECT v.* FROM video_likes l 
                JOIN videos v ON l.video_id = v.id 
                WHERE l.user_id = ? AND l.type = 'like' LIMIT 12`;
              db.all(sqlLikes, [user.id], (err, likedVideos) => finishProfile(likedVideos));
            } else {
              finishProfile([]);
            }
          });
        } else {
          if (user.show_likes || isOwner) {
            const sqlLikes = `
              SELECT v.* FROM video_likes l 
              JOIN videos v ON l.video_id = v.id 
              WHERE l.user_id = ? AND l.type = 'like' LIMIT 12`;
            db.all(sqlLikes, [user.id], (err, likedVideos) => finishProfile(likedVideos));
          } else {
            finishProfile([]);
          }
        }
      });
  });
});

// ─── VIDEO ROUTES ─────────────────────────────────────────────────────────────

app.post('/api/videos/upload', auth, uploadLimiter,
  uploadMedia.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail_file', maxCount: 1 }]),
  async (req, res) => {
    try {
      if (!req.files || !req.files['video']) return res.status(400).json({ error: 'Envie um arquivo de vídeo' });

      const title = xss(req.body.title);
      const description = xss(req.body.description);
      const tags = xss(req.body.tags);
      const category = xss(req.body.category);
      const is_private = req.body.is_private;

      if (!title) return res.status(400).json({ error: 'Título obrigatório' });

      const filename = '/uploads/videos/' + req.files['video'][0].filename;
      const videoFullPath = path.join(__dirname, 'public', filename);

      let duration = 0;
      try {
        duration = await getVideoDuration(videoFullPath);
      } catch(e) {
        console.error('Erro ao extrair duração:', e.message);
      }

      let thumbnail = null;
      if (req.files['thumbnail_file']) {
        thumbnail = '/uploads/thumbnails/' + req.files['thumbnail_file'][0].filename;
      } else {
        try {
          const thumbName = 'auto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '.jpg';
          const thumbPath = path.join(__dirname, 'public', 'uploads', 'thumbnails', thumbName);
          const seekTime = duration > 5 ? 3 : 0;
          await generateThumbnail(videoFullPath, thumbPath, seekTime);
          thumbnail = '/uploads/thumbnails/' + thumbName;
        } catch(e) {
          console.error('Erro ao gerar thumbnail:', e.message);
        }
      }

      db.run(
        'INSERT INTO videos (user_id, title, description, filename, thumbnail, duration, tags, category, is_private) VALUES (?,?,?,?,?,?,?,?,?)',
        [req.user.id, title, description || '', filename, thumbnail, duration, tags || '', category || 'Geral', parseInt(is_private) || 0],
        function(err) {
          if (err) {
            console.error('❌ ERRO AO SALVAR NO BANCO:', err.message);
            return res.status(500).json({ error: 'Erro ao salvar no banco' });
          }
          const videoId = this.lastID;
          console.log('✅ VÍDEO REGISTRADO NO BANCO COM ID:', videoId);
          res.json({ message: 'Vídeo enviado!', id: videoId, filename, duration, thumbnail });

          const hlsFolder = path.join(__dirname, 'public/uploads/videos/hls_' + videoId);
          processVideoToHLS(videoFullPath, hlsFolder);
        }
      );
    } catch(e) {
      console.error('❌ ERRO NO UPLOAD:', e);
      res.status(500).json({ error: 'Erro no processamento do vídeo' });
    }
  }
);

// Upload com thumbnail separada
app.post('/api/videos/:id/thumbnail', auth, uploadLimiter, uploadMedia.single('thumbnail'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem' });
  const thumb = '/uploads/thumbnails/' + req.file.filename;
  db.run('UPDATE videos SET thumbnail = ? WHERE id = ? AND user_id = ?',
    [thumb, req.params.id, req.user.id], function(err) {
      res.json({ thumbnail: thumb });
    });
});

app.get('/api/videos', optionalAuth, (req, res) => {
  const { page = 1, limit = 24, category, search, sort = 'newest' } = req.query;
  const offset = (page - 1) * limit;
  
  let where = ['v.is_private = 0']; // 0=público, 1=privado, 2=não listado
  let params = [];
  
  // No server.js, dentro da rota GET /api/videos, mude para:
if (category) { where.push('LOWER(v.category) = LOWER(?)'); params.push(category); }
  if (search) { where.push('(v.title LIKE ? OR v.tags LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  
  const orderMap = { newest: 'v.created_at DESC', popular: 'v.views DESC', liked: 'v.likes DESC' };
  const order = orderMap[sort] || 'v.created_at DESC';
  
  const countSql = `SELECT COUNT(*) as total FROM videos v WHERE ${where.join(' AND ')}`;
  const sql = `SELECT v.*, u.username, u.avatar 
               FROM videos v
               LEFT JOIN users u ON v.user_id = u.id
               WHERE ${where.join(' AND ')}
               ORDER BY ${order} LIMIT ? OFFSET ?`;
               
  db.get(countSql, params, (countErr, countRow) => {
    if (countErr) { console.error('❌ Erro count:', countErr.message); }
    db.all(sql, [...params, parseInt(limit), parseInt(offset)], (err, rows) => {
      if (err) { console.error('❌ Erro SQL:', err.message); return res.status(500).json({ error: 'Erro ao buscar vídeos' }); }
      console.log('📋 /api/videos retornou', rows?.length, 'vídeos');
      res.json({ videos: rows || [], total: countRow?.total || 0, page: parseInt(page), limit: parseInt(limit) });
    });
  });
});

app.get('/api/videos/:id', optionalAuth, (req, res) => {
  db.get(`SELECT v.*, u.username, u.avatar FROM videos v
          LEFT JOIN users u ON v.user_id = u.id
          WHERE v.id = ?`, [req.params.id], (err, video) => {
    if (!video) return res.status(404).json({ error: 'Vídeo não encontrado' });

    const isOwner = req.user && req.user.id === video.user_id;

    if (video.is_private === 1 && !isOwner) {
      return res.status(403).json({ error: 'Este vídeo é privado.' });
    }

    const hlsFolder = 'public/uploads/videos/hls_' + video.id;
    video.has_hls = fs.existsSync(path.join(__dirname, hlsFolder, 'master.m3u8'));
    video.hls_url = '/uploads/videos/hls_' + video.id + '/master.m3u8';
    video.isOwner = isOwner; 

    let isFavorite = false;

    const finishRequest = () => {
      db.run('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);
      db.all(`SELECT r.*, u.username, u.avatar FROM video_comments r
              JOIN users u ON r.user_id = u.id
              WHERE r.video_id = ? ORDER BY r.created_at DESC`, [req.params.id], (err, comments) => {
        res.json({ ...video, is_favorite: isFavorite, comments: comments || [] });
      });
    };

    if (req.user) {
      // Deleta o registro antigo e insere o novo para atualizar a data do histórico
      db.run(`DELETE FROM video_history WHERE video_id = ? AND user_id = ?`, [video.id, req.user.id], () => {
        db.run(`INSERT INTO video_history (video_id, user_id) VALUES (?, ?)`, [video.id, req.user.id]);
      });
      // Verifica se está nos favoritos
      db.get(`SELECT id FROM video_favorites WHERE video_id = ? AND user_id = ?`, [video.id, req.user.id], (err, fav) => {
        if (fav) isFavorite = true;
        finishRequest();
      });
    } else {
      finishRequest();
    }
  });
});

app.delete('/api/videos/:id', auth, (req, res) => {
  db.get('SELECT * FROM videos WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, video) => {
    if (!video) return res.status(404).json({ error: 'Vídeo não encontrado ou sem permissão' });

    // 1. Apaga o vídeo original (.mp4)
    const videoFile = path.join(__dirname, 'public', video.filename);
    if (fs.existsSync(videoFile)) fs.unlinkSync(videoFile);

    // 2. Apaga a Thumbnail (imagem)
    if (video.thumbnail && video.thumbnail.startsWith('/uploads')) {
      const thumbFile = path.join(__dirname, 'public', video.thumbnail);
      if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile);
    }

    // 3. Apaga a pasta HLS inteira (Recursivo: apaga a pasta e tudo dentro)
    const hlsFolder = path.join(__dirname, 'public/uploads/videos/hls_' + video.id);
    if (fs.existsSync(hlsFolder)) fs.rmSync(hlsFolder, { recursive: true, force: true });

    // 4. Limpeza de Banco de Dados (Evita dados órfãos)
    db.serialize(() => {
      db.run('DELETE FROM video_likes WHERE video_id = ?', [video.id]);
      db.run('DELETE FROM video_comments WHERE video_id = ?', [video.id]);
      db.run('DELETE FROM video_favorites WHERE video_id = ?', [video.id]);
      db.run('DELETE FROM video_history WHERE video_id = ?', [video.id]);
      db.run('DELETE FROM playlist_videos WHERE video_id = ?', [video.id]);
      db.run('DELETE FROM reports WHERE video_id = ?', [video.id]);
      
      // Finalmente, apaga o vídeo em si
      db.run('DELETE FROM videos WHERE id = ?', [video.id], () => {
        res.json({ message: 'Vídeo e todos os rastros foram completamente excluídos.' });
      });
    });
  });
});
// Alternar Favorito
app.post('/api/videos/:id/favorite', auth, actionLimiter, (req, res) => {
  db.get('SELECT id FROM video_favorites WHERE video_id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
    if (row) {
      db.run('DELETE FROM video_favorites WHERE id = ?', [row.id]);
      res.json({ message: 'Removido dos favoritos', is_favorite: false });
    } else {
      db.run('INSERT INTO video_favorites (video_id, user_id) VALUES (?, ?)', [req.params.id, req.user.id]);
      res.json({ message: 'Adicionado aos favoritos', is_favorite: true });
    }
  });
});

// Buscar Histórico do Usuário
app.get('/api/me/history', auth, (req, res) => {
  const sql = `SELECT v.*, u.username FROM video_history h 
               JOIN videos v ON h.video_id = v.id 
               JOIN users u ON v.user_id = u.id
               WHERE h.user_id = ? ORDER BY h.watched_at DESC LIMIT 50`;
  db.all(sql, [req.user.id], (err, rows) => res.json(rows || []));
});

// Buscar Favoritos do Usuário
app.get('/api/me/favorites', auth, (req, res) => {
  const sql = `SELECT v.*, u.username FROM video_favorites f 
               JOIN videos v ON f.video_id = v.id 
               JOIN users u ON v.user_id = u.id
               WHERE f.user_id = ? ORDER BY f.created_at DESC`;
  db.all(sql, [req.user.id], (err, rows) => res.json(rows || []));
});
// Rota para editar os dados do vídeo
app.put('/api/videos/:id', auth, (req, res) => {
  // Passa o aspirador de pó em todo o texto
  const title = xss(req.body.title);
  const description = xss(req.body.description);
  const tags = xss(req.body.tags);
  const category = xss(req.body.category);
  const is_private = req.body.is_private;
  
  db.run(
    'UPDATE videos SET title = ?, description = ?, tags = ?, category = ?, is_private = ? WHERE id = ? AND user_id = ?',
    [title, description || '', tags || '', category || 'Geral', parseInt(is_private), req.params.id, req.user.id],
    // ... resto da rota continua igual,
    function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar vídeo' });
      if (this.changes === 0) return res.status(403).json({ error: 'Não autorizado ou vídeo não encontrado' });
      res.json({ message: 'Vídeo atualizado com sucesso!' });
    }
  );
});

app.post('/api/videos/:id/like', auth, actionLimiter, (req, res) => {
  const { type } = req.body; // 'like' ou 'dislike'
  if (!['like', 'dislike'].includes(type)) return res.status(400).json({ error: 'Tipo inválido' });
  db.get('SELECT * FROM video_likes WHERE video_id = ? AND user_id = ?', [req.params.id, req.user.id], (err, existing) => {
    if (existing) {
      if (existing.type === type) {
        db.run('DELETE FROM video_likes WHERE id = ?', [existing.id]);
        db.run(`UPDATE videos SET ${type}s = ${type}s - 1 WHERE id = ?`, [req.params.id]);
        return res.json({ message: 'Removido' });
      }
      db.run('UPDATE video_likes SET type = ? WHERE id = ?', [type, existing.id]);
      const add = type, rem = type === 'like' ? 'dislike' : 'like';
      db.run(`UPDATE videos SET ${add}s = ${add}s + 1, ${rem}s = ${rem}s - 1 WHERE id = ?`, [req.params.id]);
    } else {
      db.run('INSERT INTO video_likes (video_id, user_id, type) VALUES (?,?,?)', [req.params.id, req.user.id, type]);
      db.run(`UPDATE videos SET ${type}s = ${type}s + 1 WHERE id = ?`, [req.params.id]);
    }
    res.json({ message: 'Ok' });
  });
});

app.post('/api/videos/:id/report', auth, reportLimiter, (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Motivo da denúncia é obrigatório' });
  const cleanReason = xss(reason.substring(0, 500));
  
  db.run('INSERT INTO reports (type, target_id, user_id, reason) VALUES (?,?,?,?)',
    ['video', req.params.id, req.user.id, cleanReason], function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao registrar denúncia' });
      res.json({ message: 'Denúncia recebida. Nossa equipe de moderação irá analisar o conteúdo.' });
    });
});

// ─── COMENTÁRIOS COM REPLIES ─────────────────────────
app.post('/api/videos/:id/comments', auth, contentLimiter, (req, res) => {
  const content = xss(req.body.content);
  const parent_id = req.body.parent_id ? parseInt(req.body.parent_id) : null;
  if (!content || content.trim() === '') return res.status(400).json({ error: 'Comentário vazio' });

  db.run('INSERT INTO video_comments (video_id, user_id, content, parent_id) VALUES (?,?,?,?)',
    [req.params.id, req.user.id, content, parent_id], function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao salvar comentário' });
      
      // Notificar dono do vídeo
      db.get('SELECT user_id FROM videos WHERE id = ?', [req.params.id], (err, video) => {
        if (video && video.user_id !== req.user.id) {
          db.run('INSERT INTO notifications (user_id, type, message, link, actor_id) VALUES (?,?,?,?,?)',
            [video.user_id, 'comment', `${req.user.username} comentou no seu vídeo`, `/watch/${req.params.id}`, req.user.id]);
        }
      });

      res.json({ id: this.lastID, content, username: req.user.username, parent_id, user_id: req.user.id });
    });
});

app.get('/api/videos/:id/comments', optionalAuth, (req, res) => {
  db.all(`SELECT c.*, u.username, u.avatar FROM video_comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.video_id = ? ORDER BY c.created_at DESC`, [req.params.id], (err, comments) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar comentários' });
    // Organizar em árvore: comentários pai primeiro, replies aninhadas
    const tree = [];
    const map = {};
    (comments || []).forEach(c => {
      c.replies = [];
      map[c.id] = c;
    });
    (comments || []).forEach(c => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies.push(c);
      } else {
        tree.push(c);
      }
    });
    res.json(tree);
  });
});

app.delete('/api/comments/:id', auth, (req, res) => {
  db.get('SELECT * FROM video_comments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, comment) => {
    if (!comment) return res.status(404).json({ error: 'Comentário não encontrado ou sem permissão' });
    db.run('DELETE FROM video_comments WHERE id = ? OR parent_id = ?', [req.params.id, req.params.id], () => {
      res.json({ message: 'Comentário removido' });
    });
  });
});

// ─── FOLLOW / UNFOLLOW ──────────────────────────────
app.post('/api/users/:id/follow', auth, actionLimiter, (req, res) => {
  const targetId = parseInt(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: 'Não pode seguir a si mesmo' });

  db.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetId], (err, row) => {
    if (row) {
      db.run('DELETE FROM follows WHERE id = ?', [row.id]);
      res.json({ following: false });
    } else {
      db.run('INSERT INTO follows (follower_id, following_id) VALUES (?,?)', [req.user.id, targetId], function() {
        // Notificar
        db.run('INSERT INTO notifications (user_id, type, message, link, actor_id) VALUES (?,?,?,?,?)',
          [targetId, 'follow', `${req.user.username} começou a seguir você`, `/profile/${req.user.username}`, req.user.id]);
        res.json({ following: true });
      });
    }
  });
});

app.get('/api/users/:id/follow-status', auth, (req, res) => {
  const targetId = parseInt(req.params.id);
  db.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetId], (err, row) => {
    res.json({ isFollowing: !!row });
  });
});

// ─── NOTIFICAÇÕES ───────────────────────────────────
app.get('/api/notifications', auth, (req, res) => {
  db.all(`SELECT n.*, u.username as actor_username, u.avatar as actor_avatar
          FROM notifications n LEFT JOIN users u ON n.actor_id = u.id
          WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50`,
    [req.user.id], (err, rows) => {
      db.get('SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND read = 0', [req.user.id], (err, count) => {
        res.json({ notifications: rows || [], unread: count ? count.unread : 0 });
      });
    });
});

app.post('/api/notifications/:id/read', auth, (req, res) => {
  db.run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], () => {
    res.json({ message: 'Ok' });
  });
});

app.post('/api/notifications/read-all', auth, (req, res) => {
  db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.user.id], () => {
    res.json({ message: 'Todas marcadas como lidas' });
  });
});

// ─── PLAYLISTS ──────────────────────────────────────
app.get('/api/playlists', auth, (req, res) => {
  db.all(`SELECT p.*,
          (SELECT COUNT(*) FROM playlist_videos WHERE playlist_id = p.id) as video_count
          FROM playlists p WHERE p.user_id = ? ORDER BY p.created_at DESC`,
    [req.user.id], (err, rows) => res.json(rows || []));
});

app.get('/api/playlists/:id', optionalAuth, (req, res) => {
  db.get(`SELECT p.*, u.username FROM playlists p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
    [req.params.id], (err, playlist) => {
      if (!playlist) return res.status(404).json({ error: 'Playlist não encontrada' });
      db.all(`SELECT v.*, pv.position, pv.added_at FROM playlist_videos pv
              JOIN videos v ON pv.video_id = v.id
              WHERE pv.playlist_id = ? ORDER BY pv.position ASC, pv.added_at DESC`,
        [req.params.id], (err, videos) => {
          res.json({ ...playlist, videos: videos || [] });
        });
    });
});

app.post('/api/playlists', auth, (req, res) => {
  const name = xss(req.body.name);
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome da playlist obrigatório' });
  db.run('INSERT INTO playlists (user_id, name) VALUES (?,?)', [req.user.id, name.trim()], function(err) {
    if (err) return res.status(500).json({ error: 'Erro ao criar playlist' });
    res.json({ id: this.lastID, name: name.trim() });
  });
});

app.put('/api/playlists/:id', auth, (req, res) => {
  const name = xss(req.body.name);
  const description = xss(req.body.description || '');
  db.run('UPDATE playlists SET name = ?, description = ? WHERE id = ? AND user_id = ?',
    [name, description, req.params.id, req.user.id], function(err) {
      if (this.changes === 0) return res.status(404).json({ error: 'Playlist não encontrada' });
      res.json({ message: 'Playlist atualizada' });
    });
});

app.delete('/api/playlists/:id', auth, (req, res) => {
  db.get('SELECT id FROM playlists WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, pl) => {
    if (!pl) return res.status(404).json({ error: 'Playlist não encontrada' });
    db.run('DELETE FROM playlist_videos WHERE playlist_id = ?', [req.params.id]);
    db.run('DELETE FROM playlists WHERE id = ?', [req.params.id], () => {
      res.json({ message: 'Playlist removida' });
    });
  });
});

app.post('/api/playlists/:id/videos', auth, (req, res) => {
  const videoId = parseInt(req.body.video_id);
  if (!videoId) return res.status(400).json({ error: 'video_id obrigatório' });
  db.get('SELECT id FROM playlists WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, pl) => {
    if (!pl) return res.status(404).json({ error: 'Playlist não encontrada' });
    db.get('SELECT id FROM playlist_videos WHERE playlist_id = ? AND video_id = ?', [req.params.id, videoId], (err, existing) => {
      if (existing) return res.json({ message: 'Vídeo já está na playlist' });
      db.get('SELECT MAX(position) as mp FROM playlist_videos WHERE playlist_id = ?', [req.params.id], (err, max) => {
        const pos = (max && max.mp !== null) ? max.mp + 1 : 0;
        db.run('INSERT INTO playlist_videos (playlist_id, video_id, position) VALUES (?,?,?)', [req.params.id, videoId, pos], () => {
          res.json({ message: 'Vídeo adicionado à playlist' });
        });
      });
    });
  });
});

app.delete('/api/playlists/:id/videos/:videoId', auth, (req, res) => {
  db.run('DELETE FROM playlist_videos WHERE playlist_id = ? AND video_id = ?',
    [req.params.id, req.params.videoId], () => {
      res.json({ message: 'Vídeo removido da playlist' });
    });
});

// Streaming de vídeo com suporte a Range (Protegido contra Path Traversal)
app.get('/api/stream/:filename', (req, res) => {
  const allowedDir = path.resolve(__dirname, 'public', 'uploads', 'videos');
  const filename = req.params.filename;
  
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(403).send('Acesso negado');
  }
  
  const filePath = path.resolve(path.join(allowedDir, filename));
  if (!filePath.startsWith(allowedDir)) {
    return res.status(403).send('Acesso negado');
  }
  
  if (!fs.existsSync(filePath)) return res.status(404).send('Não encontrado');
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': 'video/mp4' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }
  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
  const chunkSize = end - start + 1;
  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': 'video/mp4',
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
});

// ─── FORUM ROUTES ─────────────────────────────────────────────────────────────

app.post('/api/forum/upload', auth, uploadLimiter, uploadForumMedia.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem' });
  const url = '/uploads/forum/' + req.file.filename;
  res.json({ url, filename: req.file.filename });
});

app.get('/api/forum/categories', (req, res) => {
  db.all('SELECT * FROM forum_categories ORDER BY id', (err, rows) => res.json(rows || []));
});

app.get('/api/forum/posts', optionalAuth, (req, res) => {
  const { category_id, page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;
  let where = ['p.is_deleted = 0'];
  let params = [];
  if (category_id) { where.push('p.category_id = ?'); params.push(category_id); }
  if (search) { 
    where.push('(p.title LIKE ? OR p.content LIKE ?)'); 
    params.push(`%${search}%`, `%${search}%`); 
  }
  const whereStr = 'WHERE ' + where.join(' AND ');
  db.all(`SELECT p.*, u.username, u.avatar, c.name as category_name,
          (SELECT COUNT(*) FROM forum_post_reactions r WHERE r.post_id = p.id) as reactions_count
          FROM forum_posts p
          JOIN users u ON p.user_id = u.id
          JOIN forum_categories c ON p.category_id = c.id
          ${whereStr}
          ORDER BY p.pinned DESC, p.created_at DESC
          LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), parseInt(offset)], (err, rows) => res.json(rows || []));
});

app.get('/api/forum/posts/:id', optionalAuth, (req, res) => {
  const postId = req.params.id;
  
  db.get(`SELECT p.*, u.username, u.avatar, c.name as category_name
          FROM forum_posts p
          JOIN users u ON p.user_id = u.id
          JOIN forum_categories c ON p.category_id = c.id
          WHERE p.id = ?`, [postId], (err, post) => {
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    
    if (post.is_deleted === 1) {
      post.title = '[Post deletado]';
      post.content = 'Este post foi removido.';
    }
    
    const hasPermission = req.user && isOwnerOrMod(post.user_id, req);
    post.can_edit = hasPermission;
    post.can_delete = hasPermission;
    post.is_owner = req.user && req.user.id === post.user_id;
    
    db.run('UPDATE forum_posts SET views = views + 1 WHERE id = ?', [postId]);
    
    db.all(`SELECT r.*, u.username, u.avatar FROM forum_replies r
            JOIN users u ON r.user_id = u.id
            WHERE r.post_id = ? ORDER BY r.created_at ASC`, [postId], (err, replies) => {
      
      replies = (replies || []).map(r => {
        if (r.is_deleted === 1) {
          r.content = '[Resposta deletada]';
        }
        const hasReplyPerm = req.user && isOwnerOrMod(r.user_id, req);
        r.can_edit = hasReplyPerm;
        r.can_delete = hasReplyPerm;
        r.is_owner = req.user && req.user.id === r.user_id;
        return r;
      });
      
      db.all('SELECT emoji, COUNT(*) as count FROM forum_post_reactions WHERE post_id = ? GROUP BY emoji', [postId], (err, postReactions) => {
        db.all('SELECT reply_id, emoji, COUNT(*) as count FROM forum_reply_reactions WHERE reply_id IN (' + 
          replies.map(() => '?').join(',') + ') GROUP BY reply_id, emoji', 
          replies.map(r => r.id), (err, replyReactions) => {
          
          let userPostReactions = [];
          let userReplyReactions = [];
          
          const finish = () => {
            post.reactions = postReactions || [];
            post.my_reactions = userPostReactions;
            
            replies.forEach(r => {
              r.reactions = (replyReactions || []).filter(x => x.reply_id === r.id);
              r.my_reactions = userReplyReactions.filter(x => x.reply_id === r.id);
            });
            
            res.json({ ...post, replies: replies });
          };
          
          if (req.user) {
            db.all('SELECT emoji FROM forum_post_reactions WHERE post_id = ? AND user_id = ?', [postId, req.user.id], (err, upr) => {
              userPostReactions = (upr || []).map(x => x.emoji);
              db.all('SELECT reply_id, emoji FROM forum_reply_reactions WHERE reply_id IN (' + 
                replies.map(() => '?').join(',') + ') AND user_id = ?', 
                [...replies.map(r => r.id), req.user.id], (err, urr) => {
                userReplyReactions = urr || [];
                finish();
              });
            });
          } else {
            finish();
          }
        });
      });
    });
  });
});

app.post('/api/forum/posts', auth, contentLimiter, (req, res) => {
  const category_id = req.body.category_id;
  const title = xss(req.body.title);
  const content = xss(req.body.content);

  if (!category_id || !title || !content)
    return res.status(400).json({ error: 'Preencha todos os campos' });
// ...
  db.run('INSERT INTO forum_posts (category_id, user_id, title, content) VALUES (?,?,?,?)',
    [category_id, req.user.id, title, content], function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar post' });
      db.run('UPDATE forum_categories SET post_count = post_count + 1 WHERE id = ?', [category_id]);
      res.json({ id: this.lastID, message: 'Post criado!' });
    });
});

app.post('/api/forum/posts/:id/replies', auth, contentLimiter, (req, res) => {
  const postId = req.params.id;
  const content = xss(req.body.content);
  if (!content) return res.status(400).json({ error: 'Conteúdo vazio' });
  
  db.get('SELECT locked FROM forum_posts WHERE id = ?', [postId], (err, post) => {
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    
    const isModUser = req.user.role === 'admin' || req.user.role === 'mod';
    if (post.locked === 1 && !isModUser) {
      return res.status(403).json({ error: 'Este tópico está trancado. Apenas moderadores podem responder.' });
    }
    
    db.run('INSERT INTO forum_replies (post_id, user_id, content) VALUES (?,?,?)',
      [postId, req.user.id, content], function(err) {
        db.run('UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id = ?', [postId]);
        res.json({ id: this.lastID, message: 'Resposta enviada!' });
      });
  });
});

app.put('/api/forum/posts/:id', auth, (req, res) => {
  const postId = req.params.id;
  const title = xss(req.body.title);
  const content = xss(req.body.content);

  db.get('SELECT * FROM forum_posts WHERE id = ?', [postId], (err, post) => {
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    if (!isOwnerOrMod(post.user_id, req)) 
      return res.status(403).json({ error: 'Não autorizado' });

    if (!title || !content) 
      return res.status(400).json({ error: 'Título e conteúdo obrigatórios' });

    db.run('UPDATE forum_posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, content, postId], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar' });
        res.json({ message: 'Post atualizado!' });
      });
  });
});

app.delete('/api/forum/posts/:id', auth, (req, res) => {
  const postId = req.params.id;
  db.get('SELECT * FROM forum_posts WHERE id = ?', [postId], (err, post) => {
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });
    if (!isOwnerOrMod(post.user_id, req)) 
      return res.status(403).json({ error: 'Não autorizado' });

    db.run('UPDATE forum_posts SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [postId], function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao deletar' });
      res.json({ message: 'Post deletado!' });
    });
  });
});

app.put('/api/forum/replies/:id', auth, (req, res) => {
  const replyId = req.params.id;
  const content = xss(req.body.content);

  db.get('SELECT * FROM forum_replies WHERE id = ?', [replyId], (err, reply) => {
    if (!reply) return res.status(404).json({ error: 'Resposta não encontrada' });
    if (!isOwnerOrMod(reply.user_id, req)) 
      return res.status(403).json({ error: 'Não autorizado' });

    if (!content) 
      return res.status(400).json({ error: 'Conteúdo obrigatório' });

    db.run('UPDATE forum_replies SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [content, replyId], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar' });
        res.json({ message: 'Resposta atualizada!' });
      });
  });
});

app.delete('/api/forum/replies/:id', auth, (req, res) => {
  const replyId = req.params.id;
  db.get('SELECT * FROM forum_replies WHERE id = ?', [replyId], (err, reply) => {
    if (!reply) return res.status(404).json({ error: 'Resposta não encontrada' });
    if (!isOwnerOrMod(reply.user_id, req)) 
      return res.status(403).json({ error: 'Não autorizado' });

    db.run('UPDATE forum_replies SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [replyId], function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao deletar' });
      db.run('UPDATE forum_posts SET reply_count = MAX(0, reply_count - 1) WHERE id = ?', [reply.post_id]);
      res.json({ message: 'Resposta deletada!' });
    });
  });
});

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👀', '💯', '🙄', '🤔', '😈', '🥵'];

app.post('/api/forum/posts/:id/react', auth, actionLimiter, (req, res) => {
  const postId = req.params.id;
  const { emoji } = req.body;
  
  if (!emoji || !ALLOWED_EMOJIS.includes(emoji))
    return res.status(400).json({ error: 'Emoji inválido' });

  db.get('SELECT id FROM forum_posts WHERE id = ? AND is_deleted = 0', [postId], (err, post) => {
    if (!post) return res.status(404).json({ error: 'Post não encontrado' });

    db.get('SELECT id FROM forum_post_reactions WHERE post_id = ? AND user_id = ? AND emoji = ?', 
      [postId, req.user.id, emoji], (err, existing) => {
      
      if (existing) {
        db.run('DELETE FROM forum_post_reactions WHERE id = ?', [existing.id]);
        res.json({ added: false, emoji });
      } else {
        db.run('INSERT INTO forum_post_reactions (post_id, user_id, emoji) VALUES (?,?,?)',
          [postId, req.user.id, emoji]);
        res.json({ added: true, emoji });
      }
    });
  });
});

app.post('/api/forum/replies/:id/react', auth, actionLimiter, (req, res) => {
  const replyId = req.params.id;
  const { emoji } = req.body;
  
  if (!emoji || !ALLOWED_EMOJIS.includes(emoji))
    return res.status(400).json({ error: 'Emoji inválido' });

  db.get('SELECT id FROM forum_replies WHERE id = ? AND is_deleted = 0', [replyId], (err, reply) => {
    if (!reply) return res.status(404).json({ error: 'Resposta não encontrada' });

    db.get('SELECT id FROM forum_reply_reactions WHERE reply_id = ? AND user_id = ? AND emoji = ?', 
      [replyId, req.user.id, emoji], (err, existing) => {
      
      if (existing) {
        db.run('DELETE FROM forum_reply_reactions WHERE id = ?', [existing.id]);
        res.json({ added: false, emoji });
      } else {
        db.run('INSERT INTO forum_reply_reactions (reply_id, user_id, emoji) VALUES (?,?,?)',
          [replyId, req.user.id, emoji]);
        res.json({ added: true, emoji });
      }
    });
  });
});

app.post('/api/forum/posts/:id/report', auth, reportLimiter, (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Motivo obrigatório' });
  const cleanReason = xss(reason.substring(0, 500));
  
  db.run('INSERT INTO reports (type, target_id, user_id, reason) VALUES (?,?,?,?)',
    ['post', req.params.id, req.user.id, cleanReason], function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao registrar denúncia' });
      res.json({ message: 'Denúncia recebida. Nossa equipe irá analisar.' });
    });
});

app.post('/api/forum/replies/:id/report', auth, reportLimiter, (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Motivo obrigatório' });
  const cleanReason = xss(reason.substring(0, 500));
  
  db.run('INSERT INTO reports (type, target_id, user_id, reason) VALUES (?,?,?,?)',
    ['reply', req.params.id, req.user.id, cleanReason], function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao registrar denúncia' });
      res.json({ message: 'Denúncia recebida. Nossa equipe irá analisar.' });
    });
});

app.put('/api/forum/posts/:id/pin', auth, isMod, (req, res) => {
  const { pinned } = req.body;
  const val = pinned === true || pinned === 1 || pinned === '1' ? 1 : 0;
  db.run('UPDATE forum_posts SET pinned = ? WHERE id = ?', [val, req.params.id], function(err) {
    if (this.changes === 0) return res.status(404).json({ error: 'Post não encontrado' });
    res.json({ message: val ? 'Post fixado!' : 'Post desfixado!', pinned: val });
  });
});

app.put('/api/forum/posts/:id/lock', auth, isMod, (req, res) => {
  const { locked } = req.body;
  const val = locked === true || locked === 1 || locked === '1' ? 1 : 0;
  db.run('UPDATE forum_posts SET locked = ? WHERE id = ?', [val, req.params.id], function(err) {
    if (this.changes === 0) return res.status(404).json({ error: 'Post não encontrado' });
    res.json({ message: val ? 'Post trancado!' : 'Post destrancado!', locked: val });
  });
});

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────────────

app.post('/api/admin/init', auth, (req, res) => {
  const code = process.env.ADMIN_INIT_CODE;
  if (!code || code === 'mudar123') {
    return res.status(500).json({ error: 'Configure ADMIN_INIT_CODE no .env com um valor seguro' });
  }
  const { code: inputCode } = req.body;
  if (inputCode !== code) {
    return res.status(403).json({ error: 'Código inválido' });
  }
  db.run('UPDATE users SET role = ? WHERE id = ?', ['admin', req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Erro ao promover' });
    if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Promovido a admin! Faça logout e login novamente para o token atualizar.' });
  });
});

app.get('/api/admin/stats', auth, isMod, (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => { stats.users = row?.count || 0;
    db.get('SELECT COUNT(*) as count FROM videos', (err, row) => { stats.videos = row?.count || 0;
      db.get('SELECT COUNT(*) as count FROM forum_posts WHERE is_deleted = 0', (err, row) => { stats.posts = row?.count || 0;
        db.get('SELECT COUNT(*) as count FROM forum_replies WHERE is_deleted = 0', (err, row) => { stats.replies = row?.count || 0;
          db.get('SELECT COUNT(*) as count FROM reports WHERE status = ?', ['pendente'], (err, row) => { stats.pending_reports = row?.count || 0;
            res.json(stats);
          });
        });
      });
    });
  });
});

app.get('/api/admin/reports', auth, isMod, (req, res) => {
  const { status = 'pendente', limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  db.all(`SELECT r.id, r.type as content_type, r.target_id as content_id, 
                 r.reason, r.status, r.created_at,
                 u.username as reporter_name 
          FROM reports r 
          JOIN users u ON r.user_id = u.id 
          WHERE r.status = ? 
          ORDER BY r.created_at DESC 
          LIMIT ? OFFSET ?`, [status, parseInt(limit), parseInt(offset)], (err, rows) => {
    res.json(rows || []);
  });
});

app.put('/api/admin/reports/:id', auth, isMod, (req, res) => {
  const { status } = req.body;
  if (!['pendente', 'resolvido', 'rejeitado'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  db.run('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (this.changes === 0) return res.status(404).json({ error: 'Report não encontrado' });
    res.json({ message: 'Report atualizado', status });
  });
});

app.get('/api/admin/users', auth, isMod, (req, res) => {
  const { search, limit = 50, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  let where = [];
  let params = [];
  if (search) {
    where.push('(username LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
  db.all(`SELECT id, username, email, avatar, bio, role, is_private, is_banned, ban_reason, created_at, last_login
          FROM users
          ${whereStr}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)], (err, rows) => {
    res.json(rows || []);
  });
});

app.put('/api/admin/users/:id/role', auth, isAdmin, (req, res) => {
  const { role } = req.body;
  if (!['user', 'mod', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role inválida' });
  }
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id], function(err) {
    if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Role atualizada', role });
  });
});

app.put('/api/admin/users/:id/ban', auth, isMod, (req, res) => {
  const { banned, reason } = req.body;
  const isBanned = banned === true || banned === 1 || banned === '1' ? 1 : 0;
  const banReason = isBanned ? (reason || null) : null;
  db.run('UPDATE users SET is_banned = ?, ban_reason = ? WHERE id = ?', [isBanned, banReason, req.params.id], function(err) {
    if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: isBanned ? 'Usuário banido' : 'Usuário desbanido', is_banned: isBanned });
  });
});

// ─── LIVE ROUTES ──────────────────────────────────────────────────────────────

app.post('/api/lives/create', auth, contentLimiter, (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Título necessário' });
  const streamKey = 'live_' + req.user.id + '_' + Date.now();
  db.run('INSERT OR REPLACE INTO lives (user_id, title, stream_key) VALUES (?,?,?)',
    [req.user.id, title, streamKey], function(err) {
      res.json({
        id: this.lastID,
        stream_key: streamKey,
        rtmp_url: `rtmp://seu-servidor:1935/live`,
        hls_url: `/hls/${streamKey}.m3u8`,
        message: 'Live criada! Use OBS com a RTMP URL e Stream Key fornecidas.'
      });
    });
});

app.get('/api/lives', (req, res) => {
  db.all(`SELECT l.*, u.username, u.avatar FROM lives l
          JOIN users u ON l.user_id = u.id
          WHERE l.is_live = 1 ORDER BY l.viewer_count DESC`, (err, rows) => {
    res.json(rows || []);
  });
});

app.get('/api/lives/:id', (req, res) => {
  db.get(`SELECT l.*, u.username, u.avatar FROM lives l
          JOIN users u ON l.user_id = u.id WHERE l.id = ?`, [req.params.id], (err, live) => {
    if (!live) return res.status(404).json({ error: 'Live não encontrada' });
    res.json(live);
  });
});

// ─── SOCKET.IO (Chat das lives) ───────────────────────────────────────────────

const chatRooms = {};

io.on('connection', (socket) => {
  socket.on('join_live', ({ liveId, username }) => {
    socket.join(`live_${liveId}`);
    const rawUsername = username || 'Anônimo';
    socket.username = xss(rawUsername.substring(0, 50));
    socket.liveId = liveId;
    if (!chatRooms[liveId]) chatRooms[liveId] = 0;
    chatRooms[liveId]++;
    db.run('UPDATE lives SET viewer_count = ? WHERE id = ?', [chatRooms[liveId], liveId]);
    io.to(`live_${liveId}`).emit('viewer_count', chatRooms[liveId]);
    io.to(`live_${liveId}`).emit('system_message', `${socket.username} entrou na live`);
  });

  socket.on('chat_message', ({ liveId, message }) => {
    // Se não limpar aqui, o XSS afeta todo mundo na live na mesma hora
    const cleanMessage = xss(message);
    
    if (!cleanMessage || cleanMessage.trim() === '') return;

    io.to(`live_${liveId}`).emit('chat_message', {
      username: socket.username,
      message: cleanMessage,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('disconnect', () => {
    if (socket.liveId && chatRooms[socket.liveId]) {
      chatRooms[socket.liveId] = Math.max(0, chatRooms[socket.liveId] - 1);
      db.run('UPDATE lives SET viewer_count = ? WHERE id = ?', [chatRooms[socket.liveId], socket.liveId]);
      io.to(`live_${socket.liveId}`).emit('viewer_count', chatRooms[socket.liveId]);
    }
  });
});

// ─── SPA FALLBACK ─────────────────────────────────────────────
app.get(/^\/(?!api|uploads|socket\.io|hls).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────
// ─── PROCESSAMENTO HLS (Qualidades Múltiplas) ─────────────────────────────────
function processVideoToHLS(videoPath, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  // Cria o arquivo mestre que controla as qualidades
  const masterContent = `#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720\n720p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480\n480p.m3u8`;
  fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterContent);

  console.log(`⏳ Iniciando conversão HLS (480p)...`);
  
  ffmpeg(videoPath)
    .size('?x480')
    .outputOptions(['-c:v libx264', '-crf 23', '-preset veryfast', '-c:a aac', '-b:a 128k', '-hls_time 10', '-hls_playlist_type vod'])
    .output(path.join(outputDir, '480p.m3u8'))
    .on('error', (err) => console.error('❌ Erro na conversão 480p:', err.message))
    .on('end', () => {
      console.log('✅ 480p concluído. Iniciando 720p...');
      ffmpeg(videoPath)
        .size('?x720')
        .outputOptions(['-c:v libx264', '-crf 23', '-preset veryfast', '-c:a aac', '-b:a 128k', '-hls_time 10', '-hls_playlist_type vod'])
        .output(path.join(outputDir, '720p.m3u8'))
        .on('error', (err) => console.error('❌ Erro na conversão 720p:', err.message))
        .on('end', () => console.log(`🚀 HLS TOTALMENTE PRONTO PARA O VÍDEO!`))
        .run();
    })
    .run();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📺 Vídeos:  http://localhost:${PORT}/videos.html`);
  console.log(`💬 Fórum:   http://localhost:${PORT}/forum.html`);
  console.log(`🔴 Lives:   http://localhost:${PORT}/lives.html`);
});