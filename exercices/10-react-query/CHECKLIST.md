# Checklist — Exercice 10 : React Query CRUD

Coche chaque élément une fois valide :

- [ ] Les fonctions API (`fetchTasks`, `createTask`, `updateTask`, `deleteTask`) sont typees
- [ ] `useQuery` récupéré la liste des taches avec la queryKey `["tasks"]`
- [ ] `useMutation` pour la création invalide le cache dans `onSuccess`
- [ ] `useMutation` pour la mise a jour implemente une mise a jour optimiste
- [ ] Le rollback fonctionne en cas d'erreur sur la mise a jour optimiste
- [ ] `useMutation` pour la suppression invalide le cache dans `onSuccess`
- [ ] Les états `isLoading` et `isError` sont geres dans le rendu
- [ ] Le `QueryClient` est créé en dehors du composant
- [ ] Le `QueryClientProvider` enveloppe l'arbre de composants
- [ ] json-server fonctionne et repond sur le port 3001
- [ ] Les boutons affichent un état de chargement pendant la mutation
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
