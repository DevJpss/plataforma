// ─── API ─────────────────────────────────────────────────────────────────────
// Adicione no topo do seu app.js
function checkAgeGate() {
  if (!localStorage.getItem('age_verified')) {
    const gate = document.createElement('div');
    gate.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.95); z-index: 9999; display: flex; 
      align-items: center; justify-content: center; backdrop-filter: blur(10px);
    `;
    gate.innerHTML = `
      <div style="background: var(--bg2); padding: 40px; border-radius: 20px; text-align: center; max-width: 400px; border: 1px solid var(--border);">
        <h1 style="color: var(--accent); margin-bottom: 15px; font-size: 32px;">🔞 Aviso 18+</h1>
        <p style="color: var(--text2); margin-bottom: 25px; line-height: 1.5;">
          Este site contém conteúdo adulto explícito. Você deve ter 18 anos ou mais para entrar.<br><br>
          Ao clicar em "Eu tenho 18+", você concorda com nossos Termos de Uso e Política de Privacidade.
        </p>
        <div style="display: flex; gap: 10px; flex-direction: column;">
          <button class="btn btn-primary" onclick="acceptAgeGate(this)" style="padding: 15px; font-size: 16px;">Eu tenho 18+ e concordo</button>
          <button class="btn btn-ghost" onclick="window.location.href='https://google.com'" style="padding: 15px;">Sair</button>
        </div>
      </div>
    `;
    document.body.appendChild(gate);
    document.body.style.overflow = 'hidden'; // Impede de rolar a página
  }
}

function acceptAgeGate(btn) {
  localStorage.setItem('age_verified', 'true');
  btn.closest('div').parentElement.parentElement.remove();
  document.body.style.overflow = 'auto';
}

// Chama a função assim que o JS carregar
checkAgeGate();

const API = {
  base: '',

  getToken() { return localStorage.getItem('token'); },
  getUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  },
  isLoggedIn() { return !!this.getToken(); },

  async request(method, path, body, isFormData = false) {
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const res = await fetch(this.base + path, {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  delete(path) { return this.request('DELETE', path); },
  upload(path, formData) { return this.request('POST', path, formData, true); },

  setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
};

// ─── ADS SYSTEM ───────────────────────────────────────────────────────────────

let ADS_CONFIG = { enabled: false, header: '', footer: '', sidebar: '', video: '' };

async function loadAds() {
  try {
    ADS_CONFIG = await API.get('/api/ads');
  } catch(e) {
    console.error('Erro ao carregar ADS:', e);
  }
}

function injectAd(containerId, adHtml) {
  if (!ADS_CONFIG.enabled || !adHtml) return;
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = adHtml;
}

function injectAllAds() {
  injectAd('ad-header', ADS_CONFIG.header);
  injectAd('ad-footer', ADS_CONFIG.footer);
  injectAd('ad-sidebar', ADS_CONFIG.sidebar);
  injectAd('ad-video', ADS_CONFIG.video);
}

loadAds();

// ─── UI HELPERS ───────────────────────────────────────────────────────────────

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function formatViews(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n || 0;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return Math.floor(diff / 60) + 'min atrás';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h atrás';
  if (diff < 2592000) return Math.floor(diff / 86400) + 'd atrás';
  if (diff < 31536000) return Math.floor(diff / 2592000) + 'mes atrás';
  return Math.floor(diff / 31536000) + 'a atrás';
}

function formatDuration(secs) {
  if (!secs) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function avatarLetter(name) {
  return (name || '?')[0].toUpperCase();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderForumContent(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0;display:block">');

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const urlRegex = /(?<!href=")(?<!\()(https?:\/\/[^\s<>"'\)]+)/gi;
  html = html.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  html = html.replace(/\n/g, '<br>');

  return html;
}

function insertFormat(textareaId, before, after, placeholder) {
  const ta = document.getElementById(textareaId);
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.substring(start, end) || placeholder;
  const newValue = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
  ta.value = newValue;
  ta.focus();
  ta.setSelectionRange(start + before.length, start + before.length + selected.length);
}

function insertLink(textareaId) {
  const ta = document.getElementById(textareaId);
  if (!ta) return;
  const url = prompt('Digite a URL:', 'https://');
  if (!url || url === 'https://') return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.substring(start, end);
  const linkText = selected || prompt('Texto do link (opcional):') || url;
  const markdown = `[${linkText}](${url})`;
  ta.value = ta.value.substring(0, start) + markdown + ta.value.substring(end);
  ta.focus();
}

async function uploadForumImage(input, textareaId) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const formData = new FormData();
    formData.append('image', file);
    const data = await API.upload('/api/forum/upload', formData);
    const ta = document.getElementById(textareaId);
    if (ta) {
      const filename = file.name.replace(/\.[^/.]+$/, '');
      const markdown = `![${filename}](${data.url})\n`;
      const start = ta.selectionStart;
      ta.value = ta.value.substring(0, start) + markdown + ta.value.substring(ta.selectionEnd);
      ta.focus();
    }
    toast('Imagem enviada!', 'success');
  } catch(e) {
    toast('Erro no upload: ' + e.message, 'error');
  }
  input.value = '';
}

function getParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────

function renderNavbar(activePage = '') {
  const user = API.getUser();
  const nav = document.getElementById('navbar');
  if (!nav) return;

  nav.innerHTML = `
    <a class="navbar-logo" href="/">ADULT<span>HUB</span></a>
    <div class="navbar-search">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" id="search-input" placeholder="Buscar vídeos, usuários..." value="${getParams().search || ''}" />
    </div>
    <nav class="navbar-nav">
      <a class="nav-link ${activePage==='videos'?'active':''}" href="/videos.html">Vídeos</a>
      <a class="nav-link ${activePage==='forum'?'active':''}" href="/forum.html">Fórum</a>
      <a class="nav-link live-link ${activePage==='lives'?'active':''}" href="/lives.html">Lives</a>
      ${user ? `
        <a class="nav-link" href="/upload.html">+ Upload</a>
        <a class="nav-link" href="/profile.html?u=${user.username}" style="color:var(--accent);font-weight:700">${user.username}</a>
        <button class="btn btn-ghost btn-sm" onclick="API.logout()">Sair</button>
      ` : `
        <button class="btn btn-ghost btn-sm" onclick="showModal('login')">Entrar</button>
        <button class="btn btn-primary btn-sm" onclick="showModal('register')">Cadastrar</button>
      `}
    </nav>
  `;

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        window.location.href = `/videos.html?search=${encodeURIComponent(searchInput.value.trim())}`;
      }
    });
  }
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────

function showModal(tab = 'login') {
  let overlay = document.getElementById('auth-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'auth-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="position:relative">
        <button class="modal-close" onclick="closeModal()">×</button>
        <div id="modal-content"></div>
      </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  renderModal(tab);
}

function closeModal() {
  const overlay = document.getElementById('auth-modal');
  if (overlay) overlay.style.display = 'none';
}

function renderModal(tab) {
  const el = document.getElementById('modal-content');
  if (tab === 'login') {
    el.innerHTML = `
      <h2>Entrar</h2>
      <div id="modal-error" style="display:none" class="modal-error"></div>
      <div class="form-group">
        <label>Usuário ou email</label>
        <input type="text" id="m-username" placeholder="seu usuário" autocomplete="username" />
      </div>
      <div class="form-group">
        <label>Senha</label>
        <input type="password" id="m-password" placeholder="••••••••" autocomplete="current-password" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="doLogin()">Entrar</button>
      </div>
      <p style="text-align:center;margin-top:16px;font-size:13px;color:var(--text2)">
        Não tem conta? <a href="#" onclick="renderModal('register')">Cadastrar grátis</a>
      </p>
    `;
    document.getElementById('m-password').addEventListener('keypress', e => { if(e.key==='Enter') doLogin(); });
  } else {
    el.innerHTML = `
      <h2>Criar conta</h2>
      <div id="modal-error" style="display:none" class="modal-error"></div>
      <div class="form-group">
        <label>Usuário</label>
        <input type="text" id="m-username" placeholder="seu usuário" autocomplete="username"/>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="m-email" placeholder="email@exemplo.com" autocomplete="email"/>
      </div>
      <div class="form-group">
        <label>Senha</label>
        <input type="password" id="m-password" placeholder="mínimo 6 caracteres" autocomplete="new-password"/>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="doRegister()">Criar conta</button>
      </div>
      <p style="text-align:center;margin-top:16px;font-size:13px;color:var(--text2)">
        Já tem conta? <a href="#" onclick="renderModal('login')">Entrar</a>
      </p>
    `;
  }
}

function showModalError(msg) {
  const el = document.getElementById('modal-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function doLogin() {
  const username = document.getElementById('m-username').value;
  const password = document.getElementById('m-password').value;
  try {
    const data = await API.post('/api/login', { username, password });
    API.setAuth(data.token, data.user);
    closeModal();
    toast('Bem-vindo, ' + data.user.username + '!', 'success');
    setTimeout(() => location.reload(), 800);
  } catch(e) { showModalError(e.message); }
}

async function doRegister() {
  const username = document.getElementById('m-username').value;
  const email = document.getElementById('m-email').value;
  const password = document.getElementById('m-password').value;
  try {
    const data = await API.post('/api/register', { username, email, password });
    API.setAuth(data.token, data.user);
    closeModal();
    toast('Conta criada! Bem-vindo, ' + data.user.username + '!', 'success');
    setTimeout(() => location.reload(), 800);
  } catch(e) { showModalError(e.message); }
}

// ─── VIDEO CARD ───────────────────────────────────────────────────────────────

function renderVideoCard(v) {
  const uname = v.username || 'Desconhecido';
  const thumb = v.thumbnail
    ? `<img src="${v.thumbnail}" alt="${v.title}" loading="lazy">`
    : `<div class="no-thumb">▶</div>`;
  return `
    <div class="video-card" onclick="window.location.href='/watch.html?id=${v.id}'">
      <div class="video-thumb">
        ${thumb}
        ${v.duration ? `<div class="video-duration">${formatDuration(v.duration)}</div>` : ''}
        ${v.category && v.category !== 'Geral' ? `<div class="video-hd">${v.category}</div>` : ''}
      </div>
      <div class="video-info">
        <div class="video-title">${v.title}</div>
        <div class="video-author">@${uname}</div>
        <div class="video-meta">
          <span>${formatViews(v.views)} views</span>
          <span class="dot"></span>
          <span>${timeAgo(v.created_at)}</span>
        </div>
      </div>
    </div>
  `;
}

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👀', '💯', '🙄', '🤔', '😈', '🥵'];

function renderReactions(reactions, myReactions, targetType, targetId) {
  if (!reactions || !reactions.length) {
    if (!API.isLoggedIn()) return '';
    return `<div class="reaction-bar">
      <button class="reaction-btn reaction-add" onclick="showReactionPicker('${targetType}', ${targetId})" title="Reagir">
        <span class="reaction-plus">+</span>
      </button>
    </div>`;
  }
  
  let html = '<div class="reaction-bar">';
  
  reactions.forEach(r => {
    const isActive = myReactions && myReactions.includes(r.emoji);
    const count = r.count || 0;
    html += `<button class="reaction-btn ${isActive ? 'active' : ''}" 
      onclick="toggleReaction('${targetType}', ${targetId}, '${r.emoji}')" title="${r.emoji}">
      <span class="reaction-emoji">${r.emoji}</span>
      <span class="reaction-count">${count}</span>
    </button>`;
  });
  
  if (API.isLoggedIn()) {
    html += `<button class="reaction-btn reaction-add" onclick="showReactionPicker('${targetType}', ${targetId})" title="Mais reações">
      <span class="reaction-plus">+</span>
    </button>`;
  }
  
  html += '</div>';
  return html;
}

async function toggleReaction(targetType, targetId, emoji) {
  if (!API.isLoggedIn()) return showModal('login');
  try {
    const endpoint = targetType === 'post' 
      ? `/api/forum/posts/${targetId}/react`
      : `/api/forum/replies/${targetId}/react`;
    await API.post(endpoint, { emoji });
    location.reload();
  } catch(e) { toast(e.message, 'error'); }
}

function showReactionPicker(targetType, targetId) {
  let picker = document.getElementById('reaction-picker');
  if (!picker) {
    picker = document.createElement('div');
    picker.id = 'reaction-picker';
    picker.className = 'reaction-picker-overlay';
    picker.onclick = (e) => { if (e.target === picker) picker.remove(); };
    document.body.appendChild(picker);
  }
  
  picker.innerHTML = `
    <div class="reaction-picker">
      <div class="reaction-picker-header">Reagir com</div>
      <div class="reaction-picker-grid">
        ${ALLOWED_EMOJIS.map(e => `<button class="reaction-picker-item" onclick="pickReaction('${targetType}', ${targetId}, '${e}')">${e}</button>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:12px;width:100%" onclick="document.getElementById('reaction-picker').remove()">Cancelar</button>
    </div>
  `;
  picker.style.display = 'flex';
}

function pickReaction(targetType, targetId, emoji) {
  document.getElementById('reaction-picker').remove();
  toggleReaction(targetType, targetId, emoji);
}

function showForumEditModal(type, id, currentTitle, currentContent, postId) {
  let modal = document.getElementById('forum-edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'forum-edit-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:620px">
        <button class="modal-close" onclick="document.getElementById('forum-edit-modal').remove()">×</button>
        <h2 id="fem-title">Editar</h2>
        <div id="fem-error" class="modal-error" style="display:none"></div>
        <div id="fem-title-group" class="form-group">
          <label>Título</label>
          <input type="text" id="fem-input-title" maxlength="200">
        </div>
        <div class="form-group">
          <label>Conteúdo</label>
          <div id="fem-toolbar" style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-ghost btn-sm" onclick="insertFormat('fem-input-content','**','**','negrito')">B</button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="insertFormat('fem-input-content','*','*','itálico')">I</button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="insertLink('fem-input-content')">🔗 Link</button>
          </div>
          <textarea id="fem-input-content" style="min-height:220px;font-family:monospace;font-size:13px;line-height:1.6"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="document.getElementById('forum-edit-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" id="fem-save-btn">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  const isReply = type === 'reply';
  document.getElementById('fem-title').textContent = isReply ? 'Editar Resposta' : 'Editar Tópico';
  document.getElementById('fem-title-group').style.display = isReply ? 'none' : 'block';
  if (currentTitle) document.getElementById('fem-input-title').value = currentTitle;
  if (currentContent) document.getElementById('fem-input-content').value = currentContent;
  
  const saveBtn = document.getElementById('fem-save-btn');
  saveBtn.onclick = async () => {
    const errEl = document.getElementById('fem-error');
    errEl.style.display = 'none';
    try {
      const content = document.getElementById('fem-input-content').value.trim();
      if (!content) { errEl.textContent = 'Conteúdo obrigatório'; errEl.style.display = 'block'; return; }
      
      if (isReply) {
        await API.put(`/api/forum/replies/${id}`, { content });
      } else {
        const title = document.getElementById('fem-input-title').value.trim();
        if (!title) { errEl.textContent = 'Título obrigatório'; errEl.style.display = 'block'; return; }
        await API.put(`/api/forum/posts/${id}`, { title, content });
      }
      
      modal.remove();
      toast('Salvo!', 'success');
      location.reload();
    } catch(e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
  };
  
  modal.style.display = 'flex';
}

function showForumReportModal(type, targetId) {
  let modal = document.getElementById('forum-report-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'forum-report-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:460px">
        <button class="modal-close" onclick="document.getElementById('forum-report-modal').remove()">×</button>
        <h2>Denunciar</h2>
        <div id="frm-error" class="modal-error" style="display:none"></div>
        <div class="form-group">
          <label>Motivo</label>
          <textarea id="frm-reason" style="min-height:100px" placeholder="Descreva o motivo da denúncia..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="document.getElementById('forum-report-modal').remove()">Cancelar</button>
          <button class="btn btn-primary" id="frm-submit">Denunciar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  document.getElementById('frm-reason').value = '';
  document.getElementById('frm-error').style.display = 'none';
  
  const submit = document.getElementById('frm-submit');
  submit.onclick = async () => {
    const reason = document.getElementById('frm-reason').value.trim();
    const errEl = document.getElementById('frm-error');
    if (!reason) { errEl.textContent = 'Descreva o motivo'; errEl.style.display = 'block'; return; }
    try {
      const endpoint = type === 'post' 
        ? `/api/forum/posts/${targetId}/report`
        : `/api/forum/replies/${targetId}/report`;
      await API.post(endpoint, { reason });
      modal.remove();
      toast('Denúncia enviada!', 'success');
    } catch(e) { errEl.textContent = e.message; errEl.style.display = 'block'; }
  };
  
  modal.style.display = 'flex';
}

async function deleteForumItem(type, id, postId) {
  const confirmMsg = type === 'post' 
    ? 'Tem certeza que quer deletar este post? As respostas serão mantidas.'
    : 'Tem certeza que quer deletar esta resposta?';
  
  if (!confirm(confirmMsg)) return;
  try {
    const endpoint = type === 'post' 
      ? `/api/forum/posts/${id}`
      : `/api/forum/replies/${id}`;
    await API.delete(endpoint);
    toast('Deletado!', 'success');
    if (type === 'post') window.location.href = '/forum.html';
    else location.reload();
  } catch(e) { toast(e.message, 'error'); }
}