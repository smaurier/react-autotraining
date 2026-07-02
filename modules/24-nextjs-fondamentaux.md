---
titre: Next.js — fondamentaux et App Router
cours: 04-react
notions: [pourquoi un framework par-dessus React, App Router vs Pages Router legacy, structure app/, conventions de fichiers page/layout/loading/error/not-found, routing par dossiers et segments dynamiques, layouts imbriqués, navigation avec Link et useRouter, metadata API statique et generateMetadata, params et searchParams comme Promises en Next 15]
outcomes: [structurer une application avec l'App Router de Next.js 15, créer des routes et layouts imbriqués via les conventions de fichiers, gérer navigation metadata et états loading/error sans configuration manuelle]
prerequis: [23-tanstack-query]
next: 25-server-components
libs: [{ name: react, version: "^19" }, { name: next, version: "^15" }]
tribuzen: admin web TribuZen sous Next.js 15 — structure app/(admin)/familles, layout à sidebar, loading squelette, metadata par page
last-reviewed: 2026-07
---

# Next.js — fondamentaux et App Router

> **Outcomes — tu sauras FAIRE :** structurer une application avec l'App Router de Next.js 15, créer routes et layouts imbriqués via les conventions de fichiers, gérer navigation, metadata et états loading/error sans configuration manuelle.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

L'admin TribuZen était jusqu'ici une SPA Vite + React Router. On la migre vers Next.js 15 pour trois raisons concrètes : SEO des pages publiques (barème d'aide, mentions légales), rendu serveur des listes lourdes (familles, événements), et un routing qui ne dérive plus dans un fichier `routes.tsx` de 300 lignes.

Voici l'ancien routing manuel qu'on veut supprimer :

```tsx
// AVANT — src/router.tsx (React Router, config manuelle)
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminLayout />,          // layout à câbler à la main
    children: [
      { path: 'familles', element: <FamilyListPage /> },
      { path: 'familles/:id', element: <FamilyDetailPage /> },
      { path: 'evenements', element: <EventListPage /> },
    ],
    errorElement: <ErrorPage />,        // une seule erreur pour tout
  },
]);
```

**Trois problèmes immédiats :**
1. Chaque route est déclarée manuellement — ajouter une page = éditer ce fichier central.
2. Le `loading` par route n'existe pas : il faut brancher soi-même un `<Suspense>` + spinner partout.
3. Le layout est câblé à la main, sans imbrication native ni segmentation d'erreur.

Avec l'App Router, **l'arborescence de dossiers EST le routing**. Créer `app/familles/page.tsx` crée la route `/familles`. Ce module te donne les conventions qui remplacent toute cette configuration.

---

## 2. Théorie complète, concise

### 2.1 Pourquoi un framework par-dessus React ?

React est une bibliothèque d'UI, pas un framework applicatif. Pour une application de production, il manque des briques que tu devrais assembler et maintenir toi-même :

| Besoin | React seul | Next.js 15 |
|---|---|---|
| Routing | react-router (config manuelle) | Routing par système de fichiers |
| SSR / SSG | à configurer soi-même | intégré (App Router) |
| Optimisation images | rien | `next/image` |
| Code splitting | `React.lazy` manuel | automatique par route |
| API backend | serveur Express séparé | Route Handlers intégrés |
| SEO | SPA = mauvais SEO | SSR + metadata API |

> **Équivalence que tu connais :** Vue 3 seul ne suffit pas en prod, tu prends **Nuxt 3**. Next.js est à React ce que Nuxt est à Vue. Angular est déjà « batteries included » ; Next apporte cet esprit à l'écosystème React.

### 2.2 App Router vs Pages Router — le legacy à écarter

Next.js a deux systèmes de routing. Il faut savoir les distinguer car beaucoup de tutoriels en ligne montrent encore l'ancien.

| | App Router (`app/`) | Pages Router (`pages/`) |
|---|---|---|
| Statut | actuel, recommandé | **legacy** (maintenu, non déprécié, mais figé) |
| Depuis | Next 13, stable Next 14+ | historique (Next ≤ 12) |
| Composants | Server Components par défaut | Client Components par défaut |
| Data fetching | `async` component + `fetch` | `getServerSideProps` / `getStaticProps` |
| Layouts | `layout.tsx` imbriqués natifs | `_app.tsx` unique |
| Navigation | `next/navigation` | `next/router` |

**Règle pour Sylvain :** tout nouveau projet démarre en App Router. Si tu vois `getServerSideProps`, `pages/_app.tsx` ou un import `next/router`, tu es sur du Pages Router legacy — utile à lire sur une base existante, jamais à écrire en neuf. Ce module ne couvre QUE l'App Router.

### 2.3 Créer un projet

```bash
npx create-next-app@latest tribuzen-admin --typescript --tailwind --app --src-dir --eslint
```

Options qui comptent :
- `--app` : active l'App Router (sans ça, Pages Router legacy).
- `--typescript` : TS strict par défaut.
- `--src-dir` : place le code dans `src/` (le routing devient `src/app/`).
- `--tailwind`, `--eslint` : outillage prêt.

### 2.4 Structure `app/` et conventions de fichiers

Dans l'App Router, un dossier = un segment d'URL, et des **fichiers au nom réservé** définissent le comportement de ce segment.

```
src/app/
├── layout.tsx          # layout racine OBLIGATOIRE (contient html + body)
├── page.tsx            # route /  (obligatoire pour rendre l'URL accessible)
├── loading.tsx         # UI pendant le chargement (Suspense automatique)
├── error.tsx           # boundary d'erreur du segment ('use client' obligatoire)
├── not-found.tsx       # UI 404 du segment
├── familles/
│   ├── page.tsx        # route /familles
│   ├── loading.tsx     # squelette pendant le fetch de /familles
│   └── [id]/
│       └── page.tsx    # route dynamique /familles/:id
└── evenements/
    └── page.tsx        # route /evenements
```

Les fichiers réservés et leur rôle :

| Fichier | Rôle | Note |
|---|---|---|
| `page.tsx` | rend le segment accessible comme URL | sans lui, le dossier n'est pas une route |
| `layout.tsx` | enveloppe les pages enfants, **persiste** entre navigations | ne se re-monte pas |
| `loading.tsx` | UI affichée pendant le chargement | wrappe automatiquement le contenu dans `<Suspense>` |
| `error.tsx` | capture les erreurs du segment | **doit être `'use client'`**, reçoit `error` + `reset` |
| `not-found.tsx` | UI 404 du segment | rendu via `notFound()` ou route inconnue |
| `template.tsx` | comme `layout` mais **re-monté** à chaque navigation | rare, pour animations d'entrée |
| `route.ts` | endpoint API (GET/POST…) | remplace un serveur Express pour l'API |

Point clé : le fichier `page.tsx` est ce qui **publie** l'URL. Un dossier sans `page.tsx` (ni `route.ts`) ne crée aucune route — il sert juste à organiser.

### 2.5 Le layout racine

Il est **obligatoire** et doit contenir `<html>` et `<body>`. C'est le seul endroit où tu écris ces balises.

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TribuZen Admin',
  description: "Console d'administration TribuZen",
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

### 2.6 Routing par dossiers et segments dynamiques

L'arborescence de fichiers se traduit directement en URLs :

```
src/app/
├── page.tsx                       → /
├── familles/page.tsx              → /familles
├── familles/[id]/page.tsx         → /familles/:id       (segment dynamique)
├── evenements/[...slug]/page.tsx  → /evenements/a/b/c    (catch-all)
└── (admin)/reglages/page.tsx      → /reglages            (groupe, sans segment URL)
```

Trois formes à retenir :
- `[id]` : **segment dynamique** — capture une valeur (`/familles/42` → `id = "42"`).
- `[...slug]` : **catch-all** — capture le reste du chemin en tableau.
- `(admin)` : **groupe de routes** — les parenthèses organisent le code **sans** ajouter de segment à l'URL. Sert à partager un layout entre plusieurs pages sans polluer les URLs.

### 2.7 Accéder à params et searchParams — Promises en Next 15

**Changement majeur Next.js 15 :** `params` et `searchParams` reçus par une page, un layout ou un route handler sont désormais des **Promises**. Dans un composant `async`, on les `await`.

```tsx
// src/app/familles/[id]/page.tsx
interface FamilyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}

export default async function FamilyDetailPage({ params, searchParams }: FamilyPageProps) {
  const { id } = await params;            // Next 15 : await obligatoire
  const { onglet } = await searchParams;  // idem pour la query string

  return (
    <section>
      <h1>Famille {id}</h1>
      <p>Onglet actif : {onglet ?? 'apercu'}</p>
    </section>
  );
}
```

Dans un **Client Component** (`'use client'`), on ne peut pas `await` au top-level : on déballe la Promise avec le hook `use` de React 19.

```tsx
'use client';
import { use } from 'react';

export default function ClientTabs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);   // React 19 : use() lit une Promise dans un composant client
  return <div>Onglets de la famille {id}</div>;
}
```

> Ne confonds pas : en Next 14 c'était `const { id } = params` (objet synchrone). En Next 15 c'est une Promise. Un code copié d'un vieux tuto plantera au typage.

### 2.8 Layouts imbriqués

Chaque `layout.tsx` enveloppe **son segment et tous ses enfants**, et persiste pendant la navigation entre pages sœurs. On compose ainsi une UI en couches.

```tsx
// src/app/(admin)/layout.tsx — layout partagé de toute la zone admin
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <nav>
          <Link href="/familles">Familles</Link>
          <Link href="/evenements">Événements</Link>
        </nav>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
```

Le layout racine (`app/layout.tsx`) enveloppe ce layout admin, qui enveloppe la page. Les couches s'emboîtent de la racine vers la feuille. La sidebar ne se re-monte pas quand on passe de `/familles` à `/evenements` — seul le `{children}` change.

### 2.9 Navigation : Link et navigation programmatique

Pour naviguer, on n'utilise pas `<a>` (rechargement complet de la page) mais `<Link>` (navigation côté client + prefetch automatique).

```tsx
import Link from 'next/link';

// ❌ balise <a> classique → recharge tout le document, perd l'état client
// <a href="/familles">Familles</a>

// ✅ navigation client, prefetch du segment au survol
<Link href="/familles">Familles</Link>

// ✅ lien dynamique
<Link href={`/familles/${family.id}`}>{family.name}</Link>
```

Pour naviguer **depuis du code** (après une action), on utilise `useRouter` — depuis `next/navigation`, dans un Client Component.

```tsx
'use client';
import { useRouter } from 'next/navigation';

export default function SearchFamilies() {
  const router = useRouter();

  function onSubmit(query: string) {
    router.push(`/familles?q=${encodeURIComponent(query)}`);
  }

  return <button onClick={() => onSubmit('durand')}>Chercher</button>;
}
```

> **Piège d'import classique :** `useRouter` vient de `next/navigation` (App Router). L'ancien `next/router` appartient au Pages Router legacy et n'a pas la même API. Si tu importes le mauvais, `router.push` se comporte différemment ou casse.

### 2.10 Metadata API

Le SEO se gère par des exports, pas par des `<head>` manuels. Deux formes.

**Metadata statique** — un objet exporté, pour un contenu fixe :

```tsx
// src/app/familles/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Familles — TribuZen Admin',
  description: 'Liste des familles inscrites',
};
```

**Metadata dynamique** — `generateMetadata`, quand le titre dépend des données (donc de `params`). En Next 15, on `await params`.

```tsx
// src/app/familles/[id]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const family = await getFamily(id);
  return {
    title: `${family.name} — TribuZen Admin`,
    description: `Fiche de la famille ${family.name}`,
  };
}
```

Les metadata des layouts et des pages **fusionnent** de la racine vers la feuille : un `title` de page écrase celui du layout racine pour ce segment.

---

## 3. Worked examples

### Exemple 1 — Zone admin TribuZen complète (routing + layout + loading)

Objectif : la liste des familles sous `/familles`, dans une zone admin à sidebar, avec squelette de chargement et 404 dédié.

```tsx
// ─── src/app/layout.tsx — layout racine (html + body + metadata globale) ───
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TribuZen Admin',
  description: "Console d'administration TribuZen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

// ─── src/app/(admin)/layout.tsx — coquille admin partagée, sidebar persistante ───
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <nav>
          <Link href="/familles">Familles</Link>
          <Link href="/evenements">Événements</Link>
        </nav>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

// ─── src/app/(admin)/familles/page.tsx — liste des familles ───
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Familles — TribuZen Admin',
  description: 'Liste des familles inscrites',
};

async function getFamilies() {
  // fetch serveur : ce composant est un Server Component par défaut (module 25)
  const res = await fetch('https://api.tribuzen.test/families', { cache: 'no-store' });
  return res.json() as Promise<{ id: string; name: string }[]>;
}

export default async function FamilyListPage() {
  const families = await getFamilies();
  return (
    <section>
      <h1>Familles</h1>
      <ul>
        {families.map((f) => (
          <li key={f.id}>
            <Link href={`/familles/${f.id}`}>{f.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── src/app/(admin)/familles/loading.tsx — squelette pendant le fetch ───
export default function Loading() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Chargement des familles">
      <div className="skeleton__line" />
      <div className="skeleton__line" />
      <div className="skeleton__line" />
    </div>
  );
}

// ─── src/app/(admin)/familles/not-found.tsx — 404 dédié au segment ───
import Link from 'next/link';

export default function FamilyNotFound() {
  return (
    <div>
      <h1>Famille introuvable</h1>
      <Link href="/familles">Retour à la liste</Link>
    </div>
  );
}
```

**Ce que ce découpage apporte :**
- Ajouter `/evenements` = créer `(admin)/evenements/page.tsx`. Aucun fichier de config à toucher.
- `loading.tsx` s'affiche automatiquement tant que `getFamilies()` n'a pas résolu — pas de `useState(isLoading)` à câbler.
- La sidebar (`(admin)/layout.tsx`) ne se re-monte pas d'une page à l'autre.
- Le groupe `(admin)` garde les URLs propres : `/familles`, pas `/admin/familles`.

### Exemple 2 — Fiche famille dynamique avec metadata et params awaited

Objectif : `/familles/:id` avec titre de page dépendant de la donnée, et gestion du 404.

```tsx
// ─── src/app/(admin)/familles/[id]/page.tsx ───
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface FamilyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}

async function getFamily(id: string) {
  const res = await fetch(`https://api.tribuzen.test/families/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  return res.json() as Promise<{ id: string; name: string; membersCount: number }>;
}

// Metadata dynamique : le titre dépend de params → generateMetadata + await
export async function generateMetadata({ params }: FamilyPageProps): Promise<Metadata> {
  const { id } = await params;
  const family = await getFamily(id);
  if (!family) return { title: 'Famille introuvable — TribuZen Admin' };
  return {
    title: `${family.name} — TribuZen Admin`,
    description: `Fiche de la famille ${family.name}`,
  };
}

export default async function FamilyDetailPage({ params, searchParams }: FamilyPageProps) {
  const { id } = await params;              // Next 15 : Promise → await
  const { onglet } = await searchParams;    // query string aussi
  const family = await getFamily(id);

  if (!family) notFound();                   // rend le not-found.tsx du segment

  return (
    <article>
      <h1>{family.name}</h1>
      <p>{family.membersCount} membres</p>
      <p>Onglet : {onglet ?? 'apercu'}</p>
    </article>
  );
}
```

**Points clés de l'exemple :**
- `generateMetadata` et le composant `await` tous deux `params` — c'est le contrat Next 15.
- `notFound()` interrompt le rendu et affiche le `not-found.tsx` le plus proche.
- `searchParams` (`?onglet=membres`) est aussi une Promise à `await`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Lire `params` sans `await` (réflexe Next 14)

```tsx
// ❌ Next 14 et avant — objet synchrone
export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;              // en Next 15, params est une Promise → id undefined / erreur type
  return <h1>{id}</h1>;
}

