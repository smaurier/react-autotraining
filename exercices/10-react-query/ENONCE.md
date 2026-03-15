# Exercice 10 — React Query CRUD

**Module** : 03-Gestion-état · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 minutes
**Cours** : `cours/03-gestion-etat/03-gestion-etat.md`

---

## Objectif

Implementer un CRUD complet avec TanStack Query (React Query) pour maîtriser la gestion des donnees serveur. Tu apprendras à utiliser `useQuery` pour lire, `useMutation` pour écrire, l'invalidation de cache pour la synchronisation, et les mises a jour optimistes pour une UX fluide.

---

## Consignes

### Preparation

1. **Installer les dépendances** :
   ```bash
   npm install @tanstack/react-query json-server
   ```

2. **Créer le fichier** `src/exercises/ex10/db.json` :
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

4. **Créer le fichier** `src/exercises/ex10/api.ts` :
   - Définir l'interface `Task` avec `id`, `title`, `completed`.
   - Créer les fonctions API :
     - `fetchTasks(): Promise<Task[]>` — GET `/tasks`
     - `createTask(task: Omit<Task, "id">): Promise<Task>` — POST `/tasks`
     - `updateTask(task: Task): Promise<Task>` — PUT `/tasks/:id`
     - `deleteTask(id: string): Promise<void>` — DELETE `/tasks/:id`

5. **Créer le fichier** `src/exercises/ex10/TaskManager.tsx` :
   - `useQuery` pour lister les taches avec une queryKey `["tasks"]`.
   - `useMutation` pour créer une tache avec `onSuccess` qui invalide le cache.
   - `useMutation` pour mettre a jour une tache avec une mise a jour optimiste.
   - `useMutation` pour supprimer une tache avec invalidation.
   - Gérer les états `isLoading`, `isError`, `error`.

6. **Créer le fichier** `src/exercises/ex10/App.tsx` :
   - Configurer le `QueryClient` et le `QueryClientProvider`.

---

## Contraintes TypeScript

- Mode `strict` active.
- Les fonctions API doivent etre entièrement typees (paramètres et retour).
- Les `queryKey` doivent utiliser des tableaux types (`["tasks"] as const`).
- Les mutations doivent avoir les génériques corrects.
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
| `useQuery` récupéré la liste des taches           | oui     |
| `useMutation` créé une nouvelle tache             | oui     |
| `useMutation` met a jour une tache existante      | oui     |
| `useMutation` supprime une tache                  | oui     |
| Le cache est invalide après chaque mutation       | oui     |
| Les états loading/error sont geres                | oui     |
| Aucun `any` dans le code                          | oui     |

---

## Ressources

- [TanStack Query — Quick Start](https://tanstack.com/query/latest/docs/framework/react/quick-start)
- [TanStack Query — useMutation](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [TanStack Query — Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [json-server](https://github.com/typicode/json-server)
