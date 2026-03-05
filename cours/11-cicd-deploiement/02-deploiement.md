# Cours 41 — Déploiement : Vercel, Docker et alternatives

> **Objectif** : Savoir déployer une application Next.js en production sur Vercel (zero config), en Docker + Nginx (self-hosted), et connaître le mode standalone de Next.js. Gérer les variables d'environnement en production, mettre en place des preview deployments pour les PR, et comparer les plateformes de déploiement (Vercel, Netlify, Firebase, Docker).

---

## Rappel du cours précédent

<details>
<summary>1. Quels sont les trois jobs principaux d'une pipeline CI React/Next.js ?</summary>

(1) `quality` : lint + typecheck, (2) `test` : tests unitaires + couverture, (3) `build` : compilation de l'application. Les jobs `quality` et `test` s'exécutent en parallèle, et `build` attend que les deux réussissent.
</details>

<details>
<summary>2. Pourquoi utiliser --frozen-lockfile en CI ?</summary>

`--frozen-lockfile` garantit que les dépendances installées correspondent exactement au fichier `pnpm-lock.yaml` versionné. Si le lockfile est désynchronisé avec `package.json`, le build échoue immédiatement au lieu d'installer des versions potentiellement différentes.
</details>

<details>
<summary>3. Que fait la configuration concurrency dans GitHub Actions ?</summary>

`concurrency` avec `cancel-in-progress: true` annule automatiquement les runs en cours quand un nouveau push arrive sur la même branche/PR. Cela économise des minutes CI et donne un feedback plus rapide sur le dernier commit.
</details>

---

## Analogie

Le déploiement, c'est comme **envoyer un colis**. Vercel est un **service de livraison express** : vous déposez le colis (git push), et il est livré automatiquement partout dans le monde (CDN global). Docker est comme **construire votre propre camion de livraison** : plus de contrôle, mais plus de travail de maintenance. Les preview deployments sont comme des **échantillons envoyés au client** avant la livraison finale — le client (reviewer) peut tester avant d'approuver.

---

## Théorie

### 1. Vercel : LA plateforme pour Next.js

Vercel est créé par la même équipe que Next.js. Le déploiement est "zero config" :

```bash
# Installation du CLI
npm i -g vercel

# Premier déploiement (lie le projet à Vercel)
vercel

# Déploiement en production
vercel --prod
```

#### Déploiement automatique via Git

1. Connecter le repo GitHub sur [vercel.com](https://vercel.com)
2. Chaque push sur `main` → déploiement en production automatique
3. Chaque PR → preview deployment avec URL unique

```
main → https://monapp.vercel.app (production)
PR #42 → https://monapp-pr-42.vercel.app (preview)
```

#### Configuration Vercel

```json
// vercel.json (optionnel, la plupart du temps pas nécessaire)
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "regions": ["cdg1"]  // Paris pour la latence France
}
```

#### Variables d'environnement

Dans le dashboard Vercel : Settings → Environment Variables

| Variable | Environment | Valeur |
|----------|------------|--------|
| `DATABASE_URL` | Production | `postgresql://...prod` |
| `DATABASE_URL` | Preview | `postgresql://...staging` |
| `AUTH_SECRET` | All | `xxx` |
| `NEXT_PUBLIC_APP_URL` | Production | `https://monapp.com` |
| `NEXT_PUBLIC_APP_URL` | Preview | Auto (URL de preview) |

> **Bonne pratique** : utiliser une base de données de staging pour les preview deployments afin de ne pas polluer la production.

### 2. Docker + Nginx pour le self-hosted

Certains clients ESN exigent un hébergement on-premise ou sur un cloud spécifique (AWS, OVH, Scaleway). Docker est la solution standard.

#### Next.js standalone output

```tsx
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",  // Génère un build autonome sans node_modules
};
```

Le mode `standalone` crée un dossier `.next/standalone` qui contient uniquement les fichiers nécessaires au runtime — pas besoin d'installer `node_modules` dans le conteneur Docker.

#### Dockerfile optimisé (multi-stage)

```dockerfile
# Dockerfile

# ─── Stage 1 : Dépendances ───
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Stage 2 : Build ───
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'environnement de build
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN pnpm build

# ─── Stage 3 : Production ───
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

```bash
# Build et run
docker build -t monapp --build-arg NEXT_PUBLIC_APP_URL=https://monapp.com .
docker run -p 3000:3000 --env-file .env.production monapp
```

#### docker-compose avec Nginx

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build:
      context: .
      args:
        NEXT_PUBLIC_APP_URL: https://monapp.com
    env_file: .env.production
    restart: unless-stopped
    expose:
      - "3000"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    restart: unless-stopped
```

```nginx
# nginx.conf
upstream nextjs {
    server app:3000;
}

server {
    listen 80;
    server_name monapp.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name monapp.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # Headers de sécurité
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Fichiers statiques (cache longue durée)
    location /_next/static/ {
        proxy_pass http://nextjs;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Tout le reste vers Next.js
    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Variables d'environnement en production

| Méthode | Quand l'utiliser |
|---------|-----------------|
| `.env.production` (fichier) | Dev local, docker-compose |
| Variables Vercel Dashboard | Déploiement Vercel |
| Docker `--env-file` ou `-e` | Docker en production |
| Kubernetes Secrets | Orchestration K8s |
| Vault (HashiCorp) | Entreprise, secrets sensibles |

```bash
# ❌ NE JAMAIS versionner les fichiers .env avec des secrets
# .gitignore
.env
.env.local
.env.production
.env*.local
```

```bash
# ✅ Fournir un template
# .env.example (versionné, sans valeurs secrètes)
DATABASE_URL=postgresql://user:password@host:5432/db
AUTH_SECRET=generate-with-openssl-rand-base64-32
NEXT_PUBLIC_APP_URL=https://monapp.com
```

### 4. Preview deployments (PR previews)

Les preview deployments permettent au reviewer de tester une PR sur une URL unique :

#### Avec Vercel (automatique)

Chaque PR crée automatiquement un preview deployment. Le bot Vercel ajoute un commentaire avec le lien :

```
✅ Preview: https://monapp-git-feature-xyz-team.vercel.app
```

#### Avec GitHub Actions + Docker (self-hosted)

```yaml
# .github/workflows/preview.yml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t monapp:pr-${{ github.event.pull_request.number }} \
            --build-arg NEXT_PUBLIC_APP_URL=https://pr-${{ github.event.pull_request.number }}.staging.monapp.com \
            .

      # Déployer sur infrastructure de staging
      # (spécifique à votre infrastructure)

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Preview: https://pr-${context.issue.number}.staging.monapp.com`
            })