// ✅ Next 15 — Promise à await
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <h1>{id}</h1>;
}
```

**Pourquoi c'est faux :** depuis Next 15, `params`/`searchParams` sont asynchrones (rendu partiel/streaming). Un code copié d'un tuto Next 14 se type `{ id: string }` et casse. Dans un Client Component, utilise `use(params)` au lieu de `await`.

### PIÈGE #2 — Confondre `next/navigation` et `next/router`

```tsx
// ❌ next/router = Pages Router legacy, API différente
import { useRouter } from 'next/router';

// ✅ next/navigation = App Router
import { useRouter } from 'next/navigation';
```

**Pourquoi c'est faux :** ce sont deux modules distincts. Dans l'App Router, `next/router` ne fournit pas la bonne API (`router.query` n'existe pas, etc.). Toujours `next/navigation` dès qu'on est sous `app/`.

### PIÈGE #3 — Oublier que `error.tsx` doit être un Client Component

```tsx
// ❌ pas de 'use client' → Next refuse de compiler error.tsx
export default function Error({ error, reset }) { /* ... */ }

// ✅ error.tsx est OBLIGATOIREMENT client (il gère un état + un bouton reset)
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>Une erreur est survenue.</p>
      <button onClick={() => reset()}>Réessayer</button>
    </div>
  );
}
```

**Pourquoi :** un error boundary a besoin d'interactivité (le bouton `reset`), donc il tourne côté client. `loading.tsx` et `not-found.tsx`, eux, peuvent rester des Server Components.

### PIÈGE #4 — Un dossier sans `page.tsx` croit créer une route

```
src/app/
└── familles/
    └── FamilyCard.tsx      # ❌ pas de page.tsx → /familles renvoie 404
