# Cours 25 — Server Components vs Client Components

> **Objectif** : comprendre la distinction fondamentale entre Server Components et Client Components dans React 19 / Next.js 15, savoir quand utiliser `'use client'`, et maîtriser les patterns de composition serveur/client.
>
> **SSR cross-cours** : le SSR/ISR est aussi couvert dans 03-Vue module 04 (SSR/Hydration, Nuxt 3) et 07-HTTP-Caching modules 10-12 (stratégies de cache et CDN). Ici l'angle est Next.js App Router et Server Components.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la convention de fichier pour créer une route dans Next.js App Router ?</summary>

Il faut créer un fichier `page.tsx` dans un dossier sous `src/app/`. Le chemin du dossier détermine l'URL : `src/app/about/page.tsx` correspond à la route `/about`.
</details>

<details>
<summary>2. Pourquoi utiliser `<Link>` de Next.js plutôt qu'une balise `<a>` ?</summary>

`<Link>` effectue une navigation côté client sans rechargement complet de la page. Il prefetch automatiquement les routes visibles dans le viewport, ce qui rend la navigation quasi instantanée.
</details>

<details>
<summary>3. En Next.js 15, comment accède-t-on aux paramètres dynamiques d'une route ?</summary>

Les `params` sont désormais une `Promise`. Il faut `await` le résultat : `const { slug } = await params;` dans un composant async.
</details>

---

## Analogie

Imagine un **restaurant**. La **cuisine** (serveur) prépare les plats : elle a accès aux ingrédients (base de données), aux recettes (logique métier), aux outils lourds (Node.js). La **salle** (client/navigateur) est l'endroit où le client interagit : il choisit dans le menu, appuie sur la sonnette, parle au serveur.

Les **Server Components** sont la cuisine : ils préparent le HTML côté serveur, accèdent directement aux données, et n'envoient au navigateur que le résultat final (pas de JavaScript). Les **Client Components** sont la salle : ils gèrent l'interactivité (clics, formulaires, animations).

---

## Théorie

### Le changement de paradigme

Avant React 19 / Next.js App Router, **tous les composants** étaient des Client Components : le JavaScript était envoyé au navigateur, hydraté, et tout s'exécutait côté client.

Avec les Server Components, React inverse le modèle par défaut :

```
┌─────────────────────────────────────┐
│  App Router : TOUT est Server       │
│  Component par défaut               │
│                                     │
│  Pour rendre un composant client,   │
│  tu DOIS ajouter 'use client'       │
└─────────────────────────────────────┘
```

### Server Components : le défaut

```tsx
// src/app/users/page.tsx
// PAS de 'use client' → Server Component par défaut

interface User {
  id: number;
  name: string;
  email: string;
}

export default async function UsersPage() {
  // ✅ Fetch directement dans le composant — pas de useEffect !
  const res = await fetch("https://jsonplaceholder.typicode.com/users");
  const users: User[] = await res.json();

  return (
    <section>
      <h1>Utilisateurs</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} — {user.email}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

**Ce que les Server Components PEUVENT faire :**
- Accéder directement à la base de données (Prisma, Drizzle)
- Lire le système de fichiers (`fs.readFile`)
- Utiliser des variables d'environnement secrètes (sans `NEXT_PUBLIC_`)
- Faire des `fetch` sans `useEffect`
- Importer des packages lourds sans impact sur le bundle client

**Ce que les Server Components NE PEUVENT PAS faire :**
- Utiliser des hooks (`useState`, `useEffect`, `useRef`...)
- Accéder aux APIs navigateur (`window`, `document`, `localStorage`)
- Gérer des événements (`onClick`, `onChange`...)
- Utiliser `createContext` / `useContext`

### Client Components : quand tu as besoin d'interactivité

```tsx
// src/components/counter.tsx
"use client"; // ← Directive obligatoire en première ligne

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Compteur : {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
```

### Quand utiliser `'use client'` ?

| Tu as besoin de... | Server Component | Client Component |
|---|---|---|
| Afficher des données de la BDD | ✅ | ❌ (via props) |
| `useState`, `useEffect` | ❌ | ✅ |
| `onClick`, `onChange` | ❌ | ✅ |
| `window`, `localStorage` | ❌ | ✅ |
| Réduire le JS envoyé au client | ✅ | ❌ |
| Accès fichiers / env secrets | ✅ | ❌ |

> **Règle d'or** : garde `'use client'` aussi **bas que possible** dans l'arbre de composants. Ne marque pas une page entière comme client si seul un bouton a besoin d'interactivité.

### Patterns ❌ / ✅

```tsx
// ❌ MAUVAIS : page entière en client pour un simple bouton
"use client";

export default function ProductPage() {
  const [liked, setLiked] = useState(false);

  // ... 200 lignes de contenu statique ...

  return (
    <div>
      <h1>Produit</h1>
      <p>Description longue...</p>
      {/* Seul ce bouton a besoin d'être client */}
      <button onClick={() => setLiked(!liked)}>
        {liked ? "❤️" : "🤍"}
      </button>
    </div>
  );
}
```

```tsx
// ✅ BON : extraire la partie interactive dans un Client Component
// src/components/like-button.tsx
"use client";

import { useState } from "react";

export function LikeButton() {
  const [liked, setLiked] = useState(false);
  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? "❤️" : "🤍"}
    </button>
  );
}

// src/app/products/[id]/page.tsx (Server Component)
import { LikeButton } from "@/components/like-button";

