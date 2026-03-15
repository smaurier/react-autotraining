# Exercice 07 — Custom hooks

**Module** : 02-Hooks-avances · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/02-hooks-avances/02-hooks-avances.md`

---

## Objectif

Créer trois hooks personnalises réutilisables pour maîtriser le pattern des custom hooks. Tu apprendras a extraire de la logique commune dans des hooks génériques, a les typer avec des génériques TypeScript, et a les tester.

---

## Consignes

### Hook 1 : `useLocalStorage<T>(key, initialValue)`

1. **Créer le fichier** `src/exercises/ex07/useLocalStorage.ts`.
2. **Signature** : `function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void]`
3. **Comportement** :
   - Au montage, lire la valeur depuis `localStorage`. Si elle existe, la parser avec `JSON.parse`. Sinon, utiliser `initialValue`.
   - Le setter doit persister la nouvelle valeur dans `localStorage` avec `JSON.stringify`.
   - Le setter doit accepter une valeur ou une fonction (comme `useState`).

### Hook 2 : `useDebounce<T>(value, delay)`

4. **Créer le fichier** `src/exercises/ex07/useDebounce.ts`.
5. **Signature** : `function useDebounce<T>(value: T, delay: number): T`
6. **Comportement** :
   - Retourner la valeur avec un delai : la valeur de retour ne se met a jour que `delay` ms après le dernier changement de `value`.
   - Utiliser `useEffect` avec un `setTimeout` et un cleanup `clearTimeout`.

### Hook 3 : `useMediaQuery(query)`

7. **Créer le fichier** `src/exercises/ex07/useMediaQuery.ts`.
8. **Signature** : `function useMediaQuery(query: string): boolean`
9. **Comportement** :
   - Utiliser `window.matchMedia(query)` pour vérifier si la media query correspond.
   - Ecouter les changements avec `addEventListener("change", ...)` et mettre a jour l'état.
   - Nettoyer l'ecouteur au demontage.

### Demo

10. **Créer le fichier** `src/exercises/ex07/App.tsx` :
    - Utiliser les trois hooks dans un composant de demonstration.
    - `useLocalStorage` pour stocker un nom d'utilisateur.
    - `useDebounce` pour debouncer un champ de recherche.
    - `useMediaQuery` pour détecter si l'ecran est mobile.

---

## Contraintes TypeScript

- Mode `strict` active.
- Les hooks doivent utiliser des génériques TypeScript (`<T>`).
- Les types de retour doivent etre explicites.
- Aucun `any` autorise.
- Les hooks doivent etre exportes comme export par defaut.

---

## Bonus

- [ ] Écrire des tests unitaires pour chaque hook avec `renderHook` de Testing Library.
- [ ] Ajouter un hook `useOnClickOutside(ref, handler)` pour détecter les clics en dehors d'un élément.
- [ ] Ajouter la gestion des erreurs dans `useLocalStorage` (JSON invalide, quota dépasse).

---

## Fichiers

```
src/exercises/ex07/
  ├── useLocalStorage.ts
  ├── useDebounce.ts
  ├── useMediaQuery.ts
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                           | Attendu |
| ------------------------------------------------- | ------- |
| `useLocalStorage` lit et écrit dans le localStorage | oui   |
| `useDebounce` retarde la valeur du delai specifie  | oui    |
| `useMediaQuery` détecté les changements de media   | oui    |
| Les hooks utilisent des génériques TypeScript      | oui    |
| Les hooks nettoient correctement (cleanup)         | oui    |
| Aucun `any` dans le code                          | oui     |

---

## Ressources

- [React — Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [MDN — Window.matchMedia()](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
- [MDN — localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
