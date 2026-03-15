# Cours 36 — React 19 : les nouveautés

> **Objectif** : maîtriser les nouvelles API de React 19 — le hook `use()`, `useOptimistic`, les améliorations de `useTransition` et `useDeferredValue`, le React Compiler, les Form Actions avec `useActionState`/`useFormStatus`, et les autres changements (ref as prop, metadata, resource preloading).

---

## Rappel du cours précédent

<details>
<summary>1. Dans quel ordre imbrique-t-on ErrorBoundary et Suspense ?</summary>

`ErrorBoundary` à l'extérieur, `Suspense` à l'intérieur. L'ErrorBoundary capture les erreurs de rendu ; Suspense gère le chargement. Le composant de données est l'enfant le plus profond.
</details>

<details>
<summary>2. Comment un composant "suspend" en React ?</summary>

Il lance (throw) une Promise. Suspense attrape cette Promise et affiche le `fallback` jusqu'à sa résolution. C'est ce que font `useSuspenseQuery` (React Query) et le nouveau hook `use()`.
</details>

<details>
<summary>3. Pourquoi `error.tsx` doit-il être un Client Component en Next.js ?</summary>

Les Error Boundaries utilisent `componentDidCatch` et `getDerivedStateFromError`, qui sont des méthodes de cycle de vie de class components — elles ne fonctionnent que côté client. Le `"use client"` est obligatoire.
</details>

---

## Analogie

Imagine que React 18 était un **restaurant bien rodé** :
- `useTransition` = le serveur qui prend ta commande et te dit « c'est en cours » sans bloquer les autres tables.
- `Suspense` = le chef qui prépare en cuisine et envoie les plats quand ils sont prêts.

React 19 ajoute de **nouveaux outils à ce restaurant** :
- `use()` = un serveur qui peut aller chercher un plat directement en cuisine et revenir, sans que tu passes par le système de commande habituel.
- `useOptimistic` = l'écran d'affichage qui montre ta commande comme « prête » immédiatement, avant que le chef ait fini.
- Le **React Compiler** = un sous-chef automatique qui optimise chaque recette sans que le cuisinier doive y penser.

---

## Théorie

### 1. Le hook `use()`

`use()` est un nouveau hook React 19 qui peut lire des **Promises** et des **Contexts**. Contrairement aux autres hooks, `use()` peut être appelé dans des conditions et des boucles.

#### Lire une Promise avec `use()`

```tsx
import { use, Suspense } from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

// La Promise est créée EN DEHORS du composant (ou passée en prop)
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// Le parent crée la Promise et la passe
function App() {
  const userPromise = fetch("/api/user/1").then((r) => r.json());

  return (
    <Suspense fallback={<p>Chargement du profil...</p>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

> **Règle critique** : ne jamais créer la Promise **dans** le composant qui appelle `use()`. Cela provoquerait une nouvelle Promise à chaque rendu et une boucle infinie. La Promise doit être créée dans le parent, dans un loader, ou mise en cache.

#### `use()` vs `useEffect` pour le data fetching

| Aspect | `useEffect` + `useState` | `use()` + `Suspense` |
|--------|--------------------------|----------------------|
| Chargement | géré manuellement (`isLoading`) | automatique via `Suspense` |
| Erreurs | `try/catch` dans l'effet | `ErrorBoundary` |
| Rendu initial | composant vide puis rempli | composant suspendu puis affiché complet |
| Cascades de fetch | possibles (waterfall) | évitées si Promises lancées en parallèle |

#### Lire un Context avec `use()`

`use()` peut remplacer `useContext` avec un avantage : il fonctionne dans les conditions.

```tsx
import { use, createContext } from "react";

const ThemeContext = createContext<"light" | "dark">("light");

