# Exercice 18 — Tests intégration MSW

**Module** : 07-Tests · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/07-tests/03-integration-msw.md`

---

## Objectif

Tester un composant qui effectue des appels réseau en utilisant MSW (Mock Service Worker) pour intercepter les requêtes HTTP. Tu vas créer un composant qui fetch des taches depuis une API, et écrire des tests couvrant les états loading, succes et erreur.

MSW permet de mocker les requêtes au niveau du réseau (pas au niveau du code), ce qui rend les tests plus proches du comportement réel de l'application.

---

## Consignes

1. **Créer le composant** `src/components/TaskFetcher.tsx` :
   - Client Component avec `'use client'`.
   - Fetch les taches depuis `GET /api/tasks` au montage (avec `useEffect` ou un custom hook).
   - Affiche un état "Chargement..." pendant le fetch.
   - Affiche la liste des taches en cas de succes.
   - Affiche un message d'erreur en cas d'echec avec un bouton "Reessayer".

2. **Configurer MSW** :
   - `src/test/mocks/handlers.ts` : définir le handler `GET /api/tasks`.
   - `src/test/mocks/server.ts` : créer le serveur MSW pour les tests.
   - Intégrer MSW dans le setup Vitest.

3. **Écrire les tests** `src/components/__tests__/TaskFetcher.test.tsx` :
   - **Test 1** : affiche "Chargement..." au rendu initial.
   - **Test 2** : affiche la liste des taches après un fetch reussi.
   - **Test 3** : affiche un message d'erreur si le serveur retourne 500.
   - **Test 4** : le bouton "Reessayer" relance le fetch après une erreur.
   - **Test 5** : affiche "Aucune tache" si le serveur retourne un tableau vide.

4. **Utiliser `server.use()`** pour surcharger les handlers dans certains tests (erreur, tableau vide).

---

## Contraintes TypeScript

- Mode `strict` active.
- Typer les donnees fetchees avec l'interface `Task`.
- Typer les handlers MSW avec les types de `msw`.
- Typer l'état du composant (`loading`, `error`, `data`).
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un test pour un fetch POST (création de tache).
- [ ] Tester un delai de réponse avec `delay()` de MSW.
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
| MSW est configure et intercepte les requêtes     | oui     |
| Le test de chargement vérifié "Chargement..."    | oui     |
| Le test de succes vérifié que les taches s'affichent | oui  |
| Le test d'erreur vérifié le message d'erreur     | oui     |
| Le test "Reessayer" vérifié que le fetch est relance | oui |
| Le test tableau vide vérifié "Aucune tache"      | oui     |
| Aucun `any` dans les tests                       | oui     |

---

## Ressources

- [MSW — Getting Started](https://mswjs.io/docs/getting-started)
- [MSW — Node.js intégration](https://mswjs.io/docs/integrations/node)
- [Testing Library — Async utilities](https://testing-library.com/docs/dom-testing-library/api-async)
