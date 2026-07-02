# Lab 40 — Déploiement Next.js (Vercel + Docker standalone)

> **Outcome :** à la fin, tu sais préparer une app Next.js 15 pour la production — build de prod, `output: 'standalone'`, Dockerfile multi-stage, séparation stricte des variables build/runtime — et connaître la procédure de déploiement Vercel avec preview par PR.
> **Vrai outil :** Next.js 15 (`next build`, `next start`), Docker, CLI/Dashboard Vercel. Pas de harnais simulé.
> **Feedback :** le coach valide en session — build réel qui passe, conteneur qui répond, pas de test-runner auto-correcteur.

---

## Énoncé

Tu reprends l'admin TribuZen (Next.js 15, App Router). Le lead veut deux cibles de déploiement à partir du **même code** :

1. **Vercel** — cible par défaut, avec preview automatique par PR et variables d'env par environnement.
2. **Docker self-host** — pour un client qui impose son hébergement, via `output: 'standalone'`.

Ta mission : rendre le projet déployable sur les deux, en plaçant **correctement** chaque variable d'environnement (build vs runtime).

### Point de départ

Une app Next.js 15 minimale suffit :

```bash
pnpm create next-app@latest tribuzen-admin --ts --app --no-src-dir --use-pnpm
cd tribuzen-admin
```

Ajoute une route serveur qui lit un secret runtime et une page cliente qui lit une variable publique, pour **prouver** la séparation :

```txt
app/
  page.tsx                 ← page d'accueil (Static attendu)
  familles/page.tsx        ← lit cookies() → Dynamic attendu
  api/health/route.ts      ← lit process.env.DATABASE_URL (serveur, secret)
next.config.ts             ← à modifier (output standalone)
Dockerfile                 ← à écrire
.env.example               ← à écrire (committé)
.env.local                 ← à écrire (NON committé)
```

**Contraintes :**
- `DATABASE_URL` et `AUTH_SECRET` : secrets runtime, **jamais** de prefixe `NEXT_PUBLIC_`, jamais versionnés.
- `NEXT_PUBLIC_API_URL` : variable publique, inlinée au build, lisible côté client.
- Le Dockerfile doit être **multi-stage** et copier uniquement la sortie `standalone` + les assets statiques.
- **Pas de gap-fill** : tu écris `next.config.ts`, le `Dockerfile`, les `.env` complets.

---

## Étapes (en friction)

1. **Écris les deux routes de preuve.** `app/familles/page.tsx` appelle `cookies()` (force Dynamic). `app/api/health/route.ts` renvoie `{ ok: true, hasDb: Boolean(process.env.DATABASE_URL) }`. Une page cliente (`'use client'`) affiche `process.env.NEXT_PUBLIC_API_URL`.
2. **Lance `pnpm build`** et lis le tableau des routes : vérifie que `/` est `○` (Static) et `/familles` est `ƒ` (Dynamic). Explique-toi pourquoi.
3. **Active `output: 'standalone'`** dans `next.config.ts`. Rebuild, puis lance `node .next/standalone/server.js` et vérifie que ça répond sur `http://localhost:3000`.
4. **Écris `.env.example`** (committé, sans valeurs) et `.env.local` (réel, gitignoré). Vérifie que `.env*` est dans `.gitignore`.
5. **Écris le `Dockerfile`** multi-stage (deps → builder → runner), avec `NEXT_PUBLIC_API_URL` en `ARG`/`ENV` de build.
6. **Build et run l'image :** `NEXT_PUBLIC_API_URL` en `--build-arg`, les secrets en `--env-file`. `curl http://localhost:3000/api/health` doit renvoyer `hasDb: true`.
7. **Preuve du piège :** ouvre le bundle client (DevTools → Sources) et cherche la valeur `NEXT_PUBLIC_API_URL` : elle y est en clair. Cherche `DATABASE_URL` : absente. C'est le cœur du module.
8. **Procédure Vercel** (à décrire, pas besoin de compte payant) : connecter le repo, mapper les env par environnement, ouvrir une PR → preview.

---

## Corrigé complet commenté

```ts
// ─── next.config.ts ─────────────────────────────────────────────
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // standalone : build autoportant pour Docker (.next/standalone/server.js).
  // Inutile sur Vercel, mais sans effet néfaste — on peut le laisser.
  output: 'standalone',
};

export default nextConfig;
```

```tsx
// ─── app/familles/page.tsx ──────────────────────────────────────
import { cookies } from 'next/headers';

// L'appel à cookies() dépend de la requête → Next classe cette route Dynamic (ƒ).
// C'est voulu : la liste des familles dépend de la session de l'utilisateur.
export default async function FamillesPage() {
  const store = await cookies();          // Next 15 : cookies() est async
  const session = store.get('session')?.value ?? 'anonyme';
  return <p>Familles visibles pour la session : {session}</p>;
}
```

```ts
// ─── app/api/health/route.ts ────────────────────────────────────
import { NextResponse } from 'next/server';

// Route serveur (node runtime par défaut). process.env.DATABASE_URL est un
// secret runtime : lu côté serveur, JAMAIS envoyé au client.
export async function GET() {
  return NextResponse.json({
    ok: true,
    hasDb: Boolean(process.env.DATABASE_URL), // true si le secret est fourni au run
  });
}
```

