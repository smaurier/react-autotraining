# Exercice 20 — Performance audit

**Module** : 08-Performance & Patterns · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/08-performance-patterns/01-profiling-devtools.md`

---

## Objectif

Prendre un composant volontairement lent (100 produits avec filtres et tri) et l'optimiser en utilisant `React.memo`, `useMemo`, `useCallback` et `React.lazy`. Mesurer les performances avant et après avec le React Profiler.

L'objectif pedagogique est de comprendre **quand et pourquoi** optimiser, pas d'optimiser par reflexe. Chaque optimisation doit etre justifiee par une mesure.

---

## Consignes

1. **Créer le composant "lent"** `src/components/ProductCatalog.tsx` :
   - 100 produits generes (où charger depuis un JSON).
   - Champ de recherche qui filtre par nom.
   - Selecteur de tri (prix croissant, prix decroissant, nom A-Z).
   - Selecteur de categorie.
   - Chaque produit affiche une carte avec nom, prix, categorie, image placeholder.
   - **Volontairement non optimise** : filtrage et tri recalcules à chaque render, chaque carte re-render à chaque keystroke.

2. **Mesurer les performances initiales** :
   - Utiliser `<Profiler>` de React pour mesurer le temps de rendu.
   - Noter le nombre de re-renders et la duree dans la console.
   - Identifier les composants qui re-render inutilement.

3. **Optimiser étape par étape** :
   - **Étape A** : `useMemo` pour le filtrage et le tri des produits.
   - **Étape B** : `React.memo` sur le composant `ProductCard`.
   - **Étape C** : `useCallback` pour les handlers passes en props.
   - **Étape D** : `React.lazy` + `Suspense` pour charger un composant lourd (modal de detail).

4. **Mesurer les performances après optimisation** :
   - Comparer les metriques avant/après.
   - Documenter les gains dans un commentaire en haut du fichier.

---

## Contraintes TypeScript

- Mode `strict` active.
- Typer les callbacks passes au `<Profiler>` avec `ProfilerOnRenderCallback`.
- Typer les comparateurs de tri avec une union type.
- Typer les props de `React.memo` correctement.
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter la virtualisation de la liste avec `@tanstack/react-virtual`.
- [ ] Utiliser `useTransition` pour le champ de recherche (ne pas bloquer l'input).
- [ ] Implementer le debounce sur le champ de recherche.
- [ ] Comparer les performances avec et sans le compilateur React 19.

---

## Fichiers

```
src/
  types/
    product.ts
  components/
    ProductCatalog.tsx          (version non optimisee)
    ProductCatalogOptimized.tsx (version optimisee)
    ProductCard.tsx
    ProductDetailModal.tsx       (lazy loaded)
  app/
    performance/
      page.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| Le composant initial est volontairement lent     | oui     |
| Le `<Profiler>` mesure les temps de rendu        | oui     |
| `useMemo` est utilise pour le filtrage et le tri | oui     |
| `React.memo` empeche les re-renders inutiles     | oui     |
| `useCallback` stabilise les références de fonctions | oui  |
| `React.lazy` charge le modal à la demandé        | oui     |
| Les gains sont documentes (avant/après)          | oui     |
| Aucun `any` dans le code                         | oui     |

---

## Ressources

- [React — Profiler](https://react.dev/reference/react/Profiler)
- [React — useMemo](https://react.dev/reference/react/useMemo)
- [React — memo](https://react.dev/reference/react/memo)
- [React — lazy](https://react.dev/reference/react/lazy)