function Badge({ urgent }: { urgent: boolean }) {
  // ✅ use() dans une condition — impossible avec useContext
  if (urgent) {
    const theme = use(ThemeContext);
    return <span className={theme === "dark" ? "bg-red-900" : "bg-red-100"}>Urgent</span>;
  }

  return <span>Normal</span>;
}
```

#### Gestion d'erreur avec ErrorBoundary

Si la Promise rejetée est passée à `use()`, l'erreur remonte au `ErrorBoundary` le plus proche :

```tsx
<ErrorBoundary fallback={<p>Erreur lors de la recherche.</p>}>
  <Suspense fallback={<p>Recherche en cours...</p>}>
    <SearchResults resultsPromise={resultsPromise} />
  </Suspense>
</ErrorBoundary>
```

L'ordre reste le même que dans le cours précédent : `ErrorBoundary > Suspense > composant avec use()`.

> **Quand utiliser `use()`** : dans les composants qui reçoivent une Promise en prop (Server Components, loaders Next.js, données préchargées). Pour le data fetching côté client, `useSuspenseQuery` de React Query reste plus pratique (cache, refetch, stale-while-revalidate).

---

### 2. `useOptimistic`

`useOptimistic` permet d'afficher un état « optimiste » immédiatement, avant que le serveur confirme. Si le serveur échoue, React revient automatiquement à l'état réel.

#### Signature

```tsx
const [optimisticState, addOptimistic] = useOptimistic(
  currentState,
  // Reducer : (état actuel, valeur optimiste) => nouvel état
  (current, optimisticValue) => newState
);
```

#### Exemple : bouton Like avec feedback instantané

```tsx
"use client";

import { useOptimistic, useTransition } from "react";

interface Post { id: number; likes: number; likedByMe: boolean }

function LikeButton({ post }: { post: Post }) {
  const [optimistic, addOptimistic] = useOptimistic(post, (current) => ({
    ...current,
    likedByMe: !current.likedByMe,
    likes: current.likedByMe ? current.likes - 1 : current.likes + 1,
  }));
  const [, startTransition] = useTransition();

  function handleLike() {
    startTransition(async () => {
      addOptimistic(null); // Déclenche le reducer → UI instantanée
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      // Si erreur, React revient à `post` quand la transition se termine
    });
  }

  return (
    <button onClick={handleLike}>
      {optimistic.likedByMe ? "❤️" : "🤍"} {optimistic.likes}
    </button>
  );
}
```

#### Exemple : Todo list avec ajout optimiste

```tsx
"use client";

import { useOptimistic, useRef } from "react";

interface Todo { id: string; text: string; pending?: boolean }

function TodoList({ todos, addTodoAction }: {
  todos: Todo[];
  addTodoAction: (text: string) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (current, newText: string) => [
      ...current,
      { id: `temp-${Date.now()}`, text: newText, pending: true },
    ]
  );

  async function formAction(formData: FormData) {
    const text = formData.get("text") as string;
    formRef.current?.reset();
    addOptimisticTodo(text);
    await addTodoAction(text);
  }

  return (
    <div>
      <form ref={formRef} action={formAction}>
        <input name="text" placeholder="Nouvelle tâche..." required />
        <button type="submit">Ajouter</button>
      </form>
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
            {todo.text} {todo.pending && "(en cours...)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

> **Rollback automatique** : `useOptimistic` n'a pas de mécanisme de rollback explicite. L'état optimiste n'existe que pendant la durée de la transition (ou de l'action du formulaire). Quand le parent re-rend avec les nouvelles données serveur, l'état optimiste est remplacé.

#### Intégration avec Server Actions (Next.js)

En Next.js, `addTodoAction` est une Server Action (`"use server"`). Le Server Component parent charge les todos depuis la DB, les passe en prop, et la Server Action fait le `revalidatePath` pour rafraîchir la page après l'insertion.

---

### 3. `useTransition` et `useDeferredValue`

Ces hooks existaient en React 18 mais React 19 les renforce : `useTransition` supporte maintenant les fonctions `async` et s'intègre nativement avec les Form Actions.

#### `useTransition` : marquer une mise à jour comme non-urgente

```tsx
"use client";

import { useState, useTransition } from "react";

function ProductSearch({ products }: { products: { id: number; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(products);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value); // Urgent : le champ réagit immédiatement

    startTransition(() => { // Non-urgent : le filtrage peut attendre
      setFiltered(products.filter((p) => p.name.toLowerCase().includes(value.toLowerCase())));
    });
  }

  return (
    <div>
      <input type="search" value={query} onChange={handleSearch} placeholder="Rechercher..." />
      {isPending && <p>Filtrage en cours...</p>}
      <ul>{filtered.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </div>
  );
}
```

#### `useTransition` async (React 19)

En React 19, `startTransition` accepte une fonction `async`. Cela permet d'intégrer des appels serveur :

```tsx
const [isPending, startTransition] = useTransition();

function handleSave() {
  startTransition(async () => {
    // isPending est true pendant toute la durée
    await saveToServer(data);
    // isPending redevient false après la résolution
  });
}
```

#### `useDeferredValue` : différer le rendu d'une valeur

```tsx
"use client";

import { useState, useDeferredValue, memo } from "react";

// Composant lourd mémoïsé — ne re-rend que si query change
const HeavyList = memo(function HeavyList({ query }: { query: string }) {
  const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`);
  const filtered = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  return <ul>{filtered.slice(0, 100).map((item) => <li key={item}>{item}</li>)}</ul>;
});

