# Cours 27 — API Routes et Server Actions

> **Objectif** : créer des endpoints API avec les Route Handlers de Next.js 15, comprendre les Server Actions (`'use server'`) pour les mutations, et utiliser `useFormStatus` / `useActionState` pour le feedback utilisateur.

---

## Rappel du cours précédent

<details>
<summary>1. Comment Next.js décide-t-il entre rendu statique et dynamique ?</summary>

Par défaut, Next.js rend les pages statiquement. Si le composant utilise des fonctions dynamiques (`cookies()`, `headers()`, `searchParams`) ou un `fetch` sans cache, Next.js bascule automatiquement en rendu dynamique (SSR à chaque requête).
</details>

<details>
<summary>2. Quelle est la différence entre `revalidatePath` et `revalidateTag` ?</summary>

`revalidatePath("/blog")` invalide le cache d'un chemin URL spécifique. `revalidateTag("posts")` invalide tous les `fetch` qui ont été taggés avec `next: { tags: ["posts"] }`, quel que soit le chemin.
</details>

<details>
<summary>3. Comment obtenir du streaming granulaire dans une page Next.js ?</summary>

On enveloppe chaque composant `async` lent dans un `<Suspense fallback={...}>`. Chaque boundary `Suspense` streame indépendamment : les parties rapides s'affichent immédiatement, les parties lentes apparaissent quand elles sont prêtes.
</details>

---

## Analogie

Pense à un **guichet de banque** :
- Les **Route Handlers** sont comme un **guichet classique** : le client (frontend) envoie une requête (lettre), le guichet (API) traite et renvoie une réponse. C'est le modèle REST classique.
- Les **Server Actions** sont comme un **virement en ligne** : pas besoin de passer par un guichet intermédiaire. Tu remplis le formulaire directement et l'action s'exécute côté serveur sans écrire d'endpoint API. Le formulaire parle directement au serveur.

---

## Théorie

### Route Handlers : des endpoints API dans Next.js

Les Route Handlers remplacent les "API Routes" du Pages Router. Ils vivent dans `app/api/` avec un fichier `route.ts`.

```
src/app/
└── api/
    ├── users/
    │   └── route.ts          → GET/POST /api/users
    └── users/
        └── [id]/
            └── route.ts      → GET/PUT/DELETE /api/users/:id
```

#### GET : lire des données

```tsx
// src/app/api/users/route.ts
import { NextResponse } from "next/server";

interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

export async function GET() {
  return NextResponse.json(users);
}
```

#### POST : créer une ressource

```tsx
// src/app/api/users/route.ts (suite)
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validation basique
  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: "name et email sont requis" },
      { status: 400 }
    );
  }

  const newUser: User = {
    id: Date.now(),
    name: body.name,
    email: body.email,
  };

  // En vrai : sauvegarder en BDD
  return NextResponse.json(newUser, { status: 201 });
}
```

#### Route dynamique avec paramètres

```tsx
// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // En vrai : fetch depuis la BDD
  return NextResponse.json({ id, name: `User ${id}` });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // En vrai : supprimer de la BDD
  return NextResponse.json(
    { message: `Utilisateur ${id} supprimé` },
    { status: 200 }
  );
}
```

#### Accéder aux query params et headers

```tsx
export async function GET(request: NextRequest) {
  // Query params : /api/users?page=2&limit=10
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "10";

  // Headers
  const authHeader = request.headers.get("authorization");

  return NextResponse.json({ page, limit });
}
```

### Server Actions : mutations sans API

Les Server Actions sont des fonctions qui s'exécutent côté serveur, appelables directement depuis un formulaire ou un composant client. Plus besoin d'écrire un endpoint API + un `fetch` côté client.

#### Définir une Server Action

```tsx
// src/actions/user-actions.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  // Validation
  if (!name || !email) {
    return { error: "Nom et email requis" };
  }

  // En vrai : sauvegarder en BDD
  console.log("Création utilisateur :", { name, email });

  // Revalider le cache de la page
  revalidatePath("/users");

  return { success: true };
}
```

