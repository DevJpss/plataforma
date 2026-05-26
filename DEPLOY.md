# Deploy Automático - Guias

## 🚀 Opção 1: Fly.io ($5 FREE por mês - RECOMENDADA)

**Melhor opção** porque tem:
- ✅ $5 de crédito GRÁTIS por mês (você não paga nada se ficar abaixo)
- ✅ Armazenamento PERSISTENTE (seu SQLite NÃO será apagado)
- ✅ Sem cold starts

### Passo 1: Instale o Fly CLI
```bash
# Windows ( Winget )
winget install flyctl

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

### Passo 2: Crie uma conta
```bash
fly auth signup
```
(Requer cartão de crédito APENAS para verificação - não será cobrado enquanto você ficar abaixo do $5 free)

### Passo 3: Deploy automático
```bash
cd plataforma
fly launch --copy-config --name=seu-app-unico --region=gru --no-deploy
```

### Passo 4: Configure as variáveis de ambiente
```bash
fly secrets set JWT_SECRET=SEU_SEGREDO_MUITO_SEGURO_AQUI
fly secrets set ADMIN_INIT_CODE=SEU_CODIGO_ADMIN
fly secrets set CLIENT_URL=https://seu-app.fly.dev
```

### Passo 5: Deploy!
```bash
fly deploy
```

---

## 🎯 Opção 2: Render (100% Grátis - sem cartão)

**Vantagem**: Não precisa de cartão de crédito
**Desvantagem**: Dados são PERDIDOS quando o app dorme (cada 15min de inatividade)

### Passo 1: Crie uma conta no https://render.com

### Passo 2: Clique em "New" → "Web Service"

### Passo 3: Conecte seu repositório GitHub

### Passo 4: Preencha:
- **Name**: `seu-app`
- **Region**: São Paulo (se disponível) ou Virginia
- **Build Command**: `cd client && npm install && npm run build && cd .. && npm install`
- **Start Command**: `npm start`
- **Plan**: Free

### Passo 5: Avançado → Environment Variables:
```
JWT_SECRET=SEU_SEGREDO_AQUI
ADMIN_INIT_CODE=SEU_CODIGO
NODE_ENV=production
```

### Passo 6: Clique em "Create Web Service"

---

## 📋 Variáveis Obrigatórias no .env

```env
PORT=3000
JWT_SECRET=coloque_um_segredo_aleatorio_muito_longo_aqui
ADMIN_INIT_CODE=codigo_secreto_para_promover_admin
CLIENT_URL=https://seu-dominio.com
ADS_ENABLED=false
```

## 🔐 Gerar um JWT_SECRET seguro

Execute no terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🛠️ Problemas Comuns

### SQLite e dados perdidos no Render
No Render Free Tier, o disco é APAGADO toda vez que o app reinicia. Para dados persistentes:
1. Use Fly.io (recomendado)
2. Ou migre para PostgreSQL (Render tem free PostgreSQL por 90 dias)

### Como me tornar Admin
1. Logue na sua conta
2. Abra o Console DevTools (F12)
3. Execute:
```javascript
const token = localStorage.getItem('token');
const code = 'SEU_ADMIN_INIT_CODE';

fetch('/api/admin/init', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ code })
}).then(r => r.json()).then(console.log);
```
4. Faça Logout → Login novamente
5. Acesse `/admin.html`

---

## 📊 Monitoramento

- **Fly.io**: `fly status`, `fly logs`
- **Render**: Dashboard na web

---

## 🎯 Provedores de Anúncio para quando lançar

| Provedor | Tipo | Link |
|---|---|---|
| **ExoClick** | Rede de anúncios adultos | exoclick.com |
| **TrafficJunky** | CPM alto adulto | trafficjunky.com |
| **PlugRush** | Pop-unders / Push | plugrush.com |
| **TrafficFactory** | Banners / Pop | trafficfactory.com |

Configure no `.env`:
```env
ADS_ENABLED=true
ADS_HEADER_BANNER=<a href="SEU_LINK" target="_blank"><img src="..."></a>
ADS_FOOTER_BANNER=...
```
