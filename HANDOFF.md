# HANDOFF — Site do coletivo (Companhia Artística Brasileira)

Documento de transferência. Resume o estado completo do projeto para continuar em outra sessão.
_Última atualização: 2026-06-09 (login reconstruído + nova home "capa" + testes; ver §0 e §11)._

## 0. Estado de produção (AO VIVO)
- **Site no ar:** https://coletivosite.netlify.app/
- **Repo GitHub:** `gabrielferrazemail-del/companhia-artistica-brasileira-final` (branch `main`).
  - Remote `origin` já configurado localmente; `git push` funcionou (credencial do GitHub no Windows).
- **Hospedagem:** Netlify (plano **Starter / free** — cobre Functions + Identity). `netlify.toml` define o build.
- **Admin:** e-mail `gabriel.ferraz.email@gmail.com` (via env `ADMIN_EMAILS`).
- **Identity:** habilitado, **invite only**.
- **Env vars na Netlify:** `GITHUB_TOKEN` (PAT fine-grained, Contents R/W), `GITHUB_REPO`
  (`gabrielferrazemail-del/companhia-artistica-brasileira-final`), `GITHUB_BRANCH` (`main`), `ADMIN_EMAILS`.
- ✅ **LOGIN ADMIN OK (2026-06-09):** usuário confirmou que loga e acessa o painel como admin.
  O fluxo de login foi **reconstruído** nesta sessão (fonte da verdade = `whoami`; roteamento por
  papel; ver §11). Gotcha histórico mantido: env var nova na Netlify só vale após *Trigger deploy*.
- 🔐 O usuário colou a **senha** dele no chat numa sessão antiga — **orientado a trocá-la**. Nunca pedir senha.

## 1. Visão geral

Site institucional/vitrine de um coletivo de arte de São Paulo. Mostra **exposições**
(cada uma com **artistas e obras** numa lista plana + **galeria de fotos**) e **artistas**
(página própria que agrega as obras das exposições). Tem **painel de administração próprio**
(login) para gerenciar todo o conteúdo.

