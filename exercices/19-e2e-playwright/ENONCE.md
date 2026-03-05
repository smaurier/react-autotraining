# Exercice 19 — E2E Playwright

**Module** : 07-Tests · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 minutes
**Cours** : `cours/07-tests/04-playwright-e2e.md`

---

## Objectif

Ecrire 5 scenarios de tests end-to-end (E2E) avec Playwright pour une application de gestion de taches. Tu vas utiliser le pattern Page Object pour structurer tes tests et couvrir les parcours utilisateur complets : navigation, creation, modification, suppression et filtrage.

Les tests E2E verifient que l'application fonctionne de bout en bout dans un vrai navigateur, contrairement aux tests unitaires qui testent des composants isoles.

---

## Consignes

1. **Configurer Playwright** :
   - `playwright.config.ts` avec base URL, navigateur(s), retry, screenshots on failure.
   - Script `webServer` pour demarrer l'application Next.js avant les tests.

2. **Creer le Page Object** `e2e/pages/TaskPage.ts` :
   - Classe `TaskPage` qui encapsule les selecteurs et les actions.
   - Methodes : `goto()`, `addTask(title)`, `toggleTask(title)`, `deleteTask(title)`, `editTask(oldTitle, newTitle)`, `filterByStatus(status)`, `getTaskCount()`, `getTaskTitles()`.

3. **Ecrire les 5 scenarios** dans `e2e/tasks.spec.ts` :
   - **Scenario 1** : Naviguer vers la page des taches et verifier le titre.
   - **Scenario 2** : Creer une tache, verifier qu'elle apparait dans la liste.
   - **Scenario 3** : Modifier le titre d'une tache existante.
   - **Scenario 4** : Supprimer une tache et verifier qu'elle disparait.
   - **Scenario 5** : Filtrer les taches par statut (toutes, actives, completees).

4. **Utiliser les bonnes pratiques Playwright** :
   - Selecteurs accessibles (`getByRole`, `getByLabel`, `getByText`).
   - `expect` avec auto-waiting (pas de `waitForTimeout`).
   - `test.describe` pour grouper les scenarios.

---

## Contraintes TypeScript

- Mode `strict` active.
- Le Page Object est une classe TypeScript avec des methodes typees.
- Les selecteurs Playwright utilisent les types `Locator` et `Page`.
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter des tests visuels avec `toHaveScreenshot()`.
- [ ] Tester sur plusieurs navigateurs (Chromium, Firefox, WebKit).
- [ ] Ajouter un test de performance (page load < 3s).
- [ ] Generer un rapport HTML avec `playwright show-report`.

---

## Fichiers

```
e2e/
  pages/
    TaskPage.ts
  tasks.spec.ts
playwright.config.ts
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| Playwright est configure avec un `webServer`     | oui     |
| Le Page Object encapsule tous les selecteurs     | oui     |
| 5 scenarios E2E passent au vert                  | oui     |
| Les selecteurs sont accessibles (`getByRole`, etc.) | oui  |
| Pas de `waitForTimeout` (utiliser l'auto-waiting) | oui    |
| Les tests sont groupes dans un `describe`        | oui     |
| Le code compile sans erreur TypeScript           | oui     |

---

## Ressources

- [Playwright — Getting Started](https://playwright.dev/docs/intro)
- [Playwright — Page Object Models](https://playwright.dev/docs/pom)
- [Playwright — Locators](https://playwright.dev/docs/locators)
