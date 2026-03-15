# Exercice 06 — Hooks avances

**Module** : 02-Hooks-avances · **Difficulte** : ⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/02-hooks-avances/02-hooks-avances.md`

---

## Objectif

Optimiser les performances d'une page de catalogue de produits en utilisant `useMemo`, `useCallback` et `React.memo`. Tu apprendras quand et pourquoi ces outils sont nécessaires, et comment éviter les re-renders inutiles.

---

## Consignes

1. **Créer les types** dans `src/exercises/ex06/types.ts` :
   ```ts
   export interface Product {
     id: string;
     name: string;
     price: number;
     category: string;
   }
   ```

2. **Créer les donnees** dans `src/exercises/ex06/data.ts` :
   - Un tableau de 20 produits repartis dans 4 categories.

3. **Créer le composant** `src/exercises/ex06/ProductCard.tsx` :
   - Accepter `product: Product` et `onSelect: (id: string) => void`.
   - Envelopper le composant avec `React.memo` pour éviter les re-renders inutiles.
   - Ajouter un `console.log("Render ProductCard:", product.name)` pour visualiser les re-renders.

4. **Créer le composant** `src/exercises/ex06/ProductFilter.tsx` :
   - État : `searchTerm` (chaine de recherche), `sortBy` (`"name" | "price"`), `selectedCategory` (filtre par categorie).
   - Utiliser `useMemo` pour calculer la liste filtree ET triee. Le calcul ne doit se refaire que si `products`, `searchTerm`, `sortBy` ou `selectedCategory` changent.
   - Utiliser `useCallback` pour le handler `handleSelect` passe à chaque `ProductCard`.
   - Afficher le nombre de résultats.

5. **Créer le fichier** `src/exercises/ex06/App.tsx`.

6. **Vérifier** dans la console que les `ProductCard` ne se re-rendent pas quand seul le champ de recherche change (grâce à `React.memo` + `useCallback`).

---

## Contraintes TypeScript

- Mode `strict` active.
- Les génériques de `useMemo` et `useCallback` doivent etre corrects.
- Le type du comparateur de tri doit etre type (`(a: Product, b: Product) => number`).
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un compteur de re-renders avec `useRef` dans `ProductCard` pour le debug.
- [ ] Utiliser les React DevTools Profiler pour mesurer l'impact de `memo`.
- [ ] Implementer un `arePropsEqual` custom dans `React.memo` pour un controle plus fin.

---

## Fichiers

```
src/exercises/ex06/
  ├── types.ts
  ├── data.ts
  ├── ProductCard.tsx
  ├── ProductFilter.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| `useMemo` calcule la liste filtree/triee         | oui     |
| `useCallback` stabilise les handlers             | oui     |
| `React.memo` empeche les re-renders inutiles     | oui     |
| Les dépendances de `useMemo` et `useCallback` sont correctes | oui |
| Le filtrage et le tri fonctionnent               | oui     |
| Aucun `any` dans le code                         | oui     |

---

## Ressources

- [React — useMemo](https://react.dev/reference/react/useMemo)
- [React — useCallback](https://react.dev/reference/react/useCallback)
- [React — memo](https://react.dev/reference/react/memo)
