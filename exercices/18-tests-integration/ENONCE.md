# Exercice 18 — Tests integration MSW

**Module** : 07-Tests · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/07-tests/03-integration-msw.md`

---

## Objectif

Tester un composant qui effectue des appels reseau en utilisant MSW (Mock Service Worker) pour intercepter les requetes HTTP. Tu vas creer un composant qui fetch des taches depuis une API, et ecrire des tests couvrant les etats loading, succes et erreur.

MSW permet de mocker les requetes au niveau du reseau (pas au niveau du code), ce qui rend les tests plus proches du comportement reel de l'application.

---

## Consignes

1. **Creer le composant** `src/components/TaskFetcher.tsx` :
   - Client Component avec `'use client'`.
   - Fetch les taches depuis `GET /api/tasks` au montage (avec `useEffect` ou un custom hook).
   - Affiche un etat "Chargement..." pendant le fetch.
   - Affiche la liste des taches en cas de succes.
   - Affiche un message d'erreur en cas d'echec avec un bouton "Reessayer".

2. **Configurer MSW** :
   - `src/test/mocks/handlers.ts` : definir le handler `GET /api/tasks`.
   - `src/test/mocks/server.ts` : creer le serveur MSW pour les tests.
   - Integrer MSW dans le setup Vitest.

3. **Ecrire les tests** `src/components/__tests__/TaskFetcher.test.tsx` :
   - **Test 1** : affiche "Chargement..." au rendu initial.
   - **Test 2** : affiche la liste des taches apres un fetch reussi.
   - **Test 3** : affiche un message d'erreur si le serveur retourne 500.
   - **Test 4** : le bouton "Reessayer" relance le fetch apres une erreur.
   - **Test 5** : affiche "Aucune tache" si le serveur retourne un tableau vide.

4. **Utiliser `server.use()`** pour surcharger les handlers dans certains tests (erreur, tableau vide).

---

## Contraintes TypeScript

- Mode `strict` active.
- Typer les donnees fetchees avec l'interface `Task`.
- Typer les handlers MSW avec les types de `msw`.
- Typer l'etat du composant (`loading`, `error`, `data`).
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un test pour un fetch POST (creation de tache).
- [ ] Tester un delai de reponse avec `delay()` de MSW.
- [ ] Utiliser `waitForElementToBeRemoved` pour le loader.
- [ ] Ajouter une gestion du cache avec TanStack Query et tester l'invalidation.

---

## Fichiers

```
src/
  types/
    task.ts
  components/
    TaskFetcher.tsx
    __tests__/
      TaskFetcher.test.tsx
  test/
    setup.ts
    mocks/
      handlers.ts
      server.ts
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| MSW est configure et intercepte les requetes     | oui     |
| Le test de chargement verifie "Chargement..."    | oui     |
| Le test de succes verifie que les taches s'affichent | oui  |
| Le test d'erreur verifie le message d'erreur     | oui     |
| Le test "Reessayer" verifie que le fetch est relance | oui |
| Le test tableau vide verifie "Aucune tache"      | oui     |
| Aucun `any` dans les tests                       | oui     |

---

## Ressources

- [MSW — Getting Started](https://mswjs.io/docs/getting-started)
- [MSW — Node.js integration](https://mswjs.io/docs/integrations/node)
- [Testing Library — Async utilities](https://testing-library.com/docs/dom-testing-library/api-async)
