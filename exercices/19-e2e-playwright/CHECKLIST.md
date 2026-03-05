# Checklist — Exercice 19 : E2E Playwright

## Validation

- [ ] Playwright est configure avec `webServer` pour demarrer Next.js automatiquement
- [ ] Le `playwright.config.ts` definit `baseURL`, `retries`, `screenshot` et `trace`
- [ ] Le Page Object `TaskPage` encapsule tous les selecteurs dans une classe TypeScript
- [ ] Les methodes du Page Object sont typees (`Promise<void>`, `Promise<number>`, etc.)
- [ ] Scenario 1 : la navigation vers `/tasks` affiche le titre et les elements principaux
- [ ] Scenario 2 : creer une tache l'ajoute a la liste et vide l'input
- [ ] Scenario 3 : modifier le titre d'une tache met a jour l'affichage
- [ ] Scenario 4 : supprimer une tache la retire de la liste et decremente le compteur
- [ ] Scenario 5 : filtrer par statut affiche uniquement les taches correspondantes
- [ ] Les selecteurs sont accessibles (`getByRole`, `getByLabel`, `getByText`)
- [ ] Aucun `waitForTimeout` — utilisation de l'auto-waiting de Playwright
- [ ] Les tests sont groupes dans un `test.describe`
- [ ] Le Page Object est reutilisable et independant des tests
- [ ] Aucun `any` dans le code — types stricts
- [ ] Les tests passent avec `npx playwright test`