```

**Pourquoi c'est faux :** seul `page.tsx` (ou `route.ts` pour l'API) publie une URL. Un dossier ne contenant que des composants utilitaires n'est pas une route — c'est juste de l'organisation. Ajoute `familles/page.tsx` pour rendre `/familles` accessible.

### PIÈGE #5 — Utiliser `<a>` au lieu de `<Link>` pour la navigation interne

```tsx
// ❌ recharge tout le document, perd l'état client et le prefetch
<a href="/familles">Familles</a>

// ✅ navigation SPA côté client + prefetch automatique
<Link href="/familles">Familles</Link>
```

**Pourquoi :** `<a>` déclenche une navigation navigateur complète (full reload). `<Link>` fait une transition côté client et précharge le segment cible. On garde `<a>` uniquement pour les liens **externes**.

---

## 5. Ancrage TribuZen

L'admin web TribuZen est une application **Next.js 15 App Router**. Voici la cartographie réelle des fichiers de routing dans `smaurier/tribuzen-admin` :

```
tribuzen-admin/src/app/
├── layout.tsx                       # racine : <html lang="fr">, metadata globale
├── page.tsx                         # / → redirige/affiche le dashboard
├── (admin)/                         # groupe : URLs propres, layout partagé
│   ├── layout.tsx                   # coquille admin : sidebar + main, persistante
│   ├── familles/
│   │   ├── page.tsx                 # /familles — liste (Server Component, fetch direct)
│   │   ├── loading.tsx              # squelette liste pendant le fetch
│   │   ├── not-found.tsx            # 404 dédié aux familles
│   │   └── [id]/
│   │       └── page.tsx             # /familles/:id — fiche, generateMetadata dynamique
│   └── evenements/
│       ├── page.tsx                 # /evenements
│       └── loading.tsx
└── api/
    └── familles/route.ts            # endpoint interne (Route Handler)
