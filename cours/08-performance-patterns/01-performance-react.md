# Cours 33 — Performance React : comprendre et optimiser les re-rendus

> **Objectif** : Comprendre le modèle de rendu de React (quand et pourquoi un composant se re-rend), maîtriser `React.memo()`, `useMemo`, `useCallback`, le code splitting avec `React.lazy` + `Suspense`, et savoir utiliser le React DevTools Profiler pour diagnostiquer les goulots d'étranglement. Comparer avec `OnPush` (Angular) et le caching des `computed` (Vue 3).

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre un test unitaire Vitest et un test d'intégration avec MSW ?</summary>

Un test unitaire Vitest vérifie une fonction ou un hook de manière isolée, sans dépendance réseau. Un test d'intégration avec MSW (Mock Service Worker) simule les appels HTTP au niveau réseau pour tester l'interaction composant + API sans backend réel.
</details>

<details>
<summary>2. Quel sélecteur React Testing Library privilégier pour cibler un bouton ?</summary>

`screen.getByRole('button', { name: /texte du bouton/i })` — on cherche par rôle accessible plutôt que par classe CSS ou test-id.
</details>

<details>
<summary>3. Pourquoi utiliser `waitFor` ou `findBy` dans les tests asynchrones ?</summary>

Les données chargées de manière asynchrone n'apparaissent pas immédiatement dans le DOM. `findBy` attend qu'un élément apparaisse (polling), `waitFor` attend qu'une assertion passe. Sans eux, le test échoue car le DOM n'est pas encore mis à jour.
</details>

---

## Analogie

Imaginez un **peintre en bâtiment** qui repeint toute la pièce à chaque fois qu'on change la couleur d'un mur. C'est le comportement par défaut de React : quand un composant parent re-rend, **tous ses enfants re-rendent aussi**, même si leurs props n'ont pas changé. Les outils de performance (`React.memo`, `useMemo`, `useCallback`) sont comme des instructions au peintre : "ne repeins ce mur que si la couleur a réellement changé".

En Angular, `ChangeDetectionStrategy.OnPush` joue ce rôle automatiquement. En Vue, les `computed` sont naturellement cachés. En React, c'est **opt-in** et explicite.

---

## Théorie

### 1. Quand un composant React re-rend-il ?

Un composant re-rend dans exactement trois cas :

1. **Son state change** (`useState`, `useReducer`)
2. **Son parent re-rend** (cascade par défaut)
3. **Le contexte auquel il souscrit change** (`useContext`)

```tsx
// ❌ Idée fausse : "les props changent → re-rendu"
// En réalité : le parent re-rend → l'enfant re-rend → les nouvelles props sont passées

function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      {/* Child re-rend à CHAQUE clic, même si title ne change jamais */}
      <Child title="Statique" />
    </div>
  );
}

function Child({ title }: { title: string }) {
  console.log("Child rendu !"); // S'affiche à chaque clic parent
  return <h2>{title}</h2>;
}
```

> **Comparaison Angular** : avec la stratégie `Default`, Angular vérifie aussi tous les composants. Avec `OnPush`, il ne vérifie que si les `@Input()` changent par référence. React n'a pas d'équivalent automatique — il faut utiliser `React.memo`.

### 2. React.memo() : mémoriser un composant

`React.memo()` empêche le re-rendu si les props n'ont pas changé (comparaison superficielle) :

```tsx
// ✅ Child ne re-rend que si title change
const Child = React.memo(function Child({ title }: { title: string }) {
  console.log("Child rendu !");
  return <h2>{title}</h2>;
});
```

> **Comparaison Vue** : en Vue 3, un composant enfant avec des props primitives ne re-rend pas inutilement grâce au système de réactivité. `React.memo` reproduit ce comportement manuellement.

#### Piège : les objets et fonctions

```tsx
// ❌ React.memo inutile ici — l'objet est recréé à chaque rendu
function Parent() {
  const [count, setCount] = useState(0);
  const style = { color: "red" }; // Nouvelle référence à chaque rendu !

  return <MemoChild style={style} />;
}

const MemoChild = React.memo(function MemoChild({ style }: { style: React.CSSProperties }) {
  return <p style={style}>Texte</p>;
});
```

### 3. useMemo : mémoriser une valeur calculée

```tsx
// ✅ Le filtrage n'est recalculé que si tasks ou filter changent
const filteredTasks = useMemo(
  () => tasks.filter((t) => t.status === filter),
  [tasks, filter]
);
```

```tsx
// ❌ useMemo inutile pour des calculs simples
const doubled = useMemo(() => count * 2, [count]); // Surcoût > gain
```

**Quand utiliser `useMemo` ?**

| Situation | useMemo ? |
|-----------|-----------|
| Filtrage/tri d'une grande liste (> 100 éléments) | ✅ Oui |
| Calcul mathématique simple | ❌ Non |
| Objet passé en prop à un composant `memo()` | ✅ Oui |
| Valeur dérivée affichée directement | ❌ Non |

> **Comparaison Vue** : `useMemo` est l'équivalent de `computed()` en Vue 3, sauf qu'il faut déclarer les dépendances manuellement. En Vue, le tracking est automatique.

### 4. useCallback : mémoriser une fonction

