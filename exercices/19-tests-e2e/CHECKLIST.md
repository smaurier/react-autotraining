# Checklist — Exercice 19 : Tests E2E avec Playwright

Coche chaque élément une fois validé :

- [ ] `playwright.config.ts` est configuré avec `baseURL: 'http://localhost:3000'`
- [ ] Le fichier `e2e/register.spec.ts` existe
- [ ] Un `test.beforeEach` navigue vers `/register` avant chaque test
- [ ] La fonction helper `fillRegisterForm` est définie et réutilisée
- [ ] Test nominal : inscription réussie → redirection `/dashboard` vérifiée avec `toHaveURL`
- [ ] Test erreur email manquant : message "Email requis" visible
- [ ] Test erreur password trop court : message "8 caractères minimum" visible
- [ ] Test passwords non concordants : message approprié visible
- [ ] Test focus initial sur le champ email avec `toBeFocused`
- [ ] Aucun `page.waitForTimeout()` présent dans les tests
- [ ] Locators exclusivement `getByRole`, `getByLabel`, `getByText`
- [ ] Chaque test est indépendant (pas de dépendance d'état)
- [ ] Tous les tests passent avec `npx playwright test`
- [ ] Le rapport HTML s'ouvre correctement avec `npx playwright show-report`
- [ ] TypeScript : pas de `any`, types explicites sur les paramètres
