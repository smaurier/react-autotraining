# Cours 26 — Data Fetching dans Next.js

> **Objectif** : maîtriser les différentes stratégies de récupération de données dans Next.js 15 App Router : fetch serveur, rendu statique vs dynamique, revalidation (ISR), streaming avec Suspense, et fetching parallèle.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence fondamentale entre Server Components et Client Components ?</summary>

Les Server Components s'exécutent uniquement côté serveur : ils peuvent accéder directement aux données (BDD, fichiers, fetch) et n'envoient aucun JavaScript au navigateur. Les Client Components (`'use client'`) s'exécutent côté client et gèrent l'interactivité (hooks, événements, APIs navigateur).
</details>

<details>
<summary>2. Pourquoi faut-il pousser `'use client'` le plus bas possible dans l'arbre ?</summary>

Chaque composant marqué `'use client'` (et tous ses enfants importés) est inclus dans le bundle JavaScript envoyé au navigateur. En gardant la directive au plus bas, on minimise le JS côté client et on maximise le rendu serveur (plus rapide, meilleur SEO).
</details>

<details>
<summary>3. Un Client Component peut-il importer directement un Server Component ?</summary>

Non. Un Client Component ne peut pas `import` un Server Component. Cependant, il peut recevoir un Server Component via la prop `children` (ou toute autre prop de type `ReactNode`).
</details>

---

## Analogie

Pense à un **journal** :
- **Statique (SSG)** = le journal imprimé du matin. Il est préparé une fois, distribué partout, identique pour tous. Très rapide à "lire" (servir).
- **Dynamique (SSR)** = un flash info en direct. Chaque demande génère une réponse fraîche. Plus lent, mais toujours à jour.
- **ISR (Incrémental)** = un journal avec une édition spéciale toutes les heures. On garde le cache, puis on régénère périodiquement.
- **Streaming** = un journal dont les pages arrivent une par une. Tu peux lire la une pendant que les pages sport se chargent.

---

## Théorie

### fetch() dans les Server Components

Dans l'App Router, tu peux utiliser `fetch()` directement dans un composant `async` :

```tsx
// src/app/posts/page.tsx — Server Component
interface Post {
  id: number;
  title: string;
  body: string;
}

export default async function PostsPage() {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts");
  const posts: Post[] = await res.json();

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**Déduplication automatique** : si deux composants dans la même requête font le même `fetch()`, Next.js n'envoie qu'une seule requête réseau.

```tsx
// ✅ Ces deux composants font le même fetch → une seule requête réelle
// composant A
const data = await fetch("https://api.example.com/user");

// composant B (dans le même render)
const data = await fetch("https://api.example.com/user"); // dédupliqué !
```

### Rendu statique vs dynamique

Next.js décide automatiquement du mode de rendu :

| Critère | Statique (SSG) | Dynamique (SSR) |
|---|---|---|
| Quand | Au build | À chaque requête |
| Cache | Résultat en cache CDN | Pas de cache |
| Déclencheur | Pas de données dynamiques | `cookies()`, `headers()`, `searchParams`, `fetch` sans cache |
| Performance | Ultra rapide | Plus lent mais frais |

```tsx
// ✅ Statique par défaut (pas de données dynamiques)
export default function AboutPage() {
  return <h1>À propos</h1>;
}

// ⚡ Devient dynamique automatiquement (utilise cookies)
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session");
  // ...
}
```

Pour forcer le comportement :

```tsx
// Force le rendu dynamique
export const dynamic = "force-dynamic";

// Force le rendu statique (erreur si données dynamiques)
export const dynamic = "force-static";
```

### generateStaticParams : pré-rendre les routes dynamiques

```tsx
// src/app/blog/[slug]/page.tsx