function SearchWithDeferredValue() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher..."
      />
      <div style={{ opacity: isStale ? 0.6 : 1, transition: "opacity 0.2s" }}>
        <HeavyList query={deferredQuery} />
      </div>
    </div>
  );
}
```

#### Quand utiliser lequel ?

| Critère | `useTransition` | `useDeferredValue` |
|---------|-----------------|---------------------|
| Tu contrôles le `setState` | ✅ Enveloppe le setState | ❌ |
| La valeur vient d'un parent (prop) | ❌ | ✅ Enveloppe la prop |
| Indicateur de chargement | `isPending` | Comparaison `value !== deferredValue` |
| Fonctions async | ✅ (React 19) | ❌ |
| Cas d'usage typique | Recherche, filtrage, navigation | Composant enfant lourd avec prop qui change vite |

> **Règle simple** : si tu peux envelopper le `setState`, utilise `useTransition`. Si la valeur vient d'un prop que tu ne contrôles pas, utilise `useDeferredValue`.

---

### 4. React Compiler

Le React Compiler (anciennement React Forget) est un compilateur qui **mémoïse automatiquement** les composants et les valeurs. Il rend `useMemo`, `useCallback` et `React.memo` inutiles dans la plupart des cas.

#### Ce qu'il fait

Le compilateur analyse le code au build et insère automatiquement la mémoïsation là où elle est nécessaire :

```tsx
// ❌ Avant : mémoïsation manuelle partout
const ExpensiveList = memo(function ExpensiveList({ items, onSelect }: {
  items: string[];
  onSelect: (item: string) => void;
}) {
  const sorted = useMemo(() => [...items].sort(), [items]);
  const handleClick = useCallback((item: string) => onSelect(item), [onSelect]);
  return <ul>{sorted.map((item) => <li key={item} onClick={() => handleClick(item)}>{item}</li>)}</ul>;
});

// ✅ Après : le compilateur gère la mémoïsation automatiquement
function ExpensiveList({ items, onSelect }: {
  items: string[];
  onSelect: (item: string) => void;
}) {
  const sorted = [...items].sort();
  return <ul>{sorted.map((item) => <li key={item} onClick={() => onSelect(item)}>{item}</li>)}</ul>;
}
```

Le compilateur produit un code equivalent au premier, sans intervention manuelle.

#### Comment l'activer

**Avec Next.js 15+ :**

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
```

**Avec Vite** : installer `babel-plugin-react-compiler` et l'ajouter aux plugins Babel de `@vitejs/plugin-react`.

#### Migration progressive avec `"use memo"`