- **Local do projeto:** `C:\Users\gabri\.claude\coletivo-site\`
- **Stack:** Eleventy (11ty) v3 (site estático) + Netlify Functions (serverless) + Netlify Identity (login).
- **Decap CMS foi REMOVIDO** — substituído por painel próprio em `/painel/`. `/admin/` dá 404.
- **Exposição seed:** "Delírios Anatômicos" (tema visual `delirios`: papel sépia, Anton + Fraunces).
- **Nome do coletivo:** "Companhia Artística Brasileira" (em `src/_data/site.json`).

## 2. Como rodar localmente

```
cd C:\Users\gabri\.claude\coletivo-site
npm install
npx @11ty/eleventy --serve --port 8080     # http://localhost:8080/
```
- Só o site estático roda assim. As **funções do painel** (CRUD) e o **login** precisam de
  `netlify dev` + variáveis de ambiente (ver seção 6) ou do deploy — sem isso a UI aparece mas
  as chamadas a `/.netlify/functions/*` dão 404 e o widget de login pede a URL do site Netlify.
- Build de produção: `npm run build` → saída em `_site/`.

## 3. Modelo de conteúdo (frontmatter da exposição)

```
title, slug, status (rascunho | em-cartaz), order (nº; ordem manual no painel), theme (default | delirios), cover,
summary, start_date, end_date, location{ name, address },
credits{ curator (TEXTO LIVRE), photography },
influences (markdown),
gallery[]{ image, alt, caption, credit }          # FOTOS da exposição
participations[]{ artist(slug), works[]{ image, title, technique, dimensions, description } }
--- corpo markdown = TEXTO CURATORIAL ("Sobre a exposição") ---
```
- **NÃO há mais "sessões".** Os artistas ficam numa **lista plana** (`participations[]`).
- **Curadoria** é um **nome em texto** (`credits.curator`), não mais seleção de artistas.
- **Galeria** (`gallery[]`) é editável no painel e aparece na página (só fotos por enquanto;
  modelo preparado para vídeo futuro: bastaria um `video`/`type` no item).
- Compatibilidade: filtros e página caem de volta para `sessions[]` antigo se `participations`
  não existir (nada quebra com conteúdo legado).

## 4. Estrutura (o que existe e faz)

### Conteúdo / templates (`src/`)
- `_data/site.json` — config do site (nome, tagline, about, logo, contato, redes, seo).
- `_includes/base.njk` — layout base: head/SEO/OG, fontes (Anton/Fraunces no delirios, Archivo no
  padrão), **widget Netlify Identity**, e carrega o JS por página (inclui `/painel/contatos/`).
- `_includes/exposicao.njk` — página de exposição: herói (status por data, local, **Curadoria ·
  nome**), capa, **Sobre a exposição** (corpo md), **Influências**, **Galeria** (fotos —
  `partials/gallery.njk`, após os textos), **Artistas** (lista deduplicada via `artistsInExposition`).
- `_includes/artista.njk` — página do artista: cabeçalho, bio, **obras agregadas** (`worksByArtist`),
  "Participou de" (`exhibitionsByArtist`).
- `_includes/partials/` — `nav.njk` (links de auth), `footer.njk`, `gallery.njk` (tiles de fotos),
  `artist-summary.njk`, `exhibition-card.njk` (selo de status).
- `exposicoes/exposicoes.json` — config da coleção (layout, permalink `/exposicoes/<slug>/`).
- `exposicoes/exposicoes.11tydata.js` — `eleventyComputed.effectiveStatus` (rascunho / em-breve /
  em-cartaz / encerrada; por data, UTC).
- `exposicoes/delirios-anatomicos.md` — seed: status em-cartaz, data 2026-06-13, local "Galeria R.
  Monteiro", theme delirios, `credits.curator: "Carlos Henrique"`, `influences` (Exquisite Corpse),
  `gallery` com **3 SVGs placeholder**, `participations` com **19 artistas** (lista plana).
- `artistas/*.md` — 19 artistas (alguns com campo `email` para login por e-mail).
- `index.njk` — home (herói destaca o 1º em-cartaz/em-breve da coleção; grade "anteriores").
- `exposicoes.njk` — índice `/exposicoes/` (em-cartaz + em-breve no topo, depois "Anteriores").
- **ORDENAÇÃO (`.eleventy.js`, coleção `exposicoes`):** por status (em-cartaz → em-breve → encerrada →
  rascunho), depois pelo `order` manual, depois pela data (desc). Isso garante a ordem pedida pelo
  cliente em todo o site (home, índice e painel).
- `sobre.njk`, `contato.njk` — páginas simples.
- `entrar.njk` — **login** (widget Identity). Pós-login mostra botões (sem redirect automático):
  "Ir para meu perfil" (todos) + "Ir para o painel" (`data-only-admin`) + "Sair".
- `minha-conta.njk` — **artista edita o próprio perfil**.
- `painel.njk` — **dashboard admin**: Exposições (agrupadas por status: em cartaz → em breve →
  encerradas → rascunhos, com setas ↑↓ para reordenar dentro do grupo + "Salvar ordem") + Artistas +
  atalho Configurações.
- `painel-editar.njk` — **editor de exposição**: campos + capa + **curador (texto)** +
  **Artistas** (lista plana → obras) + **Galeria (fotos)**.
- `painel-editar-artista.njk` — **editor de artista** (nome, slug, **e-mail**, foto, tagline,
  papéis, links, bio).
- `painel-configuracoes.njk` — **configurações avançadas do site** (nome, tagline, sobre, logo,
  contato, redes, SEO + imagem OG).
- `painel-contatos.njk` — **tela dedicada de contatos** (`/painel/contatos/`): só e-mail, WhatsApp e
  redes sociais. Reusa `get-site`/`save-site`; o JS guarda o `site.json` inteiro e faz *merge* (só
  troca `contact`/`social`, preserva o resto). Tem cartão próprio no `painel.njk`.
- `artistas-json.njk` → `/api/artistas.json` (lista de artistas para os selects do editor).

### CSS / JS (`src/assets/`)
- `css/styles.css` — todo o shell + estilos (nav, herói, galerias `.s-gallery/.tile`, cards,
  editores `#artists-list`/`#gallery-list`/`.work-row`, etc.). `text-wrap: balance/pretty`
  (anti-viúvas) cobrindo ledes **e títulos** (`.page-title`, `.section-title`, `.expo-card-title`,
  `.artista-name`…).
- `css/themes/delirios.css` — pele Delírios (Anton/Fraunces/sépia, drop cap, `.title` line-height .95).
- `js/identity.js` — auth global: `coletivoAuth.{isAdmin, current, token, authFetch, checkAdmin}`.
  **`checkAdmin()`** chama `whoami` (com cache, limpo no logout) e alterna `[data-only-admin]`
  de forma assíncrona; fallback local quando `whoami` não responde.
- `js/painel.js` (lista + **agrupa por status e reordena com ↑↓ + "Salvar ordem"**),
  `js/painel-editar.js`, `js/painel-editar-artista.js`, `js/painel-configuracoes.js`,
  `js/painel-contatos.js` (tela focada de contatos) — telas do painel; gate de admin via
  **`await checkAdmin()`**.
- `js/minha-conta.js` — editor de perfil do artista.
- `js/main.js` — nav scroll + lightbox.

### Backend (`netlify/functions/`) — exigem admin, exceto get/update-profile (artista dono) e whoami
- `utils/github.js` — **compartilhado**: API do GitHub (getFile/readFile/listDir/deleteFile,
  `commitFiles` = commit único), respostas, `matter`. **Auth:** `isAdmin` (roles **OU**
  `ADMIN_EMAILS`), **`artistSlugForUser`** (casa o e-mail do token com o campo `email` nos
  `src/artistas/*.md`; fallback `user_metadata.artist_slug`).
- `whoami.js` — retorna `{ loggedIn, admin, artistSlug }` a partir do token.
- `get-profile.js` / `update-profile.js` — perfil do artista DONO (slug via `artistSlugForUser`).
- `list/get/save/delete-exposicao.js` — CRUD de exposições. `save` grava `participations[]` (plano),
  `gallery[]` (fotos), `credits.curator` e **preserva `order`** (ordem manual); upload de capa/obras/fotos;
  commit único; rename remove o slug antigo. `list` devolve também `order`.
- `reorder-exposicoes.js` — grava o campo `order` de várias exposições num **commit único** (body
  `{ items:[{slug,order}] }`); usado pelo botão "Salvar ordem" do painel.
- `list/get/save/delete-artista.js` — CRUD de artistas (`save` grava `email` no frontmatter, upload de foto).
- `get-site.js` / `save-site.js` — lê/grava `src/_data/site.json` (upload de logo e imagem OG).

### Config
- `.eleventy.js` — coleções; helper `participationsOf(data)` (usa `participations` ou achata
  `sessions` legado); filtros `worksByArtist`, `exhibitionsByArtist`, `artistsInExposition`
  (recebe participações), `formatDate/formatDateShort` (UTC), `padNum`, `statusLabel`, `getArtist`;
  shortcode `image`; passthrough `src/assets` e `src/uploads`.
- `netlify.toml` — build `npm run build`, publish `_site`, NODE_VERSION 20, functions + esbuild,
  plugin sitemap.
- `package.json` — `@11ty/eleventy`, `@11ty/eleventy-img` (traz `sharp`), `gray-matter`.

## 5. Modelo de auth (estado ATUAL)
- **Login:** Netlify Identity (JWT); funções validam via `context.clientContext.user`.
- **Admin:** `app_metadata.roles` inclui `"admin"` **OU** e-mail listado em `ADMIN_EMAILS`
  (env, separada por vírgula). Checado em `utils/github.js → isAdmin`.
- **Artista:** casamento do e-mail do token com o campo `email` no `.md` do artista
  (`artistSlugForUser`); fallback `user_metadata.artist_slug`.
- **Cliente sabe se é admin pelo servidor:** `identity.js → checkAdmin()` consulta `whoami`.
- **Escrita:** sempre via Netlify Functions com `GITHUB_TOKEN` do servidor. Sem Git Gateway.

## 6. Deploy
**JÁ FEITO** (ver §0 para os valores reais). **Guia completo em `DEPLOY.md`.** Resumo dos passos:
0. **Gotcha crítico:** toda vez que mudar uma **env var** na Netlify, é preciso **Trigger deploy**
   para ela passar a valer nas Functions (foi o tropeço do 1º login admin).
1. Subir o repo para o GitHub.
2. Netlify → "Add new site" → importar o repo (build/publish vêm do `netlify.toml`).
3. Habilitar **Identity** (registration **invite only**).
4. Criar **GitHub token** (fine-grained PAT, **Contents: read/write** no repo).
5. Env vars: `GITHUB_TOKEN`, `GITHUB_REPO` (`usuario/repo`), `GITHUB_BRANCH` (`main`),
   `ADMIN_EMAILS` (e-mails de admin separados por vírgula).
6. Convidar usuários no Identity. Para artistas: criar o artista no painel e preencher o **e-mail**
   dele — ao logar com esse e-mail, cai no próprio perfil.
7. (Opcional) Apontar domínio (Registro.br → DNS Netlify).

## 7. ⚠️ Pendências (conteúdo a trocar — placeholders)
- **[RESOLVIDO 2026-06-09] Login admin:** funciona (ver §0/§11). Pendência atual: **subir a imagem/gif
  da capa** da home no painel (Configurações avançadas → "Página inicial (capa)").
- `src/_data/site.json`: **Instagram** = `https://instagram.com/` (genérico) e **e-mail** =
  `contato@coletivo.com.br` são placeholders → trocar pelos reais (**painel → Contatos**, atalho novo).
- **Galeria do Delírios:** 3 SVGs placeholder em `src/uploads/exposicoes/delirios-anatomicos/` →
  trocar por fotos reais no editor de exposição.
- `src/uploads/og.jpg`: imagem OG gerada (1200×630, branded) — pode ser trocada no painel.
- (Opcional / futuro) **vídeos na galeria** (decidido adiar; modelo já preparado).

## 8. Decisões fixas
- 11ty + Netlify Functions + Identity (sem Decap, sem Git Gateway).
- Painel próprio cobre exposições, artistas e configurações.
- Saves em **commit único** (Git Data API) → 1 rebuild por save.
- **Status por data** (3 estados), calculado no build.
- Tema por exposição (`theme: delirios` aplica a pele).
- Conteúdo: exposição → **`participations[]` (lista plana)** → `works[]`; **`gallery[]`** (fotos);
  **curador em texto**. A página do artista agrega as obras varrendo as exposições.

## 9. Verificação já feita
- **AO VIVO (produção):** home `200` (título + herói "Delírios Anatômicos" corretos), `/painel/` `200`,
  **`/painel/contatos/` `200`** (página nova publicada), função `whoami` responde
  `{"loggedIn":false,"admin":false,"artistSlug":null}` (Functions no ar). Login Identity funciona.
- **Ordenação** validada por simulação do comparador: em-cartaz → em-breve (respeitando `order`) →
  encerrada → rascunho (oculto).
- Build limpo (exit 0, **32 páginas** após a tela de contatos).
- **Varredura de links:** 0 links internos quebrados (30 páginas).
- Galeria renderiza na página da exposição (3 fotos, legendas com crédito).
- Guard do painel sem login mostra "precisa entrar"; sem erros de JS (home, exposição, painel).
- Imagem OG gerada e servida (`/uploads/og.jpg`).
- Editor de exposição (curador texto, artistas plano, galeria) renderiza por DOM.
- Auth por e-mail/`whoami`/`checkAdmin` implementados (testados de verdade só com `netlify dev`/deploy).

## 10. Notas / armadilhas
- **Env var nova/alterada na Netlify NÃO vale até um novo deploy** (Trigger deploy). Causou o 1º
  login admin falhar. Depois do redeploy, **logout/login** no site para limpar o cache do `checkAdmin`.
- `git`/`gh`/`netlify` CLIs: **só `git` está instalado** nesta máquina (gh e netlify-cli não). Deploy
  e env vars foram feitos pela **UI web** da Netlify; `git push` rodou via terminal (Bash tool).
- **Funções e login** só funcionam com `netlify dev` + envs ou após deploy (local dá 404 / o
  widget pede a URL do site Netlify).
- O **preview MCP** estava preso a outro projeto e os **screenshots travam** (conexões de
  live-reload empilhadas); verificação confiável por DOM (`preview_eval`) e varredura de arquivos.
- Eleventy `--watch` às vezes não pega ARQUIVO NOVO; ao criar template novo, reiniciar o serve.
- O texto curatorial e o de "Influências" do Delírios já estão definitivos (fornecidos pelo usuário).

## 11. Mudanças da sessão 2026-06-09

### Correções de bugs (UI + auth)
- **Nav mobile:** Sobre/Contato sumiam em ≤640px (regra `a:not(.primary){display:none}`).
  Substituído por **menu hambúrguer** (`#nav-toggle` em `nav.njk`; CSS `.nav-toggle`/dropdown em
  `styles.css`; toggle em `main.js`: abre/fecha por clique, link, clique fora, Esc).
- **`[hidden]` ignorado:** `.btn-primary{display:inline-block}` e `.auth-actions{display:flex}`
  venciam o `[hidden]` do user-agent → botões de logado vazavam deslogado na `/entrar/`. Corrigido
  com regra global **`[hidden]{display:none!important}`** em `styles.css`.

### Login reconstruído (Netlify Identity mantido; fonte da verdade = `whoami`)
- **`identity.js` reescrito** como controlador único: busca `whoami` 1x e cacheia
  `{loggedIn, admin, artistSlug}` (limpa no logout); visibilidade por papel via
  **`[data-only-admin]`** (admin) e **`[data-only-artist]`** (tem artistSlug); eventos
  `identity:ready|login|logout` passam `detail.{user, role, whoami}`. API mantida
  (`current/token/authFetch/checkAdmin`) + novos `whoami()` e `role()`.
- **`entrar.njk`** simplificado (estado deslogado = só botão login; estado logado = ações por papel).
- **`entrar.js` (novo, incluído só em `/entrar/` via `base.njk`):** roteamento pós-login →
  admin vai para `/painel/`, artista para `/minha-conta/`, sem papel fica na `/entrar/` com aviso.
- **`nav.njk`:** "Minha conta" agora é `data-only-artist`; "Painel" segue `data-only-admin`.
- **`minha-conta.js`:** libera o formulário pelo **`whoami().artistSlug`** (servidor), não mais por
  `user_metadata.artist_slug` — corrige artista vinculado **por e-mail** que via "conta não vinculada".
- **`whoami.js`:** calcula `admin` **antes** do early-return de `configured()` (admin não depende mais
  de GITHUB_* estar setado).
- **`utils/github.js → isAdmin`:** comparação de e-mail **case-insensitive + trim** (ADMIN_EMAILS).

### Nova homepage = "capa" (estilo Hauser & Wirth)
- **`index.njk`** virou **só a capa**: imagem/gif em tela cheia + botão central → `/exposicoes/`.
  Removidos os blocos "exposição em destaque" e "anteriores". Funciona sem imagem (fundo neutro).
- CSS `.home-cover*` em `styles.css` (object-fit cover, overlay p/ legibilidade, botão hover invertido).
- **Dado novo em `site.json`:** `home_hero { image, heading, subheading, cta_label }`. Botão sempre
  → `/exposicoes/` (fixo no template); só o rótulo/textos são editáveis.
- **Editável no painel:** `painel-configuracoes.njk` + `.js` ganharam a seção **"Página inicial (capa)"**
  (upload de imagem/gif + título/subtítulo/texto do botão), reusando `setupImage`.
- **`save-site.js`** persiste `home_hero` usando o helper `resolveImage` (commit em `src/uploads/site/`).

### Foto de perfil do artista
- **Já existia ponta-a-ponta** (campo em `minha-conta.njk` → `update-profile.js` commita em
  `src/uploads/artistas/<slug>-<ts>.<ext>` → renderiza em `artista.njk`). Não aparecia só por causa do
  bug "conta não vinculada", agora corrigido. **Confirmado ao vivo** (commit `Atualiza artista: 7416`).

### Testes (novos)
- **Unit (`node:test`, sem deps):** `npm test` → `test/unit/` cobre `isAdmin` (role + e-mail
  case-insensitive) e `utils/site-helpers.js` (`clean`, `extFromUpload`). **15 testes.**
- **DRY:** `clean`/`extFromUpload` (duplicados em `save-site.js` e `update-profile.js`) extraídos
  para **`netlify/functions/utils/site-helpers.js`**; ambas as functions agora o importam.
- **E2E (Playwright/chromium):** `npm run test:e2e` → `test/e2e/` cobre capa+CTA, `/entrar/` deslogado
  e nav mobile. **7 testes.** Config `playwright.config.js` (reusa `eleventy --serve` na 8080).
  `package.json` ganhou scripts `test`/`test:e2e` + devDep `@playwright/test`; `.gitignore` ignora
  `test-results/` e `playwright-report/`.

### Commits (no `main`, já no ar)
- `fix: nav mobile, estado de login e deteccao de admin`
- `feat: reconstroi fluxo de login com roteamento por papel`
- `feat: homepage em capa de tela cheia editavel no painel`
- `test: add node:test unit suite (isAdmin + site-helpers)`
- `test: add Playwright e2e for home cover, login, mobile nav`

### Pendência aberta
- **Subir a imagem/gif da capa** no painel (hoje a home mostra fundo neutro — sem imagem ainda).
  Painel → Configurações avançadas → "Página inicial (capa)" → upload → Salvar.

## 12. Mudanças da sessão 2026-06-09 (parte 2 — uploads, molduras, lightbox)

### Uploads reconstruídos (corrige: erro com >3 fotos, GIF na capa, foto grande)
- **Causa raiz** dos erros "Internal Error" ao salvar: todas as imagens iam em **base64 num único
  POST** → estourava o limite de **6 MB** do body das Netlify Functions (1 foto de celular já
  passa; GIFs idem). Não havia validação de campos — crédito sempre foi opcional.
- **Novo fluxo (2 camadas):**
  1. **Compressão no cliente** (`src/assets/js/upload.js`, `window.coletivoUpload`): canvas
     redimensiona p/ máx 2000px e re-encoda (jpeg q.85; png mantém png). **GIF/SVG passam intactos.**
  2. **Upload individual:** ao escolher o arquivo, o cliente chama **`upload-image`** (function
     nova) que cria um **blob solto no GitHub** (`POST /git/blobs`) e devolve `{ blobSha }`.
     O save final envia só `{ blobSha, name, type }`; `commitFiles` referencia o sha na árvore →
     **continua commit único / 1 rebuild**, e a quantidade de fotos é **ilimitada**.
- **Limite restante:** GIF individual > **~3,5 MB** (binário) ainda não passa (um POST por imagem,
  teto de 6 MB do gateway). `upload-image` responde 413 com mensagem amigável.
- **Backend:** `utils/github.js` (`createBlob`, `commitFiles` aceita `{ blobSha }`),
  `utils/site-helpers.js` (`isUpload`, `uploadFileEntry`; `extFromUpload` consolidado — removidas
  cópias locais de `save-exposicao`/`save-artista`), e os 4 saves aceitam `{ blobSha | dataBase64 }`.
- **Frontend:** `painel-editar.js`, `painel-configuracoes.js`, `painel-editar-artista.js`,
  `minha-conta.js` fazem upload imediato no `change` (status "Enviando imagem…", botão Salvar
  desabilitado enquanto envia, erro junto ao status). `base.njk` injeta `upload.js` nessas 4 páginas.

### UI
- **Bolas coloridas removidas** do herói (layout normal): markup `.blobs` fora do `exposicao.njk`
  e CSS `.blob*`/`@keyframes float` removidos do `styles.css`.
- **Molduras de definição** (`.img-frame` + variantes em `styles.css`): preview com a proporção e
  o corte REAIS em todo upload — galeria/obras/foto de artista/perfil **1:1** (cover), capa da home
  **16:9** ("tela cheia"), OG **1200×630**, capa de exposição e logo **sem corte** (contain).
  Aplicado em `painel-editar.njk`, `painel-configuracoes.njk`, `painel-editar-artista.njk`,
  `minha-conta.njk`.
- **Campos da foto de galeria** (tpl-photo): "Nome da obra" (`caption`), "Descrição" (`alt`),
  "Crédito" (`credit` — sem "(fotógrafo)"). Todos opcionais; chaves de dados não mudaram.
- **Lightbox novo** (`main.js` + classes `.lightbox*` no CSS): foto ampliada mostra **nome,
  descrição e crédito** (data-attrs em `partials/gallery.njk` e nos tiles de obras do
  `artista.njk`); fecha por clique ou **Esc**; trava o scroll do body.

### Testes
- Unit: **22** (`npm test`) — novos: `createBlob`, `commitFiles` com `blobSha` (fetch mockado),
  `isUpload`/`uploadFileEntry`.
- E2E: **10** (`npm run test:e2e`) — novo `test/e2e/galeria.spec.js`: sem `.blob` na exposição,
  lightbox abre com legenda/“Crédito:” e fecha no Esc, tpl-photo usa "Crédito" sem `required`.
- Build limpo (33 páginas).
