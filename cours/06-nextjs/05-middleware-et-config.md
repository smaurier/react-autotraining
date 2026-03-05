# Cours 28 — Middleware et configuration Next.js

> **Objectif** : intercepter les requêtes avec `middleware.ts`, configurer les paths matchés, comprendre les cas d'usage courants (auth, i18n, rate limiting), et maîtriser `next.config.ts` (images, redirects, rewrites, variables d'environnement).

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre un Route Handler et une Server Action ?</summary>

Un **Route Handler** (`app/api/.../route.ts`) est un endpoint REST classique (GET, POST, PUT, DELETE) accessible par n'importe quel client HTTP. Une **Server Action** (`'use server'`) est une fonction serveur appelée directement depuis un formulaire (`action={...}`) ou un composant client, sans passer par un endpoint API explicite.
</details>

<details>
<summary>2. Pourquoi `useFormStatus` doit-il être dans un composant enfant du form ?</summary>

`useFormStatus` lit le statut du `<form>` parent le plus proche dans l'arbre React. Si on l'utilise dans le même composant que le `<form>`, il ne trouve pas de form parent et ne fonctionne pas. Il faut l'extraire dans un composant enfant (ex. `<SubmitButton />`).
</details>

<details>
<summary>3. Comment revalider le cache après une Server Action ?</summary>

On utilise `revalidatePath("/chemin")` pour invalider le cache d'une page spécifique, ou `revalidateTag("tag")` pour invalider tous les `fetch` associés à un tag donné.
</details>

---

## Analogie