On peut activer le compilateur fichier par fichier avec la directive `"use memo"` en haut du fichier. C'est une directive temporaire de migration. À terme, le compilateur s'appliquera à tout le projet.

#### Ce que le compilateur n'est PAS

- **Pas un bundler** : il ne remplace ni Webpack ni Vite.
- **Pas un runtime** : il ne change pas le comportement de React, seulement les performances.
- **Pas magique** : si le code viole les règles de React, le compilateur ne peut pas optimiser.

#### Règles que le compilateur impose

1. **Pas de mutation** : `items.sort()` (mutation du prop) vs `[...items].sort()` (copie)
2. **Pas d'effets de bord dans le rendu** : pas de `fetch()` dans le corps du composant
3. **Hooks au top level** (sauf `use()`)
4. **Props et state immuables**

Le linter `eslint-plugin-react-compiler` aide à détecter ces violations avant le build.

---

### 5. Form Actions : `useActionState` et `useFormStatus`

React 19 intègre les actions de formulaire directement dans le framework. Un `<form>` peut avoir une prop `action` qui pointe vers une fonction (client ou serveur).

#### `<form action={...}>`

```tsx
// La fonction reçoit le FormData directement — pas de e.preventDefault()
<form action={async (formData: FormData) => {
  await fetch("/api/contact", { method: "POST", body: formData });
}}>
  <input name="name" required />
  <input name="email" type="email" required />
  <button type="submit">Envoyer</button>
</form>
```

> **Progressive enhancement** : avec Next.js Server Actions, le formulaire fonctionne même sans JavaScript.

#### `useActionState` : état du formulaire + erreurs

```tsx
"use client";

import { useActionState } from "react";

interface FormState {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
}

async function createAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = formData.get("password") as string;
  if (password.length < 8) {
    return { success: false, message: "", errors: { password: "Min. 8 caractères" } };
  }

  const res = await fetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ email: formData.get("email"), password }),
  });

  if (!res.ok) return { success: false, message: "Erreur serveur." };
  return { success: true, message: "Compte créé !" };
}

function RegisterForm() {
  const [state, formAction, isPending] = useActionState(createAccount, {
    success: false, message: "",
  });

  return (
    <form action={formAction}>
      <input name="email" type="email" required placeholder="Email" />
      <input name="password" type="password" required placeholder="Mot de passe" />
      {state.errors?.password && <p className="text-red-600">{state.errors.password}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? "Création..." : "Créer le compte"}
      </button>

      {state.message && (
        <p className={state.success ? "text-green-600" : "text-red-600"}>{state.message}</p>
      )}
    </form>
  );
}
```

#### `useFormStatus` : état de soumission pour les composants enfants

`useFormStatus` donne l'état de soumission du `<form>` parent le plus proche. Il doit être utilisé dans un composant **enfant** du formulaire.

```tsx
"use client";

import { useFormStatus } from "react-dom";

// SubmitButton DOIT être un composant enfant du <form>
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Envoi en cours..." : label}
    </button>
  );
}

function NewsletterForm() {
  async function subscribe(formData: FormData) {
    await fetch("/api/subscribe", { method: "POST", body: formData });
  }

  return (
    <form action={subscribe}>
      <input name="email" type="email" placeholder="votre@email.com" required />
      <SubmitButton label="S'abonner" />
    </form>
  );
}
```

> **Piège courant** : `useFormStatus` ne fonctionne **pas** dans le même composant que le `<form>`. Il doit être dans un composant enfant rendu à l'intérieur du formulaire.

---

### 6. Autres nouveautés

#### `ref` comme prop (plus besoin de `forwardRef`)

En React 19, les function components reçoivent `ref` directement comme prop :

```tsx
// ❌ Avant : forwardRef obligatoire
const Input = forwardRef<HTMLInputElement, { label: string }>(
  function Input({ label }, ref) { return <input ref={ref} aria-label={label} />; }
);

// ✅ Après : ref est une prop normale
function Input({ label, ref }: { label: string; ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} aria-label={label} />;
}
```