interface Product {
  id: string;
  name: string;
  description: string;
}

async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`https://api.example.com/products/${id}`);
  return res.json();
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <LikeButton />
    </div>
  );
}
```

### Composition : server parent, client children

La règle clé : un **Server Component peut importer et rendre un Client Component**, mais un **Client Component ne peut pas importer un Server Component**.

```
Server Component (page.tsx)
├── Server Component (header.tsx)        ← OK
├── Client Component (search-bar.tsx)    ← OK
│   └── Client Component (input.tsx)     ← OK
└── Server Component (product-list.tsx)  ← OK
```

Cependant, un Client Component peut **recevoir un Server Component via `children`** :

```tsx
// ✅ Pattern : Client wrapper avec Server children
// src/components/sidebar.tsx
"use client";

import { useState } from "react";

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside style={{ display: isOpen ? "block" : "none" }}>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {/* children peut être un Server Component ! */}
      {children}
    </aside>
  );
}

// src/app/dashboard/page.tsx (Server Component)
import { Sidebar } from "@/components/sidebar";

async function getMenuItems() {
  const res = await fetch("https://api.example.com/menu");
  return res.json();
}

export default async function DashboardPage() {
  const menuItems = await getMenuItems();

  return (
    <Sidebar>
      {/* Ce contenu est rendu côté serveur, puis passé au client */}
      <nav>
        {menuItems.map((item: { id: string; label: string }) => (
          <a key={item.id} href={item.id}>{item.label}</a>
        ))}
      </nav>
    </Sidebar>
  );
}
```

### Comparaison avec Vue / Angular

| Concept | React 19 / Next.js 15 | Vue 3 / Nuxt 3 | Angular 19+ |
|---|---|---|---|
| Composant serveur | Défaut dans App Router | `<script setup>` + `useAsyncData` | Angular SSR (expérimental) |
| Directive client | `'use client'` | Composants dans `components/` | Hydratation partielle (preview) |
| Data fetching serveur | `async` component + `fetch` | `useAsyncData`, `useFetch` | Resolvers + `TransferState` |
| Hydratation | Automatique pour client comp. | Hydratation complète | Hydratation incrémentale |

**Le vrai changement** : en Vue/Angular, tu penses d'abord client puis tu ajoutes du SSR. En React 19 + Next.js, tu penses d'abord serveur et tu ajoutes du client uniquement quand c'est nécessaire.

---

## Pratique

### Exercice : page produit avec composition serveur/client

**Objectif** : créer une page produit qui mixe Server et Client Components.

1. Crée un Server Component `ProductPage` qui fetch les données d'un produit (utilise `jsonplaceholder.typicode.com/posts/1` comme API)
2. Crée un Client Component `AddToCartButton` avec un compteur
3. Crée un Client Component `ImageGallery` qui gère un state pour l'image sélectionnée
4. Compose le tout : la page (serveur) rend les composants client uniquement là où l'interactivité est nécessaire

<details>
<summary>Solution</summary>

```tsx
// src/components/add-to-cart-button.tsx
"use client";

import { useState } from "react";

export function AddToCartButton({ productName }: { productName: string }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    setAdded(true);
    console.log(`Ajouté ${quantity}x ${productName} au panier`);
  }

  return (
    <div>
      <label>
        Quantité :
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </label>
      <button onClick={handleAdd} disabled={added}>
        {added ? "Ajouté !" : "Ajouter au panier"}
      </button>
    </div>
  );
}

// src/components/image-gallery.tsx
"use client";

import { useState } from "react";

const images = [
  "/images/product-1.jpg",
  "/images/product-2.jpg",
  "/images/product-3.jpg",
];

export function ImageGallery() {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      <div style={{ border: "1px solid #ccc", padding: "1rem" }}>
        <p>Image sélectionnée : {images[selected]}</p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        {images.map((img, i) => (
          <button
            key={img}
            onClick={() => setSelected(i)}
            style={{ fontWeight: i === selected ? "bold" : "normal" }}
          >
            Image {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

// src/app/products/[id]/page.tsx (Server Component)
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ImageGallery } from "@/components/image-gallery";

interface Post {
  id: number;
  title: string;
  body: string;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await fetch(
    `https://jsonplaceholder.typicode.com/posts/${id}`
  );
  const product: Post = await res.json();

  return (
    <div>
      <h1>{product.title}</h1>

      {/* Client Component : gère le state de la galerie */}
      <ImageGallery />

      {/* Server-rendered : pas de JS envoyé au client */}
      <p>{product.body}</p>

      {/* Client Component : gère l'ajout au panier */}
      <AddToCartButton productName={product.title} />
    </div>
  );
}
```

</details>

---

## Résumé

| Concept | À retenir |
|---|---|
| Défaut = Server | Dans App Router, tout composant sans `'use client'` est un Server Component |
| `'use client'` | Directive à placer en première ligne du fichier pour activer le mode client |
| Server Component | Peut fetch, accéder à la BDD, lire les fichiers — zéro JS envoyé au client |
| Client Component | Nécessaire pour hooks, événements, APIs navigateur |
| Composition | Server parent peut rendre Client children ; Client peut recevoir Server via `children` |
| Règle d'or | Pousse `'use client'` le plus bas possible dans l'arbre |

---

> **Prochain cours** : [Data Fetching et caching dans Next.js](./03-data-fetching.md) — fetch côté serveur, revalidation, streaming avec Suspense.
