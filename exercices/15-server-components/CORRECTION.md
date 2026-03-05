# Correction — Exercice 15 : Server Components

---

## Etape 1 : Types TypeScript

```ts
// src/types/product.ts

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
```

---

## Etape 2 : Donnees statiques

```json
// src/data/products.json
[
  {
    "id": "1",
    "name": "Clavier mecanique RGB",
    "description": "Clavier mecanique avec switches Cherry MX et retroeclairage RGB personnalisable.",
    "price": 129.99,
    "image": "/images/keyboard.jpg",
    "category": "peripheriques",
    "inStock": true
  },
  {
    "id": "2",
    "name": "Souris ergonomique",
    "description": "Souris sans fil ergonomique avec capteur 16000 DPI.",
    "price": 79.99,
    "image": "/images/mouse.jpg",
    "category": "peripheriques",
    "inStock": true
  },
  {
    "id": "3",
    "name": "Ecran 4K 27 pouces",
    "description": "Moniteur IPS 4K avec taux de rafraichissement 144Hz.",
    "price": 549.99,
    "image": "/images/monitor.jpg",
    "category": "ecrans",
    "inStock": true
  },
  {
    "id": "4",
    "name": "Casque audio sans fil",
    "description": "Casque avec reduction de bruit active et autonomie 30h.",
    "price": 199.99,
    "image": "/images/headphones.jpg",
    "category": "audio",
    "inStock": false
  },
  {
    "id": "5",
    "name": "Webcam HD 1080p",
    "description": "Webcam avec autofocus et microphone integre.",
    "price": 69.99,
    "image": "/images/webcam.jpg",
    "category": "peripheriques",
    "inStock": true
  },
  {
    "id": "6",
    "name": "Ecran ultrawide 34 pouces",
    "description": "Moniteur ultrawide 21:9 avec dalle VA et 100Hz.",
    "price": 449.99,
    "image": "/images/ultrawide.jpg",
    "category": "ecrans",
    "inStock": true
  }
]
```

---

## Etape 3 : Server Component — Page produits

```tsx
// src/app/products/page.tsx
// Pas de 'use client' — c'est un Server Component par defaut

import type { Product } from "@/types/product";
import productsData from "@/data/products.json";
import { ProductCard } from "@/components/ProductCard";

// Typage des donnees JSON
const products: Product[] = productsData;

// Simule un delai de chargement (utile pour tester loading.tsx)
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function ProductsPage() {
  // Simule un appel API avec delai
  await delay(500);

  // Grouper par categorie
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div>
      <h1>Nos produits</h1>
      <p>{products.length} produits disponibles</p>

      {categories.map((category) => (
        <section key={category} style={{ marginBottom: "2rem" }}>
          <h2 style={{ textTransform: "capitalize" }}>{category}</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {products
              .filter((p) => p.category === category)
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

---

## Etape 4 : Server Component — ProductCard

```tsx
// src/components/ProductCard.tsx
// Pas de 'use client' — Server Component

import type { Product } from "@/types/product";
import { AddToCartButton } from "./AddToCartButton";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {/* Placeholder pour l'image */}
      <div
        style={{
          width: "100%",
          height: "200px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
        }}
      >
        {product.name}
      </div>

      <h3 style={{ margin: 0 }}>{product.name}</h3>
      <p style={{ color: "#666", fontSize: "0.9rem", margin: 0 }}>
        {product.description}
      </p>
      <p style={{ fontWeight: "bold", fontSize: "1.2rem", margin: 0 }}>
        {product.price.toFixed(2)} EUR
      </p>

      {product.inStock ? (
        <span style={{ color: "green", fontSize: "0.85rem" }}>En stock</span>
      ) : (
        <span style={{ color: "red", fontSize: "0.85rem" }}>Rupture de stock</span>
      )}

      {/* Client Component imbrique — la frontiere server/client est ici */}
      <AddToCartButton product={product} disabled={!product.inStock} />
    </div>
  );
}
```

---

## Etape 5 : Client Component — AddToCartButton

```tsx
// src/components/AddToCartButton.tsx
"use client";

import { useState } from "react";
import type { Product } from "@/types/product";

interface AddToCartButtonProps {
  product: Product; // Serialisable : pas de fonctions, pas de classes
  disabled?: boolean;
}

