# Correction — Exercice 06 : Hooks avances

## Resultat attendu

Une page de catalogue avec un champ de recherche, un selecteur de categorie, un tri par nom ou prix, et une grille de cartes produit. Seules les cartes dont les props changent se re-rendent grace a `React.memo` et `useCallback`.

---

## Code corrige

### `src/exercises/ex06/types.ts`

```ts
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}
```

### `src/exercises/ex06/data.ts`

```ts
import type { Product } from "./types";

export const products: Product[] = [
  { id: "1", name: "Clavier mecanique", price: 89.99, category: "Peripheriques" },
  { id: "2", name: "Souris ergonomique", price: 49.99, category: "Peripheriques" },
  { id: "3", name: "Ecran 4K", price: 399.99, category: "Ecrans" },
  { id: "4", name: "Ecran ultrawide", price: 599.99, category: "Ecrans" },
  { id: "5", name: "Casque audio", price: 129.99, category: "Audio" },
  { id: "6", name: "Enceinte Bluetooth", price: 79.99, category: "Audio" },
  { id: "7", name: "Webcam HD", price: 69.99, category: "Video" },
  { id: "8", name: "Micro USB", price: 59.99, category: "Audio" },
  { id: "9", name: "Hub USB-C", price: 34.99, category: "Peripheriques" },
  { id: "10", name: "Tapis de souris XL", price: 19.99, category: "Peripheriques" },
  { id: "11", name: "Ecran portable", price: 249.99, category: "Ecrans" },
  { id: "12", name: "Clavier sans fil", price: 59.99, category: "Peripheriques" },
  { id: "13", name: "Barre de son", price: 149.99, category: "Audio" },
  { id: "14", name: "Camera streaming", price: 199.99, category: "Video" },
  { id: "15", name: "Souris gaming", price: 79.99, category: "Peripheriques" },
  { id: "16", name: "Ecran incurve", price: 449.99, category: "Ecrans" },
  { id: "17", name: "Casque gaming", price: 99.99, category: "Audio" },
  { id: "18", name: "Support ecran", price: 39.99, category: "Ecrans" },
  { id: "19", name: "Ring light", price: 29.99, category: "Video" },
  { id: "20", name: "Capture card", price: 159.99, category: "Video" },
];

export const categories = [...new Set(products.map((p) => p.category))];
```

### `src/exercises/ex06/ProductCard.tsx`

```tsx
import { memo } from "react";
import type { Product } from "./types";

export interface ProductCardProps {
  product: Product;
  onSelect: (id: string) => void;
}

/**
 * Composant ProductCard enveloppe dans React.memo.
 * Ne se re-rend que si ses props changent (comparaison superficielle).
 */
const ProductCard = memo(function ProductCard({
  product,
  onSelect,
}: ProductCardProps) {
  // Log pour visualiser les re-renders dans la console
  console.log("Render ProductCard:", product.name);

  const formattedPrice = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(product.price);

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p className="product-card__price">{formattedPrice}</p>
      <span className="product-card__category">{product.category}</span>
      <button onClick={() => onSelect(product.id)} type="button">
        Selectionner
      </button>
    </div>
  );
});

export default ProductCard;
```

### `src/exercises/ex06/ProductFilter.tsx`

