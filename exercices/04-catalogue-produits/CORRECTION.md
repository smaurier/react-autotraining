# Correction — Exercice 04 : Catalogue produits

## Résultat attendu

Une page affichant une grille de 5 cartes produit, chacune avec nom, prix, description, badge stock et bouton "Ajouter au panier". En haut, un résumé du panier affiche le nombre d'articles ajoutes. Les produits en rupture ont un bouton désactivé.

---

## Code corrige

### `src/exercises/ex04/types.ts`

```ts
/** Representation d'un produit dans le catalogue */
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  inStock: boolean;
}
```

### `src/exercises/ex04/data.ts`

```ts
import type { Product } from "./types";

export const products: Product[] = [
  {
    id: "1",
    name: "Clavier mecanique",
    price: 89.99,
    description: "Clavier mecanique RGB avec switches Cherry MX Blue.",
    inStock: true,
  },
  {
    id: "2",
    name: "Souris ergonomique",
    price: 49.99,
    description: "Souris verticale sans fil pour reduire la fatigue.",
    inStock: true,
  },
  {
    id: "3",
    name: "Ecran 4K 27 pouces",
    price: 399.99,
    description: "Moniteur IPS 4K avec temps de reponse de 4ms.",
    inStock: false,
  },
  {
    id: "4",
    name: "Casque audio",
    price: 129.99,
    description: "Casque sans fil avec reduction de bruit active.",
    inStock: true,
  },
  {
    id: "5",
    name: "Hub USB-C",
    price: 34.99,
    description: "Hub 7 ports USB-C avec HDMI et lecteur SD.",
    inStock: true,
  },
];
```

### `src/exercises/ex04/ProductCard.tsx`

```tsx
import type { Product } from "./types";

// --- Typage des props ---
export interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

/**
 * Composant ProductCard
 * Affiche les informations d'un produit avec un bouton d'ajout au panier.
 */
export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // Formater le prix en euros (format francais)
  const formattedPrice = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(product.price);

  return (
    <div className="product-card">
      <h3 className="product-card__name">{product.name}</h3>
      <p className="product-card__price">{formattedPrice}</p>
      <p className="product-card__description">{product.description}</p>

      {/* Badge stock avec rendu conditionnel */}
      <span
        className={`product-card__badge ${
          product.inStock ? "product-card__badge--in-stock" : "product-card__badge--out-of-stock"
        }`}
      >
        {product.inStock ? "En stock" : "Rupture"}
      </span>

      {/* Bouton desactive si rupture de stock */}
      <button
        onClick={() => onAddToCart(product)}
        disabled={!product.inStock}
        type="button"
        className="product-card__button"
      >
        Ajouter au panier
      </button>
    </div>
  );
}
```

### `src/exercises/ex04/CartSummary.tsx`

```tsx
// --- Typage des props ---
export interface CartSummaryProps {
  itemCount: number;
}

/**
 * Composant CartSummary
 * Affiche le nombre d'articles dans le panier.
 */
export default function CartSummary({ itemCount }: CartSummaryProps) {
  return (
    <div className="cart-summary">
      <span>Panier : </span>
      <strong>
        {itemCount} article{itemCount > 1 ? "s" : ""}
      </strong>
    </div>
  );
}
```

### `src/exercises/ex04/ProductList.tsx`

```tsx
import { useState } from "react";
import type { Product } from "./types";
import { products } from "./data";
import ProductCard from "./ProductCard";
import CartSummary from "./CartSummary";

/**
 * Composant ProductList
 * Orchestre l'affichage du catalogue et la gestion du panier.
 */
export default function ProductList() {
  // Etat du compteur de panier
  const [cartCount, setCartCount] = useState<number>(0);

  // Callback passe aux enfants ProductCard
  const handleAddToCart = (product: Product) => {
    console.log(`Ajout au panier : ${product.name}`);
    setCartCount((prev) => prev + 1);
  };

  return (
    <div className="product-list">
      {/* Resume du panier */}
      <CartSummary itemCount={cartCount} />

      {/* Grille de produits */}
      <div className="product-list__grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
    </div>
  );
}
```

### `src/exercises/ex04/App.tsx`

```tsx
import ProductList from "./ProductList";

/**
 * Composant racine de l'exercice 04.
 */
export default function App() {
  return (
    <main>
      <h1>Exercice 04 — Catalogue produits</h1>
      <ProductList />
    </main>
  );
}
```

---

## Ce que tu aurais pu oublier

### 1. Ne pas typer le callback `onAddToCart`

- ❌ `onAddToCart: Function` ou `onAddToCart: any`
  Types trop larges, aucune vérification sur les paramètres.
- ✅ `onAddToCart: (product: Product) => void`
  Signature précisé : TypeScript vérifié que le callback recoit bien un `Product`.

### 2. Oublier `disabled` sur le bouton

- ❌ Le bouton reste cliquable même quand le produit est en rupture.
  L'utilisateur peut ajouter un produit indisponible.
- ✅ `<button disabled={!product.inStock}>` désactivé le bouton visuellement et fonctionnellement.

### 3. Formater le prix avec une simple concatenation

- ❌ `product.price + " EUR"` affiche `"399.99 EUR"` au lieu du format français.
- ✅ `Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })` produit `"399,99 EUR"`.

### 4. Mettre l'état du panier dans ProductCard

- ❌ Chaque `ProductCard` géré son propre compteur. Impossible d'avoir un total global.
- ✅ L'état est dans le parent (`ProductList`), le total est centralise.

### 5. Ne pas separer les types dans un fichier dedie

- ❌ Définir `Product` dans chaque fichier ou l'inliner dans les props.
  Duplication et risque de desynchronisation.
- ✅ Un fichier `types.ts` unique importe partout.

---

## Concepts clés utilises

| Concept             | Description                                                           | Documentation                              |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| Props               | Donnees passees du parent a l'enfant                                  | [react.dev](https://react.dev/learn/passing-props-to-a-component) |
| Callback props      | Fonction passee en prop pour communiquer de l'enfant vers le parent   | [react.dev](https://react.dev/learn/responding-to-events) |
| Composition         | Assembler plusieurs composants pour construire l'UI                   | [react.dev](https://react.dev/learn/thinking-in-react) |
| Interface TypeScript | Définir la forme des objets et des props                             | [TS Handbook](https://www.typescriptlang.org/docs/handbook/2/objects.html) |
| `Intl.NumberFormat` | Formatage des nombres selon la locale                                 | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) |
| `disabled`          | Attribut HTML pour désactiver un élément interactif                   | [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/disabled) |

---

## Pour aller plus loin

- Transforme le compteur en un vrai tableau `CartItem[]` avec quantites.
- Ajoute un composant `CartDrawer` qui affiche le detail du panier.
- Implemente un système de recherche/filtre sur les produits.
