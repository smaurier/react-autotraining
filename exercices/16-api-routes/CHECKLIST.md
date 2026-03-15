# Checklist — Exercice 16 : API Routes & Server Actions

## Validation

- [ ] Les interfaces `Task`, `CreateTaskInput`, `UpdateTaskInput` sont definies et exportees
- [ ] Le store en mémoire expose `getTasks`, `getTaskById`, `createTask`, `updateTask`, `deleteTask`
- [ ] GET `/api/tasks` retourne la liste des taches avec un status 200
- [ ] POST `/api/tasks` créé une tache et retourne un status 201
- [ ] GET `/api/tasks/[id]` retourne la tache ou un 404
- [ ] PUT `/api/tasks/[id]` met a jour la tache ou retourne un 404
- [ ] DELETE `/api/tasks/[id]` supprime la tache ou retourne un 404
- [ ] La validation Zod rejette les donnees invalides avec un status 400
- [ ] La Server Action `createTaskAction` valide les donnees et appelle `revalidatePath`
- [ ] `useFormStatus` est utilise dans un composant enfant du `<form>` (pas dans le même composant)
- [ ] Le bouton affiche "Ajout en cours..." pendant la soumission
- [ ] `params` est type comme `Promise<{ id: string }>` et `await` dans les Route Handlers
- [ ] Aucun `any` dans le code — types stricts partout
- [ ] Le projet compile sans erreur TypeScript