#### Utiliser une Server Action dans un formulaire

```tsx
// src/app/users/new/page.tsx — Server Component !
import { createUser } from "@/actions/user-actions";

export default function NewUserPage() {
  return (
    <form action={createUser}>
      <label>
        Nom :
        <input type="text" name="name" required />
      </label>
      <label>
        Email :
        <input type="email" name="email" required />
      </label>
      <button type="submit">Créer l'utilisateur</button>
    </form>
  );
}
```

> **C'est la magie** : pas de `fetch`, pas d'endpoint API, pas de `useState` pour le formulaire. Le `<form action={...}>` appelle directement la fonction serveur.

### useFormStatus : feedback pendant la soumission

```tsx
// src/components/submit-button.tsx
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Envoi en cours..." : "Créer l'utilisateur"}
    </button>
  );
}
```

> **Important** : `useFormStatus` doit être utilisé dans un composant **enfant** du `<form>`, pas dans le même composant.

```tsx
// ❌ MAUVAIS : useFormStatus dans le même composant que le form
"use client";
export default function Form() {
  const { pending } = useFormStatus(); // Ne fonctionne pas !
  return <form action={...}>...</form>;
}

// ✅ BON : useFormStatus dans un composant enfant
import { SubmitButton } from "@/components/submit-button";

export default function NewUserPage() {
  return (
    <form action={createUser}>
      <input name="name" />
      <SubmitButton /> {/* useFormStatus fonctionne ici */}
    </form>
  );
}
```

### useActionState : gérer le résultat de l'action

`useActionState` (React 19) remplace l'ancien `useFormState`. Il gère le state retourné par la Server Action.

```tsx
// src/app/users/new/page.tsx
"use client";

import { useActionState } from "react";
import { createUser } from "@/actions/user-actions";
import { SubmitButton } from "@/components/submit-button";

interface ActionState {
  error?: string;
  success?: boolean;
}

const initialState: ActionState = {};

export default function NewUserPage() {
  const [state, formAction] = useActionState(
    async (_prevState: ActionState, formData: FormData) => {
      return await createUser(formData);
    },
    initialState
  );

  return (
    <form action={formAction}>
      {state.error && <p style={{ color: "red" }}>{state.error}</p>}
      {state.success && <p style={{ color: "green" }}>Utilisateur créé !</p>}

      <label>
        Nom : <input type="text" name="name" required />
      </label>
      <label>
        Email : <input type="email" name="email" required />
      </label>

      <SubmitButton />
    </form>
  );
}
```

### Route Handlers vs Server Actions : quand utiliser quoi ?

| Critère | Route Handler | Server Action |
|---|---|---|
| Cas d'usage | API publique, webhooks, auth | Mutations depuis l'UI (formulaires) |
| Méthode HTTP | GET, POST, PUT, DELETE | POST uniquement (encapsulé) |
| Appel | `fetch("/api/...")` | `action={serverAction}` ou appel direct |
| Validation | Manuelle | Manuelle (+ Zod recommandé) |
| Revalidation | `revalidatePath` / `revalidateTag` | `revalidatePath` / `revalidateTag` |
| API tierce/webhook | ✅ Idéal | ❌ Pas conçu pour |

### Comparaison avec Vue / Angular

| Concept | Next.js 15 | Nuxt 3 | Angular 19+ / NestJS |
|---|---|---|---|
| Route API | `app/api/route.ts` | `server/api/[route].ts` | `@Controller` NestJS |
| Méthodes HTTP | Export `GET`, `POST`... | `defineEventHandler` | `@Get()`, `@Post()`... |
| Server Action | `'use server'` + `action={}` | `useAsyncData` + API | Pas d'équivalent direct |
| Validation | Zod + vérification manuelle | Zod / Joi | `class-validator` + pipes |
| Request object | `NextRequest` | `H3Event` | `@Req()` Express/Fastify |