```tsx
// ─── app/env-preview.tsx (Client Component) ─────────────────────
'use client';

// Seules les variables NEXT_PUBLIC_ existent côté client : elles sont
// inlinées EN DUR dans le bundle au moment du build.
export function EnvPreview() {
  return <p>API publique : {process.env.NEXT_PUBLIC_API_URL}</p>;
  // process.env.DATABASE_URL ici → undefined (et c'est sain)
}
```

```txt
# ─── .env.example (COMMITTÉ, sans valeurs réelles) ──────────────
DATABASE_URL=postgresql://user:password@host:5432/tribuzen
AUTH_SECRET=generer-avec-openssl-rand-base64-32
NEXT_PUBLIC_API_URL=https://api.tribuzen.app
```

```txt
# ─── .env.local (NON committé — vraies valeurs de dev) ──────────
DATABASE_URL=postgresql://dev:dev@localhost:5432/tribuzen
AUTH_SECRET=dev-secret-not-for-prod
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```txt
# ─── .gitignore (vérifier la présence de ces lignes) ────────────
.env
.env*.local
.env.production
```

```dockerfile
# ─── Dockerfile (multi-stage, cible self-host) ──────────────────
# Stage 1 : dépendances
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2 : build
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variable de BUILD : inlinée dans le bundle client → doit être présente ICI.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm build

# Stage 3 : runner (image finale minimale)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# On copie UNIQUEMENT la sortie standalone + public + assets statiques.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

```bash
# ─── Build + run ────────────────────────────────────────────────
# Le NEXT_PUBLIC_ est figé au BUILD → --build-arg
docker build -t tribuzen-admin \
  --build-arg NEXT_PUBLIC_API_URL=https://api.tribuzen.app \
  .

# Les SECRETS runtime → --env-file (jamais dans l'image)
docker run -p 3000:3000 --env-file .env.local tribuzen-admin

# Vérifications
curl http://localhost:3000/api/health   # {"ok":true,"hasDb":true}
curl http://localhost:3000/familles      # rendu serveur par requête
```

**Procédure Vercel (Git flow) :**

```txt
1. vercel.com → Import du repo GitHub → framework "Next.js" détecté
2. Settings → Environment Variables :
     DATABASE_URL        Production → prod     | Preview → staging
     AUTH_SECRET         All        → <secret>
     NEXT_PUBLIC_API_URL Production → https://api.tribuzen.app
                         Preview    → https://staging-api.tribuzen.app
3. git push origin main       → déploiement PRODUCTION
4. ouverture d'une PR          → PREVIEW deployment (URL commentée par le bot)
```

**Pourquoi ce corrigé est correct :**
- `DATABASE_URL`/`AUTH_SECRET` n'ont pas de prefixe `NEXT_PUBLIC_` → ils restent côté serveur, invisibles dans le bundle. `/api/health` confirme leur présence au runtime sans jamais les exposer.
- `NEXT_PUBLIC_API_URL` est fournie **au build** (`--build-arg` en Docker, valeur d'environnement sur Vercel) car elle est inlinée dans le JS client — la fournir seulement au `docker run` donnerait `undefined` côté navigateur.
- Le Dockerfile ne copie que `standalone` + `static` + `public` → image minimale, utilisateur non-root, lancée par `node server.js`.
- `/` reste Static et `/familles` devient Dynamic parce que cette dernière appelle `cookies()` : la classification est une conséquence du code, pas d'un réglage.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire, sans rouvrir ce corrigé ni le module, en 40 minutes :**

1. Ajoute un `middleware.ts` en **edge runtime** qui redirige vers `/login` si le cookie `session` est absent (sauf sur `/login` et `/api/*`).
2. Ajoute une route `app/api/geo/route.ts` en `export const runtime = 'edge'` qui renvoie la région (`request.headers.get('x-vercel-ip-country')`) — et explique pourquoi cette route peut être en edge alors que `/api/health` (si elle touchait vraiment une DB) devrait rester en node.
3. Ajoute un `.dockerignore` qui exclut `node_modules`, `.next`, `.env*` du contexte de build, et vérifie que l'image build toujours.
4. **Critère de réussite :** le middleware redirige un visiteur non authentifié, `/api/geo` répond, et `docker build` ignore bien les fichiers listés (contexte plus léger).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen-admin`, ce lab se matérialise ainsi :

```txt
tribuzen-admin/
  next.config.ts            # output: 'standalone' (cible Docker white-label)
  middleware.ts             # garde d'auth NextAuth, edge runtime
  app/
    familles/page.tsx       # Dynamic (session)
    api/health/route.ts     # health check, node runtime
  .env.example              # committé
  Dockerfile                # multi-stage self-host
  .github/workflows/ci.yml  # lint + test + build (--frozen-lockfile)
  vercel.json               # regions: ["cdg1"]
```

**Différences par rapport au lab :**
- Les env réelles vivent dans le **dashboard Vercel** (par environnement) et dans le vault du client pour la cible self-host — pas dans un `.env.local` de dev.
- `middleware.ts` s'appuie sur la session NextAuth du module 39 (pas un simple cookie brut).
- La CI ajoute typecheck + tests avant le build ; le déploiement prod est délégué à Vercel sur push `main`.

**Commit cible :**
```txt
chore(deploy): output standalone + Dockerfile multi-stage self-host
chore(env): .env.example + séparation build/runtime (NEXT_PUBLIC_ vs secrets)
ci: lint + test + build sur PR et main
```