export function AddToCartButton({ product, disabled = false }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  function handleAddToCart(): void {
    // Ici on pourrait appeler un store Zustand ou une Server Action
    console.log(`Ajout de ${quantity}x ${product.name} au panier`);

    // Feedback visuel
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "auto" }}>
      {/* Selecteur de quantite */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <button
          type="button"
          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
          disabled={disabled}
          style={{ padding: "0.25rem 0.5rem" }}
        >
          -
        </button>
        <span style={{ minWidth: "2rem", textAlign: "center" }}>{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((prev) => Math.min(10, prev + 1))}
          disabled={disabled}
          style={{ padding: "0.25rem 0.5rem" }}
        >
          +
        </button>
      </div>

      {/* Bouton ajouter */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={disabled}
        style={{
          flex: 1,
          padding: "0.5rem 1rem",
          backgroundColor: isAdded ? "#4caf50" : disabled ? "#ccc" : "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background-color 0.3s",
        }}
      >
        {isAdded ? "Ajoute !" : "Ajouter au panier"}
      </button>
    </div>
  );
}
```

---

## Etape 6 : Client Component — CartSummary

```tsx
// src/components/CartSummary.tsx
"use client";

import { useState, useEffect } from "react";

interface CartSummaryProps {
  initialCount?: number;
}

export function CartSummary({ initialCount = 0 }: CartSummaryProps) {
  const [itemCount, setItemCount] = useState<number>(initialCount);

  // Ecouter un evenement custom pour les ajouts au panier
  useEffect(() => {
    function handleCartUpdate(event: CustomEvent<{ count: number }>) {
      setItemCount((prev) => prev + event.detail.count);
    }

    window.addEventListener("cart-update", handleCartUpdate as EventListener);
    return () => {
      window.removeEventListener("cart-update", handleCartUpdate as EventListener);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 1rem",
        backgroundColor: "#f5f5f5",
        borderRadius: "20px",
      }}
    >
      <span role="img" aria-label="panier">
        Panier
      </span>
      <span style={{ fontWeight: "bold" }}>{itemCount}</span>
      <span>article{itemCount !== 1 ? "s" : ""}</span>
    </div>
  );
}
```

---

## Etape 7 : Loading

```tsx
// src/app/products/loading.tsx
export default function ProductsLoading() {
  return (
    <div>
      <h1>Chargement des produits...</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1rem",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              padding: "1rem",
              height: "350px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "200px",
                backgroundColor: "#eee",
                borderRadius: "4px",
                marginBottom: "0.5rem",
              }}
            />
            <div style={{ width: "60%", height: "1.2rem", backgroundColor: "#eee", borderRadius: "4px", marginBottom: "0.5rem" }} />
            <div style={{ width: "80%", height: "1rem", backgroundColor: "#f0f0f0", borderRadius: "4px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Ce que tu aurais pu oublier

1. **La directive `'use client'` se propage vers le bas** : si tu mets `'use client'` sur un composant parent, tous ses enfants deviennent aussi des Client Components. La bonne pratique est de placer `'use client'` le plus bas possible dans l'arbre.

2. **Les props serialisables uniquement** : on ne peut pas passer de fonctions, de `Date` natifs, de `Map`, de `Set` depuis un Server Component vers un Client Component. Seuls les types JSON simples sont autorises.

3. **Un Server Component ne peut pas utiliser de hooks** : `useState`, `useEffect`, `useRef`, etc. sont interdits dans les Server Components. Si tu as besoin d'interactivite, cree un Client Component enfant.

4. **Le fichier `page.tsx` est un Server Component par defaut** : pas besoin de l'indiquer explicitement. C'est le comportement naturel de Next.js App Router.

5. **Imports partages** : le type `Product` est importe des deux cotes (serveur et client). C'est correct car les types TypeScript sont effaces a la compilation — ils ne font pas partie du bundle.

6. **`async` dans un Server Component** : les Server Components peuvent etre `async` (pour fetch, delai, etc.). Les Client Components ne le peuvent pas.

7. **La frontiere est au niveau du fichier** : c'est le fichier entier qui est Client ou Server, pas un bout du composant. C'est pour cela qu'on cree des fichiers separes.

8. **Ne pas confondre `'use client'` et "rendu cote client"** : un Client Component est toujours pre-rendu sur le serveur (SSR) puis hydrate cote client. `'use client'` signifie "ce composant a besoin de JavaScript cote client".