---

## Pratique

### Exercice : CRUD complet avec Route Handlers + Server Action

**Objectif** : créer une mini-app de gestion de tâches (todos).

1. Crée un Route Handler `GET /api/todos` qui retourne une liste de todos
2. Crée un Route Handler `POST /api/todos` qui ajoute une todo
3. Crée une Server Action `addTodo` qui ajoute une todo et revalide la page
4. Crée une page `/todos` qui :
   - Affiche la liste (Server Component avec fetch)
   - Contient un formulaire utilisant la Server Action
   - Affiche un état de chargement avec `useFormStatus`
   - Affiche les erreurs avec `useActionState`

<details>
<summary>Solution</summary>

```tsx
// src/app/api/todos/route.ts
import { NextRequest, NextResponse } from "next/server";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// Simulation de BDD en mémoire (en vrai : Prisma, Drizzle...)
const todos: Todo[] = [
  { id: 1, title: "Apprendre Next.js", completed: false },
  { id: 2, title: "Comprendre les Server Actions", completed: false },
];

export async function GET() {
  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.title) {
    return NextResponse.json(
      { error: "Le titre est requis" },
      { status: 400 }
    );
  }

  const newTodo: Todo = {
    id: Date.now(),
    title: body.title,
    completed: false,
  };

  todos.push(newTodo);
  return NextResponse.json(newTodo, { status: 201 });
}

// src/actions/todo-actions.ts
"use server";

import { revalidatePath } from "next/cache";

interface TodoActionState {
  error?: string;
  success?: boolean;
}

export async function addTodo(
  _prevState: TodoActionState,
  formData: FormData
): Promise<TodoActionState> {
  const title = formData.get("title") as string;

  if (!title || title.trim().length < 3) {
    return { error: "Le titre doit faire au moins 3 caractères" };
  }

  // En vrai : insertion en BDD
  console.log("Nouvelle todo :", title);

  revalidatePath("/todos");
  return { success: true };
}

// src/components/add-todo-form.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addTodo } from "@/actions/todo-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Ajout..." : "Ajouter"}
    </button>
  );
}

export function AddTodoForm() {
  const [state, formAction] = useActionState(addTodo, {});

  return (
    <form action={formAction}>
      {state.error && <p style={{ color: "red" }}>{state.error}</p>}
      {state.success && <p style={{ color: "green" }}>Todo ajoutée !</p>}

      <input
        type="text"
        name="title"
        placeholder="Nouvelle tâche..."
        required
        minLength={3}
      />
      <SubmitButton />
    </form>
  );
}

// src/app/todos/page.tsx
import { AddTodoForm } from "@/components/add-todo-form";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export default async function TodosPage() {
  const res = await fetch("http://localhost:3000/api/todos", {
    cache: "no-store",
  });
  const todos: Todo[] = await res.json();

  return (
    <div>
      <h1>Mes tâches</h1>
      <AddTodoForm />
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {todo.completed ? "✓" : "○"} {todo.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

</details>

---

## Résumé

| Concept | À retenir |
|---|---|
| Route Handlers | `app/api/.../route.ts` — exporte `GET`, `POST`, `PUT`, `DELETE` |
| `NextRequest` / `NextResponse` | API Web standard enrichie par Next.js |
| Server Actions | `'use server'` — fonctions serveur appelées depuis `<form action={...}>` |
| `useFormStatus` | Feedback de soumission (dans un composant **enfant** du form) |
| `useActionState` | Gère le state retourné par la Server Action (erreurs, succès) |
| Route Handler = API publique | Pour webhooks, API tierces, clients externes |
| Server Action = mutation UI | Pour formulaires et interactions utilisateur |

---

> **Prochain cours** : [Middleware et configuration Next.js](./05-middleware-et-config.md) — intercepter les requêtes, gérer l'auth, configurer les images et les variables d'environnement.
