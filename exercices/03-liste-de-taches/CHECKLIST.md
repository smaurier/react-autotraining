# Checklist — Exercice 03 : Liste de taches

Coche chaque élément une fois valide :

- [ ] L'interface `Todo` est definie et exportee avec `id`, `text`, `completed`
- [ ] `useState<Todo[]>` est utilise avec un type explicite
- [ ] L'ajout d'une tache créé un nouvel objet avec `crypto.randomUUID()`
- [ ] Le champ est vide après l'ajout et l'ajout de texte vide est bloque
- [ ] La bascule du statut utilise `.map()` de manière immutable
- [ ] La suppression utilise `.filter()` de manière immutable
- [ ] `.map()` utilise `todo.id` comme `key` (pas l'index)
- [ ] Le rendu conditionnel affiche "Aucune tache" quand la liste est vide
- [ ] Le compteur des taches restantes est correct et se met a jour
- [ ] Les taches completees sont visuellement differenciees (barrees)
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
- [ ] Aucune mutation directe du tableau (`push`, `splice`, etc.)
