# Checklist — Exercice 06 : Hooks avances

Coche chaque élément une fois valide :

- [ ] `useMemo` est utilise pour calculer la liste filtree et triee
- [ ] Les dépendances de `useMemo` incluent `searchTerm`, `sortBy` et `selectedCategory`
- [ ] `useCallback` stabilise le handler `handleSelect` passe aux enfants
- [ ] Les dépendances de `useCallback` sont correctes (tableau vide ou valeurs nécessaires)
- [ ] `React.memo` enveloppe `ProductCard` pour éviter les re-renders inutiles
- [ ] Le filtrage par categorie fonctionne correctement
- [ ] La recherche textuelle filtre les produits par nom
- [ ] Le tri par nom et par prix fonctionne
- [ ] Le tableau n'est pas mute lors du tri (`[...result].sort(...)`)
- [ ] Le nombre de résultats s'affiche et se met a jour
- [ ] Les `console.log` dans `ProductCard` confirment l'absence de re-renders inutiles
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