#### Métadonnées du document dans les composants

`<title>`, `<meta>` et `<link>` peuvent être rendus dans n'importe quel composant. React les hoist dans le `<head>` :

```tsx
function BlogPost({ post }: { post: { title: string; description: string } }) {
  return (
    <article>
      <title>{post.title} — Mon Blog</title>
      <meta name="description" content={post.description} />
      <h1>{post.title}</h1>
    </article>
  );
}
```

> En Next.js, préférer `metadata` / `generateMetadata`. Cette API React 19 est surtout utile dans les SPA sans framework.

#### Priorité des feuilles de style et préchargement

```tsx
// React insère les <link> dans le <head> et déduplique automatiquement
<link rel="stylesheet" href="/styles/base.css" precedence="default" />
<link rel="stylesheet" href="/styles/widget.css" precedence="high" />
```

#### Préchargement de ressources

React 19 expose des fonctions pour précharger des ressources depuis n'importe quel composant :

```tsx
import { preload, preconnect, prefetchDNS } from "react-dom";

preload("/fonts/inter.woff2", { as: "font", crossOrigin: "anonymous" });
preconnect("https://cdn.example.com");
prefetchDNS("https://analytics.example.com");
```

---

## Résumé

| Fonctionnalité | Ce qu'il faut retenir |
|----------------|----------------------|
| `use()` | Lit une Promise (suspend) ou un Context, peut être conditionnel |
| `useOptimistic` | Affiche un état optimiste pendant une action async, rollback automatique |
| `useTransition` | Marque un setState comme non-urgent, supporte `async` en React 19 |
| `useDeferredValue` | Diffère une valeur prop pour ne pas bloquer la saisie |
| React Compiler | Mémoïsation automatique, plus besoin de `useMemo`/`useCallback`/`memo` |
| `useActionState` | État de formulaire + validation + pending dans une seule API |
| `useFormStatus` | Pending state pour un bouton enfant du `<form>` |
| `ref` as prop | Plus besoin de `forwardRef` |
| Metadata | `<title>`, `<meta>` rendus dans n'importe quel composant |
| Resource preloading | `preload()`, `preconnect()`, `prefetchDNS()` depuis n'importe où |

---

## Pratique

### Exercice 1 : recherche avec `use()` et Suspense

Crée un composant `BookSearch` qui :
1. Contient un champ de recherche
2. À chaque soumission, crée une Promise de fetch vers `/api/books?q=...`
3. Passe cette Promise à un composant enfant `BookResults` qui utilise `use()`
4. Enveloppe `BookResults` dans `Suspense` et `ErrorBoundary`

<details>
<summary>Voir la solution</summary>

```tsx
"use client";

import { use, Suspense, useState, type FormEvent } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface Book { id: number; title: string; author: string }

function BookResults({ booksPromise }: { booksPromise: Promise<Book[]> }) {
  const books = use(booksPromise);
  if (books.length === 0) return <p>Aucun livre trouvé.</p>;
  return (
    <ul>
      {books.map((b) => <li key={b.id}><strong>{b.title}</strong> — {b.author}</li>)}
    </ul>
  );
}

function fetchBooks(query: string): Promise<Book[]> {
  return fetch(`/api/books?q=${encodeURIComponent(query)}`).then((r) => {
    if (!r.ok) throw new Error("Erreur recherche");
    return r.json();
  });
}

export function BookSearch() {
  const [booksPromise, setBooksPromise] = useState<Promise<Book[]> | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = (new FormData(e.currentTarget).get("query") as string).trim();
    if (query) setBooksPromise(fetchBooks(query));
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input name="query" placeholder="Rechercher un livre..." required />
        <button type="submit">Rechercher</button>
      </form>
      {booksPromise && (
        <ErrorBoundary fallback={<p>Erreur de recherche.</p>} resetKeys={[booksPromise]}>
          <Suspense fallback={<p>Recherche en cours...</p>}>
            <BookResults booksPromise={booksPromise} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
```

