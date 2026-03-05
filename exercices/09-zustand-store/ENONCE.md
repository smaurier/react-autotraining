# Exercice 09 — Zustand store

**Module** : 03-Gestion-etat · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/03-gestion-etat/03-gestion-etat.md`

---

## Objectif

Creer un store de gestion de taches avec Zustand, une bibliotheque de gestion d'etat legere et performante. Tu apprendras a definir un store type, a creer des actions, a utiliser des selecteurs pour optimiser les re-renders, et a persister l'etat avec un middleware.

---

## Consignes

1. **Definir les types** dans `src/exercises/ex09/types.ts` :
   ```ts
   export interface Task {
     id: string;
     title: string;
     completed: boolean;
     createdAt: Date;
   }

   export type FilterStatus = "all" | "active" | "completed";
   ```

2. **Creer le store** dans `src/exercises/ex09/useTaskStore.ts` :
   - Utiliser `create` de Zustand avec un typage strict.
   - **Etat** :
     - `tasks: Task[]` — liste des taches.
     - `filter: FilterStatus` — filtre courant.
   - **Actions** :
     - `addTask(title: string): void` — ajouter une tache.
     - `toggleTask(id: string): void` — basculer le statut.
     - `deleteTask(id: string): void` — supprimer une tache.
     - `setFilter(filter: FilterStatus): void` — changer le filtre.
   - **Selecteurs** (fonctions derivees) :
     - `getFilteredTasks(): Task[]` — retourner les taches selon le filtre courant.
     - `getRemainingCount(): number` — nombre de taches non completees.
   - **Middleware** : utiliser `persist` pour sauvegarder l'etat dans `localStorage`.

3. **Creer le composant** `src/exercises/ex09/TaskInput.tsx` :
   - Champ de saisie + bouton pour ajouter une tache.
   - Utiliser un selecteur precis : `useTaskStore((s) => s.addTask)`.

4. **Creer le composant** `src/exercises/ex09/TaskList.tsx` :
   - Afficher les taches filtrees.
   - Utiliser les selecteurs du store.

5. **Creer le composant** `src/exercises/ex09/TaskFilters.tsx` :
   - Trois boutons pour changer le filtre (Toutes, Actives, Completees).
   - Afficher le compteur de taches restantes.

6. **Creer le fichier** `src/exercises/ex09/App.tsx`.

---

## Contraintes TypeScript

- Mode `strict` active.
- Le store doit etre entierement type avec une interface `TaskState`.
- Les selecteurs dans les composants doivent etre des fonctions fleches typees.
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter une action `clearCompleted()` pour supprimer toutes les taches completees.
- [ ] Ajouter le middleware `devtools` pour le debug avec les Redux DevTools.
- [ ] Creer un selecteur `useFilteredTasks()` avec `useShallow` pour eviter les re-renders.

---

## Fichiers

```
src/exercises/ex09/
  ├── types.ts
  ├── useTaskStore.ts
  ├── TaskInput.tsx
  ├── TaskList.tsx
  ├── TaskFilters.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| Le store Zustand est cree et type                | oui     |
| Les actions add/toggle/delete fonctionnent       | oui     |
| Les filtres Toutes/Actives/Completees marchent   | oui     |
| Le middleware `persist` sauvegarde dans localStorage | oui  |
| Les selecteurs sont precis (pas de `useTaskStore()` sans selecteur) | oui |
| Aucun `any` dans le code                         | oui     |

---

## Ressources

- [Documentation Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Zustand — Persist middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [Zustand — TypeScript guide](https://docs.pmnd.rs/zustand/guides/typescript)
