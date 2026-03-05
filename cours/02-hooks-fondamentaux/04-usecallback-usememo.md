# Cours 12 — useCallback et useMemo

> **Objectif** : Comprendre quand et pourquoi utiliser `useMemo` et `useCallback` pour optimiser les performances, maîtriser `React.memo()`, et surtout savoir quand **ne pas** les utiliser. Transposer `computed` (Vue) et `computed()` (Angular) vers `useMemo`.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre `useRef` et `useState` ?</summary>

`useState` déclenche un re-render quand la valeur change et la nouvelle valeur est reflétée dans le JSX. `useRef` persiste une valeur entre les rendus **sans** déclencher de re-render. On utilise `useRef` pour les IDs de timer, les éléments DOM, et les valeurs qui ne doivent pas provoquer de mise à jour visuelle.
</details>

<details>
<summary>2. Comment accéder à un élément DOM en React avec TypeScript ?</summary>

`const ref = useRef<HTMLInputElement>(null)` puis `<input ref={ref} />`. L'élément est accessible via `ref.current`. Il faut le vérifier avec `ref.current?.focus()` car il peut être `null`.
</details>

<details>
<summary>3. À quoi sert `useImperativeHandle` ?</summary>

Il permet d'exposer une **API impérative personnalisée** sur un composant enfant via `forwardRef`. Le parent accède à des méthodes comme `reset()`, `focus()`, etc., plutôt qu'à l'élément DOM brut. C'est un usage rare.
</details>

---

## Analogie

Imaginez un **restaurant**. `useMemo`, c'est le plat du jour : le chef le prépare une fois le matin et le ressert tel quel à chaque client qui le commande (tant que la recette ne change pas). `useCallback`, c'est la recette elle-même : on la plastifie et on la réutilise au lieu de la réécrire à chaque service. Sans ces optimisations, le chef recuisinerait chaque plat à chaque commande et réécrirait chaque recette — parfois c'est acceptable, mais quand le restaurant est plein (application complexe), ça devient un problème.

---

## Théorie

### 1. Le problème : un nouvel objet à chaque rendu

En React, **chaque rendu crée de nouvelles références** pour les fonctions et objets :

```tsx
function Parent() {
  // À chaque rendu, handleClick est une NOUVELLE fonction (nouvelle référence)
  const handleClick = () => console.log("click");

  // À chaque rendu, config est un NOUVEL objet (nouvelle référence)
  const config = { theme: "dark", lang: "fr" };

  return <Child onClick={handleClick} config={config} />;
}
```

Pourquoi c'est un problème ?
- `Child` reçoit de **nouvelles props** à chaque rendu du parent (même si les valeurs sont identiques)
- Si `Child` est enveloppé dans `React.memo()`, la mémoïsation est **cassée** car les références changent
- Les `useEffect` dans `Child` qui dépendent de ces props se ré-exécutent inutilement

### 2. `useMemo` — mémoïser une valeur calculée

```tsx
import { useMemo } from "react";

const memoizedValue = useMemo(() => expensiveComputation(a, b), [a, b]);
//                              ^                                ^
//                         factory function              dépendances
```

`useMemo` **recalcule** la valeur uniquement quand les dépendances changent.

```tsx
// ✅ useMemo pour un calcul coûteux
function ProductList({ products, searchQuery }: Props) {
  const filteredProducts = useMemo(() => {
    console.log("Filtrage recalculé"); // Vérifie que ça ne se re-exécute pas inutilement
    return products
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.price - b.price);
  }, [products, searchQuery]);

  return (
    <ul>
      {filteredProducts.map((p) => (
        <li key={p.id}>{p.name} — {p.price} EUR</li>
      ))}
    </ul>
  );
}

// ✅ useMemo pour stabiliser la référence d'un objet
function ChartWrapper({ data }: { data: number[] }) {
  const chartOptions = useMemo(() => ({
    responsive: true,
    scales: { y: { beginAtZero: true } },
  }), []); // Objet créé une seule fois

  return <Chart options={chartOptions} data={data} />;
}
```

### 3. `useCallback` — mémoïser une fonction

`useCallback` est un raccourci de `useMemo` pour les fonctions :

```tsx
import { useCallback } from "react";

// Ces deux formes sont IDENTIQUES :
const memoizedFn = useCallback((x: number) => x * 2, []);
const memoizedFn = useMemo(() => (x: number) => x * 2, []);
```

