# Checklist — Exercice 07 : Custom hooks

Coche chaque element une fois valide :

- [ ] `useLocalStorage` lit la valeur depuis `localStorage` au montage
- [ ] `useLocalStorage` persiste dans `localStorage` a chaque changement
- [ ] `useLocalStorage` supporte la forme fonctionnelle du setter `(prev) => newValue`
- [ ] `useLocalStorage` utilise un generique `<T>` pour le typage
- [ ] `useDebounce` retourne la valeur avec le delai specifie
- [ ] `useDebounce` nettoie le timeout dans le cleanup de `useEffect`
- [ ] `useDebounce` utilise un generique `<T>` pour le typage
- [ ] `useMediaQuery` utilise `window.matchMedia` pour evaluer la query
- [ ] `useMediaQuery` ecoute les changements avec `addEventListener("change", ...)`
- [ ] `useMediaQuery` nettoie le listener au demontage
- [ ] Les trois hooks sont utilises dans le composant `App.tsx` de demonstration
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
- [ ] Les hooks respectent les regles des hooks (appeles au top level)
