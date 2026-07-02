# Lab 06 — Rendu conditionnel et listes

> **Outcome :** à la fin, tu sais rendre une liste dynamique avec une key stable et gérer les trois états vide/chargement/erreur d'un fil de posts en React 19 + TypeScript.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis le `FamilyFeed` de l'admin TribuZen : le mur qui affiche les posts d'une famille. Cahier des charges **exact** :

1. **`FamilyFeed`** reçoit `posts: Post[]`, `loading: boolean`, `error: string | null` et un état de filtre local `onlyPinned: boolean` (bouton toggle).
2. Gère les **trois états** dans cet ordre par early return : chargement → erreur → vide.
3. **Filtre** (`onlyPinned`) et **trie** (par `createdAt` décroissant) les posts **avant** le JSX, sur une copie.
4. Rend la liste avec une **key stable** (`post.id`, jamais l'index).
5. L'**état vide** affiche un message qui dépend du filtre (« Aucun post épinglé » vs « Aucun post pour le moment »).
6. Les posts épinglés ont un style distinct.

**Données de départ (à copier dans `App.tsx`) :**

```tsx
export interface Post {
  id: string;
  author: string;
  body: string;
  pinned: boolean;
  createdAt: number; // timestamp ms
}

const DEMO_POSTS: Post[] = [
  { id: 'p1', author: 'Alice', body: 'On part au parc dimanche ?', pinned: false, createdAt: 1717000000000 },
  { id: 'p2', author: 'Bob', body: 'Rappel : réunion de famille vendredi', pinned: true, createdAt: 1717500000000 },
  { id: 'p3', author: 'Chloé', body: 'Photos du week-end ajoutées', pinned: false, createdAt: 1717200000000 },
];
```

**Contraintes :**
- `FamilyFeed` ne fetche pas : il reçoit `posts`/`loading`/`error` par props (le fetch viendra plus tard avec `useQuery`).
- Pas de `.sort()` sur le tableau des props directement — copie avec `[...posts]`.
- Aucune garde `{posts.length && ...}` : utilise `length === 0` explicite.
- **Pas de gap-fill** — tu écris le composant complet depuis le starter.

### Starter minimal

Crée un projet Vite et ces fichiers :

```
pnpm create vite@latest tribuzen-feed --template react-ts

src/
  features/
    feed/
      FamilyFeed.tsx   ← à écrire
  App.tsx              ← DEMO_POSTS + toggle loading/error pour tester les états
```

Lance `pnpm dev` et valide chaque état dans le navigateur.

---

## Étapes (en friction)

1. **Type + props** — dans `FamilyFeed.tsx`, déclare `FamilyFeedProps` (`posts`, `loading`, `error`) ; `onlyPinned` sera un `useState` local avec un bouton toggle.
2. **Prépare les données** — au-dessus du `return`, calcule `visiblePosts` = `[...posts]` filtré sur `onlyPinned` puis trié par `createdAt` décroissant.
3. **Gardes early return** — `if (loading)`, `if (error)`, puis `if (visiblePosts.length === 0)` avec message dépendant de `onlyPinned`.
4. **Liste nominale** — `visiblePosts.map((post) => <li key={post.id}>…)`, avec classe distincte si `post.pinned`.
5. **Bouton filtre** — un `<button>` qui inverse `onlyPinned`, avec `aria-pressed`.
6. **Branche dans `App.tsx`** — passe `DEMO_POSTS`. Teste les états : force `loading`, puis `error='Réseau indisponible'`, puis `posts={[]}`, puis active le filtre sur des posts non épinglés.

---

## Corrigé complet commenté

```tsx
// ─── src/features/feed/FamilyFeed.tsx ───────────────────────────
import { useState } from 'react';

export interface Post {
  id: string;
  author: string;
  body: string;
  pinned: boolean;
  createdAt: number;
}

interface FamilyFeedProps {
  posts: Post[];
  loading: boolean;
  error: string | null;
}

function FamilyFeed({ posts, loading, error }: FamilyFeedProps) {
  // Filtre local — état UI pur, légitime dans ce composant
  const [onlyPinned, setOnlyPinned] = useState(false);

  // 1) Données préparées AVANT le JSX, sur une COPIE (ne pas muter les props)
  const visiblePosts = [...posts]
    .filter((p) => (onlyPinned ? p.pinned : true))
    .sort((a, b) => b.createdAt - a.createdAt); // plus récent en premier

  // 2) Gardes : chaque état a sa sortie dédiée, dans l'ordre loading → error → vide
  if (loading) return <p>Chargement du fil…</p>;
  if (error) return <p style={{ color: '#c0392b' }}>Erreur : {error}</p>;

  return (
    <div>
      {/* Bouton filtre — aria-pressed reflète l'état pour l'accessibilité */}
      <button onClick={() => setOnlyPinned((v) => !v)} aria-pressed={onlyPinned}>
        {onlyPinned ? '★ Épinglés seulement' : 'Tous les posts'}
      </button>

      {/* 3) État vide explicite (length === 0, pas `posts.length &&`) */}
      {visiblePosts.length === 0 ? (
        <p style={{ color: '#666' }}>
          {onlyPinned ? 'Aucun post épinglé' : 'Aucun post pour le moment'}
        </p>
      ) : (
        // 4) Liste nominale — key = post.id (identité stable, jamais l'index)
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {visiblePosts.map((post) => (
            <li
              key={post.id}
              style={{
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
                borderRadius: 6,
                background: post.pinned ? '#fff7ed' : '#f3f4f6',
                borderLeft: post.pinned ? '3px solid #f59e0b' : '3px solid transparent',
              }}
            >
              {post.pinned && <span aria-label="Épinglé">📌 </span>}
              <strong>{post.author}</strong> — {post.body}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FamilyFeed;

// ─── src/App.tsx ─────────────────────────────────────────────────
import FamilyFeed, { type Post } from './features/feed/FamilyFeed';

const DEMO_POSTS: Post[] = [
  { id: 'p1', author: 'Alice', body: 'On part au parc dimanche ?', pinned: false, createdAt: 1717000000000 },
  { id: 'p2', author: 'Bob', body: 'Rappel : réunion de famille vendredi', pinned: true, createdAt: 1717500000000 },
  { id: 'p3', author: 'Chloé', body: 'Photos du week-end ajoutées', pinned: false, createdAt: 1717200000000 },
];

function App() {
  // Change ces valeurs à la main pour tester les trois états :
  //   loading={true}                       → "Chargement du fil…"
  //   error="Réseau indisponible"          → message d'erreur
  //   posts={[]}                           → état vide
  return (
    <div style={{ padding: '2rem', maxWidth: 480 }}>
      <h1>TribuZen Admin — FamilyFeed</h1>
      <FamilyFeed posts={DEMO_POSTS} loading={false} error={null} />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- `[...posts]` avant `.sort()` : on trie une copie, jamais le tableau des props → pas de mutation du parent.
- Ordre des gardes `loading → error → vide` : on ne rend le cas nominal que quand tout est prêt et non vide.
- `visiblePosts.length === 0` (pas `posts.length &&`) : pas de `0` fantôme, et message contextualisé au filtre.
- `key={post.id}` : la réconciliation reste stable quand on active le filtre (les posts changent de position sans que React s'emmêle).
- `onlyPinned` est un état **UI local** (pas de la donnée métier) → légitime dans un composant qui reçoit sinon tout par props.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes :**

1. Ajoute un **compteur** en tête : « X post(s) affiché(s) sur Y » (Y = total, X = après filtre).
2. Remplace le toggle par **trois** boutons de filtre générés depuis un objet de mapping `{ all: 'Tous', pinned: 'Épinglés', mine: 'Les miens' }` — « Les miens » filtre sur `author === 'Alice'`. Utilise `Object.keys(...).map()` avec `key` = la clé de filtre et `aria-pressed`.
3. Groupe l'affichage : les posts épinglés d'abord (dans une `<section>`), puis les autres — chaque section rendue avec son propre `.map()` et un `<Fragment key>` si besoin de dt/dd.
4. **Sans rouvrir** ce corrigé ni le module 06.

**Critère de réussite :** le compteur est juste, les trois filtres marchent, chaque bouton reflète l'état actif, et supprimer/réordonner ne casse pas l'affichage (key stable).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ce composant vit ici :

```
tribuzen/src/
  features/
    feed/
      FamilyFeed.tsx
      PostItem.tsx        ← <li> extrait en composant présentationnel (module 05)
  components/
    ui/
      EmptyState.tsx      ← message d'état vide réutilisable
```

**Différences par rapport au lab :**
- `posts`/`loading`/`error` viendront de `useQuery(['feed', familyId], …)` (module data-fetching) au lieu des props manuelles — la logique de rendu conditionnel reste identique.
- Le `<li>` inline sera extrait en `PostItem` présentationnel (pattern module 05), et l'état vide en `EmptyState` réutilisable.
- Les styles inline seront remplacés par les tokens du design system TribuZen.

**Commit cible :**
```
feat(feed): FamilyFeed — liste filtrée + états vide/chargement/erreur, key stable
```