```tsx
// ✅ useCallback pour stabiliser une référence de fonction
function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState("");

  // Sans useCallback : nouvelle fonction à chaque rendu
  // Avec useCallback : même référence tant que setTodos ne change pas
  const handleToggle = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []); // setTodos est stable → pas de dépendance nécessaire

  const handleDelete = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <TodoList
        todos={todos}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
    </>
  );
}
```

### 4. `React.memo()` — mémoïser un composant

`React.memo()` empêche le re-render d'un composant **si ses props n'ont pas changé** (comparaison superficielle) :

```tsx
import { memo } from "react";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

// ✅ Le composant ne re-render que si ses props changent (par référence)
const TodoItem = memo(function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  console.log(`Rendu de ${todo.text}`); // Vérifiez les rendus inutiles

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => onToggle(todo.id)}
      />
      <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>
        {todo.text}
      </span>
      <button onClick={() => onDelete(todo.id)}>X</button>
    </li>
  );
});
```

> **Important** : `React.memo()` ne sert à rien si les props changent de référence à chaque rendu. C'est pourquoi il fonctionne **en tandem** avec `useCallback` et `useMemo`.

### 5. Le trio : memo + useCallback + useMemo

```tsx
// ✅ Optimisation complète
function Dashboard() {
  const [data, setData] = useState<DataPoint[]>(initialData);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // useMemo : calcul coûteux mémoïsé
  const stats = useMemo(() => computeStats(data), [data]);

  // useCallback : fonction stable pour le composant enfant mémoïsé
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return (
    <div>
      <StatsPanel stats={stats} />
      <DataGrid data={data} onSelect={handleSelect} />
      {selectedId && <DetailPanel id={selectedId} />}
    </div>
  );
}

// Composant enfant mémoïsé — ne re-render que quand data ou onSelect changent
const DataGrid = memo(function DataGrid({ data, onSelect }: DataGridProps) {
  return (
    <table>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} onClick={() => onSelect(row.id)}>
            <td>{row.label}</td>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});
```

### 6. Quand NE PAS utiliser useMemo/useCallback

```tsx
// ❌ Inutile — calcul trivial, le coût du mémo dépasse le gain
const doubled = useMemo(() => count * 2, [count]);
// ✅ Simple variable
const doubled = count * 2;

// ❌ Inutile — composant enfant non mémoïsé avec React.memo()
const handleClick = useCallback(() => {
  console.log("click");
}, []);
<Button onClick={handleClick} />  // Si Button n'est PAS memo(), ça ne sert à rien

// ❌ Inutile — primitive (string, number, boolean)
const label = useMemo(() => `Total: ${count}`, [count]);
// ✅ Les primitives sont comparées par valeur
const label = `Total: ${count}`;
```

**Règles de pouce :**

| Situation                                     | Utiliser memo/callback ? |
|-----------------------------------------------|--------------------------|
| Calcul trivial (addition, concaténation)      | ❌ Non                    |
| Calcul coûteux (tri, filtrage de 1000+ items) | ✅ `useMemo`             |
| Fonction passée à un enfant `memo()`          | ✅ `useCallback`         |
| Fonction dans un event handler local          | ❌ Non                    |
| Objet passé en prop à un enfant `memo()`      | ✅ `useMemo`             |
| Objet utilisé dans un `useEffect` deps        | ✅ `useMemo`             |

> **Philosophie React** : n'optimisez pas prématurément. Mesurez d'abord avec React DevTools Profiler, puis ajoutez `memo`/`useMemo`/`useCallback` là où ça compte.

### 7. Comparaison : computed / computed() vs useMemo

| Aspect              | Vue 3 `computed()`       | Angular `computed()`     | React `useMemo`               |
|---------------------|--------------------------|--------------------------|-------------------------------|
| Syntaxe             | `computed(() => a + b)`  | `computed(() => a() + b())` | `useMemo(() => a + b, [a, b])` |
| Dépendances         | Auto-trackées            | Auto-trackées (signals)  | Manuelles (tableau)           |
| Cache               | Oui (tant que deps stables) | Oui (tant que signals stables) | Oui (tant que deps stables) |
| Réactivité          | Granulaire               | Granulaire               | Re-render du composant        |

