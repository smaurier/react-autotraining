# Correction — Exercice 16 : API Routes & Server Actions

---

## Étape 1 : Types TypeScript

```ts
// src/types/task.ts

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  createdAt: string;
}

export type CreateTaskInput = Omit<Task, "id" | "createdAt">;
export type UpdateTaskInput = Partial<CreateTaskInput>;
```

---

## Étape 2 : Store en mémoire

```ts
// src/lib/task-store.ts
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types/task";

// Simule une base de donnees en memoire
let tasks: Task[] = [
  {
    id: "1",
    title: "Apprendre Next.js 15",
    description: "Etudier le App Router et les Server Components",
    completed: false,
    priority: "high",
    createdAt: new Date("2025-01-15").toISOString(),
  },
  {
    id: "2",
    title: "Configurer TypeScript strict",
    description: "Activer strict mode dans tsconfig.json",
    completed: true,
    priority: "medium",
    createdAt: new Date("2025-01-10").toISOString(),
  },
  {
    id: "3",
    title: "Ecrire des tests",
    description: "Ajouter des tests unitaires avec Vitest",
    completed: false,
    priority: "medium",
    createdAt: new Date("2025-01-20").toISOString(),
  },
];

let nextId = 4;

export function getTasks(): Task[] {
  return [...tasks]; // Copie pour eviter la mutation externe
}

export function getTaskById(id: string): Task | undefined {
  return tasks.find((task) => task.id === id);
}

export function createTask(input: CreateTaskInput): Task {
  const newTask: Task = {
    ...input,
    id: String(nextId++),
    createdAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  return newTask;
}

export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  tasks[index] = { ...tasks[index], ...input };
  return tasks[index];
}

export function deleteTask(id: string): boolean {
  const initialLength = tasks.length;
  tasks = tasks.filter((task) => task.id !== id);
  return tasks.length < initialLength;
}
```

---

## Étape 3 : Schemas de validation Zod

```ts
// src/lib/validations/task.ts
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(100),
  description: z.string().min(1, "La description est requise").max(500),
  completed: z.boolean().default(false),
  priority: z.enum(["low", "medium", "high"]),
});

export const updateTaskSchema = createTaskSchema.partial();

// Types deduits des schemas
export type CreateTaskPayload = z.infer<typeof createTaskSchema>;
export type UpdateTaskPayload = z.infer<typeof updateTaskSchema>;
```

---

## Étape 4 : Route Handlers — Collection

```ts
// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/task-store";
import { createTaskSchema } from "@/lib/validations/task";

// GET /api/tasks — Liste toutes les taches
export async function GET(): Promise<NextResponse> {
  const tasks = getTasks();
  return NextResponse.json(tasks);
}

// POST /api/tasks — Cree une nouvelle tache
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    // Validation avec Zod
    const result = createTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const newTask = createTask(result.data);

    return NextResponse.json(newTask, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Corps de la requete invalide" },
      { status: 400 }
    );
  }
}
```

---

## Étape 5 : Route Handlers — Item

```ts
// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTaskById, updateTask, deleteTask } from "@/lib/task-store";
import { updateTaskSchema } from "@/lib/validations/task";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/:id
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const task = getTaskById(id);

  if (!task) {
    return NextResponse.json(
      { error: "Tache introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json(task);
}

// PUT /api/tasks/:id
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const body: unknown = await request.json();
    const result = updateTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Donnees invalides", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const updated = updateTask(id, result.data);

    if (!updated) {
      return NextResponse.json(
        { error: "Tache introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Corps de la requete invalide" },
      { status: 400 }
    );
  }
}

// DELETE /api/tasks/:id
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;
  const deleted = deleteTask(id);

  if (!deleted) {
    return NextResponse.json(
      { error: "Tache introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Tache supprimee" });
}
```

---

## Étape 6 : Server Action

```ts
// src/actions/task-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createTask } from "@/lib/task-store";
import { createTaskSchema } from "@/lib/validations/task";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createTaskAction(formData: FormData): Promise<ActionResult> {
  // Extraire les donnees du formulaire
  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    completed: false,
  };

  // Valider avec Zod
  const result = createTaskSchema.safeParse(rawData);

  if (!result.success) {
    const firstError = result.error.errors[0]?.message ?? "Donnees invalides";
    return { success: false, error: firstError };
  }

  // Creer la tache
  createTask(result.data);

  // Revalider la page pour afficher la nouvelle tache
  revalidatePath("/tasks");

  return { success: true };
}
```

