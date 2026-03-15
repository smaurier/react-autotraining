# Exercice 03 — Liste de taches

**Module** : 01-Les-bases · **Difficulte** : ⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/01-les-bases/01-les-bases.md`

---

## Objectif

Construire une liste de taches (todo list) complete pour maîtriser la gestion d'un tableau dans l'état React. Tu apprendras a ajouter, basculer et supprimer des éléments, à utiliser `.map()` avec la prop `key`, et à faire du rendu conditionnel.

---

## Consignes

1. **Créer le fichier** `src/exercises/ex03/TodoList.tsx`.

2. **Définir les types** :
   ```ts
   interface Todo {
     id: string;
     text: string;
     completed: boolean;
   }
   ```

3. **Implementer l'état** :
   - `todos` : `Todo[]` — la liste des taches, initialisee à un tableau vide.
   - `inputValue` : `string` — la valeur du champ de saisie.

4. **Implementer les actions** :
   - **Ajouter** une tache : créer un nouvel objet `Todo` avec un `id` unique (`crypto.randomUUID()`), le texte saisi et `completed: false`. Vider le champ après ajout. Empecher l'ajout si le texte est vide.
   - **Basculer** le statut d'une tache : inverser `completed` pour la tache cliquee.
   - **Supprimer** une tache : retirer la tache de la liste.

5. **Afficher dans le JSX** :
   - Un champ `<input>` lie a `inputValue` et un bouton "Ajouter".
   - La liste des taches avec `.map()` et une `key` unique.
   - Chaque tache affiche son texte (barre si completee), une checkbox et un bouton "Supprimer".
   - Un compteur des taches restantes (non completees) en bas.
   - Si la liste est vide, afficher un message "Aucune tache pour le moment".

6. **Créer le fichier** `src/exercises/ex03/App.tsx` avec un titre et le composant `TodoList`.

---

## Contraintes TypeScript

- Mode `strict` active.
- L'interface `Todo` doit etre exportee.
- `useState<Todo[]>` avec type explicite.
- Les fonctions de manipulation du tableau doivent etre immutables (spread, `.filter()`, `.map()`).
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter un filtre : "Toutes", "Actives", "Completees".
- [ ] Permettre la soumission via la touche `Enter` dans le champ de saisie.
- [ ] Ajouter un bouton "Supprimer les completees" pour nettoyer la liste en un clic.

---

## Fichiers

```
src/exercises/ex03/
  ├── TodoList.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                      | Attendu |
| -------------------------------------------- | ------- |
| Ajout d'une tache fonctionne                 | oui     |
| Bascule du statut (complete/non complete)     | oui     |
| Suppression d'une tache fonctionne           | oui     |
| `.map()` utilise avec une `key` unique       | oui     |
| Message affiche quand la liste est vide      | oui     |
| Compteur des taches restantes correct        | oui     |
| Aucun `any` dans le code                     | oui     |

---

## Ressources

- [React — Rendering Lists](https://react.dev/learn/rendering-lists)
- [React — Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state)
- [MDN — crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
