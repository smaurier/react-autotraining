# Exercice 10 — React Query CRUD

**Module** : 03-Gestion-etat · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 minutes
**Cours** : `cours/03-gestion-etat/03-gestion-etat.md`

---

## Objectif

Implementer un CRUD complet avec TanStack Query (React Query) pour maitriser la gestion des donnees serveur. Tu apprendras a utiliser `useQuery` pour lire, `useMutation` pour ecrire, l'invalidation de cache pour la synchronisation, et les mises a jour optimistes pour une UX fluide.

---

## Consignes

### Preparation

1. **Installer les dependances** :
   ```bash
   npm install @tanstack/react-query json-server
   ```

2. **Creer le fichier** `src/exercises/ex10/db.json` :
   ```json
   {
     "tasks": [
       { "id": "1", "title": "Apprendre React Query", "completed": false },
       { "id": "2", "title": "Configurer json-server", "completed": true }
     ]
   }
   ```

3. **Lancer json-server** : `npx json-server --watch src/exercises/ex10/db.json --port 3001`

### Implementation

4. **Creer le fichier** `src/exercises/ex10/api.ts` :
   - Definir l'interface `Task` avec `id`, `title`, `completed`.
   - Creer les fonctions API :
     - `fetchTasks(): Promise<Task[]>` — GET `/tasks`
     - `createTask(task: Omit<Task, "id">): Promise<Task>` — POST `/tasks`
     - `updateTask(task: Task): Promise<Task>` — PUT `/tasks/:id`
     - `deleteTask(id: string): Promise<void>` — DELETE `/tasks/:id`

5. **Creer le fichier** `src/exercises/ex10/TaskManager.tsx` :
   - `useQuery` pour lister les taches avec une queryKey `["tasks"]`.
   - `useMutation` pour creer une tache avec `onSuccess` qui invalide le cache.
   - `useMutation` pour mettre a jour une tache avec une mise a jour optimiste.
   - `useMutation` pour supprimer une tache avec invalidation.
   - Gerer les etats `isLoading`, `isError`, `error`.

6. **Creer le fichier** `src/exercises/ex10/App.tsx` :
   - Configurer le `QueryClient` et le `QueryClientProvider`.

---

## Contraintes TypeScript

- Mode `strict` active.
- Les fonctions API doivent etre entierement typees (parametres et retour).
- Les `queryKey` doivent utiliser des tableaux types (`["tasks"] as const`).
- Les mutations doivent avoir les generiques corrects.
- Aucun `any` autorise.

---

## Bonus

- [ ] Implementer la mise a jour optimiste complete avec rollback en cas d'erreur.
- [ ] Ajouter un indicateur de chargement par mutation (icone spinner sur le bouton).
- [ ] Utiliser `useQueryClient` pour pre-remplir le cache lors de la navigation vers un detail.
- [ ] Ajouter la pagination avec `keepPreviousData`.

---

## Fichiers

```
src/exercises/ex10/
  ├── db.json
  ├── api.ts
  ├── TaskManager.tsx
  └── App.tsx
```

---

## Criteres de reussite

| Critere                                           | Attendu |
| ------------------------------------------------- | ------- |
| `useQuery` recupere la liste des taches           | oui     |
| `useMutation` cree une nouvelle tache             | oui     |
| `useMutation` met a jour une tache existante      | oui     |
| `useMutation` supprime une tache                  | oui     |
| Le cache est invalide apres chaque mutation       | oui     |
| Les etats loading/error sont geres                | oui     |
| Aucun `any` dans le code                          | oui     |

---

## Ressources

- [TanStack Query — Quick Start](https://tanstack.com/query/latest/docs/framework/react/quick-start)
- [TanStack Query — useMutation](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [TanStack Query — Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [json-server](https://github.com/typicode/json-server)
