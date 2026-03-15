# Exercice 16 — API Routes & Server Actions

**Module** : 06-Next.js App Router · **Difficulte** : ⭐⭐⭐
**Duree estimee** : 75 minutes
**Cours** : `cours/06-nextjs/03-data-fetching-actions.md`

---

## Objectif

Construire une API REST complete pour gérer des taches (CRUD) avec les Route Handlers de Next.js 15, puis utiliser une Server Action pour soumettre un formulaire cote serveur. Tu vas comprendre la différence entre Route Handlers (endpoints HTTP classiques) et Server Actions (mutations directes depuis le client).

---

## Consignes

1. **Créer les types** `src/types/task.ts` :
   - Interface `Task` : `id`, `title`, `description`, `completed` (boolean), `priority` (`"low" | "medium" | "high"`), `createdAt` (string).
   - Type `CreateTaskInput` : `Omit<Task, "id" | "createdAt">`.
   - Type `UpdateTaskInput` : `Partial<CreateTaskInput>`.

2. **Créer un store en mémoire** `src/lib/task-store.ts` :
   - Un tableau de taches en mémoire (simule une base de donnees).
   - Fonctions exportees : `getTasks()`, `getTaskById(id)`, `createTask(input)`, `updateTask(id, input)`, `deleteTask(id)`.

3. **Créer les Route Handlers** :
   - `src/app/api/tasks/route.ts` :
     - `GET` : retourner toutes les taches.
     - `POST` : créer une tache (valider le body avec Zod).
   - `src/app/api/tasks/[id]/route.ts` :
     - `GET` : retourner une tache par ID.
     - `PUT` : mettre a jour une tache.
     - `DELETE` : supprimer une tache.
   - Retourner les bons codes HTTP (200, 201, 404, 400).

4. **Créer une Server Action** `src/actions/task-actions.ts` :
   - Directive `'use server'` en haut du fichier.
   - Action `createTaskAction(formData: FormData)` qui créé une tache depuis un formulaire.
   - Valider les donnees avec Zod.
   - Appeler `revalidatePath("/tasks")` après création.

5. **Créer la page avec formulaire** `src/app/tasks/page.tsx` :
   - Afficher la liste des taches (Server Component).
   - Formulaire d'ajout utilisant la Server Action.
   - Utiliser `useFormStatus` dans un Client Component pour l'état pending.

---

## Contraintes TypeScript

- Mode `strict` active.
- Typer tous les handlers avec `NextRequest` et `NextResponse`.
- Typer le body des requêtes après validation Zod.
- Typer les params comme `Promise<{ id: string }>` (Next.js 15).
- Utiliser `z.infer<typeof schema>` pour deduire les types des schemas.
- Aucun `any` autorise.

---

## Bonus

- [ ] Ajouter une pagination GET `/api/tasks?page=1&limit=10`.
- [ ] Ajouter un filtre GET `/api/tasks?priority=high&completed=false`.
- [ ] Utiliser `useOptimistic` pour une mise a jour optimiste de la liste.
- [ ] Ajouter un middleware de validation générique pour les Route Handlers.

---

## Fichiers

```
src/
  types/
    task.ts
  lib/
    task-store.ts
  actions/
    task-actions.ts
  app/
    api/
      tasks/
        route.ts
        [id]/
          route.ts
    tasks/
      page.tsx
  components/
    TaskForm.tsx          (Client Component)
    SubmitButton.tsx       (Client Component — useFormStatus)
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| GET `/api/tasks` retourne la liste des taches     | oui     |
| POST `/api/tasks` créé une tache (201)            | oui     |
| PUT `/api/tasks/:id` met a jour une tache         | oui     |
| DELETE `/api/tasks/:id` supprime une tache        | oui     |
| Les erreurs retournent les bons codes HTTP        | oui     |
| La Server Action créé une tache depuis le formulaire | oui  |
| `useFormStatus` affiche l'état pending            | oui     |
| La validation Zod rejette les donnees invalides   | oui     |
| Aucun `any` dans le code                          | oui     |

---

## Ressources

- [Next.js — Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Next.js — Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [React — useFormStatus](https://react.dev/reference/react-dom/hooks/useFormStatus)