```

Chaque page porte sa **metadata** (`title` visible dans l'onglet et pour le SEO). La zone `(admin)` partage la **sidebar** via son `layout.tsx` — un seul montage, navigation instantanée entre `/familles` et `/evenements`. Les `loading.tsx` remplacent les spinners manuels de l'ancienne SPA : dès qu'un Server Component `await` ses données, Next affiche le squelette. La migration supprime le `router.tsx` central de l'Exemple 1 du cas concret.

> Ce module pose le **squelette de navigation**. Le module suivant (25 — Server Components) explique *pourquoi* `FamilyListPage` peut `await` un fetch directement sans `useEffect` : c'est un Server Component.

---

## 6. Points clés

1. Next.js ajoute à React le routing, le SSR, l'optimisation et l'API — comme Nuxt pour Vue.
2. On écrit uniquement en **App Router** (`app/`) ; le Pages Router (`pages/`, `getServerSideProps`, `next/router`) est legacy — à lire, pas à écrire.
3. L'arborescence de dossiers EST le routing : un dossier = un segment, `page.tsx` publie l'URL.
4. Fichiers réservés : `page`, `layout` (persistant), `loading` (Suspense auto), `error` (`'use client'`), `not-found`, `template`, `route` (API).
5. Segments dynamiques `[id]`, catch-all `[...slug]`, groupes `(nom)` qui n'ajoutent pas de segment URL.
6. **Next 15 :** `params` et `searchParams` sont des **Promises** — `await` en composant async, `use()` en Client Component.
7. Layouts imbriqués : chaque `layout.tsx` enveloppe ses enfants et persiste entre navigations sœurs.
8. Navigation : `<Link>` (client + prefetch) au lieu de `<a>` ; `useRouter` depuis `next/navigation` pour naviguer en code.
9. Metadata via export `metadata` (statique) ou `generateMetadata` async (dynamique, dépend de `params`).

---

## 7. Seeds Anki

```
Pourquoi utiliser Next.js plutôt que React seul en production ?|React est une bibliothèque d'UI, pas un framework. Next apporte routing par fichiers, SSR/SSG, optimisation d'images, code splitting automatique, Route Handlers et metadata SEO — l'équivalent de ce que Nuxt apporte à Vue.
App Router vs Pages Router : lequel écrire en neuf et pourquoi ?|Toujours l'App Router (dossier app/), actuel et recommandé, Server Components par défaut, layouts imbriqués natifs. Le Pages Router (dossier pages/, getServerSideProps, next/router) est legacy : maintenu mais figé, à lire sur du code existant, jamais à écrire en neuf.
Quel fichier rend une route accessible dans l'App Router ?|page.tsx (ou route.ts pour un endpoint API). Un dossier sans page.tsx ne crée aucune URL — il ne sert qu'à organiser le code.
À quoi servent loading.tsx, error.tsx et not-found.tsx ?|loading.tsx : UI de chargement, wrappe automatiquement le contenu dans Suspense. error.tsx : boundary d'erreur du segment, doit être 'use client' (reçoit error + reset). not-found.tsx : UI 404 du segment, déclenchée par notFound() ou route inconnue.
Comment lire params dans une page en Next.js 15 ?|params (et searchParams) sont des Promises. En composant async : const { id } = await params. En Client Component : const { id } = use(params) avec le hook use de React 19. En Next 14 c'était un objet synchrone — d'où les erreurs sur du code copié.
Que fait un groupe de routes (dossier entre parenthèses) comme (admin) ?|Il regroupe des routes pour partager un layout sans ajouter de segment à l'URL. (admin)/familles/page.tsx sert la route /familles, pas /admin/familles.
Différence entre next/navigation et next/router ?|next/navigation est l'API de l'App Router (useRouter, redirect, notFound, usePathname). next/router est l'ancienne API du Pages Router legacy, incompatible. Sous app/, toujours importer depuis next/navigation.
Quand utiliser metadata (export objet) vs generateMetadata ?|export const metadata = {...} pour un titre/description fixes. export async function generateMetadata({ params }) quand la metadata dépend des données (on await params pour fetch, puis on retourne l'objet Metadata). Les metadata fusionnent de la racine vers la feuille.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-24-nextjs-fondamentaux/README.md`. Construire la zone admin TribuZen de zéro avec l'App Router Next.js 15 : groupe `(admin)`, layout à sidebar, route `/familles`, route dynamique `/familles/[id]` avec `params` awaited, `loading.tsx` et metadata.
