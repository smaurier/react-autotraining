# Exercice 17 — Tests composants

**Module** : 07-Tests · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 minutes
**Cours** : `cours/07-tests/02-react-testing-library.md`

---

## Objectif

Ecrire une suite de tests complete pour un composant `TaskList` avec React Testing Library (RTL) et Vitest. Tu vas tester le rendu de la liste, l'ajout, le toggle (cocher/decocher), la suppression et l'etat vide.

L'objectif pedagogique est d'apprendre a ecrire des tests **centres sur l'utilisateur** : on interagit avec les elements comme le ferait un vrai utilisateur (clic, saisie), et on verifie ce qui est visible a l'ecran.

---

## Consignes

1. **Creer le composant a tester** `src/components/TaskList.tsx` :
   - Composant Client (`'use client'` si Next.js, ou composant React classique).
   - Gere un state local `tasks: Task[]`.
   - Input + bouton pour ajouter une tache.
   - Chaque tache affiche : checkbox (toggle completed), titre, bouton supprimer.
   - Si la liste est vide, afficher "Aucune tache".
   - Compteur de taches restantes (non completees).

2. **Creer le fichier de tests** `src/components/__tests__/TaskList.test.tsx` :
   - **Test 1** : Rendu initial — affiche "Aucune tache" quand la liste est vide.
   - **Test 2** : Ajout d'une tache — saisir un texte, cliquer "Ajouter", verifier qu'elle apparait.
   - **Test 3** : Ajout de plusieurs taches — verifier le compteur.
   - **Test 4** : Toggle d'une tache — cliquer la checkbox, verifier le style barre et le compteur.
   - **Test 5** : Suppression d'une tache — cliquer "Supprimer", verifier qu'elle disparait.
   - **Test 6** : Ne pas ajouter une tache vide — le bouton est desactive ou rien ne se passe.
   - **Test 7** : Accessibilite — verifier les roles ARIA (checkbox, list, button).

3. **Utiliser `@testing-library/user-event`** pour les interactions (pas `fireEvent`).

4. **Configuration** : `vitest.config.ts` avec `jsdom` et setup pour RTL.

---

## Contraintes TypeScript

- Mode `strict` active.
- Typer l'interface `Task` avec `id`, `title`, `completed`.
- Les tests doivent compiler sans erreur TypeScript.
- Utiliser les types de `@testing-library/react` et `vitest`.
- Aucun `any` autorise.

---

## Bonus

- [ ] Tester un composant avec des props initiales (`initialTasks: Task[]`).
- [ ] Ajouter un test de snapshot (`toMatchInlineSnapshot`).
- [ ] Tester le raccourci clavier "Entree" pour ajouter une tache.
- [ ] Mesurer la couverture de code avec `vitest --coverage`.

---

## Fichiers

```
src/
  types/
    task.ts
  components/
    TaskList.tsx
    __tests__/
      TaskList.test.tsx
  test/
    setup.ts
vitest.config.ts
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| Au moins 7 tests passent au vert                 | oui     |
| Les tests utilisent `user-event` (pas `fireEvent`) | oui  |
| Les requetes utilisent des selecteurs accessibles (`getByRole`, `getByText`) | oui |
| Le composant fonctionne correctement             | oui     |
| Les tests couvrent : rendu, ajout, toggle, suppression, etat vide | oui |
| Aucun `any` dans les tests                       | oui     |
| Tous les tests compilent sans erreur TS          | oui     |

---

## Ressources

- [React Testing Library — Introduction](https://testing-library.com/docs/react-testing-library/intro)
- [Testing Library — user-event](https://testing-library.com/docs/user-event/intro)
- [Vitest — Configuration](https://vitest.dev/config/)
