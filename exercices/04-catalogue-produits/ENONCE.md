# Exercice 04 — Catalogue produits

**Module** : 01-Les-bases · **Difficulte** : ⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/01-les-bases/01-les-bases.md`

---

## Objectif

Construire un catalogue de produits compose de plusieurs composants pour maîtriser le passage de props, les callbacks parent-enfant et la composition de composants. Tu apprendras a structurer une application en composants réutilisables et bien types.

---

## Consignes

1. **Définir les types** dans `src/exercises/ex04/types.ts` :
   ```ts
   export interface Product {
     id: string;
     name: string;
     price: number;
     description: string;
     inStock: boolean;
   }
   ```

2. **Créer les donnees** dans `src/exercises/ex04/data.ts` :
   - Un tableau `products` de 5 produits avec des donnees realistes.

3. **Créer le composant** `src/exercises/ex04/ProductCard.tsx` :
   - Accepter les props : `product: Product` et `onAddToCart: (product: Product) => void`.
   - Afficher le nom, le prix formate (ex : `"12,99 EUR"`), la description.
   - Afficher un badge "En stock" ou "Rupture" selon `inStock`.
   - Un bouton "Ajouter au panier" qui appelle `onAddToCart(product)`.
   - Le bouton doit etre désactivé si le produit n'est pas en stock.

4. **Créer le composant** `src/exercises/ex04/CartSummary.tsx` :
   - Accepter la prop `itemCount: number`.
   - Afficher le nombre d'articles dans le panier.

5. **Créer le composant** `src/exercises/ex04/ProductList.tsx` :
   - Importer les produits depuis `data.ts`.
   - Gérer un état `cartCount` avec `useState<number>`.
   - Passer le callback `handleAddToCart` à chaque `ProductCard`.
   - Afficher `CartSummary` avec le nombre d'articles.

6. **Créer le fichier** `src/exercises/ex04/App.tsx` avec le composant `ProductList`.

---

## Contraintes TypeScript

- Mode `strict` active.
- Toutes les interfaces dans un fichier `types.ts` separe.
- Les props de chaque composant doivent etre typees via une interface exportee.
- Le callback `onAddToCart` doit avoir une signature précisé.
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un vrai panier (tableau de produits) au lieu d'un simple compteur.
- [ ] Afficher le total du panier en euros.
- [ ] Ajouter un bouton "Vider le panier".
- [ ] Gérer les quantites (ne pas dupliquer un produit déjà dans le panier).

---

## Fichiers

```
src/exercises/ex04/
  ├── types.ts
  ├── data.ts
  ├── ProductCard.tsx
  ├── CartSummary.tsx
  ├── ProductList.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| Les produits s'affichent avec nom, prix, description | oui |
| Le badge stock est correct                       | oui     |
| Le bouton "Ajouter" est désactivé si rupture     | oui     |
| Le compteur du panier s'incremente au clic       | oui     |
| Les props sont typees avec des interfaces        | oui     |
| Le callback est passe du parent a l'enfant       | oui     |
| Aucun `any` dans le code                         | oui     |

---

## Ressources

- [React — Passing Props](https://react.dev/learn/passing-props-to-a-component)
- [React — Thinking in React](https://react.dev/learn/thinking-in-react)
- [TypeScript — Function Types](https://www.typescriptlang.org/docs/handbook/2/functions.html)
