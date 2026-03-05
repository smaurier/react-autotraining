# Checklist — Exercice 17 : Tests composants

## Validation

- [ ] Vitest est configure avec `jsdom` et le setup RTL (`@testing-library/jest-dom/vitest`)
- [ ] Le composant `TaskList` gere un state local `tasks: Task[]` avec ajout, toggle et suppression
- [ ] Le composant affiche "Aucune tache" quand la liste est vide
- [ ] Test 1 : etat vide affiche "Aucune tache" et compteur a 0
- [ ] Test 2 : ajout d'une tache via saisie + clic sur "Ajouter"
- [ ] Test 3 : le compteur de taches restantes se met a jour correctement
- [ ] Test 4 : le toggle coche la checkbox et applique le style barre
- [ ] Test 5 : la suppression retire la tache de la liste
- [ ] Test 6 : impossible d'ajouter une tache vide (bouton desactive)
- [ ] Test 7 : les roles ARIA sont corrects (`list`, `checkbox`, `button`)
- [ ] Les interactions utilisent `userEvent` (pas `fireEvent`)
- [ ] Les selecteurs sont accessibles (`getByRole`, `getByLabelText`, `getByText`)
- [ ] Aucun `any` dans les tests — types stricts
- [ ] Tous les tests passent au vert (`vitest run`)
- [ ] Le composant et les tests compilent sans erreur TypeScript
