# Lab 28 — Middleware & config Next.js (admin TribuZen)

> **Outcome :** à la fin, tu sais écrire de zéro un middleware d'accès (matcher, redirection basée cookie, header de sécurité), configurer `next.config.ts` (images distantes, redirect, rewrite), et — surtout — re-vérifier l'autorisation dans une DAL côté page/action : **défense en profondeur**.
> **Vrai outil :** Next.js 15 (App Router) + React 19. Serveur réel (`next dev`), pas de harnais simulé.
> **Feedback :** le coach valide en session (pas de test-runner auto-correcteur).

> ⚠️ **Message central du lab :** le middleware **n'est pas** la couche d'autorisation. Il redirige (UX), il ne protège pas. Un contournement du matcher (cf. CVE middleware Next.js début 2025) laisserait la page nue si elle ne se protégeait pas elle-même. La **vraie** vérification vit dans une DAL (`requireAdmin()`) appelée par chaque page et Server Action. Le middleware est la première ligne, pas la seule.

## Pré-requis

Une app Next.js 15 App Router + TypeScript :

```bash
npx create-next-app@latest tribuzen-admin --typescript --app --eslint
cd tribuzen-admin
npm run dev
```

## Énoncé

1. **`middleware.ts`** : tout `/admin/*` sans cookie `tz_session` → redirige `/login?from=<url>`. Un utilisateur déjà connecté qui visite `/login` → redirige `/admin`. Ajoute un header de sécurité (`x-content-type-options: nosniff`) sur les réponses. Un `matcher` qui **exclut** les assets (`_next`, images, favicon).
2. **`next.config.ts`** : `images.remotePatterns` pour `avatars.tribuzen.app`, un `redirects()` (`/dashboard` → `/admin`), un `rewrite()` (`/api/legacy/:path*` → l'ancien backend).
3. **DAL** (`app/admin/_lib/dal.ts`) : `requireAdmin()` qui lit la session et **throw/redirect** si pas admin — appelée par `app/admin/familles/page.tsx`. C'est la preuve de la défense en profondeur.

**Contrainte (le cœur du lab) :** tu dois montrer que retirer le middleware **ne suffit pas** à accéder à `/admin/familles` en tant que non-admin, parce que la page appelle `requireAdmin()`.

## Étapes (en friction)

1. Écris `middleware.ts` avec le `config.matcher`. Teste `/admin` sans cookie → redirection `/login?from=/admin`.
2. Pose un cookie `tz_session` (DevTools → Application → Cookies) et recharge : accès autorisé. Visite `/login` connecté → redirigé vers `/admin`.
3. Écris `next.config.ts`. Ajoute une `<Image src="https://avatars.tribuzen.app/u1.png" />` : sans `remotePatterns`, Next refuse (erreur explicite) ; ajoute le pattern → OK.
4. Écris `requireAdmin()` dans la DAL, appelle-la en tête de `page.tsx`.
5. **Preuve défense en profondeur** : commente le `config.matcher` pour que le middleware ne couvre plus `/admin`. Accède à `/admin/familles` avec une session `member` → la **page** refuse quand même (grâce à `requireAdmin`). Décommente ensuite.
6. Explique au coach : pourquoi le middleware ne peut PAS être ta seule barrière (edge runtime limité, pas d'accès BDD complet, matcher contournable) ?

## Corrigé complet commenté

```ts
// middleware.ts (racine du projet)
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('tz_session');

  // 1. zone admin sans session → login, en mémorisant la cible
  if (pathname.startsWith('/admin') && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // 2. déjà connecté et sur /login → admin
  if (pathname === '/login' && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 3. header de sécurité sur les autres réponses
  const res = NextResponse.next();
  res.headers.set('x-content-type-options', 'nosniff');
  return res;
}

export const config = {
  // exclut assets statiques et images : le middleware ne tourne que sur les pages
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg)).*)'],
};
```

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.tribuzen.app' },
    ],
  },
  async redirects() {
    return [{ source: '/dashboard', destination: '/admin', permanent: true }];
  },
  async rewrites() {
    return [
      { source: '/api/legacy/:path*', destination: 'https://old.tribuzen.app/:path*' },
    ];
  },
};

export default nextConfig;
```

```ts
// app/admin/_lib/dal.ts — la VRAIE autorisation (défense en profondeur)
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth'; // même faux auth qu'au lab 27

export async function requireAdmin() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'admin') redirect('/login?error=forbidden');
  return session;
}
```

```tsx
// app/admin/familles/page.tsx — la page se protège ELLE-MÊME
import { requireAdmin } from '../_lib/dal';

export default async function FamillesPage() {
  // même si le middleware est contourné, cette ligne bloque un non-admin
  await requireAdmin();
  return <h1>Familles</h1>;
}
```

```ts
// lib/auth.ts (rappel du lab 27, pour tester le refus)
export interface Session { user: { id: string; role: 'admin' | 'member' } }
export async function auth(): Promise<Session | null> {
  return { user: { id: 'u1', role: 'admin' } }; // bascule en 'member' pour tester
}
```

**Ce que tu dois pouvoir expliquer au coach :**
- Pourquoi le `matcher` exclut `_next`/images : le middleware ne doit pas tourner sur chaque asset (coût + inutile).
- Pourquoi `NEXT_PUBLIC_` change tout : une variable préfixée est **inlinée dans le bundle client** (visible par tous) ; un secret (`SESSION_SECRET`) reste sans préfixe, côté serveur uniquement.
- Pourquoi la page appelle `requireAdmin()` **alors que** le middleware protège déjà `/admin` : le middleware peut être contourné (matcher, edge), il n'a pas toujours accès à la BDD ; la page/DAL est l'autorité finale.

## Variante J+30 (fading)

Reprends **sans le corrigé**, en 25 minutes :
1. Ajoute au middleware un en-tête `Content-Security-Policy` minimal + un nonce par requête (via `crypto.randomUUID()`), et explique pourquoi le CSP se pose bien au niveau middleware.
2. Ajoute une variable `NEXT_PUBLIC_API_URL` (`.env.local`) et une `lib/api.ts` qui l'utilise côté serveur ET client ; prouve (via `console.log` build client) qu'un secret **non** préfixé n'apparaît pas dans le bundle.

## Application TribuZen

Porte dans `smaurier/tribuzen` :
- `middleware.ts` : redirection `/admin/*` → `/login?from=` sur absence de `tz_session`, header sécurité, matcher excluant les assets.
- `next.config.ts` : `remotePatterns` pour `avatars.tribuzen.app` (avatars familles) + fallback généré.
- `app/admin/_lib/dal.ts` : `requireAdmin()` appelée par chaque page admin et **chaque Server Action** (lab 27) — autorisation réelle.
- `.env.local` : `NEXT_PUBLIC_API_URL` (public) vs `DATABASE_URL`/`SESSION_SECRET` (serveur, sans préfixe).
- Commit : `feat(admin): middleware d'acces + config images + DAL requireAdmin (defense en profondeur)`.
```