</details>

---

### Exercice 2 : liste de commentaires avec `useOptimistic`

Crée un composant `CommentSection` qui :
1. Affiche une liste de commentaires
2. Permet d'ajouter un commentaire via un formulaire
3. Utilise `useOptimistic` pour afficher le commentaire immédiatement (avec une opacité réduite)
4. Appelle une Server Action (ou une API) pour persister

<details>
<summary>Voir la solution</summary>

```tsx
"use client";

import { useOptimistic, useRef } from "react";

interface Comment { id: string; author: string; text: string; pending?: boolean }

export function CommentSection({
  comments,
  postCommentAction,
}: {
  comments: Comment[];
  postCommentAction: (author: string, text: string) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (current, newComment: { author: string; text: string }) => [
      ...current,
      { id: `temp-${Date.now()}`, ...newComment, pending: true },
    ]
  );

  async function handleSubmit(formData: FormData) {
    const author = (formData.get("author") as string).trim();
    const text = (formData.get("text") as string).trim();
    if (!author || !text) return;

    formRef.current?.reset();
    addOptimisticComment({ author, text });
    await postCommentAction(author, text);
  }

  return (
    <div>
      <h2>Commentaires ({optimisticComments.length})</h2>
      <ul>
        {optimisticComments.map((c) => (
          <li key={c.id} style={{ opacity: c.pending ? 0.5 : 1 }}>
            <strong>{c.author}</strong>: {c.text}
            {c.pending && <span> (en cours...)</span>}
          </li>
        ))}
      </ul>
      <form ref={formRef} action={handleSubmit}>
        <input name="author" placeholder="Votre nom" required />
        <textarea name="text" placeholder="Votre commentaire..." required rows={3} />
        <button type="submit">Publier</button>
      </form>
    </div>
  );
}
```

</details>

---

### Exercice 3 : champ de recherche avec `useTransition` + `useDeferredValue`

Crée un composant `UserDirectory` qui :
1. Contient un champ de recherche qui filtre une liste de 5 000 utilisateurs
2. Utilise `useTransition` pour le filtrage (avec indicateur `isPending`)
3. Passe les résultats filtrés à un composant enfant `UserList` via `useDeferredValue`
4. `UserList` est mémoïsé avec `memo` et affiche les 50 premiers résultats

<details>
<summary>Voir la solution</summary>

```tsx
"use client";

import { useState, useTransition, useDeferredValue, memo } from "react";

interface User { id: number; name: string; email: string; department: string }

const ALL_USERS: User[] = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  name: `Utilisateur ${i + 1}`,
  email: `user${i + 1}@example.com`,
  department: ["Engineering", "Marketing", "Sales", "Support", "Design"][i % 5],
}));

const UserList = memo(function UserList({ users }: { users: User[] }) {
  return (
    <ul>
      {users.slice(0, 50).map((u) => (
        <li key={u.id}>{u.name} — {u.email} ({u.department})</li>
      ))}
    </ul>
  );
});

export function UserDirectory() {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(ALL_USERS);
  const [isPending, startTransition] = useTransition();
  const deferredFiltered = useDeferredValue(filtered);
  const isStale = filtered !== deferredFiltered;

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    startTransition(() => {
      const lower = value.toLowerCase();
      setFiltered(
        value.trim()
          ? ALL_USERS.filter((u) =>
              u.name.toLowerCase().includes(lower) ||
              u.email.toLowerCase().includes(lower)
            )
          : ALL_USERS
      );
    });
  }

  return (
    <div>
      <input type="search" value={query} onChange={handleSearch} placeholder="Rechercher..." />
      {isPending && <p>Filtrage en cours...</p>}
      <p>{filtered.length} résultat(s)</p>
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        <UserList users={deferredFiltered} />
      </div>
    </div>
  );
}
```

</details>

---

> **Prochain cours** : [Cours 37 — Tailwind CSS](../09-styling/01-tailwind-css.md)