```tsx
// Vue 3
const fullName = computed(() => firstName.value + " " + lastName.value);
// Auto-tracké : recalcule quand firstName ou lastName change

// Angular 19
fullName = computed(() => this.firstName() + " " + this.lastName());
// Auto-tracké via signals

// React
const fullName = useMemo(
  () => firstName + " " + lastName,
  [firstName, lastName]
);
// Dépendances manuelles — oublie => bug silencieux
```

> **Différence clé** : Vue et Angular trackent les dépendances automatiquement. En React, vous les déclarez manuellement. L'avantage : pas de "magie". L'inconvénient : erreur possible si vous oubliez une dépendance.

### 8. Anti-pattern : tout mémoïser

```tsx
// ❌ "Memo everything" — complexité inutile, surcoût mémoire
function SimpleCard({ title, onClick }: { title: string; onClick: () => void }) {
  const memoTitle = useMemo(() => title.toUpperCase(), [title]);
  const memoClick = useCallback(() => onClick(), [onClick]);

  return <div onClick={memoClick}>{memoTitle}</div>;
}

// ✅ Pas besoin de mémo ici — composant simple, rendu rapide
function SimpleCard({ title, onClick }: { title: string; onClick: () => void }) {
  return <div onClick={onClick}>{title.toUpperCase()}</div>;
}
```

---

## Pratique

### Exercice : liste de produits avec recherche et tri

Créez une application avec :
1. Un tableau de 500 produits (générés avec une boucle)
2. Un champ de recherche qui filtre par nom
3. Un bouton pour trier par prix (croissant/décroissant)
4. Un compteur de re-renders affiché pour chaque `ProductRow` (via `useRef`)
5. Optimisez avec `React.memo`, `useMemo` et `useCallback` pour que seuls les `ProductRow` modifiés se re-render

<details>
<summary>Voir la solution</summary>

```tsx
import { useState, useMemo, useCallback, useRef, memo } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
}

// Génération de 500 produits
const ALL_PRODUCTS: Product[] = Array.from({ length: 500 }, (_, i) => ({
  id: String(i + 1),
  name: `Produit ${String(i + 1).padStart(3, "0")}`,
  price: Math.round(Math.random() * 1000 * 100) / 100,
}));

// Composant mémoïsé — ne re-render que si ses props changent
interface ProductRowProps {
  product: Product;
  onSelect: (id: string) => void;
}

const ProductRow = memo(function ProductRow({ product, onSelect }: ProductRowProps) {
  const renderCount = useRef(0);
  renderCount.current += 1;

  return (
    <tr onClick={() => onSelect(product.id)}>
      <td>{product.name}</td>
      <td>{product.price.toFixed(2)} EUR</td>
      <td style={{ color: "#999", fontSize: "0.8rem" }}>
        Rendus : {renderCount.current}
      </td>
    </tr>
  );
});

type SortOrder = "asc" | "desc";

function ProductSearch() {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // useMemo : filtrage + tri coûteux sur 500 éléments
  const filteredProducts = useMemo(() => {
    const filtered = ALL_PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.sort((a, b) =>
      sortOrder === "asc" ? a.price - b.price : b.price - a.price
    );
  }, [query, sortOrder]);

  // useCallback : référence stable pour le composant mémoïsé
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div>
      <input
        placeholder="Rechercher..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={toggleSort}>
        Trier par prix ({sortOrder === "asc" ? "croissant" : "décroissant"})
      </button>
      <p>{filteredProducts.length} produits trouvés</p>
      {selectedId && <p>Sélectionné : Produit {selectedId}</p>}

      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prix</th>
            <th>Rendus</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onSelect={handleSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductSearch;
```
</details>

---

## Résumé

| Concept                | Ce qu'il faut retenir                                          |
|------------------------|----------------------------------------------------------------|
| `useMemo(fn, [deps])`  | Mémoïse une **valeur** calculée — recalcule si deps changent  |
| `useCallback(fn, [deps])` | Mémoïse une **fonction** — même référence si deps stables  |
| `React.memo(Component)` | Skip le re-render si les props n'ont pas changé              |
| Le trio                | `memo` + `useCallback` + `useMemo` fonctionnent ensemble      |
| Ne pas tout mémoïser   | Mesurer d'abord, optimiser ensuite — overhead de mémorisation |
| vs `computed`           | React = deps manuelles, Vue/Angular = auto-tracking          |

> **Prochain cours** : [Cours 13 — Custom hooks](./05-custom-hooks.md)
