# Exercice 19 — Tests E2E avec Playwright

**Module** : 07-Tests · **Difficulté** : ★★★
**Durée estimée** : 90 minutes
**Cours** : `cours/07-tests/02-tests-composants-rtl.md`, `cours/07-tests/03-tests-api-msw.md`

> *Prérequis Vue* : tu as déjà utilisé Playwright pour des tests E2E dans le parcours Vue. Ici on l'applique sur une app React/Next.js.

---

## Objectif

Écrire une suite de tests E2E avec Playwright pour un formulaire d'inscription React. L'exercice couvre le cycle complet : remplissage, soumission, validation des erreurs, et vérification de la redirection.

---

## Contexte

L'application `taskflow` dispose d'un formulaire d'inscription (`/register`) avec :
- Champ `email` (required, format valide)
- Champ `password` (required, min 8 caractères)
- Champ `confirmPassword` (doit correspondre à `password`)
- Bouton `Créer mon compte`

En cas de succès, l'utilisateur est redirigé vers `/dashboard`.

---

## Consignes

### Partie 1 — Configuration Playwright

1. Vérifier que `playwright.config.ts` est configuré avec `baseURL: 'http://localhost:3000'`.
2. Créer le fichier `e2e/register.spec.ts`.

### Partie 2 — Tests du formulaire

3. **Test nominal** : remplir le formulaire avec des données valides et vérifier la redirection vers `/dashboard`.

4. **Test erreur email** : soumettre sans email et vérifier qu'un message d'erreur `"Email requis"` s'affiche.

5. **Test erreur password trop court** : soumettre avec un mot de passe de 5 caractères et vérifier le message `"8 caractères minimum"`.

6. **Test passwords non concordants** : saisir des mots de passe différents et vérifier le message `"Les mots de passe ne correspondent pas"`.

7. **Test accessibilité basique** : vérifier que le focus est placé automatiquement sur le champ email au chargement de la page.

### Partie 3 — Helpers et robustesse

8. Créer une fonction helper `fillRegisterForm({ email, password, confirm })` réutilisable dans les tests.

9. Utiliser `page.getByRole('button', { name: /créer mon compte/i })` plutôt que des sélecteurs CSS fragiles.

10. Ajouter un `test.beforeEach` qui navigue vers `/register` avant chaque test.

---

## Contraintes

- Utiliser exclusivement les locators recommandés par Playwright : `getByRole`, `getByLabel`, `getByText`.
- Aucun `page.waitForTimeout()` dans les tests (utiliser `expect(locator).toBeVisible()`).
- Chaque test doit être indépendant (pas de dépendance d'état entre tests).

---

## Bonus

- Tester le comportement avec JavaScript désactivé.
- Ajouter un test de screenshot pour détecter les régressions visuelles.
- Configurer un rapport HTML avec `playwright.config.ts` → `reporter: 'html'`.