---

## Étape 7 : Page avec formulaire

```tsx
// src/app/tasks/page.tsx
import { getTasks } from "@/lib/task-store";
import { TaskForm } from "@/components/TaskForm";
import type { Task } from "@/types/task";

export default function TasksPage() {
  const tasks: Task[] = getTasks();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>Gestion des taches</h1>

      {/* Formulaire avec Server Action */}
      <TaskForm />

      {/* Liste des taches */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Taches ({tasks.length})</h2>
        {tasks.length === 0 ? (
          <p style={{ color: "#666" }}>Aucune tache pour le moment.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {tasks.map((task) => (
              <li
                key={task.id}
                style={{
                  padding: "1rem",
                  marginBottom: "0.5rem",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: task.completed ? 0.6 : 1,
                }}
              >
                <div>
                  <strong style={{ textDecoration: task.completed ? "line-through" : "none" }}>
                    {task.title}
                  </strong>
                  <p style={{ margin: "0.25rem 0", color: "#666", fontSize: "0.9rem" }}>
                    {task.description}
                  </p>
                </div>
                <span
                  style={{
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    backgroundColor:
                      task.priority === "high"
                        ? "#fee"
                        : task.priority === "medium"
                          ? "#ffe"
                          : "#efe",
                    color:
                      task.priority === "high"
                        ? "#c00"
                        : task.priority === "medium"
                          ? "#a80"
                          : "#080",
                  }}
                >
                  {task.priority}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

---

## Étape 8 : Client Components — Formulaire et bouton

```tsx
// src/components/TaskForm.tsx
"use client";

import { createTaskAction } from "@/actions/task-actions";
import { SubmitButton } from "./SubmitButton";
import { useRef } from "react";

export function TaskForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData): Promise<void> {
    const result = await createTaskAction(formData);
    if (result.success) {
      formRef.current?.reset(); // Reset le formulaire apres succes
    }
  }

  return (
    <form
      ref={formRef}
      action={handleAction}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1rem",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ margin: 0 }}>Nouvelle tache</h2>

      <input
        name="title"
        type="text"
        placeholder="Titre de la tache"
        required
        style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
      />

      <textarea
        name="description"
        placeholder="Description"
        required
        rows={3}
        style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
      />

      <select
        name="priority"
        defaultValue="medium"
        style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
      >
        <option value="low">Basse</option>
        <option value="medium">Moyenne</option>
        <option value="high">Haute</option>
      </select>

      <SubmitButton />
    </form>
  );
}
```

```tsx
// src/components/SubmitButton.tsx
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  // useFormStatus doit etre dans un composant enfant du <form>
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: "0.5rem 1rem",
        backgroundColor: pending ? "#999" : "#0070f3",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: pending ? "not-allowed" : "pointer",
      }}
    >
      {pending ? "Ajout en cours..." : "Ajouter la tache"}
    </button>
  );
}
```

---

## Ce que tu aurais pu oublier

1. **`params` est une Promise dans Next.js 15** : les Route Handlers aussi doivent `await params` pour acceder aux paramètres dynamiques.

2. **`useFormStatus` doit etre dans un composant enfant du `<form>`** : il ne fonctionne pas dans le même composant que le `<form>`. C'est pour cela qu'on créé un `SubmitButton` separe.

3. **`'use server'` vs Route Handlers** : les Server Actions (`'use server'`) sont des fonctions appelees directement depuis le client via RPC. Les Route Handlers (`route.ts`) sont des endpoints HTTP classiques. Les deux ont des usages différents.

4. **`revalidatePath`** est nécessaire après une mutation pour que la page affiche les donnees a jour (invalide le cache de la route).

5. **Le body doit etre valide avant parsing** : `await request.json()` peut lever une erreur si le body est vide ou mal forme. Toujours entourer d'un try/catch.

6. **`NextResponse.json(data, { status })` vs `Response.json()`** : en Next.js 15, les deux fonctionnent. `NextResponse` offre des méthodes supplementaires (cookies, headers).

7. **Le store en mémoire se reinitialise** à chaque redemarrage du serveur. En production, on utiliserait une base de donnees.

8. **`formData.get()` retourne `FormDataEntryValue | null`** : il faut valider le type avant de l'utiliser (Zod géré cela automatiquement).
