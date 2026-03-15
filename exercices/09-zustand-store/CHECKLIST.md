# Checklist — Exercice 09 : Zustand store

Coche chaque élément une fois valide :

- [ ] L'interface `TaskState` est definie avec l'état et les actions
- [ ] Le store est créé avec `create<TaskState>()`
- [ ] L'action `addTask` ajoute une tache avec un id unique
- [ ] L'action `toggleTask` bascule le statut d'une tache de manière immutable
- [ ] L'action `deleteTask` supprime une tache avec `.filter()`
- [ ] L'action `setFilter` change le filtre courant
- [ ] Le selecteur `getFilteredTasks` retourne les taches selon le filtre
- [ ] Le middleware `persist` sauvegarde l'état dans `localStorage`
- [ ] Les composants utilisent des selecteurs précis (`useTaskStore((s) => s.action)`)
- [ ] Les taches persistent après un rechargement de la page
- [ ] Le compteur de taches restantes est correct
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
