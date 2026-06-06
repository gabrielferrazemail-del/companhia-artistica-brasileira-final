# HANDOFF — Site do coletivo (Companhia Artística Brasileira)

Documento de transferência. Resume o estado completo do projeto para continuar em outra sessão.
_Última atualização: 2026-06-06._

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
  padrão), **widget Netlify Identity**, e carrega o JS por página.
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
- `index.njk` — home (herói destaca em-cartaz OU em-breve; grade "anteriores").
- `exposicoes.njk` — índice `/exposicoes/` (agrupado por `effectiveStatus`).
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
- `painel-configuracoes.njk` — **configurações do site** (nome, tagline, sobre, logo, contato,
  redes, SEO + imagem OG).
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
- `js/painel.js`, `js/painel-editar.js`, `js/painel-editar-artista.js`, `js/painel-configuracoes.js`
  — telas do painel; gate de admin via **`await checkAdmin()`**.
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
**Guia completo em `DEPLOY.md`.** Resumo:
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
- `src/_data/site.json`: **Instagram** = `https://instagram.com/` (genérico) e **e-mail** =
  `contato@coletivo.com.br` são placeholders → trocar pelos reais (painel → Configurações).
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
- Build limpo (exit 0, 31 páginas).
- **Varredura de links:** 0 links internos quebrados (30 páginas).
- Galeria renderiza na página da exposição (3 fotos, legendas com crédito).
- Guard do painel sem login mostra "precisa entrar"; sem erros de JS (home, exposição, painel).
- Imagem OG gerada e servida (`/uploads/og.jpg`).
- Editor de exposição (curador texto, artistas plano, galeria) renderiza por DOM.
- Auth por e-mail/`whoami`/`checkAdmin` implementados (testados de verdade só com `netlify dev`/deploy).

## 10. Notas / armadilhas
- **Funções e login** só funcionam com `netlify dev` + envs ou após deploy (local dá 404 / o
  widget pede a URL do site Netlify).
- O **preview MCP** estava preso a outro projeto e os **screenshots travam** (conexões de
  live-reload empilhadas); verificação confiável por DOM (`preview_eval`) e varredura de arquivos.
- Eleventy `--watch` às vezes não pega ARQUIVO NOVO; ao criar template novo, reiniciar o serve.
- O texto curatorial e o de "Influências" do Delírios já estão definitivos (fornecidos pelo usuário).
