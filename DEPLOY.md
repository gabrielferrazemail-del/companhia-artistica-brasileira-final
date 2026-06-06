# Guia de deploy — Companhia Artística Brasileira

## Pré-requisitos

- Conta no [Netlify](https://netlify.com) e no [GitHub](https://github.com).
- Node.js 20+ instalado localmente para testar antes de publicar.

---

## 1. Subir o repositório para o GitHub

```bash
cd C:\Users\gabri\.claude\coletivo-site

git init
git add .
git commit -m "chore: initial commit"

# Crie um repositório no GitHub (ex.: usuario/coletivo-site)
git remote add origin https://github.com/usuario/coletivo-site.git
git push -u origin main
```

---

## 2. Criar o site no Netlify

1. Netlify → **Add new site → Import an existing project**.
2. Selecione o repositório `usuario/coletivo-site`.
3. As configurações de build já vêm do `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `_site`
   - Node version: 20
4. Clique em **Deploy site** — o primeiro deploy ocorre (pode levar 1–2 min).

---

## 3. Habilitar Netlify Identity

1. Netlify → Site → **Integrations → Identity → Enable Identity**.
2. Em **Registration**: selecione **Invite only** (nunca deixe aberto).
3. Salve.

---

## 4. Criar o GitHub Personal Access Token (PAT)

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens → Generate new token**.
2. Configurações:
   - Resource owner: sua conta (ou a org do coletivo).
   - Repository access: **Only select repositories** → escolha `coletivo-site`.
   - Permissions → Repository permissions → **Contents: Read and write**.
3. Gere e **copie o token** (ele só aparece uma vez).

---

## 5. Configurar as variáveis de ambiente no Netlify

Netlify → Site → **Site configuration → Environment variables → Add a variable**:

| Variável         | Valor                                      |
|------------------|--------------------------------------------|
| `GITHUB_TOKEN`   | O PAT gerado no passo 4                    |
| `GITHUB_REPO`    | `usuario/coletivo-site` (sem `github.com`) |
| `GITHUB_BRANCH`  | `main`                                     |
| `ADMIN_EMAILS`   | E-mails dos admins separados por vírgula   |

> **`ADMIN_EMAILS`** é a forma mais simples de dar acesso de admin sem precisar editar `app_metadata` pelo painel do Netlify Identity. Qualquer usuário cujo e-mail de login constar nessa lista terá acesso total ao painel.

Após adicionar as variáveis, acione um novo deploy: **Deploys → Trigger deploy**.

---

## 6. Convidar usuários

### Admins
1. Netlify → Identity → **Invite users**.
2. Envie convite para o e-mail do admin.
3. Certifique-se de que esse e-mail está em `ADMIN_EMAILS`.

### Artistas
1. No painel do site (`/painel/`), crie ou edite o artista e preencha o campo **E-mail (login do artista)** com o e-mail que ele usará para entrar.
2. Netlify → Identity → **Invite users** → convide esse mesmo e-mail.
3. Quando o artista aceitar o convite e fizer login, o sistema vincula automaticamente a conta ao perfil.

---

## 7. Apontar domínio personalizado (opcional)

1. Netlify → Site → **Domain management → Add custom domain**.
2. Siga as instruções para atualizar os DNS no Registro.br (ou outro registrador):
   - Adicione um registro `CNAME` apontando `www` para `<seu-site>.netlify.app`.
   - Ou use os nameservers do Netlify para controle completo do DNS.
3. O Netlify provisiona o HTTPS (Let's Encrypt) automaticamente após a propagação do DNS.

---

## 8. Fluxo de atualização de conteúdo

- Admin entra em `/entrar/` → faz login → vai para `/painel/`.
- Toda alteração (exposição, artista, configurações) é salva via Netlify Functions como um **commit no GitHub**, o que aciona um rebuild automático.
- O rebuild publica a versão estática atualizada em ~1–2 minutos.

---

## Rodando localmente (sem painel funcional)

```bash
npm install
npx @11ty/eleventy --serve --port 8080
```

Abre o site em `http://localhost:8080/`. O painel aparece, mas as funções (`/.netlify/functions/*`) retornam 404 sem `netlify dev`.

### Com painel funcional localmente

```bash
npm install -g netlify-cli   # apenas uma vez
netlify login
netlify link                 # vincula ao site no Netlify
netlify dev                  # sobe site + funções em http://localhost:8888
```

As variáveis de ambiente são puxadas automaticamente do Netlify quando você usa `netlify link`.
