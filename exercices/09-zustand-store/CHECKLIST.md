# Checklist — Exercice 09 : Zustand store

Coche chaque element une fois valide :

- [ ] L'interface `TaskState` est definie avec l'etat et les actions
- [ ] Le store est cree avec `create<TaskState>()`
- [ ] L'action `addTask` ajoute une tache avec un id unique
- [ ] L'action `toggleTask` bascule le statut d'une tache de maniere immutable
- [ ] L'action `deleteTask` supprime une tache avec `.filter()`
- [ ] L'action `setFilter` change le filtre courant
- [ ] Le selecteur `getFilteredTasks` retourne les taches selon le filtre
- [ ] Le middleware `persist` sauvegarde l'etat dans `localStorage`
- [ ] Les composants utilisent des selecteurs precis (`useTaskStore((s) => s.action)`)
- [ ] Les taches persistent apres un rechargement de la page
- [ ] Le compteur de taches restantes est correct
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
