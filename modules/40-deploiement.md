---
titre: Déploiement Next.js et Vite en production
cours: 04-react
notions: [build de production next build, output standalone, déploiement Vercel natif, alternatives Docker et self-host, variables d'env build vs runtime, prefixe NEXT_PUBLIC_, edge runtime vs node runtime, CDN et caching, preview deployments, build statique Vite SPA, survol CI/CD GitHub Actions]
outcomes: [produire un build de production Next.js et le déployer sur Vercel, conteneuriser une app Next.js avec output standalone pour un self-host, distinguer variables d'env de build et de runtime et choisir edge ou node runtime]
prerequis: [39-auth-nextauth]
next: 41-patterns-esn
libs: [{ name: react, version: "^19" }, { name: next, version: "^15" }]
tribuzen: admin web Next.js déployé sur Vercel — env DATABASE_URL/AUTH_SECRET côté serveur, NEXT_PUBLIC_API_URL côté client, preview deployment par PR
last-reviewed: 2026-07
---

# Déploiement Next.js et Vite en production

> **Outcomes — tu sauras FAIRE :** produire un build de production Next.js et le déployer sur Vercel, conteneuriser une app Next.js avec `output: 'standalone'` pour un self-host, distinguer variables d'env de build et de runtime et choisir entre edge et node runtime.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

L'admin TribuZen tourne parfaitement en `pnpm dev`. Le lead te dit : « Mets-le en prod aujourd'hui, avec une URL de preview automatique sur chaque PR pour que le PO valide avant merge. »

Tu tapes `pnpm build`, et voici ce que le terminal crache :

```txt
▲ Next.js 15.3.0

  Creating an optimized production build ...
  ✓ Compiled successfully

Route (app)                     Size     First Load JS
┌ ○ /                           1.2 kB          92 kB
├ ○ /login                      3.4 kB         101 kB
├ ƒ /familles                   2.1 kB          95 kB
└ ƒ /familles/[id]              2.8 kB          96 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Trois questions surgissent tout de suite :

1. Pourquoi `/` est **Static** (`○`) et `/familles` est **Dynamic** (`ƒ`) ? Qu'est-ce qui décide ?
2. Où passe le `DATABASE_URL` ? Et le `NEXT_PUBLIC_API_URL` ? Ils ne vivent pas au même endroit.
3. On déploie où — Vercel en un clic, ou Docker parce que le client final impose OVH ?

Ce module répond aux trois, puis tu déploies pour de vrai dans le lab.

---

## 2. Théorie complète, concise

### 2.1 Le build de production : `next build`

`next dev` sert des modules non optimisés avec HMR. `next build` fait tout l'inverse : compilation, tree-shaking, minification, découpage en chunks, et **pré-rendu** des routes qui peuvent l'être.

```bash
pnpm build   # génère le dossier .next/ optimisé
pnpm start   # sert ce build en mode production (node)
```

Chaque route est classée à la compilation :

| Symbole | Type | Rendu | Exemple TribuZen |
|---|---|---|---|
| `○` | Static | pré-rendu au **build**, servi tel quel | `/` accueil, `/login` |
| `ƒ` | Dynamic | rendu **par requête** sur le serveur | `/familles` (lit la DB par user) |
| `●` | SSG params | pré-rendu par `generateStaticParams` | pages figées connues d'avance |

Une route bascule en Dynamic dès qu'elle utilise une API dépendante de la requête : `cookies()`, `headers()`, `searchParams`, ou un `fetch` marqué non-caché. C'est la réponse à la question 1 du cas concret : `/familles` lit la session (cookies) → dynamique.

### 2.2 `output: 'standalone'` : un build autoportant

Par défaut, `pnpm start` a besoin de tout `node_modules`. Pour un conteneur Docker léger, on active le mode **standalone** :

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // .next/standalone/ contient un server.js autonome
};

export default nextConfig;
```

Next trace les dépendances réellement utilisées et copie **le minimum** dans `.next/standalone/`, avec un `server.js` prêt à lancer :

```bash
node .next/standalone/server.js   # démarre sans node_modules complet
```

C'est la brique qui rend l'image Docker petite (~150 Mo au lieu de 1 Go+). On y revient en 2.4.

### 2.3 Déploiement Vercel (natif Next.js)

Vercel est édité par l'équipe Next.js : le déploiement est « zero config ». Deux voies.

**Voie CLI** — pour un test rapide :

```bash
npm i -g vercel
vercel          # premier déploiement, lie le projet (crée un preview)
vercel --prod   # promeut en production
```

**Voie Git (celle qu'on utilise en équipe)** — on connecte le repo GitHub sur vercel.com, puis :

```txt
push sur main   → déploiement PRODUCTION   https://tribuzen-admin.vercel.app
ouverture PR    → PREVIEW deployment        https://tribuzen-admin-git-<branche>.vercel.app
```

Vercel détecte Next.js et applique les bons réglages (SSR, ISR, routes statiques sur CDN, fonctions serveur). Un `vercel.json` n'est nécessaire que pour surcharger :

```json
{
  "framework": "nextjs",
  "regions": ["cdg1"]
}
```

`cdg1` = région Paris, pour rapprocher les fonctions serveur des utilisateurs France (latence DB).

### 2.4 Alternative : Docker + Node (self-host)

Certains clients ESN imposent un hébergement on-premise ou un cloud précis (OVH, Scaleway, AWS). On conteneurise le build standalone en multi-stage :

```dockerfile
# Dockerfile — image Next.js standalone
# ─── Stage 1 : dépendances ───
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Stage 2 : build ───
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variable de BUILD : inlinée dans le bundle client (voir 2.5)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm build

# ─── Stage 3 : runner ───
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# On ne copie QUE la sortie standalone + les assets statiques
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

```bash
# Build : le NEXT_PUBLIC_ passe en --build-arg (il est figé au build)
docker build -t tribuzen-admin --build-arg NEXT_PUBLIC_API_URL=https://api.tribuzen.app .
# Run : les secrets RUNTIME passent par --env-file (jamais au build)
docker run -p 3000:3000 --env-file .env.production tribuzen-admin
```

Retiens la dissymétrie : `NEXT_PUBLIC_API_URL` en `--build-arg`, `DATABASE_URL`/`AUTH_SECRET` en `--env-file`. La section suivante explique pourquoi.

### 2.5 Variables d'env : build vs runtime, `NEXT_PUBLIC_`

C'est le point le plus piégeux du déploiement Next. Deux moments, deux natures.

| | Variable de **build** | Variable de **runtime** |
|---|---|---|
| Prefixe | `NEXT_PUBLIC_...` | pas de prefixe |
| Lue quand | à la compilation (`next build`) | à chaque requête serveur |
| Où elle finit | **inlinée en dur** dans le bundle JS client | reste sur le serveur, jamais envoyée au client |
| Visible navigateur | OUI (public !) | NON |
| Exemple TribuZen | `NEXT_PUBLIC_API_URL` | `DATABASE_URL`, `AUTH_SECRET` |

Règle mentale : **`NEXT_PUBLIC_` = public, gravé au build**. Tout ce qui est prefixé est copié tel quel dans le JavaScript téléchargé par le navigateur — donc **jamais de secret** avec ce prefixe.

```ts
// Server Component / route serveur : accès direct, valeur runtime, jamais exposée
const db = process.env.DATABASE_URL;      // secret, côté serveur uniquement

// Client Component : SEULES les NEXT_PUBLIC_ existent (inlinées au build)
'use client';
const api = process.env.NEXT_PUBLIC_API_URL; // ok, c'est public
// process.env.DATABASE_URL ici → undefined (et heureusement)
```

Conséquence directe pour Docker : comme `NEXT_PUBLIC_*` est figé **au build**, changer sa valeur exige de **rebuild** l'image. Un secret runtime, lui, se change en relançant le conteneur avec un autre `--env-file`.

> **Note actualité (Context7 / Next.js docs) :** en Next 15 les valeurs runtime se lisent via `process.env.X` directement dans les composants serveur. Next 16 déprécie `serverRuntimeConfig`/`publicRuntimeConfig` au profit de `process.env` (+ `connection()` pour forcer une lecture strictement runtime). Le modèle build vs runtime décrit ici reste valable.

Sur Vercel, on ne gère pas de fichiers : Settings → Environment Variables, avec une valeur par environnement.

| Variable | Environment | Valeur |
|---|---|---|
| `DATABASE_URL` | Production | pointe la DB prod |
| `DATABASE_URL` | Preview | pointe une DB staging |
| `AUTH_SECRET` | All | secret partagé |
| `NEXT_PUBLIC_API_URL` | Production | `https://api.tribuzen.app` |

On ne versionne jamais un `.env` avec des secrets ; on versionne un template :

```bash
# .env.example (committé, sans valeurs réelles)
DATABASE_URL=postgresql://user:password@host:5432/db
AUTH_SECRET=generer-avec-openssl-rand-base64-32
NEXT_PUBLIC_API_URL=https://api.tribuzen.app
```

### 2.6 Edge runtime vs Node runtime

Next.js peut exécuter le rendu serveur d'une route dans deux environnements différents :

| | **Node runtime** (défaut) | **Edge runtime** |
|---|---|---|
| Basé sur | Node.js complet | Web APIs (Workers V8), sous-ensemble |
| Démarrage à froid | plus lent | quasi instantané |
| Localisation | région(s) choisies | réparti mondialement, proche du user |
| APIs Node | toutes (`fs`, drivers DB TCP…) | non — pas de `fs`, pas de socket TCP brut |
| Bon pour | accès DB, logique lourde, libs Node | middleware, geo, A/B, petites réponses |

On choisit par route :

```ts
// app/api/geo/route.ts — réponse légère, latence mini partout
export const runtime = 'edge';
```

Piège fréquent : mettre une route qui parle à Postgres en `edge` casse (pas de TCP). Pour TribuZen, les routes qui touchent la DB restent en **node** (défaut) ; l'edge se réserve au `middleware.ts` (redirections auth, géo).

### 2.7 CDN et caching

Deux familles d'assets, deux stratégies :

- **Assets statiques** (`/_next/static/...`, JS/CSS hashés) : le nom contient un hash de contenu. On les met en cache **immutable, un an**. Vercel le fait d'office ; en self-host, c'est Nginx :

```nginx
# nginx.conf — cache long sur les statiques hashés
location /_next/static/ {
    proxy_pass http://app:3000;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

- **Pages/données** : `Cache-Control` piloté par le fetch et la stratégie de rendu. Une page **Static** est servie depuis le CDN ; une page **Dynamic** est recalculée (sauf ISR/`revalidate`). Le CDN sert le HTML pré-rendu au plus proche du visiteur — c'est ce qui rend l'accueil TribuZen instantané.

### 2.8 Preview deployments (validation avant merge)

Chaque PR obtient une URL isolée où le PO teste avant merge. Sur Vercel c'est automatique : le bot commente la PR.

```txt
✅ Preview: https://tribuzen-admin-git-feat-invitations-team.vercel.app
```

Bonne pratique : brancher les previews sur une **DB staging** (via la valeur `Preview` de `DATABASE_URL`) pour ne jamais polluer la prod pendant une revue.

### 2.9 Cas Vite / SPA : build statique + hébergement

Toute app React n'est pas Next. Une SPA Vite (pas de SSR) se compile en **fichiers statiques** purs :

```bash
pnpm build        # produit dist/ : index.html + assets hashés
pnpm preview      # sert dist/ en local pour vérifier
```

`dist/` est un tas de fichiers statiques → on l'héberge sur n'importe quel CDN/static host (Netlify, Cloudflare Pages, S3+CloudFront, GitHub Pages). Deux différences majeures avec Next :

1. **Pas de serveur** : aucun secret runtime possible, tout ce qui est dans le bundle est public. Les variables Vite s'exposent avec le prefixe `VITE_` (équivalent conceptuel de `NEXT_PUBLIC_`).
2. **Fallback SPA** : comme il n'y a qu'un `index.html`, l'hébergeur doit renvoyer `index.html` sur toutes les routes (rewrite `/* → /index.html`), sinon un refresh sur `/familles` renvoie 404.

### 2.10 CI/CD en survol (GitHub Actions)

Avant tout déploiement, une pipeline garde la qualité : lint + test + build. Vercel déploie ensuite lui-même sur push, donc la CI se concentre sur les checks. Workflow minimal :

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test --run
      - run: pnpm build
        env:
          NEXT_PUBLIC_API_URL: ${{ vars.NEXT_PUBLIC_API_URL }}
```

`--frozen-lockfile` fait échouer le build si `pnpm-lock.yaml` est désynchronisé de `package.json`. Les secrets/vars viennent de <code v-pre>${{ secrets.X }}</code> / <code v-pre>${{ vars.X }}</code>, jamais du code.

---

## 3. Worked examples

### Exemple 1 — Déployer l'admin TribuZen sur Vercel avec env par environnement

Objectif : prod sur `main`, preview par PR, DB staging en preview.

**Étape 1 — préparer le repo.** `next.config.ts` reste sans `output: 'standalone'` (inutile sur Vercel, réservé au Docker). On committe un `.env.example`, on gitignore les `.env` réels :

```bash
# .gitignore
.env
.env*.local
.env.production
```

**Étape 2 — connecter le projet.** Sur vercel.com : Import GitHub repo → framework détecté « Next.js » → aucune commande à changer.

**Étape 3 — variables par environnement** (Settings → Environment Variables) :

```txt
DATABASE_URL         Production → postgres prod
DATABASE_URL         Preview    → postgres staging
AUTH_SECRET          All        → <secret>
NEXT_PUBLIC_API_URL  Production → https://api.tribuzen.app
NEXT_PUBLIC_API_URL  Preview    → https://staging-api.tribuzen.app
```

**Étape 4 — vérifier le flux.** Ouvrir une PR :

```bash
git checkout -b feat/invitations
git commit --allow-empty -m "chore: test preview"
git push -u origin feat/invitations
# → Vercel commente la PR avec l'URL de preview branchée sur la DB staging
```

**Ce que ça prouve :** le même code se déploie sur deux URLs, avec deux DB, sans toucher le code — toute la variabilité est dans les env Vercel. Le PO valide sur l'URL preview, puis merge → prod.

### Exemple 2 — Conteneuriser la même app pour un client self-host

Le client final impose OVH : pas de Vercel. On passe en standalone + Docker.

**Étape 1 — activer standalone :**

```ts
// next.config.ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { output: 'standalone' };
export default nextConfig;
```

**Étape 2 — construire l'image** (le `NEXT_PUBLIC_` doit être présent au BUILD) :

```bash
docker build -t tribuzen-admin \
  --build-arg NEXT_PUBLIC_API_URL=https://api.client.fr \
  .
```

**Étape 3 — lancer avec les secrets runtime** (jamais dans l'image) :

```bash
# .env.production (NON versionné) : DATABASE_URL, AUTH_SECRET
docker run -p 3000:3000 --env-file .env.production tribuzen-admin
curl http://localhost:3000   # doit répondre le HTML de l'admin
```

**Piège vécu :** si on avait mis `NEXT_PUBLIC_API_URL` dans `--env-file` au lieu de `--build-arg`, le bundle client contiendrait `undefined` — car la valeur est déjà gravée au build, avant le `docker run`. Symptôme : les appels API partent vers `undefined/...` en prod. La correction est de rebuild avec le bon `--build-arg`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire qu'un secret est protégé avec `NEXT_PUBLIC_`

```bash
# ❌ Le secret finit EN CLAIR dans le JS téléchargé par le navigateur
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_xxx
```

Tout ce qui est prefixé `NEXT_PUBLIC_` est inliné dans le bundle client au build. N'importe qui ouvre les DevTools et le lit. **Un secret n'a jamais de prefixe `NEXT_PUBLIC_`** — il se lit côté serveur via `process.env.SECRET` sans prefixe.

### PIÈGE #2 — Attendre qu'une NEXT_PUBLIC_ change au runtime

```bash
# On change la valeur puis on redémarre le conteneur... et rien ne change côté client
docker run --env NEXT_PUBLIC_API_URL=https://autre.fr tribuzen-admin
```

Faux : `NEXT_PUBLIC_*` est **figée au build**, pas au run. La changer impose de **rebuild l'image**. Seules les variables **sans** prefixe (lues côté serveur) réagissent au runtime. C'est exactement la dissymétrie `--build-arg` vs `--env-file`.

### PIÈGE #3 — Mettre une route DB en edge runtime

```ts
// ❌ La route parle à Postgres mais tourne en edge
export const runtime = 'edge';
export async function GET() {
  const rows = await db.query('SELECT * FROM families'); // casse : pas de TCP en edge
}
```

L'edge runtime n'a pas les APIs Node (`fs`, sockets TCP bruts). Les drivers Postgres classiques ne fonctionnent pas. **Garder le node runtime (défaut) pour tout accès DB** ; réserver l'edge au middleware et aux réponses légères sans dépendance Node (ou drivers HTTP compatibles edge).

### PIÈGE #4 — Oublier le fallback SPA sur un déploiement Vite

Sur une SPA Vite hébergée statiquement, ouvrir directement `/familles` (ou rafraîchir) renvoie **404** : le serveur cherche un fichier `familles` qui n'existe pas. Il faut configurer un rewrite `/* → /index.html` pour que le routeur client prenne la main. Sur Next.js le problème ne se pose pas (le serveur connaît les routes).

### PIÈGE #5 — Committer `.env.production`

```bash
# ❌ le secret part dans l'historique git, irrécupérable
git add .env.production && git commit -m "config"
```

Les fichiers `.env*` avec secrets ne sont **jamais** versionnés. On versionne un `.env.example` sans valeurs, on gitignore le reste, et les vraies valeurs vivent dans le dashboard Vercel ou l'`--env-file` du serveur.

---

## 5. Ancrage TribuZen

L'admin web TribuZen (Next.js 15, App Router, auth NextAuth du module 39) se déploie ainsi :

**Vercel = plateforme par défaut.** Le repo `smaurier/tribuzen-admin` est connecté à Vercel : push sur `main` → prod (`https://admin.tribuzen.app`), chaque PR → preview. Le PO valide les nouvelles vues familles/membres sur l'URL de preview avant merge.

**Répartition des variables d'env :**

```txt
# Serveur uniquement (jamais dans le bundle client)
DATABASE_URL   → Postgres TribuZen (prod vs staging selon l'environnement Vercel)
AUTH_SECRET    → signature des sessions NextAuth

# Public, inliné au build
NEXT_PUBLIC_API_URL → URL de l'API métier consommée côté client
```

**Runtime par route :** les routes qui lisent la DB famille/membre restent en **node runtime** ; `middleware.ts` (garde d'auth, redirection `/login`) tourne en **edge** pour intercepter au plus près du visiteur. Conséquence directe : le middleware ne peut pas importer un `auth.ts` qui tire `bcryptjs` ou un driver DB Node → applique le pattern **split-config** d'Auth.js v5 (`auth.config.ts` edge-safe importé par le middleware, `auth.ts` Node pour le reste), détaillé en **§2.10 du module 39**.

**Variante self-host :** si un déploiement TribuZen white-label doit vivre chez un hébergeur imposé, on bascule `output: 'standalone'` + Dockerfile multi-stage (Exemple 2), avec `NEXT_PUBLIC_API_URL` en `--build-arg` et les secrets en `--env-file`.

Fichiers cibles dans `smaurier/tribuzen-admin` :

```txt
tribuzen-admin/
  next.config.ts            # output standalone seulement pour la cible Docker
  .env.example              # committé, template sans secrets
  Dockerfile                # multi-stage, cible self-host
  .github/workflows/ci.yml  # lint + test + build
  vercel.json               # regions: ["cdg1"] (optionnel)
```

---

## 6. Points clés

1. `next build` optimise et pré-rend ce qui peut l'être : routes `○` Static (build), `ƒ` Dynamic (par requête, dès qu'on lit cookies/headers/searchParams).
2. `output: 'standalone'` produit un `.next/standalone/server.js` autoportant → image Docker légère, lancée par `node server.js`.
3. Vercel est le déploiement natif Next : push `main` → prod, PR → preview, zero config.
4. Docker + Node standalone est l'alternative self-host quand le client impose son hébergement.
5. `NEXT_PUBLIC_*` = variable de build, inlinée en clair dans le bundle client → jamais de secret ; les valeurs sans prefixe restent serveur/runtime.
6. En Docker : `NEXT_PUBLIC_*` passe en `--build-arg` (figée au build), les secrets en `--env-file` (runtime, changeables sans rebuild).
7. Edge runtime = démarrage rapide, mondial, mais pas d'APIs Node (pas de DB TCP) ; node runtime (défaut) pour tout accès DB.
8. Assets `/_next/static/` hashés → cache `immutable` un an ; le CDN sert les pages statiques au plus proche du visiteur.
9. Une SPA Vite se compile en `dist/` statique (secrets impossibles, prefixe `VITE_`), et exige un fallback `/* → /index.html`.
10. La CI (GitHub Actions) fait lint + test + build avec `--frozen-lockfile` ; Vercel gère le déploiement lui-même.

---

## 7. Seeds Anki

```
Quelle est la différence entre une route Static (○) et Dynamic (ƒ) après next build ?|Static est pré-rendue au build et servie telle quelle (CDN) ; Dynamic est rendue par requête sur le serveur. Une route devient Dynamic dès qu'elle lit cookies(), headers(), searchParams ou un fetch non caché.
Que produit output: 'standalone' dans next.config et à quoi ça sert ?|Un dossier .next/standalone/ avec un server.js autonome et seulement les dépendances tracées, lancé par node server.js. Ça permet une image Docker légère (~150 Mo) sans node_modules complet, pour le self-host.
Où finit une variable prefixée NEXT_PUBLIC_ et quelle est la règle de sécurité ?|Elle est inlinée en clair dans le bundle JavaScript client au moment du build, donc lisible par n'importe qui dans le navigateur. Règle : jamais de secret avec ce prefixe ; les secrets se lisent côté serveur via process.env sans prefixe.
Pourquoi passe-t-on NEXT_PUBLIC_API_URL en --build-arg mais DATABASE_URL en --env-file dans Docker ?|NEXT_PUBLIC_ est figée au build (inlinée dans le bundle), il faut donc la fournir au docker build ; la changer exige un rebuild. DATABASE_URL est un secret runtime lu côté serveur, fourni au docker run et changeable sans rebuild.
Quelle est la limite de l'edge runtime par rapport au node runtime ?|L'edge runtime tourne sur des Web APIs (V8), démarre vite et se répartit mondialement, mais n'a pas les APIs Node (fs, sockets TCP). Il casse pour un accès Postgres classique — on garde le node runtime (défaut) pour la DB.
Comment cache-t-on les assets /_next/static/ et pourquoi c'est sûr ?|Cache-Control: public, max-age=31536000, immutable (un an). C'est sûr car le nom des fichiers contient un hash de contenu : un changement produit un nouveau nom, donc pas de cache périmé.
Qu'est-ce qu'un preview deployment et quelle bonne pratique l'accompagne ?|Une URL isolée générée automatiquement par PR (sur Vercel) pour tester/valider avant merge. Bonne pratique : brancher les previews sur une DB staging pour ne pas polluer la production.
En quoi le déploiement d'une SPA Vite diffère-t-il de Next.js ?|Vite build produit dist/ purement statique (pas de serveur, donc pas de secret runtime, prefixe VITE_ pour l'exposé). Il faut un fallback /* → /index.html sinon un refresh sur une route profonde renvoie 404 ; Next.js n'a pas ce souci car son serveur connaît les routes.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-40-deploiement/README.md`. Préparer l'admin TribuZen pour la prod : build de production, `output: 'standalone'` + Dockerfile, séparation stricte des variables build/runtime, et procédure de déploiement Vercel avec preview par PR.
