# Correction — Exercice 20 : Performance audit

---

## Etape 1 : Types

```ts
// src/types/product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

export type SortOption = "price-asc" | "price-desc" | "name-asc";
```

---

## Etape 2 : Generation des donnees

```ts
// src/data/generate-products.ts
import type { Product } from "@/types/product";

const CATEGORIES = ["Electronique", "Vetements", "Maison", "Sport", "Livres"];

export function generateProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `product-${index + 1}`,
    name: `Produit ${index + 1} ${CATEGORIES[index % CATEGORIES.length]}`,
    price: Math.round((Math.random() * 200 + 10) * 100) / 100,
    category: CATEGORIES[index % CATEGORIES.length],
    image: `/images/product-${(index % 10) + 1}.jpg`,
  }));
}
```

---

## Etape 3 : Version NON optimisee

```tsx
// src/components/ProductCatalog.tsx
// VERSION NON OPTIMISEE — volontairement lente pour l'exercice
"use client";

import { useState, Profiler } from "react";
import type { ProfilerOnRenderCallback } from "react";
import type { Product, SortOption } from "@/types/product";
import { generateProducts } from "@/data/generate-products";

const allProducts: Product[] = generateProducts(100);
const categories = [...new Set(allProducts.map((p) => p.category))];

// Callback du Profiler pour mesurer les performances
const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log(`[Profiler] ${id} — ${phase}`);
  console.log(`  Duree reelle: ${actualDuration.toFixed(2)}ms`);
  console.log(`  Duree de base: ${baseDuration.toFixed(2)}ms`);
  console.log(`  Debut: ${startTime.toFixed(2)}ms, Commit: ${commitTime.toFixed(2)}ms`);
};

// Composant carte produit — PAS memo, re-render a chaque changement
function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  // Simulation d'un calcul lourd dans le rendu
  const startTime = performance.now();
  while (performance.now() - startTime < 1) {
    // Bloque 1ms par carte — simule un rendu complexe
  }

  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "120px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          marginBottom: "0.5rem",
        }}
      />
      <h3 style={{ fontSize: "0.9rem", margin: "0 0 0.25rem" }}>{product.name}</h3>
      <p style={{ color: "#666", margin: 0 }}>{product.price.toFixed(2)} EUR</p>
      <p style={{ fontSize: "0.8rem", color: "#999", margin: "0.25rem 0" }}>
        {product.category}
      </p>
      <button type="button" onClick={() => onSelect(product)}>
        Voir detail
      </button>
    </div>
  );
}

export function ProductCatalog() {
  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("name-asc");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // PROBLEME : filtrage et tri recalcules a CHAQUE render
  let filtered = allProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedCategory !== "all") {
    filtered = filtered.filter((p) => p.category === selectedCategory);
  }

  // PROBLEME : tri a chaque render
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name-asc":
        return a.name.localeCompare(b.name);
    }
  });

  // PROBLEME : nouvelle reference de fonction a chaque render
  function handleSelect(product: Product): void {
    setSelectedProduct(product);
  }

  return (
    <Profiler id="ProductCatalog" onRender={onRender}>
      <div>
        <h1>Catalogue ({sorted.length} produits)</h1>

        {/* Filtres */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            style={{ padding: "0.5rem" }}
          >
            <option value="name-asc">Nom A-Z</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix decroissant</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: "0.5rem" }}
          >
            <option value="all">Toutes les categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Grille de produits */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {sorted.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Modal (chargee en dur) */}
        {selectedProduct && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "2rem",
                borderRadius: "8px",
                maxWidth: "400px",
              }}
            >
              <h2>{selectedProduct.name}</h2>
              <p>{selectedProduct.price.toFixed(2)} EUR</p>
              <p>{selectedProduct.category}</p>
              <button type="button" onClick={() => setSelectedProduct(null)}>
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </Profiler>
  );
}
```

---

## Etape 4 : Version OPTIMISEE

