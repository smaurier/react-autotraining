# Cours 24 — Next.js : fondamentaux et App Router

> **Objectif** : comprendre pourquoi React a besoin d'un framework de production comme Next.js, installer un projet Next.js 15 avec App Router, et maîtriser les conventions de fichiers qui remplacent la configuration manuelle du routing.

---

<details>
<summary>Rappel du cours précédent</summary>

1. **Quelle est la différence entre un formulaire "controlled" et "uncontrolled" en React ?**
   Un formulaire controlled lie chaque champ à un state React (`value` + `onChange`). Un formulaire uncontrolled utilise `useRef` ou `FormData` pour lire les valeurs au moment de la soumission, sans synchronisation continue avec le state.

2. **Comment React Hook Form améliore-t-il les performances des formulaires ?**
   React Hook Form utilise des refs internes (mode uncontrolled) pour éviter les re-renders à chaque frappe. Seul le champ modifié est mis à jour, contrairement à un formulaire entièrement controlled qui re-render tout le composant.

3. **Quel est le rôle de Zod dans la validation de formulaires ?**
   Zod est une bibliothèque de validation de schémas TypeScript-first. Couplé à `@hookform/resolvers/zod`, il permet de définir un schéma de validation déclaratif, avec inférence automatique des types TypeScript (`z.infer<typeof schema>`).

</details>

---

## Analogie

Imagine que React est un **moteur de voiture** : puissant, flexible, mais tu ne peux pas rouler avec un moteur seul. Il te faut un châssis, des roues, un tableau de bord. **Next.js est la voiture complète** : il emballe React avec le routing, le rendu serveur, l'optimisation des images, le bundling, et le déploiement.

En Vue, tu as vécu la même chose : Vue 3 seul ne suffit pas, tu utilises **Nuxt 3** pour la production. En Angular, le framework est déjà "batteries included" — Next.js apporte ce même esprit à React.

---

## Théorie

### Pourquoi Next.js ?

React est une bibliothèque UI, pas un framework. Pour une application de production, il manque :

| Besoin | React seul | Next.js 15 |
|---|---|---|
| Routing | react-router (manuel) | File-system routing (automatique) |
| SSR / SSG | À configurer soi-même | Intégré (App Router) |
| Optimisation images | Rien | `next/image` |
| Code splitting | `React.lazy` manuel | Automatique par route |
| API backend | Serveur Express séparé | Route Handlers intégrés |
| SEO | SPA = mauvais SEO | SSR + metadata API |

### Création d'un projet

```bash
npx create-next-app@latest mon-app --typescript --tailwind --app --src-dir --eslint
```

Options importantes :
- `--app` : active App Router (pas Pages Router legacy)
- `--typescript` : TypeScript strict par défaut
- `--tailwind` : configuration Tailwind CSS intégrée
- `--src-dir` : place le code dans `src/`

### Structure du projet

```
mon-app/
├── src/
│   └── app/                    # App Router
│       ├── layout.tsx          # Layout racine (obligatoire)
│       ├── page.tsx            # Page d'accueil (/)
│       ├── loading.tsx         # UI de chargement (Suspense automatique)
│       ├── error.tsx           # Boundary d'erreur
│       ├── not-found.tsx       # Page 404
│       ├── about/
│       │   └── page.tsx        # /about
│       └── blog/
│           ├── page.tsx        # /blog
│           └── [slug]/
│               └── page.tsx    # /blog/mon-article (route dynamique)
├── public/                     # Fichiers statiques
├── next.config.ts              # Configuration Next.js
└── tsconfig.json
```

### Conventions de fichiers App Router

| Fichier | Rôle |
|---|---|
| `page.tsx` | Rend la route accessible (obligatoire pour créer une URL) |
| `layout.tsx` | Enveloppe les pages enfants, persiste entre navigations |
| `loading.tsx` | Affiché pendant le chargement (wraps automatiquement dans `<Suspense>`) |
| `error.tsx` | Capture les erreurs (doit être `'use client'`) |
| `not-found.tsx` | Page 404 personnalisée |
| `template.tsx` | Comme layout mais re-monté à chaque navigation |

### Le layout racine

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon Application",
  description: "Application Next.js 15",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