Le **middleware** Next.js est comme un **contrôle de sécurité à l'aéroport**. Avant que les passagers (requêtes) n'atteignent leur destination (page ou API), ils passent par un point de contrôle unique. Ce contrôle peut :
- Vérifier le passeport (authentification)
- Rediriger vers le bon terminal (i18n, routing conditionnel)
- Refuser l'accès (rate limiting, géo-restriction)
- Modifier le billet (réécrire l'URL)

Le fichier `next.config.ts` est le **règlement intérieur de l'aéroport** : il définit les règles globales (domaines d'images autorisés, redirections permanentes, variables d'environnement).

---

## Théorie

### Middleware : intercepter les requêtes

Le middleware s'exécute **avant** chaque requête qui matche. Il est défini dans un seul fichier à la racine du projet.

```tsx
// src/middleware.ts (ou middleware.ts à la racine)
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  console.log("Requête vers :", request.nextUrl.pathname);

  // Continuer normalement
  return NextResponse.next();
}
```

> **Emplacement** : `src/middleware.ts` si tu utilises `src/`, sinon `middleware.ts` à la racine. Il n'y a qu'**un seul** fichier middleware par projet.

### Matcher : filtrer les chemins

Par défaut, le middleware s'exécute sur **toutes les requêtes** (y compris `_next/static`, images, favicon...). Utilise `matcher` pour cibler les routes :

```tsx
// src/middleware.ts
export const config = {
  matcher: [
    // Toutes les routes sauf les fichiers statiques et les assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

Exemples de matchers :

```tsx
export const config = {
  matcher: [
    "/dashboard/:path*",    // /dashboard et toutes ses sous-routes
    "/api/:path*",           // Toutes les routes API
    "/admin",                // Seulement /admin (pas /admin/users)
  ],
};
```

### Cas d'usage 1 : redirection d'authentification

```tsx
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/settings", "/profile"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("session")?.value;

  // Vérifier si le chemin est protégé
  const isProtected = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtected && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si déjà connecté et sur /login, rediriger vers /dashboard
  if (pathname === "/login" && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/profile/:path*", "/login"],
};
```

### Cas d'usage 2 : internationalisation (i18n)

```tsx
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const locales = ["fr", "en", "de"];
const defaultLocale = "fr";

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") ?? "";

  for (const locale of locales) {
    if (acceptLanguage.includes(locale)) {
      return locale;
    }
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérifier si le chemin contient déjà une locale
  const hasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  // Rediriger vers la locale détectée
  const locale = getLocale(request);
  return NextResponse.redirect(
    new URL(`/${locale}${pathname}`, request.url)
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

### Cas d'usage 3 : rate limiting basique

```tsx
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function middleware(request: NextRequest) {
  // Uniquement sur les routes API
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxRequests = 100;

  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return NextResponse.next();
  }

  if (entry.count >= maxRequests) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429 }
    );
  }

  entry.count++;
  return NextResponse.next();
}
```

> **Note** : en production, utilise une solution comme Upstash Redis pour un rate limiting distribué. Le `Map` en mémoire ne fonctionne qu'en développement.

### Ajouter des headers

```tsx
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Headers de sécurité
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}
```

### next.config.ts : configuration globale

```tsx
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Domaines d'images autorisés
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  // Redirections permanentes (301)
  async redirects() {
    return [
      {
        source: "/ancien-blog/:slug",
        destination: "/blog/:slug",
        permanent: true,
      },
    ];
  },

  // Rewrites (proxy sans changement d'URL)
  async rewrites() {
    return [
      {
        source: "/api/external/:path*",
        destination: "https://api.externe.com/:path*",
      },
    ];
  },

  // Headers personnalisés
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Variables d'environnement

```bash
# .env.local (ignoré par git)
DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
API_SECRET_KEY="super-secret-key"

# Accessible côté CLIENT (préfixe NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL="https://api.example.com"
NEXT_PUBLIC_SITE_NAME="Mon App"
```

```tsx
// ❌ MAUVAIS : accéder à une variable serveur côté client
"use client";
const dbUrl = process.env.DATABASE_URL; // undefined côté client !

// ✅ BON : variables NEXT_PUBLIC_ côté client
"use client";
const apiUrl = process.env.NEXT_PUBLIC_API_URL; // OK

// ✅ BON : toutes les variables côté serveur
// Server Component ou Server Action
const dbUrl = process.env.DATABASE_URL; // OK
const secret = process.env.API_SECRET_KEY; // OK
```

> **Règle** : seules les variables préfixées `NEXT_PUBLIC_` sont injectées dans le bundle client. Les autres restent uniquement côté serveur.

### Comparaison avec Vue / Angular

| Concept | Next.js 15 | Nuxt 3 | Angular 19+ |
|---|---|---|---|
| Middleware | `middleware.ts` (Edge Runtime) | `middleware/` (dossier) | `HttpInterceptor` |
| Scope | Par requête HTTP | Par navigation | Par requête HTTP client |
| Auth redirect | `NextResponse.redirect` | `navigateTo` | `CanActivate` guard |
| Config | `next.config.ts` | `nuxt.config.ts` | `angular.json` |
| Env publiques | `NEXT_PUBLIC_*` | `NUXT_PUBLIC_*` | `environment.ts` |
| Env privées | `process.env.*` | `process.env.*` | Pas de support natif front |
| Rewrites | `next.config.ts` rewrites | `nitro.routeRules` | `proxy` dans `angular.json` |

---

## Pratique

### Exercice : middleware d'authentification + configuration

**Objectif** : mettre en place un système de protection de routes avec middleware.

1. Crée un middleware qui :
   - Protège `/dashboard` et `/settings` (redirige vers `/login` si pas de cookie `session`)
   - Ajoute un header `X-Request-Id` (UUID) à chaque réponse
   - Log le chemin et la méthode de chaque requête
2. Configure `next.config.ts` avec :
   - Une redirection `/home` vers `/`
   - Un domaine d'images autorisé (`images.unsplash.com`)
   - Un rewrite `/api/proxy/:path*` vers `https://jsonplaceholder.typicode.com/:path*`
3. Crée un fichier `.env.local` avec une variable publique et une privée

<details>
<summary>Solution</summary>

```tsx
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname, method } = request.nextUrl;
  const requestId = crypto.randomUUID();

  // Log
  console.log(`[${method}] ${pathname} — ${requestId}`);

  // Vérification auth
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const session = request.cookies.get("session")?.value;

  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("X-Request-Id", requestId);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

```tsx
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "https://jsonplaceholder.typicode.com/:path*",
      },
    ];
  },
};

export default nextConfig;
```

```bash
# .env.local
DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
NEXT_PUBLIC_APP_NAME="TaskFlow"
```

</details>

---

## Résumé

| Concept | À retenir |
|---|---|
| `middleware.ts` | Fichier unique, s'exécute avant chaque requête matchée |
| `matcher` | Filtre les chemins ciblés par le middleware |
| Auth middleware | Vérifie les cookies, redirige avec `NextResponse.redirect` |
| `next.config.ts` | Images, redirects, rewrites, headers |
| `NEXT_PUBLIC_*` | Seules variables accessibles côté client |
| Env privées | Accessibles uniquement dans Server Components, Actions, Route Handlers |

---

> **Prochain cours** : [Tests unitaires avec Vitest](../07-tests/01-tests-unitaires-vitest.md) — tester les fonctions, hooks et composants React avec Vitest.