```

### 5. Comparaison des plateformes

| Plateforme | Framework principal | SSR | Prix (hobby) | Self-hosted |
|------------|-------------------|-----|--------------|-------------|
| **Vercel** | Next.js | ✅ Natif | Gratuit (limites) | ❌ |
| **Netlify** | Tous | ✅ (via adapters) | Gratuit (limites) | ❌ |
| **Firebase Hosting** | Angular, React | ✅ (Cloud Functions) | Gratuit (limites) | ❌ |
| **Docker + VPS** | Tous | ✅ | ~5-20 EUR/mois | ✅ |
| **AWS Amplify** | Tous | ✅ | Pay-as-you-go | ❌ |
| **Coolify** | Tous | ✅ | Self-hosted gratuit | ✅ |

> **Recommandation ESN** : Vercel pour les projets React/Next.js (le standard). Docker pour les clients qui exigent du on-premise ou un cloud spécifique. Coolify est une alternative self-hosted qui simplifie le déploiement Docker.

> **Comparaison frameworks** : Angular est traditionnellement déployé sur Firebase Hosting ou des CDN statiques (sans SSR). Vue utilise souvent Netlify. Next.js sur Vercel est la combinaison la plus intégrée (SSR, ISR, Edge Functions, Analytics intégrés).

### 6. Checklist déploiement production

| Etape | Vérifié |
|-------|---------|
| Variables d'environnement configurées | [ ] |
| `output: "standalone"` si Docker | [ ] |
| Build réussi (`pnpm build`) | [ ] |
| Tests passent en CI | [ ] |
| Headers de sécurité (CSP, X-Frame-Options) | [ ] |
| HTTPS activé | [ ] |
| Domaine configuré (DNS) | [ ] |
| Monitoring (Sentry, Vercel Analytics) | [ ] |
| `.env` non versionné | [ ] |
| Preview deployments fonctionnels | [ ] |

---

## Pratique

### Exercice : déployer sur Vercel et configurer Docker

1. Déployez votre projet sur Vercel :
   - Créez un compte sur vercel.com
   - Connectez votre repo GitHub
   - Configurez les variables d'environnement
   - Vérifiez que le preview deployment fonctionne sur une PR

2. Créez un `Dockerfile` multi-stage et un `docker-compose.yml` pour votre projet :
   - Mode `standalone`
   - Utilisateur non-root
   - Nginx en reverse proxy

<details>
<summary>Voir la solution</summary>

**Partie 1 — Vercel :**

```bash
# 1. Installer le CLI
npm i -g vercel

# 2. Lier le projet
vercel

# 3. Configurer les variables dans le dashboard
# Settings → Environment Variables → ajouter chaque variable

# 4. Pousser une branche et créer une PR
git checkout -b feature/test-preview
git commit --allow-empty -m "test: preview deployment"
git push -u origin feature/test-preview
# Créer la PR sur GitHub → Vercel déploie automatiquement
```

**Partie 2 — Docker :**

Les fichiers `Dockerfile`, `docker-compose.yml` et `nginx.conf` sont présentés en section 2 de ce cours. Ajoutez :

```tsx
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

```bash
# Tester en local
docker compose up --build

# Vérifier
curl http://localhost
```

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| Vercel | Zero config pour Next.js, preview deployments automatiques |
| `output: "standalone"` | Build autonome pour Docker (pas de node_modules) |
| Dockerfile multi-stage | deps → build → runner (image finale ~150MB) |
| Nginx | Reverse proxy, SSL, cache des assets statiques |
| Variables d'env | Dashboard Vercel ou `--env-file` Docker, jamais versionnées |
| Preview deployments | URL unique par PR pour tester avant merge |
| Recommandation ESN | Vercel par défaut, Docker si self-hosted exigé |

> **Prochain cours** : [Cours 42 — Patterns ESN et architecture projet](../12-recettes-esn/01-patterns-esn.md)
