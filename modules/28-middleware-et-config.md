---
titre: Middleware et configuration Next.js
cours: 04-react
notions: [middleware.ts, matcher config, NextResponse.redirect/rewrite/next, lecture et écriture cookies et headers, limites edge runtime, next.config images redirects rewrites headers, variables d'environnement NEXT_PUBLIC vs serveur, défense en profondeur autorisation]
outcomes: [intercepter les requêtes avec un middleware ciblé par matcher, rediriger et réécrire une requête selon un cookie de session, configurer images redirects et variables d'environnement dans next.config]
prerequis: [27-api-routes-et-server-actions]
next: 29-tests-composants-rtl
libs: [{ name: react, version: "^19" }, { name: next, version: "^15" }]
tribuzen: middleware admin qui redirige /admin/* vers /login sans cookie de session, config images pour avatars, env NEXT_PUBLIC_API_URL
last-reviewed: 2026-07
---

# Middleware et configuration Next.js

> **Outcomes — tu sauras FAIRE :** intercepter les requêtes avec un middleware ciblé par `matcher`, rediriger/réécrire selon un cookie de session, configurer images, redirects et variables d'environnement dans `next.config`.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu construis l'admin web TribuZen en Next.js 15 (App Router). Toutes les pages sous `/admin` (liste des familles, modération, réglages) ne doivent être visibles que par un utilisateur connecté. Aujourd'hui chaque page fait sa propre vérification :

```tsx
// app/admin/families/page.tsx — AVANT
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function FamiliesPage() {
  const session = (await cookies()).get('tz_session')?.value;
  if (!session) redirect('/login'); // dupliqué dans CHAQUE page admin
  // ...
}
```

**Trois problèmes :**
1. La ligne de garde est copiée-collée dans les 12 pages de `/admin` — si tu oublies une page, elle fuit.
2. La redirection se décide *après* que le rendu de la page a commencé (gaspillage).
3. Aucun point unique pour ajouter du log ou un header de sécurité.

Il te faut **un seul point de contrôle** exécuté avant toute page `/admin`. C'est exactement le rôle du middleware. Mais attention (on y revient en §4) : le middleware gère l'**UX de redirection**, il ne remplace pas la vraie autorisation.

---

## 2. Théorie complète, concise

### 2.1 `middleware.ts` — un point de contrôle unique

Le middleware s'exécute **avant** chaque requête qui matche, sur le **edge runtime**. Un seul fichier par projet, à la racine (ou dans `src/`).

```ts
// middleware.ts (racine)  — ou src/middleware.ts si tu utilises src/
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('→', request.nextUrl.pathname);
  return NextResponse.next(); // laisse passer
}
```

> **Nommage.** Next.js 16 renomme `middleware` en `proxy` (fichier `proxy.ts`, fonction `proxy`). En Next.js 15 le nom canonique reste `middleware`. Le comportement décrit ici est identique.

### 2.2 `matcher` — cibler les chemins

Par défaut le middleware tourne sur **toutes** les requêtes (y compris assets, favicon). On restreint avec `config.matcher` :

```ts
export const config = {
  // n'exécute que sur /admin et ses sous-routes
  matcher: ['/admin/:path*'],
};
```

Syntaxes utiles :

```ts
export const config = {
  matcher: [
    '/admin/:path*', // /admin + tout ce qui suit
    '/login',        // exactement /login
    // tout SAUF assets, images optimisées, favicon et /api :
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

Le `matcher` est analysé **à la compilation** : il doit être statique (pas de valeur calculée à l'exécution).

### 2.3 Les trois retours : `next`, `redirect`, `rewrite`

```ts
import { NextResponse } from 'next/server';

// 1. Laisser passer (éventuellement en modifiant la réponse)
return NextResponse.next();

// 2. Rediriger — CHANGE l'URL dans le navigateur (3xx)
return NextResponse.redirect(new URL('/login', request.url));

// 3. Réécrire — garde l'URL affichée, sert un autre contenu en interne
return NextResponse.rewrite(new URL('/maintenance', request.url));
```

- `redirect` : l'URL de la barre d'adresse change. Pour envoyer un non-connecté vers `/login`.
- `rewrite` : l'URL affichée reste identique, mais Next sert une autre route. Pour de l'A/B testing, de l'i18n, une page de maintenance.
- `next` : continue la chaîne normale.

Toujours construire l'URL avec `new URL(path, request.url)` pour conserver l'origine (protocole + host).

### 2.4 Lire cookies et headers

`NextRequest` expose une API dédiée aux cookies + les headers Web standard :

```ts
export function middleware(request: NextRequest) {
  // Cookies
  const session = request.cookies.get('tz_session')?.value; // string | undefined
  const all = request.cookies.getAll();
  const has = request.cookies.has('tz_session'); // boolean

  // Headers (Web Headers API)
  const lang = request.headers.get('accept-language') ?? '';
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  return NextResponse.next();
}
```

### 2.5 Écrire cookies et headers sur la réponse

On modifie la **réponse** (pas la requête). Pour poser un header ou un cookie tout en laissant passer :

```ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Header de sécurité sur toutes les réponses matchées
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Cookie posé par le serveur
  response.cookies.set('tz_last_seen', Date.now().toString(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
```

> Si tu rediriges, pense à poser tes headers/cookies sur l'objet `redirect`, pas sur un `next()` que tu ne renvoies pas :
> ```ts
> const res = NextResponse.redirect(new URL('/login', request.url));
> res.cookies.set('tz_from', request.nextUrl.pathname);
> return res;
> ```

### 2.6 Limites du edge runtime

Le middleware ne tourne **pas** dans Node.js mais sur un runtime edge léger. Conséquences :

- Pas de modules Node natifs (`fs`, `net`, `child_process`…).
- Pas de driver DB TCP classique (Postgres via `pg`) : tu ne peux **pas** requêter la base directement dans le middleware.
- API disponibles : `fetch`, Web Crypto (`crypto.randomUUID()`, `crypto.subtle`), `URL`, `Headers`, cookies.
- Doit rester **rapide** : il s'exécute sur *chaque* requête matchée. Pas de gros calcul.

C'est une des raisons pour lesquelles le middleware ne fait que lire un cookie et rediriger — la vérification lourde (session valide en base, rôles) se fait plus loin, côté Node.

### 2.7 `next.config` — configuration globale

Fichier `next.config.ts` à la racine, typé via `NextConfig` :

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Domaines autorisés pour next/image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.tribuzen.app',
        pathname: '/uploads/**',
      },
    ],
  },

  // Redirections gérées par le serveur (avant même le middleware)
  async redirects() {
    return [
      { source: '/accueil', destination: '/', permanent: true }, // 308
    ];
  },

  // Rewrites : proxy sans changer l'URL affichée
  async rewrites() {
    return [
      { source: '/api/proxy/:path*', destination: 'https://api.tribuzen.app/:path*' },
    ];
  },

  // Headers globaux
  async headers() {
    return [
      { source: '/(.*)', headers: [{ key: 'X-DNS-Prefetch-Control', value: 'on' }] },
    ];
  },
};

export default nextConfig;
```

- `images.remotePatterns` : `next/image` **refuse** tout host non listé (sécurité). Chaque source d'avatars/photos doit y figurer.
- `redirects()` : `permanent: true` = 308 (301-like, mis en cache), `false` = 307.
- `rewrites()` vs middleware `rewrite` : le config est statique et global ; le middleware est dynamique (dépend du cookie, de l'heure…).

### 2.8 Variables d'environnement : `NEXT_PUBLIC_` vs serveur

```bash
# .env.local  (ignoré par git)
DATABASE_URL="postgresql://user:pass@localhost:5432/tribuzen"  # SERVEUR uniquement
SESSION_SECRET="valeur-secrete"                                # SERVEUR uniquement
NEXT_PUBLIC_API_URL="https://api.tribuzen.app"                 # exposée au CLIENT
```

**Règle unique :** seules les variables préfixées `NEXT_PUBLIC_` sont inlinées dans le bundle client au build. Les autres n'existent **que** côté serveur (Server Components, Server Actions, Route Handlers, middleware).

```tsx
'use client';
// ❌ undefined côté client — jamais envoyée au navigateur
const db = process.env.DATABASE_URL;
// ✅ disponible côté client
const api = process.env.NEXT_PUBLIC_API_URL;
```

Corollaire sécurité : ne **jamais** préfixer un secret par `NEXT_PUBLIC_` — il finirait lisible dans le JS téléchargé par tout visiteur.

---

## 3. Worked examples

### Exemple 1 — Middleware d'auth pour l'admin TribuZen (résolution du cas concret)

Objectif : protéger tout `/admin/*`. Sans cookie `tz_session` → redirection vers `/login` en mémorisant la page demandée. Si déjà connecté et on arrive sur `/login` → renvoi vers `/admin`.

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('tz_session')?.value;

  const isAdmin = pathname.startsWith('/admin');

  // 1. Zone admin sans session → login, en gardant la destination
  if (isAdmin && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname); // pour re-router après connexion
    return NextResponse.redirect(loginUrl);
  }

  // 2. Déjà connecté mais sur /login → direct à l'admin
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // 3. Cas normal : on laisse passer + header de sécurité
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}

export const config = {
  // n'exécute que là où c'est utile
  matcher: ['/admin/:path*', '/login'],
};
```

**Ce que ça règle :** un seul fichier garde les 12 pages `/admin`, la décision est prise *avant* tout rendu, et on a un point unique pour les headers. **Ce que ça NE règle PAS :** la présence du cookie ≠ session valide. Voir §4 piège #1.

### Exemple 2 — `next.config.ts` complet pour l'admin

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // avatars uploadés par les familles
      { protocol: 'https', hostname: 'avatars.tribuzen.app', pathname: '/uploads/**' },
      // fallback avatars générés
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },

  async redirects() {
    return [
      // ancienne URL de l'admin
      { source: '/dashboard/:path*', destination: '/admin/:path*', permanent: true },
    ];
  },

  async rewrites() {
    return [
      // le front appelle /api/proxy/*, servi par l'API interne sans exposer son host
      { source: '/api/proxy/:path*', destination: 'https://api.tribuzen.app/:path*' },
    ];
  },
};

export default nextConfig;
```

```tsx
// app/admin/families/_components/MemberAvatar.tsx
import Image from 'next/image';

// hostname doit figurer dans remotePatterns, sinon next/image lève une erreur
export function MemberAvatar({ src, name }: { src: string; name: string }) {
  return <Image src={src} alt={name} width={40} height={40} className="avatar" />;
}
```

```tsx
// app/admin/_lib/api.ts — usage de la variable publique
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchFamilies() {
  const res = await fetch(`${API_URL}/families`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Chargement des familles impossible');
  return res.json();
}
```

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que le middleware suffit pour autoriser (le plus grave)

Le middleware ne fait ici que vérifier la **présence** d'un cookie et rediriger. Il n'a **pas** validé que la session est réelle, non expirée, et que l'utilisateur a le rôle admin.

```ts
// ❌ FAUX sens de sécurité : "il y a un cookie donc c'est bon"
if (request.cookies.get('tz_session')) return NextResponse.next();
// Un cookie tz_session=n'importe_quoi passe la garde.
```

La **vraie autorisation** doit être re-vérifiée à la source des données — dans la Server Action, le Route Handler ou la couche d'accès aux données (DAL) — là où l'on peut valider le token en base :

```ts
// app/admin/_lib/dal.ts — appelé par chaque page/action admin
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function requireAdmin() {
  const token = (await cookies()).get('tz_session')?.value;
  const user = token ? await verifySession(token) : null; // vérif RÉELLE en base
  if (!user || user.role !== 'admin') redirect('/login');
  return user;
}
```

**Défense en profondeur :** middleware = UX (rediriger tôt, éviter le flash de page), DAL/Server Action = sécurité (la décision qui compte). Ne jamais se reposer uniquement sur le middleware.

> **Rappel CVE-2025-29927.** Une faille Next.js a permis de **contourner entièrement le middleware** en forgeant l'en-tête interne `x-middleware-subrequest`. Toute app qui plaçait sa seule barrière d'auth dans le middleware était exposée. Leçon durable : le middleware n'est pas une frontière de sécurité — l'autorisation vit près des données. Garde Next.js à jour.

### PIÈGE #2 — Requêter la base de données dans le middleware

```ts
// ❌ Ne compile pas / plante : driver Node interdit sur edge runtime
import { pool } from '@/db';
export async function middleware(req: NextRequest) {
  const user = await pool.query('SELECT ...'); // 💥 pas de TCP Node sur l'edge
}
```

Le middleware tourne sur le edge runtime : pas de `pg`, `fs`, `net`. Il lit un cookie et redirige, point. La vérification en base se fait côté Node (DAL, Route Handler), ou via un `fetch` vers une API compatible edge.

### PIÈGE #3 — `matcher` dynamique

```ts
// ❌ Ignoré : le matcher est lu à la compilation, pas à l'exécution
const paths = getProtectedPaths(); // valeur runtime
export const config = { matcher: paths };

// ✅ Statique
export const config = { matcher: ['/admin/:path*', '/login'] };
```

Le filtrage fin dynamique se fait *dans* la fonction `middleware` (via `pathname.startsWith(...)`), pas dans `config.matcher`.

### PIÈGE #4 — Confondre `redirect` et `rewrite`

```ts
// redirect : l'URL du navigateur DEVIENT /login (3xx visible)
return NextResponse.redirect(new URL('/login', request.url));

// rewrite : l'URL affichée reste /admin/families, contenu servi depuis /maintenance
return NextResponse.rewrite(new URL('/maintenance', request.url));
```

Pour une auth, on veut `redirect` (l'utilisateur doit voir `/login`). `rewrite` sert quand l'URL doit rester stable (maintenance, i18n, A/B).

### PIÈGE #5 — Exposer un secret via `NEXT_PUBLIC_`

```bash
# ❌ Ce secret finit lisible dans le bundle JS de TOUT visiteur
NEXT_PUBLIC_SESSION_SECRET="valeur-secrete"

# ✅ Un secret n'a jamais le préfixe public
SESSION_SECRET="valeur-secrete"
```

`NEXT_PUBLIC_` = « je consens à ce que ce soit public ». Réserve-le aux URLs d'API publiques, clés publiques analytics, etc.

---

## 5. Ancrage TribuZen

L'admin web TribuZen (Next.js 15, App Router) s'appuie sur ce module pour trois briques.

**Middleware d'accès** (`middleware.ts`) — redirige tout `/admin/*` vers `/login` en l'absence du cookie `tz_session`, mémorise la page demandée dans `?from=`, et renvoie un connecté depuis `/login` vers `/admin`. C'est l'Exemple 1. La **vraie** vérification de session/rôle vit dans `app/admin/_lib/dal.ts` (`requireAdmin()`), appelée par chaque page et Server Action — défense en profondeur.

**Config images** (`next.config.ts`) — `images.remotePatterns` autorise `avatars.tribuzen.app` (avatars uploadés par les familles) et le fallback généré. Sans ça, `next/image` refuse d'afficher les avatars membres.

**Variable d'environnement** (`NEXT_PUBLIC_API_URL`) — l'URL de l'API TribuZen, consommée côté client et serveur pour charger familles et membres. Les secrets (`DATABASE_URL`, `SESSION_SECRET`) restent sans préfixe, invisibles au navigateur.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen-admin/
  middleware.ts
  next.config.ts
  .env.local                       # NEXT_PUBLIC_API_URL + secrets serveur
  app/
    login/page.tsx
    admin/
      _lib/
        dal.ts                     # requireAdmin() — autorisation réelle
        api.ts                     # fetch via NEXT_PUBLIC_API_URL
      families/page.tsx
```

---

## 6. Points clés

1. `middleware.ts` : un seul fichier, exécuté avant chaque requête matchée, sur le **edge runtime** (pas de Node natif, pas de DB directe).
2. `config.matcher` cible les chemins ; il est **statique** (lu à la compilation) — le filtrage dynamique se fait dans la fonction.
3. Trois retours : `NextResponse.next()` (laisser passer), `.redirect()` (change l'URL, pour l'auth), `.rewrite()` (garde l'URL, sert autre chose).
4. Lecture via `request.cookies.get()` / `request.headers.get()` ; écriture sur la **réponse** (`response.cookies.set()` / `response.headers.set()`).
5. Le middleware ≠ frontière de sécurité : il gère l'UX de redirection ; la **vraie autorisation** vit dans la Server Action / Route Handler / DAL (défense en profondeur, cf. CVE-2025-29927).
6. `next.config` : `images.remotePatterns` (hosts autorisés pour `next/image`), `redirects()`/`rewrites()` statiques, `headers()` globaux.
7. Seules les variables `NEXT_PUBLIC_` sont exposées au client ; les secrets restent sans préfixe, côté serveur uniquement.

---

## 7. Seeds Anki

```
Où se place le fichier middleware et sur quel runtime s'exécute-t-il ?|Un seul fichier middleware.ts à la racine (ou src/), exécuté avant chaque requête matchée sur le edge runtime — pas de modules Node natifs (fs, net), pas de driver DB TCP.
À quoi sert config.matcher et quelle est sa contrainte principale ?|Il restreint les chemins sur lesquels le middleware s'exécute (ex. ['/admin/:path*']). Il est statique, lu à la compilation — pas de valeur calculée à l'exécution. Le filtrage dynamique se fait dans la fonction middleware.
Différence entre NextResponse.redirect et NextResponse.rewrite ?|redirect change l'URL affichée dans le navigateur (3xx) — usage typique : envoyer vers /login. rewrite garde l'URL affichée mais sert un autre contenu en interne — usage : maintenance, i18n, A/B.
Comment lit-on un cookie de session dans le middleware, et où écrit-on un header ?|Lecture : request.cookies.get('nom')?.value. Écriture : sur la réponse — const res = NextResponse.next(); res.headers.set(...); res.cookies.set(...); return res.
Pourquoi le middleware ne suffit-il pas à autoriser l'accès à /admin ?|Il ne vérifie que la présence d'un cookie et redirige (UX). La vraie autorisation (session valide, rôle) doit être re-vérifiée près des données : Server Action, Route Handler ou DAL. Défense en profondeur — rappel CVE-2025-29927 (contournement du middleware via en-tête forgé).
Quelle variable d'environnement est accessible côté client dans Next.js, et laquelle ne l'est pas ?|Seules les variables préfixées NEXT_PUBLIC_ sont inlinées dans le bundle client (ex. NEXT_PUBLIC_API_URL). Les autres (DATABASE_URL, SESSION_SECRET) n'existent que côté serveur. Ne jamais préfixer un secret par NEXT_PUBLIC_.
À quoi sert images.remotePatterns dans next.config ?|À lister les hôtes autorisés pour next/image. Tout host non listé est refusé (sécurité). Chaque source d'avatars/photos distantes doit y figurer avec protocol, hostname et éventuellement pathname.
Différence entre un rewrite dans next.config et un rewrite dans le middleware ?|next.config rewrites() est statique et global (connu à la compilation). Le middleware rewrite est dynamique : il dépend du cookie, de l'heure, des headers de la requête.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-28-middleware-et-config/README.md`. Écrire de zéro le middleware d'auth admin TribuZen (matcher, redirection cookie, header sécurité) et le `next.config.ts` (images, redirect, rewrite), puis re-vérifier l'autorisation dans une DAL — défense en profondeur.