// Génère les pages statiquement au build
export async function generateStaticParams() {
  const res = await fetch("https://api.example.com/posts");
  const posts: { slug: string }[] = await res.json();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await fetch(`https://api.example.com/posts/${slug}`);
  const post = await res.json();

  return <article><h1>{post.title}</h1></article>;
}
```

> **Équivalent Nuxt 3** : `useAsyncData` + `prerenderRoutes` dans `nuxt.config.ts`.
> **Équivalent Angular** : `APP_INITIALIZER` + prerendering dans `angular.json`.

### Revalidation : ISR (Incremental Static Regeneration)

#### Revalidation temporelle

```tsx
// Revalide toutes les 60 secondes
const res = await fetch("https://api.example.com/posts", {
  next: { revalidate: 60 },
});
```

Ou au niveau de la page entière :

```tsx
export const revalidate = 60; // secondes
```

#### Revalidation à la demande (tags)

```tsx
// Dans le Server Component : tagger le fetch
const res = await fetch("https://api.example.com/posts", {
  next: { tags: ["posts"] },
});

// Dans une Server Action ou Route Handler : invalider le tag
import { revalidateTag } from "next/cache";
revalidateTag("posts");

// Ou invalider un chemin spécifique
import { revalidatePath } from "next/cache";
revalidatePath("/blog");
```

### Streaming avec Suspense

Le streaming permet d'afficher progressivement la page. Les parties rapides apparaissent immédiatement, les parties lentes se chargent en arrière-plan.

#### Méthode 1 : `loading.tsx` (automatique)

```tsx
// src/app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  );
}
```

#### Méthode 2 : `<Suspense>` granulaire (recommandé)

```tsx
// src/app/dashboard/page.tsx
import { Suspense } from "react";

// Composant lent (fetch long)
async function RevenueChart() {
  const data = await fetch("https://api.example.com/revenue", {
    next: { revalidate: 3600 },
  });
  const revenue = await data.json();
  return <div>Revenus : {revenue.total} EUR</div>;
}

// Composant lent aussi
async function LatestOrders() {
  const data = await fetch("https://api.example.com/orders");
  const orders = await data.json();
  return (
    <ul>
      {orders.map((o: { id: string; amount: number }) => (
        <li key={o.id}>{o.amount} EUR</li>
      ))}
    </ul>
  );
}

// Page avec streaming granulaire
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Chaque Suspense streame indépendamment */}
      <Suspense fallback={<p>Chargement du graphique...</p>}>
        <RevenueChart />
      </Suspense>

      <Suspense fallback={<p>Chargement des commandes...</p>}>
        <LatestOrders />
      </Suspense>
    </div>
  );
}
```

### Fetching parallèle

```tsx
// ❌ Séquentiel : chaque fetch attend le précédent
export default async function Page() {
  const user = await fetch("https://api.example.com/user").then((r) => r.json());
  const posts = await fetch("https://api.example.com/posts").then((r) => r.json());
  // Temps total = temps user + temps posts
}

// ✅ Parallèle : les deux fetch partent en même temps
export default async function Page() {
  const [user, posts] = await Promise.all([
    fetch("https://api.example.com/user").then((r) => r.json()),
    fetch("https://api.example.com/posts").then((r) => r.json()),
  ]);
  // Temps total = max(temps user, temps posts)
}
```

### Comparaison : ancien Pages Router vs App Router

| Pages Router (legacy) | App Router (actuel) |
|---|---|
| `getStaticProps` | `fetch()` + `revalidate` dans le composant |
| `getServerSideProps` | `fetch()` sans cache ou `dynamic = "force-dynamic"` |
| `getStaticPaths` | `generateStaticParams` |
| `getInitialProps` | N'existe plus |
| Data passée via `props` | Data consommée directement dans le composant |

### Comparaison avec Vue / Angular

| Concept | Next.js 15 | Nuxt 3 | Angular 19+ |
|---|---|---|---|
| Fetch serveur | `async` component + `fetch()` | `useAsyncData()` / `useFetch()` | `TransferState` + resolver |
| Cache | `next: { revalidate }` | `getCachedData` | Pas natif (service custom) |
| Streaming | `<Suspense>` | `<Suspense>` (expérimental) | Streaming SSR (partial) |
| ISR | `revalidateTag` / `revalidatePath` | `routeRules: { isr: true }` | Pas de support natif |
| Pré-rendu | `generateStaticParams` | `prerenderRoutes` | Prerender dans `angular.json` |

---

## Pratique

### Exercice : dashboard avec streaming et données parallèles

**Objectif** : créer un dashboard qui charge 3 sections indépendantes en streaming.

1. Crée une page `/dashboard` avec 3 sections :
   - **Stats** : fetch `https://jsonplaceholder.typicode.com/users` (compte les utilisateurs)
   - **Posts récents** : fetch `https://jsonplaceholder.typicode.com/posts?_limit=5`
   - **Todos** : fetch `https://jsonplaceholder.typicode.com/todos?_limit=5`