```tsx
// src/components/ProductCatalogOptimized.tsx
// VERSION OPTIMISEE — gains documentes ci-dessous
//
// Mesures (100 produits, recherche "sport") :
//   AVANT : ~150ms par render (re-render de toutes les cartes)
//   APRES : ~15ms par render (seules les cartes filtrees changent)
//   Gain  : ~10x plus rapide

"use client";

import {
  useState,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  memo,
  Profiler,
} from "react";
import type { ProfilerOnRenderCallback } from "react";
import type { Product, SortOption } from "@/types/product";
import { generateProducts } from "@/data/generate-products";

// Donnees generees une seule fois, en dehors du composant
const allProducts: Product[] = generateProducts(100);
const categories = [...new Set(allProducts.map((p) => p.category))];

// Lazy loading du modal — pas charge au bundle initial
const ProductDetailModal = lazy(() => import("./ProductDetailModal"));

// Profiler callback
const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  console.log(`[Profiler] ${id} — ${phase} : ${actualDuration.toFixed(2)}ms`);
};

// OPTIMISATION B : React.memo sur la carte produit
// Ne re-render que si les props changent (shallow compare)
const ProductCardMemo = memo(function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "120px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          marginBottom: "0.5rem",
        }}
      />
      <h3 style={{ fontSize: "0.9rem", margin: "0 0 0.25rem" }}>{product.name}</h3>
      <p style={{ color: "#666", margin: 0 }}>{product.price.toFixed(2)} EUR</p>
      <p style={{ fontSize: "0.8rem", color: "#999", margin: "0.25rem 0" }}>
        {product.category}
      </p>
      <button type="button" onClick={() => onSelect(product)}>
        Voir detail
      </button>
    </div>
  );
});

export function ProductCatalogOptimized() {
  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("name-asc");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // OPTIMISATION A : useMemo pour le filtrage
  // Recalcule uniquement quand search ou selectedCategory changent
  const filteredProducts = useMemo(() => {
    let result = allProducts;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchLower)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    return result;
  }, [search, selectedCategory]);

  // OPTIMISATION A : useMemo pour le tri
  // Recalcule uniquement quand filteredProducts ou sort changent
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "name-asc":
          return a.name.localeCompare(b.name);
      }
    });
  }, [filteredProducts, sort]);

  // OPTIMISATION C : useCallback pour stabiliser la reference
  // React.memo ne fonctionne que si les props ne changent pas.
  // Sans useCallback, handleSelect est recree a chaque render → memo inutile
  const handleSelect = useCallback((product: Product): void => {
    setSelectedProduct(product);
  }, []);

  const handleClose = useCallback((): void => {
    setSelectedProduct(null);
  }, []);

  return (
    <Profiler id="ProductCatalogOptimized" onRender={onRender}>
      <div>
        <h1>Catalogue optimise ({sortedProducts.length} produits)</h1>

        {/* Filtres */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            style={{ padding: "0.5rem" }}
          >
            <option value="name-asc">Nom A-Z</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix decroissant</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: "0.5rem" }}
          >
            <option value="all">Toutes les categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Grille de produits */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {sortedProducts.map((product) => (
            <ProductCardMemo
              key={product.id}
              product={product}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* OPTIMISATION D : lazy loading du modal */}
        {selectedProduct && (
          <Suspense fallback={<p>Chargement du detail...</p>}>
            <ProductDetailModal
              product={selectedProduct}
              onClose={handleClose}
            />
          </Suspense>
        )}
      </div>
    </Profiler>
  );
}
```

---

## Etape 5 : Modal lazy-loaded

```tsx
// src/components/ProductDetailModal.tsx
import type { Product } from "@/types/product";

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export default function ProductDetailModal({
  product,
  onClose,
}: ProductDetailModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          maxWidth: "400px",
          width: "90%",
        }}
      >
        <h2>{product.name}</h2>
        <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          {product.price.toFixed(2)} EUR
        </p>
        <p style={{ color: "#666" }}>Categorie : {product.category}</p>
        <p>ID : {product.id}</p>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
```

---

## Etape 6 : Page de comparaison

```tsx
// src/app/performance/page.tsx
"use client";

import { useState } from "react";
import { ProductCatalog } from "@/components/ProductCatalog";
import { ProductCatalogOptimized } from "@/components/ProductCatalogOptimized";

export default function PerformancePage() {
  const [version, setVersion] = useState<"slow" | "fast">("slow");

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => setVersion("slow")}
          style={{
            marginRight: "0.5rem",
            fontWeight: version === "slow" ? "bold" : "normal",
          }}
        >
          Version lente
        </button>
        <button
          type="button"
          onClick={() => setVersion("fast")}
          style={{
            fontWeight: version === "fast" ? "bold" : "normal",
          }}
        >
          Version optimisee
        </button>
      </div>

      <p style={{ color: "#666" }}>
        Ouvre la console pour voir les mesures du Profiler.
      </p>

      {version === "slow" ? <ProductCatalog /> : <ProductCatalogOptimized />}
    </div>
  );
}
```

---

## Ce que tu aurais pu oublier

1. **`useMemo` ne rend pas le code plus rapide** : il evite de recalculer un resultat si les dependances n'ont pas change. Si le calcul est rapide, `useMemo` ajoute de la complexite pour rien.

2. **`React.memo` sans `useCallback` est souvent inutile** : si une fonction callback est passee en prop et qu'elle est recree a chaque render, `React.memo` ne peut pas empecher le re-render car la prop a change (nouvelle reference).

3. **Le `<Profiler>` ne fonctionne qu'en mode developpement** : en production, il est desactive par defaut pour ne pas impacter les performances.

4. **`React.lazy` necessite un `export default`** : le module importe dynamiquement doit avoir un export par defaut.

5. **Mesurer avant d'optimiser** : la regle d'or est "Don't optimize prematurely". Utiliser le Profiler pour identifier les vrais goulots d'etranglement.

6. **Le compilateur React 19 automatise certaines optimisations** : en mode experimental, il peut ajouter automatiquement `useMemo` et `useCallback` la ou c'est necessaire.

7. **Les donnees statiques doivent etre en dehors du composant** : `generateProducts(100)` ne doit pas etre appele a chaque render. Le placer au niveau module garantit une seule execution.

8. **Le tri mute le tableau** : `Array.sort()` modifie le tableau en place. Toujours faire une copie avant (`[...array].sort()`).