```tsx
function TaskList({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState("all");

  // ✅ La référence de la fonction est stable si filter ne change pas
  const handleDelete = useCallback(
    (id: string) => {
      // logique de suppression
    },
    [] // pas de dépendance → la fonction est créée une seule fois
  );

  return (
    <>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onDelete={handleDelete} />
      ))}
    </>
  );
}

const TaskItem = React.memo(function TaskItem({
  task,
  onDelete,
}: {
  task: Task;
  onDelete: (id: string) => void;
}) {
  return (
    <li>
      {task.title}
      <button onClick={() => onDelete(task.id)}>Supprimer</button>
    </li>
  );
});
```

> **Règle** : `useCallback` n'est utile que si la fonction est passée en prop à un composant enveloppé par `React.memo`, ou utilisée comme dépendance d'un `useEffect`.

### 5. React.lazy + Suspense : code splitting

```tsx
import { lazy, Suspense } from "react";

// ✅ Le composant n'est chargé que quand il est rendu
const AdminPanel = lazy(() => import("./AdminPanel"));

function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div>
      <button onClick={() => setShowAdmin(true)}>Admin</button>
      {showAdmin && (
        <Suspense fallback={<p>Chargement du panneau admin...</p>}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}
```

> **En Next.js 15**, le code splitting est automatique par route (chaque `page.tsx` est un chunk séparé). `React.lazy` reste utile pour le splitting de composants lourds au sein d'une même page.

### 6. React DevTools Profiler

Le Profiler permet de visualiser les rendus :

1. Installer l'extension **React Developer Tools** (Chrome/Firefox)
2. Onglet **Profiler** → cliquer **Record**
3. Interagir avec l'application
4. Arrêter l'enregistrement → analyser le **flamegraph**

**Ce qu'il faut chercher :**
- Composants qui re-rendent sans raison (gris clair = pas de changement mais rendu quand même)
- Rendus longs (> 16ms = perte de frame à 60fps)
- Cascade de re-rendus depuis un composant racine

### 7. Anti-patterns de performance courants

```tsx
// ❌ Anti-pattern 1 : définir un composant dans un composant
function Parent() {
  // Recrée un NOUVEAU type de composant à chaque rendu !
  function Child() {
    return <p>Hello</p>;
  }
  return <Child />;
}

// ✅ Correction : définir Child en dehors
function Child() {
  return <p>Hello</p>;
}
function Parent() {
  return <Child />;
}
```

```tsx
// ❌ Anti-pattern 2 : state trop haut dans l'arbre
// Si seul le formulaire a besoin du state, ne le mettez pas dans App

// ❌ Anti-pattern 3 : nouveau contexte pour chaque micro-state
// Utilisez Zustand pour du state fréquemment mis à jour
```

| Anti-pattern | Solution |
|-------------|----------|
| Composant défini dans un composant | Extraire en dehors |
| State trop haut | Colocaliser le state |
| Objet/fonction recréé en prop | `useMemo` / `useCallback` |
| Context pour state fréquent | Zustand ou autre store |
| Liste sans `key` stable | Ajouter `key={item.id}` |

---

## Pratique

### Exercice : optimiser une liste de produits

Vous avez un composant `ProductList` avec un champ de recherche. Chaque frappe dans le champ provoque le re-rendu de **tous** les `ProductCard`, même ceux qui ne changent pas. Optimisez ce code.

```tsx
interface Product {
  id: string;
  name: string;
  price: number;
}

function ProductList({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher..."
      />
      <div>
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  console.log(`Rendu: ${product.name}`);
  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", margin: "0.5rem" }}>
      <h3>{product.name}</h3>
      <p>{product.price} EUR</p>
    </div>
  );
}
```

<details>
<summary>Voir la solution</summary>

```tsx
import { useState, useMemo, memo } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
}

function ProductList({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");

  // ✅ useMemo : ne re-filtre que si products ou search changent
  const filtered = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher..."
      />
      <div>
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

// ✅ React.memo : ne re-rend que si la référence product change
const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  console.log(`Rendu: ${product.name}`);
  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", margin: "0.5rem" }}>
      <h3>{product.name}</h3>
      <p>{product.price} EUR</p>
    </div>
  );
});
```

**Pourquoi ça marche :** `useMemo` évite de recréer le tableau filtré si la recherche ne change pas (ici elle change à chaque frappe, donc le gain est surtout pour les `ProductCard` non affectés par le filtrage). `React.memo` sur `ProductCard` évite que les cartes dont l'objet `product` n'a pas changé par référence ne re-rendent.

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| Re-rendu par défaut | Parent re-rend → enfants re-rendent (cascade) |
| `React.memo()` | Empêche le re-rendu si les props n'ont pas changé (comparaison superficielle) |
| `useMemo` | Mémorise une valeur calculée (équivalent `computed` Vue) |
| `useCallback` | Mémorise une fonction (utile avec `memo` ou `useEffect`) |
| `React.lazy` + `Suspense` | Code splitting : charge un composant à la demandé |
| Profiler | Diagnostiquer les rendus inutiles dans React DevTools |
| Règle d'or | Ne pas optimiser prématurément — mesurer d'abord avec le Profiler |

> **Prochain cours** : [Cours 34 — Patterns de composition](./02-patterns-composition.md)
