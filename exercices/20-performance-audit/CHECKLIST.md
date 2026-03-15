# Checklist — Exercice 20 : Performance audit

## Validation

- [ ] La version non optimisee est fonctionnelle avec 100 produits, recherche, tri et filtre
- [ ] Le `<Profiler>` est intégré et les mesures s'affichent dans la console
- [ ] Les mesures "avant" sont documentees (duree de rendu, nombre de re-renders)
- [ ] `useMemo` est utilise pour le filtrage des produits (dépendances : `search`, `selectedCategory`)
- [ ] `useMemo` est utilise pour le tri des produits (dépendances : `filteredProducts`, `sort`)
- [ ] `React.memo` est applique sur `ProductCard` pour éviter les re-renders inutiles
- [ ] `useCallback` stabilise les handlers passes en props (`handleSelect`, `handleClose`)
- [ ] `React.lazy` + `Suspense` charge le modal de detail à la demandé
- [ ] Le modal lazy-loaded à un `export default`
- [ ] Les mesures "après" montrent une amelioration significative
- [ ] Les donnees sont generees en dehors du composant (niveau module)
- [ ] `[...array].sort()` est utilise au lieu de `array.sort()` (pas de mutation)
- [ ] Aucun `any` dans le code — types stricts
- [ ] Le `ProfilerOnRenderCallback` est correctement type