```

> Le layout racine est **obligatoire** et doit contenir les balises `<html>` et `<body>`.

### Routing = système de fichiers

```
src/app/
├── page.tsx                    → /
├── about/page.tsx              → /about
├── blog/page.tsx               → /blog
├── blog/[slug]/page.tsx        → /blog/:slug (dynamique)
├── shop/[...categories]/page.tsx → /shop/a/b/c (catch-all)
└── (marketing)/pricing/page.tsx  → /pricing (group sans segment URL)
```

**Groupes de routes** avec `(parenthèses)` : organisent le code sans affecter l'URL.

```tsx
// src/app/blog/[slug]/page.tsx
interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: BlogPostProps) {
  const { slug } = await params;
  return <h1>Article : {slug}</h1>;
}
```

> **Next.js 15** : `params` est désormais une **Promise** qu'il faut `await`.

### Navigation avec `<Link>`

```tsx
// ❌ Mauvais : balise <a> classique = rechargement complet
<a href="/about">À propos</a>

// ✅ Bon : navigation côté client (prefetch automatique)
import Link from "next/link";

<Link href="/about">À propos</Link>

// ✅ Navigation dynamique
<Link href={`/blog/${post.slug}`}>{post.title}</Link>
```

### Navigation programmatique

```tsx
"use client";

import { useRouter } from "next/navigation";

export default function SearchButton() {
  const router = useRouter();

  function handleSearch(query: string) {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return <button onClick={() => handleSearch("react")}>Chercher</button>;
}
```

> **Attention** : `useRouter` vient de `next/navigation` (App Router), pas de `next/router` (Pages Router legacy).

### Comparaison avec Vue/Angular

| Concept | Next.js 15 | Nuxt 3 | Angular 19 |
|---|---|---|---|
| Routing | Dossiers dans `app/` | Dossiers dans `pages/` | `app.routes.ts` déclaratif |
| Layout | `layout.tsx` (imbriqué) | `layouts/default.vue` | `<router-outlet>` |
| Page dynamique | `[slug]/page.tsx` | `[slug].vue` | `:slug` dans routes |
| Loading | `loading.tsx` | `<NuxtLoadingIndicator>` | Route resolver |
| Erreur | `error.tsx` | `error.vue` | `ErrorHandler` |
| Link | `<Link href="...">` | `<NuxtLink to="...">` | `[routerLink]="..."` |

---

## Pratique

### Exercice : créer un mini-site avec App Router

**Objectif** : créer un site avec 3 pages et un layout commun.

1. Crée un nouveau projet Next.js 15 avec App Router
2. Crée les pages suivantes :
   - `/` : page d'accueil avec un titre et des liens
   - `/about` : page "À propos" avec du contenu
   - `/blog/[slug]` : page dynamique qui affiche le slug
3. Crée un layout commun avec :
   - Un header avec navigation (`<Link>`)
   - Un footer
4. Ajoute un `loading.tsx` qui affiche "Chargement..."
5. Ajoute un `not-found.tsx` personnalisé

<details>
<summary>Solution</summary>

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mon Blog",
  description: "Blog avec Next.js 15",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <header>
          <nav>
            <Link href="/">Accueil</Link>
            <Link href="/about">À propos</Link>
            <Link href="/blog/premier-article">Blog</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <p>&copy; 2025 Mon Blog</p>
        </footer>
      </body>
    </html>
  );
}

// src/app/page.tsx
export default function HomePage() {
  return (
    <div>
      <h1>Bienvenue sur mon blog</h1>
      <p>Découvrez mes articles sur React et Next.js.</p>
    </div>
  );
}

// src/app/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>À propos</h1>
      <p>Ce blog est construit avec Next.js 15 et TypeScript.</p>
    </div>
  );
}

// src/app/blog/[slug]/page.tsx
interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: BlogPostProps) {
  const { slug } = await params;

  return (
    <article>
      <h1>Article : {slug.replace(/-/g, " ")}</h1>
      <p>Contenu de l'article "{slug}".</p>
    </article>
  );
}

// src/app/loading.tsx
export default function Loading() {
  return <p>Chargement...</p>;
}

// src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1>404 — Page introuvable</h1>
      <p>La page que vous cherchez n'existe pas.</p>
      <Link href="/">Retour à l'accueil</Link>
    </div>
  );
}
```

</details>

---

## Résumé

| Concept | À retenir |
|---|---|
| Next.js | Framework de production pour React (SSR, routing, optimisation) |
| App Router | Routing basé sur le système de fichiers dans `src/app/` |
| `page.tsx` | Rend une route accessible |
| `layout.tsx` | Enveloppe persistante pour les pages enfants |
| `loading.tsx` / `error.tsx` | Gestion automatique du chargement et des erreurs |
| `<Link>` | Navigation côté client avec prefetch |
| `params` (Next.js 15) | Est une `Promise`, doit être `await` |

---

> **Prochain cours** : [Server Components vs Client Components](./02-server-components.md) — le changement de paradigme fondamental de React moderne.
