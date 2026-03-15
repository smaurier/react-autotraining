# Exercice 15 — Server Components

**Module** : 06-Next.js App Router · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/06-nextjs/02-server-vs-client.md`

---

## Objectif

Comprendre la frontiere entre Server Components et Client Components dans Next.js 15. Tu vas construire une page e-commerce ou la liste de produits est un Server Component (acces direct aux donnees) et le bouton "Ajouter au panier" est un Client Component (interactivite).

L'objectif pedagogique est de savoir **où placer la directive `'use client'`** et de comprendre les consequences de ce choix sur le bundle, les performances et l'acces aux donnees.

---

## Consignes

1. **Créer les types** `src/types/product.ts` :
   - Interface `Product` : `id`, `name`, `description`, `price` (number), `image` (string), `category`, `inStock` (boolean).
   - Interface `CartItem` : `product: Product`, `quantity: number`.

2. **Créer les donnees** `src/data/products.json` :
   - Au moins 6 produits dans 2 categories différentes.

3. **Créer le Server Component** `src/app/products/page.tsx` :
   - Composant `async` (Server Component par defaut).
   - Simuler un delai de chargement avec une fonction `delay()`.
   - Importer les produits depuis le JSON.
   - Afficher la liste avec `<ProductCard>` pour chaque produit.
   - Aucun `'use client'` ici.

4. **Créer le composant serveur** `src/components/ProductCard.tsx` :
   - Server Component (pas de `'use client'`).
   - Affiche le nom, la description, le prix, l'image.
   - Inclut un `<AddToCartButton>` (Client Component).

5. **Créer le Client Component** `src/components/AddToCartButton.tsx` :
   - Directive `'use client'` en haut du fichier.
   - Utilise `useState` pour gérer la quantite.
   - Bouton "Ajouter au panier" avec feedback visuel (animation, message).
   - Recoit `product` en prop (serializable).

6. **Créer le Client Component** `src/components/CartSummary.tsx` :
   - Directive `'use client'`.
   - Affiche le nombre total d'articles dans le panier.
   - Utilise `useState` ou un store (optionnel).

---

## Contraintes TypeScript

- Mode `strict` active.
- Toutes les props typees avec des interfaces explicites.
- Les props passees du Server au Client doivent etre **serialisables** (pas de fonctions, pas de classes).
- Le type `Product` doit etre utilise des deux cotes (server et client).
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un store Zustand pour le panier, partage entre les Client Components.
- [ ] Afficher un compteur de panier dans le header (layout).
- [ ] Ajouter un filtre par categorie (Client Component) combine avec la liste serveur.
- [ ] Utiliser `Suspense` avec un loading spécifique pour la liste produits.

---

## Fichiers

```
src/
  types/
    product.ts
  data/
    products.json
  components/
    ProductCard.tsx        (Server Component)
    AddToCartButton.tsx    (Client Component — 'use client')
    CartSummary.tsx        (Client Component — 'use client')
  app/
    products/
      page.tsx             (Server Component)
      loading.tsx
```

---

## Criteres de reussite

| Critere                                             | Attendu |
| --------------------------------------------------- | ------- |
| La page produits est un Server Component (pas de `'use client'`) | oui |
| Les donnees sont chargees cote serveur              | oui     |
| `AddToCartButton` à la directive `'use client'`     | oui     |
| Le bouton utilise `useState` pour l'interactivite   | oui     |
| Les props passees au Client sont serialisables       | oui     |
| Aucun hook React dans les Server Components          | oui     |
| Le code compile sans erreur TS strict               | oui     |

---

## Ressources

- [Next.js — Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js — Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [React — Server Components](https://react.dev/reference/rsc/server-components)