2. Chaque section doit être un composant `async` séparé
3. Enveloppe chaque section dans un `<Suspense>` avec un fallback approprié
4. Ajoute un délai artificiel (`await new Promise(r => setTimeout(r, 2000))`) sur les Todos pour voir le streaming en action
5. Configure le fetch des stats avec revalidation toutes les 60 secondes

<details>
<summary>Solution</summary>

```tsx
// src/app/dashboard/page.tsx
import { Suspense } from "react";

function SkeletonCard() {
  return (
    <div className="animate-pulse border rounded p-4">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

async function StatsSection() {
  const res = await fetch("https://jsonplaceholder.typicode.com/users", {
    next: { revalidate: 60 },
  });
  const users = await res.json();

  return (
    <section>
      <h2>Statistiques</h2>
      <p>Nombre d'utilisateurs : {users.length}</p>
    </section>
  );
}

async function RecentPosts() {
  const res = await fetch(
    "https://jsonplaceholder.typicode.com/posts?_limit=5"
  );
  const posts: { id: number; title: string }[] = await res.json();

  return (
    <section>
      <h2>Posts récents</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </section>
  );
}

async function TodosSection() {
  // Délai artificiel pour démontrer le streaming
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const res = await fetch(
    "https://jsonplaceholder.typicode.com/todos?_limit=5"
  );
  const todos: { id: number; title: string; completed: boolean }[] =
    await res.json();

  return (
    <section>
      <h2>Tâches</h2>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {todo.completed ? "✓" : "○"} {todo.title}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      <div style={{ display: "grid", gap: "1rem" }}>
        <Suspense fallback={<SkeletonCard />}>
          <StatsSection />
        </Suspense>

        <Suspense fallback={<SkeletonCard />}>
          <RecentPosts />
        </Suspense>

        <Suspense fallback={<SkeletonCard />}>
          <TodosSection />
        </Suspense>
      </div>
    </div>
  );
}
```

Au chargement, les sections Stats et Posts apparaissent rapidement, tandis que Todos montre le skeleton pendant 2 secondes avant de s'afficher.

</details>

---

## Résumé

| Concept | À retenir |
|---|---|
| `fetch()` serveur | Directement dans les composants `async` — pas de `useEffect` |
| Déduplication | Next.js déduplique automatiquement les `fetch` identiques |
| Statique vs dynamique | Next.js choisit automatiquement ; `cookies()`, `headers()` forcent le dynamique |
| `generateStaticParams` | Pré-rend les routes dynamiques au build (comme `getStaticPaths`) |
| ISR | `next: { revalidate: N }` ou `revalidateTag` / `revalidatePath` |
| Streaming | `<Suspense>` + composants `async` = chargement progressif |
| Parallèle | `Promise.all()` pour éviter les waterfalls séquentiels |

---

> **Prochain cours** : [API Routes et Server Actions](./04-api-routes-et-server-actions.md) — créer des endpoints API et des mutations serveur directement dans Next.js.
