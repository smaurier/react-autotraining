---
titre: Rendu conditionnel et listes
cours: 04-react
notions: [rendu conditionnel avec ternaire et court-circuit &&, early return comme garde, objet de mapping vs switch, rendu de listes avec map, key stable et réconciliation, Fragment avec key, états vide chargement erreur, filtrer et trier avant le JSX]
outcomes: [choisir le bon pattern de rendu conditionnel selon le nombre de branches, rendre une liste dynamique avec une key stable, gérer proprement les états vide chargement erreur d'une liste]
prerequis: [05-composants-et-composition]
next: 07-evenements-et-formulaires-basiques
libs: [{ name: react, version: "^19" }]
tribuzen: FamilyFeed de l'admin TribuZen — liste de posts filtrée avec états vide/chargement/erreur et key stable
last-reviewed: 2026-07
---

# Rendu conditionnel et listes

> **Outcomes — tu sauras FAIRE :** choisir le bon pattern de rendu conditionnel selon le nombre de branches, rendre une liste dynamique avec une key stable, gérer proprement les états vide/chargement/erreur d'une liste.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu ouvres le `FamilyFeed` de l'admin TribuZen — le mur qui affiche les posts d'une famille. Un collègue a écrit ça, et ça marche « en dev » mais casse en prod dès qu'on filtre ou supprime un post.

```tsx
// FamilyFeed.tsx — AVANT
function FamilyFeed({ posts, loading, error, onlyPinned }: FamilyFeedProps) {
  return (
    <div className="feed">
      {loading && <Spinner />}
      {error && <p>Erreur : {error}</p>}

      {/* ❌ Piège 1 : affiche "0" à l'écran quand posts est vide */}
      {posts.length && (
        <ul>
          {/* ❌ Piège 2 : filtre + tri directement dans le JSX, illisible */}
          {posts
            .filter((p) => (onlyPinned ? p.pinned : true))
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((post, index) => (
              // ❌ Piège 3 : key={index} → réconciliation cassée quand on filtre
              <li key={index}>
                {post.author} — {post.body}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
```

**Trois bugs concrets :**
1. `{posts.length && ...}` affiche littéralement `0` dans la page quand la liste est vide (le nombre `0` est un ReactNode affichable).
2. Le `.filter().sort()` inline rend le JSX illisible et recalcule à chaque render.
3. `key={index}` : dès qu'on filtre ou réordonne, React associe le mauvais DOM au mauvais post — champs d'édition qui gardent la valeur du voisin, animations qui sautent.

Et il manque le cas le plus fréquent en vrai : l'**état vide** (« Aucun post »). Ce module te donne les patterns pour écrire ce composant correctement.

---

## 2. Théorie complète, concise

En React il n'y a **pas de directives** type `v-if` / `@if` / `v-for`. On écrit du JavaScript pur dans le JSX. C'est plus verbeux mais totalement explicite et débuggable.

### 2.1 Ternaire — deux branches

Le pattern par défaut pour basculer entre A et B :

```tsx
function Status({ isOnline }: { isOnline: boolean }) {
  return <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>;
}
```

À l'intérieur du JSX, seule une **expression** est autorisée (pas de `if`). Le ternaire est une expression → il passe. Un `if` classique, non.

### 2.2 Court-circuit `&&` — une seule branche

Afficher un élément seulement si la condition est vraie :

```tsx
{unreadCount > 0 && <Badge count={unreadCount} />}
```

**Le piège central du module.** `a && b` renvoie `a` si `a` est falsy. Or React **affiche** les nombres et les chaînes — mais ignore `false`, `null`, `undefined`.

```tsx
{posts.length && <List posts={posts} />}     // ❌ rend "0" quand length === 0
{posts.length > 0 && <List posts={posts} />} // ✅ la garde est un vrai booléen
```

Règle : à gauche d'un `&&` de rendu, mets **toujours un booléen**, jamais un nombre brut.

### 2.3 Early return — garde en tête de composant

Idéal pour sortir tôt sur les cas limites (chargement, erreur, absence de données) et garder le corps du composant focalisé sur le cas nominal :

```tsx
function MemberProfile({ member, loading, error }: MemberProfileProps) {
  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!member) return <p>Membre introuvable</p>;

  // Ici, member est garanti non-null : le reste ne gère que le cas heureux
  return <h1>{member.name}</h1>;
}
```

C'est souvent plus lisible que d'imbriquer trois ternaires dans le JSX.

### 2.4 Objet de mapping — remplace le `switch`

Quand un rendu dépend d'une valeur parmi plusieurs, une table de config bat le `switch` :

```tsx
const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: 'gray' },
  pending: { label: 'En attente', color: 'orange' },
  published: { label: 'Publié', color: 'green' },
  archived: { label: 'Archivé', color: 'red' },
} as const satisfies Record<string, { label: string; color: string }>;

type Status = keyof typeof STATUS_CONFIG;

function StatusBadge({ status }: { status: Status }) {
  const { label, color } = STATUS_CONFIG[status];
  return <span style={{ color }}>{label}</span>;
}
```

Avantage : ajouter un statut = ajouter une ligne, et `keyof typeof` garde le type synchronisé avec la table.

### 2.5 Rendu de listes avec `.map()`

On transforme un tableau de données en tableau de JSX avec `.map()` :

```tsx
interface Post {
  id: string;
  author: string;
  body: string;
}

function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul>
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </ul>
  );
}
```

`.map()` (et pas `.forEach()`) car il faut **retourner** le tableau d'éléments pour que JSX l'insère.

### 2.6 Pourquoi `key` est crucial

React utilise `key` pendant la **réconciliation** : entre deux renders, il compare les listes par key pour savoir quel élément a bougé, été ajouté ou supprimé, et réutilise le DOM existant au lieu de tout recréer.

```tsx
{items.map((item, index) => <Row key={index} item={item} />)} // ❌ index instable
{items.map((item) => <Row key={item.id} item={item} />)}      // ✅ id stable
```

Avec `key={index}`, si tu supprimes l'élément du milieu, tous les index suivants se décalent : React croit que le contenu a changé et associe le mauvais état (input, focus, animation) au mauvais élément.

**Quand l'index est tolérable comme key :** liste **statique** (jamais filtrée, réordonnée ni éditée) **et** éléments sans état interne. Dans le doute : id stable.

Deux règles sur la key :
- Unique **parmi les frères** seulement (pas globalement).
- Ne se lit pas depuis l'enfant : `key` est consommée par React, ce n'est pas une prop accessible dans le composant.

### 2.7 `Fragment` avec `key`

Quand chaque item doit rendre **plusieurs nœuds** sans wrapper DOM (ex. `<dt>` + `<dd>`), la syntaxe courte `<>...</>` n'accepte pas d'attribut. Il faut le `Fragment` explicite :

```tsx
import { Fragment } from 'react';

function Glossary({ items }: { items: DefinitionItem[] }) {
  return (
    <dl>
      {items.map((item) => (
        <Fragment key={item.id}>
          <dt>{item.term}</dt>
          <dd>{item.definition}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
```

### 2.8 Filtrer et trier AVANT le JSX

Prépare les données dans des variables en haut du composant. Le JSX reste déclaratif et lisible :

```tsx
function TaskDashboard({ tasks }: { tasks: Task[] }) {
  const activeTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.priority - b.priority);
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div>
      <h2>Actives ({activeTasks.length})</h2>
      <p>{doneCount} terminée(s)</p>
      {/* le JSX ne fait que décrire, plus aucune logique de données */}
    </div>
  );
}
```

`.sort()` mute le tableau en place : trie sur une copie (`[...tasks].sort(...)`) si `tasks` vient des props, pour ne pas modifier la donnée du parent.

### 2.9 Les trois états d'une liste : vide / chargement / erreur

Une liste réelle vient d'une API. Trois états à gérer explicitement, sinon l'UI est cassée :

```tsx
function Feed({ posts, loading, error }: FeedProps) {
  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (posts.length === 0) return <EmptyState message="Aucun post pour l'instant" />;

  return (
    <ul>
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </ul>
  );
}
```

L'**état vide** est le plus souvent oublié : une liste vide n'est pas une erreur, c'est un cas nominal qui mérite un message dédié.

---

## 3. Worked examples

### Exemple 1 — Corriger le `FamilyFeed` du cas concret

On reprend le composant buggé de la section 1 et on le répare pas à pas.

```tsx
// FamilyFeed.tsx — APRÈS
interface Post {
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
  onlyPinned: boolean;
}

function FamilyFeed({ posts, loading, error, onlyPinned }: FamilyFeedProps) {
  // 1) Données préparées AVANT le JSX (copie pour ne pas muter les props)
  const visiblePosts = [...posts]
    .filter((p) => (onlyPinned ? p.pinned : true))
    .sort((a, b) => b.createdAt - a.createdAt);

  // 2) Gardes early return : chaque état a sa sortie dédiée
  if (loading) return <Spinner />;
  if (error) return <p className="feed__error">Erreur : {error}</p>;

  // 3) État vide traité explicitement — length === 0, pas `posts.length &&`
  if (visiblePosts.length === 0) {
    return (
      <p className="feed__empty">
        {onlyPinned ? 'Aucun post épinglé' : 'Aucun post pour le moment'}
      </p>
    );
  }

  // 4) Cas nominal : liste avec key stable = post.id (jamais l'index)
  return (
    <ul className="feed">
      {visiblePosts.map((post) => (
        <li key={post.id} className={post.pinned ? 'feed__item--pinned' : 'feed__item'}>
          <strong>{post.author}</strong> — {post.body}
        </li>
      ))}
    </ul>
  );
}

export default FamilyFeed;
```

**Ce qui a changé, et pourquoi :**
- `filter/sort` remontés dans `visiblePosts` → JSX lisible, logique isolée, testable.
- `[...posts]` avant `.sort()` → on ne mute pas le tableau du parent.
- `if (visiblePosts.length === 0)` → plus de `0` fantôme, et message adapté au filtre.
- `key={post.id}` → réconciliation stable même après filtre ou réordonnancement.

### Exemple 2 — Barre de filtres + état vide contextualisé

Une vue liste de membres avec 3 filtres de rôle. Montre le pattern « boutons de filtre mappés » + état vide qui dépend du filtre courant.

```tsx
import { useState } from 'react';

interface Member {
  id: string;
  name: string;
  role: 'admin' | 'mod' | 'member';
}

type RoleFilter = 'all' | 'admin' | 'mod' | 'member';

// Table label : source unique de vérité pour les libellés des boutons
const FILTER_LABELS: Record<RoleFilter, string> = {
  all: 'Tous',
  admin: 'Admins',
  mod: 'Modos',
  member: 'Membres',
};

function MemberList({ members }: { members: Member[] }) {
  const [filter, setFilter] = useState<RoleFilter>('all');

  const visible = members.filter((m) => filter === 'all' || m.role === filter);

  return (
    <div>
      {/* Boutons générés depuis les clés de la table — pas de duplication */}
      <div className="filters">
        {(Object.keys(FILTER_LABELS) as RoleFilter[]).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
          >
            {FILTER_LABELS[key]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty">Aucun membre dans « {FILTER_LABELS[filter]} »</p>
      ) : (
        <ul>
          {visible.map((m) => (
            <li key={m.id}>
              {m.name} — {m.role}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MemberList;
```

**Points clés de cet exemple :**
- Les boutons sont eux aussi une liste `.map()` → key stable = la clé de filtre (valeur stable et unique).
- Un seul objet `FILTER_LABELS` alimente à la fois les boutons et le message vide → zéro duplication de libellé.
- Ici un ternaire `vide ? ... : liste` est justifié (deux branches vraiment alternatives, corps court). Au-delà, préférer un early return.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — `{count && <X/>}` affiche `0`

```tsx
{cart.items.length && <CartBadge />}      // ❌ rend "0" quand le panier est vide
{cart.items.length > 0 && <CartBadge />}  // ✅ garde booléenne
```

React ignore `false`/`null`/`undefined` mais **affiche** `0` et `''` (chaîne vide ne rend rien visuellement, mais `0` oui). Toujours une comparaison booléenne à gauche du `&&`.

### PIÈGE #2 — `key={index}` sur une liste modifiable

```tsx
{todos.map((todo, i) => <TodoRow key={i} todo={todo} />)}   // ❌
{todos.map((todo) => <TodoRow key={todo.id} todo={todo} />)} // ✅
```

L'index est la **position**, pas l'**identité**. Dès qu'on supprime, insère ou réordonne, les positions glissent et React réassocie l'état interne (valeur d'input, focus, animation) au mauvais élément. Index acceptable uniquement sur liste 100 % statique sans état interne.

### PIÈGE #3 — `<>...</>` avec `key`

```tsx
{items.map((it) => (
  <key={it.id}>                     // ❌ n'existe pas, erreur de syntaxe
    <dt>{it.term}</dt><dd>{it.def}</dd>
  </>
))}

import { Fragment } from 'react';
{items.map((it) => (
  <Fragment key={it.id}>            // ✅ seul le Fragment explicite accepte key
    <dt>{it.term}</dt><dd>{it.def}</dd>
  </Fragment>
))}
```

Le fragment court `<>` ne peut recevoir **aucun** attribut, key comprise. Pour porter une key, importe `Fragment`.

### PIÈGE #4 — Filtrer/trier dans le JSX (et muter les props)

```tsx
{props.tasks.sort((a, b) => a.p - b.p).map(...)}  // ❌ mute props.tasks + illisible

const sorted = [...props.tasks].sort((a, b) => a.p - b.p);  // ✅ copie + variable
return <ul>{sorted.map(...)}</ul>;
```

`.sort()` modifie le tableau **en place**. Sur un tableau venu des props, ça mute la donnée du parent → bugs fantômes. Prépare une copie dans une variable au-dessus du `return`.

### PIÈGE #5 — Oublier l'état vide

```tsx
// ❌ Si posts === [], on affiche un <ul> vide : l'utilisateur voit une page blanche
return <ul>{posts.map((p) => <li key={p.id}>{p.body}</li>)}</ul>;

// ✅ Un état vide explicite = UX correcte
if (posts.length === 0) return <EmptyState message="Aucun post" />;
```

Une liste vide n'est pas une erreur : c'est un cas nominal qui mérite un message, pas un conteneur vide silencieux.

---

## 5. Ancrage TribuZen

Dans l'admin web TribuZen (Next.js/React), le rendu conditionnel et les listes sont partout dès qu'on affiche de la donnée serveur.

**`FamilyFeed`** (`src/features/feed/FamilyFeed.tsx`) — le mur d'une famille. C'est le cas concret et l'Exemple 1 du module : filtre `onlyPinned`, tri par `createdAt`, key = `post.id`, et les trois états vide/chargement/erreur. Alimenté plus tard par `useQuery` (module data-fetching), mais la logique de rendu reste identique.

**`MemberList`** (`src/features/member/MemberList.tsx`) — la liste des membres d'une famille, avec barre de filtres par rôle (Exemple 2). Chaque ligne réutilise le `Badge` du module 05 pour le rôle.

**`NotificationDropdown`** (`src/features/notif/NotificationDropdown.tsx`) — `{unreadCount > 0 && <Dot />}` sur la cloche (piège #1 grandeur nature), et liste des notifications avec état vide « Rien de neuf ».

**`StatusBadge`** (`src/components/ui/StatusBadge.tsx`) — table `STATUS_CONFIG` (section 2.4) pour les statuts de familles (`active` / `pending` / `archived`) et d'événements.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  features/
    feed/FamilyFeed.tsx
    member/MemberList.tsx
    notif/NotificationDropdown.tsx
  components/
    ui/StatusBadge.tsx
    ui/EmptyState.tsx
```

---

## 6. Points clés

1. Dans le JSX, seules des **expressions** sont autorisées : ternaire pour deux branches, `&&` pour une, jamais un `if` inline.
2. À gauche d'un `&&` de rendu, mets toujours un **booléen** — sinon `0` s'affiche à l'écran.
3. L'**early return** en tête de composant gère chargement/erreur/absence proprement et garde le corps focalisé sur le cas nominal.
4. Un **objet de mapping** (`Record` + `keyof typeof`) remplace le `switch` et garde le type synchronisé.
5. `.map()` rend une liste ; la **key doit être stable et unique parmi les frères** — `post.id`, jamais l'index sur une liste modifiable.
6. La key sert à la **réconciliation** : un index instable réassocie le mauvais état au mauvais élément après filtre/tri/suppression.
7. Pour rendre plusieurs nœuds par item avec une key, utilise `<Fragment key={...}>` — le fragment court `<>` n'accepte pas d'attribut.
8. **Filtre et trie avant le JSX** dans des variables, sur une **copie** (`[...arr]`) pour ne pas muter les props.
9. Gère toujours l'**état vide** : une liste vide est un cas nominal, pas un `<ul>` silencieux.

---

## 7. Seeds Anki

```
Pourquoi `{items.length && <List/>}` peut-il afficher "0" à l'écran ?|`a && b` renvoie `a` si `a` est falsy, et React affiche le nombre 0. Il faut une garde booléenne : `{items.length > 0 && <List/>}`.
Quand peut-on utiliser l'index de tableau comme `key` sans risque ?|Seulement si la liste est statique (jamais filtrée, réordonnée ni éditée) ET que les éléments n'ont pas d'état interne. Sinon, un id stable est obligatoire.
À quoi sert la prop `key` dans une liste React ?|À la réconciliation : React compare les listes par key entre deux renders pour identifier ce qui a bougé/été ajouté/supprimé et réutiliser le bon DOM. La key doit être unique parmi les frères.
Comment rendre plusieurs nœuds (dt + dd) par item de liste avec une key ?|Avec `<Fragment key={item.id}>...</Fragment>` importé depuis 'react'. La syntaxe courte `<>...</>` n'accepte aucun attribut, key comprise.
Quel pattern de rendu conditionnel choisir : ternaire, &&, early return ou objet de mapping ?|Ternaire pour deux branches courtes ; `&&` pour une seule branche (avec garde booléenne) ; early return pour les gardes loading/error/null en tête de composant ; objet de mapping pour choisir parmi plusieurs valeurs (remplace switch).
Pourquoi filtrer/trier hors du JSX, et avec une copie ?|Pour garder le JSX déclaratif et lisible, et parce que `.sort()` mute le tableau en place : sur des props, `[...arr].sort()` évite de modifier la donnée du parent.
Pourquoi faut-il traiter explicitement l'état vide d'une liste ?|Une liste vide n'est pas une erreur mais un cas nominal. Sans garde `length === 0`, on rend un conteneur vide silencieux (page blanche) au lieu d'un message d'état vide utile.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-06-rendu-conditionnel-et-listes/README.md`. Construire le `FamilyFeed` de l'admin TribuZen de zéro : filtre, tri, key stable et les trois états vide/chargement/erreur, validé en direct dans le navigateur.