```tsx
import { useState, useMemo, useCallback } from "react";
import type { Product } from "./types";
import { products, categories } from "./data";
import ProductCard from "./ProductCard";

// --- Type pour le tri ---
type SortBy = "name" | "price";

/**
 * Composant ProductFilter
 * Gere le filtrage, le tri et l'affichage optimise des produits.
 */
export default function ProductFilter() {
  // --- Etats ---
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // --- useMemo : calcul couteux memorise ---
  // Ne se recalcule que si les dependances changent
  const filteredAndSortedProducts = useMemo<Product[]>(() => {
    console.log("Recalcul de la liste filtree/triee");

    let result = products;

    // Filtrage par categorie
    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Filtrage par recherche textuelle
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(term));
    }

    // Tri
    const sorted = [...result].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "fr");
      }
      return a.price - b.price;
    });

    return sorted;
  }, [searchTerm, sortBy, selectedCategory]);
  // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Dependances : le calcul se refait UNIQUEMENT si l'une de ces valeurs change

  // --- useCallback : stabiliser la reference de la fonction ---
  // Sans useCallback, une nouvelle fonction est creee a chaque render,
  // ce qui invalide React.memo sur ProductCard
  const handleSelect = useCallback((id: string) => {
    console.log("Produit selectionne :", id);
  }, []);
  // ^^ Tableau vide : la fonction ne change jamais

  return (
    <div className="product-filter">
      {/* Controles de filtrage */}
      <div className="product-filter__controls">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un produit..."
          aria-label="Rechercher"
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filtrer par categorie"
        >
          <option value="all">Toutes les categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          aria-label="Trier par"
        >
          <option value="name">Nom</option>
          <option value="price">Prix</option>
        </select>
      </div>

      {/* Nombre de resultats */}
      <p className="product-filter__count">
        {filteredAndSortedProducts.length} produit
        {filteredAndSortedProducts.length > 1 ? "s" : ""} trouve
        {filteredAndSortedProducts.length > 1 ? "s" : ""}
      </p>

      {/* Grille de produits */}
      <div className="product-filter__grid">
        {filteredAndSortedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
```

### `src/exercises/ex06/App.tsx`

```tsx
import ProductFilter from "./ProductFilter";

/**
 * Composant racine de l'exercice 06.
 */
export default function App() {
  return (
    <main>
      <h1>Exercice 06 — Hooks avances</h1>
      <ProductFilter />
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Oublier `useCallback` pour le handler passe a un composant `memo`

- ❌ `<ProductCard onSelect={(id) => console.log(id)} />`
  Une nouvelle fonction est creee a chaque render, `React.memo` ne sert a rien car la prop `onSelect` change toujours.
- ✅ `const handleSelect = useCallback((id: string) => { ... }, []);`
  La reference est stable, `React.memo` peut comparer les props correctement.

### 2. Mauvaises dependances dans `useMemo`

- ❌ `useMemo(() => { ... }, [])` — tableau vide : la liste ne se recalcule jamais, le filtre ne fonctionne pas.
- ✅ `useMemo(() => { ... }, [searchTerm, sortBy, selectedCategory])` — toutes les variables utilisees dans le calcul.

### 3. Muter le tableau dans le tri

- ❌ `result.sort(...)` — `.sort()` mute le tableau original en place.
- ✅ `[...result].sort(...)` — copie du tableau avant tri, immutabilite respectee.

### 4. Ne pas utiliser `memo` comme HOC

- ❌ `export default function ProductCard(...)` sans `memo()`.
  Le composant se re-rend a chaque render du parent, meme si ses props n'ont pas change.
- ✅ `const ProductCard = memo(function ProductCard(...) { ... });`

### 5. Utiliser `useMemo`/`useCallback` partout sans besoin

- ❌ Memoriser un calcul trivial comme `const title = useMemo(() => "Hello", [])`.
  Le cout de la memorisation depasse le cout du calcul.
- ✅ Memoriser uniquement les calculs couteux (filtrage/tri sur un grand tableau) et les fonctions passees a des composants `memo`.

---

## Concepts cles utilises

| Concept        | Description                                                              | Documentation                              |
| -------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| `useMemo`      | Memoriser le resultat d'un calcul couteux                                | [react.dev](https://react.dev/reference/react/useMemo) |
| `useCallback`  | Memoriser une fonction pour stabiliser sa reference                      | [react.dev](https://react.dev/reference/react/useCallback) |
| `React.memo`   | HOC qui empeche le re-render si les props n'ont pas change               | [react.dev](https://react.dev/reference/react/memo) |
| Dependances    | Tableau de valeurs dont dependent `useMemo`/`useCallback`                | Concept React fondamental |
| Immutabilite   | Ne pas muter les tableaux/objets, creer de nouvelles references          | Bonne pratique React |

---

## Pour aller plus loin

- Utilise les React DevTools Profiler pour comparer les renders avec et sans `memo`.
- Remplace le `console.log` par un `useRef` compteur de renders.
- Ajoute un benchmark avec 1000 produits pour voir l'impact de `useMemo`.
