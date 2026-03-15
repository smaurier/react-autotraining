# TaskFlow — Projet fil rouge

> Application de gestion de taches et de projets construite progressivement tout au long de la formation React 19 + Next.js 15 + TypeScript strict.

---

## Presentation

**TaskFlow** est une application de gestion de projet complete, combinant une vue Kanban et une vue liste pour organiser les taches par projets. Elle est construite avec Next.js 15 App Router et exploite les dernières fonctionnalites de React 19 (Server Components, Server Actions, etc.).

L'application est construite **progressivement** au fil des modules de la formation. A chaque module, tu ajoutes une nouvelle brique fonctionnelle ou technique, ce qui te permet de voir un projet realiste evoluer de zero à la production.

### Pourquoi un projet fil rouge ?

- **Contextualiser chaque concept** : chaque notion vue en cours est immediatement appliquee dans un projet concret.
- **Construire un portfolio** : à la fin de la formation, tu as un projet deployable que tu peux montrer en entretien.
- **Simuler un projet ESN** : architecture, patterns et pratiques identiques à un vrai projet client.

---

## Fonctionnalites finales

### Vue d'ensemble

| Fonctionnalite            | Description                                              |
|--------------------------|----------------------------------------------------------|
| Tableau Kanban            | Drag & drop des taches entre colonnes (Todo, En cours, Done) |
| Vue liste                 | Liste filtrable et triable de toutes les taches          |
| CRUD taches               | Créer, lire, modifier, supprimer des taches              |
| Dashboard                 | Statistiques du projet (compteurs, graphiques)           |
| Authentification          | Login/register avec Auth.js, protection des routes       |
| Dark mode                 | Toggle clair/sombre, persiste en localStorage            |
| Responsive                | Interface adaptee mobile, tablette, desktop              |
| Tests complets            | Unitaires (Vitest), intégration (MSW), E2E (Playwright) |
| CI/CD                     | Pipeline GitHub Actions, déploiement Vercel              |

---

## Types TypeScript

### Types principaux

```ts
// src/types/task.ts

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  assigneeId: string | null;
  tags: string[];
  dueDate: string | null;       // ISO 8601
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  completedAt: string | null;    // ISO 8601
  order: number;                 // Position dans la colonne Kanban
}
```

```ts
// src/types/project.ts

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;                 // Code hex pour le badge
  ownerId: string;
  members: string[];             // IDs des membres
  createdAt: string;
  updatedAt: string;
}
```

```ts
// src/types/user.ts

export type UserRole = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: UserRole;
  createdAt: string;
}
```

```ts
// src/types/column.ts

export interface Column {
  id: TaskStatus;
  title: string;
  color: string;                 // Couleur du header de colonne
  limit: number | null;          // WIP limit (optionnel)
}

export const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", title: "A faire", color: "#6b7280", limit: null },
  { id: "in-progress", title: "En cours", color: "#3b82f6", limit: 5 },
  { id: "review", title: "En revue", color: "#f59e0b", limit: 3 },
  { id: "done", title: "Termine", color: "#10b981", limit: null },
];
```

---

## Stack technique

| Categorie       | Technologie                    | Version | Role                              |
|-----------------|-------------------------------|---------|-----------------------------------|
| Framework       | Next.js                       | 15      | App Router, SSR, API Routes       |
| UI              | React                         | 19      | Server & Client Components        |
| Langage         | TypeScript                    | 5.x     | Typage strict                     |
| State global    | Zustand                       | 5.x     | Store client (panier, UI state)   |
| Data fetching   | TanStack Query (React Query)  | 5.x     | Cache, invalidation, mutations    |
| Formulaires     | React Hook Form + Zod         | 7.x     | Validation, performance           |
| Styling         | Tailwind CSS                  | 4.x     | Utility-first, dark mode          |
| Composants UI   | shadcn/ui                     | latest  | Composants accessibles            |
| Auth            | Auth.js (NextAuth v5)         | 5.x     | Credentials, OAuth, RBAC          |
| Tests unitaires | Vitest + React Testing Library| latest  | Composants, hooks                 |
| Tests E2E       | Playwright                    | latest  | Scenarios navigateur              |
| Mocking         | MSW                           | 2.x     | Interception réseau               |
| CI/CD           | GitHub Actions + Vercel       | —       | Lint, tests, build, deploy        |
| Package manager | pnpm                          | 9.x     | Rapide, strict                    |

---

## Construction progressive par module

| Module | Contenu ajoute a TaskFlow | Exercices associes |
|--------|--------------------------|-------------------|
| **00 — Intro** | Setup du projet Next.js 15 + TypeScript + Tailwind + pnpm | Ex 01 |
| **01 — Composants** | Composants de base : `TaskCard`, `ProjectBadge`, `Avatar`, `Button` | Ex 02-04 |
| **02 — Hooks** | State local pour les formulaires, `useEffect` pour les effets, custom hooks `useLocalStorage`, `useDebounce` | Ex 05-07 |
| **03 — State Management** | Store Zustand pour les taches et l'UI, Context pour le theme | Ex 08-10 |
| **04 — Routing** | Navigation entre Dashboard, Projets, Taches, Profil | Ex 11 |
| **05 — Formulaires** | Formulaire de création/edition de tache avec React Hook Form + Zod | Ex 12-13 |
| **06 — Next.js** | App Router, Server Components, Server Actions, API Routes, middleware | Ex 14-16b |
| **07 — Tests** | Tests unitaires des composants, tests d'intégration avec MSW, tests E2E Playwright | Ex 17-19 |
| **08 — Performance** | Optimisation de la liste de taches, composant Tabs compound | Ex 20-21 |
| **09 — Styling** | Dashboard complet Tailwind, dark mode, responsive | Ex 22 |
| **10 — Auth** | Authentification Auth.js, protection des routes, RBAC | Ex 23 |
| **11 — CI/CD** | Pipeline GitHub Actions, déploiement Vercel | Ex 24 |
| **12 — Recettes ESN** | Audit final, preparation entretien | Ex 25 |

---

## Structure du projet

```
taskflow/
  src/
    app/                          # Next.js App Router
      layout.tsx                  # Layout racine
      page.tsx                    # Page d'accueil / redirection
      (auth)/                     # Groupe de routes auth
        login/page.tsx
        register/page.tsx
      (dashboard)/                # Groupe de routes dashboard
        dashboard/page.tsx        # Vue d'ensemble
        tasks/page.tsx            # Liste des taches
        tasks/[id]/page.tsx       # Detail d'une tache
        board/page.tsx            # Vue Kanban
        projects/page.tsx         # Liste des projets
        profile/page.tsx          # Profil utilisateur
        admin/page.tsx            # Administration (RBAC)
      api/
        tasks/route.ts            # CRUD taches
        tasks/[id]/route.ts
        projects/route.ts         # CRUD projets
        auth/[...nextauth]/route.ts
    components/
      ui/                         # Composants generiques (Button, Input, Badge...)
      tasks/                      # Composants taches (TaskCard, TaskForm...)
      board/                      # Composants Kanban (Column, DragHandle...)
      dashboard/                  # Composants dashboard (StatsCard, Chart...)
      layout/                     # Composants layout (Sidebar, Header...)
      providers/                  # Providers (Session, Theme, QueryClient)
    hooks/                        # Custom hooks
    lib/                          # Utilitaires, config, helpers
    stores/                       # Stores Zustand
    actions/                      # Server Actions
    types/                        # Interfaces TypeScript
    test/                         # Setup tests, mocks MSW
  e2e/                            # Tests Playwright
    pages/                        # Page Objects
  public/                         # Assets statiques
  .github/workflows/              # CI/CD
```

---

## Wireframes (ASCII art)

### Dashboard

```
+------------------------------------------------------------------+
|  [=] TaskFlow                    [Rechercher...]  [Mode] [Avatar] |
+----------+-------------------------------------------------------+
|          |                                                        |
| Dashboard|  Vue d'ensemble                                        |
| Taches   |  +------------+ +------------+ +------------+ +------+|
| Board    |  | Completees | | En cours   | | En retard  | | Total||
| Projets  |  |     42     | |     15     | |      4     | |   7  ||
| Equipe   |  |   +12%     | |    -3%     | |    +8%     | |  +2% ||
| -------- |  +------------+ +------------+ +------------+ +------+|
| Parametr.|                                                        |
|          |  Taches recentes                                       |
|          |  +----------------------------------------------------+|
|          |  | Titre            | Priorite | Statut  | Echeance   ||
|          |  |----------------------------------------------------|
|          |  | Configurer Next  | Haute    | Fait    | 15 jan     ||
|          |  | Creer composants | Moyenne  | En cours| 20 jan     ||
|          |  | Implementer auth | Urgente  | A faire | 25 jan     ||
|          |  | Ecrire tests     | Moyenne  | A faire | 01 fev     ||
|          |  | Deployer staging | Basse    | A faire | 05 fev     ||
|          |  +----------------------------------------------------+|
+----------+-------------------------------------------------------+
```

### Tableau Kanban (Board)

```
+------------------------------------------------------------------+
|  [=] TaskFlow                    [Rechercher...]  [Mode] [Avatar] |
+----------+-------------------------------------------------------+
|          |                                                        |
| Dashboard|  Board — Projet Alpha                                  |
| Taches   |                                                        |
| > Board  |  +-------------+ +-------------+ +---------+ +-------+|
| Projets  |  | A FAIRE (3) | | EN COURS (2)| | REVUE(1)| | FAIT  ||
| Equipe   |  |             | |             | |         | |       ||
|          |  | +---------+ | | +---------+ | | +-----+ | | +---+ ||
|          |  | | Config  | | | | Creer   | | | |Auth | | | |Dep| ||
|          |  | | Next.js | | | | compos. | | | |flow | | | |loy| ||
|          |  | | Haute   | | | | Moyenne | | | |Haute| | | |   | ||
|          |  | +---------+ | | +---------+ | | +-----+ | | +---+ ||
|          |  |             | |             | |         | |       ||
|          |  | +---------+ | | +---------+ | |         | | +---+ ||
|          |  | | Tests   | | | | Revue   | | |         | | |Set| ||
|          |  | | unit.   | | | | code    | | |         | | |up | ||
|          |  | | Moyenne | | | | Haute   | | |         | | |   | ||
|          |  | +---------+ | | +---------+ | |         | | +---+ ||
|          |  |             | |             | |         | |       ||
|          |  | +---------+ | |             | |         | |       ||
|          |  | | Docs    | | |             | |         | |       ||
|          |  | | Basse   | | |             | |         | |       ||
|          |  | +---------+ | |             | |         | |       ||
|          |  +-------------+ +-------------+ +---------+ +-------+|
+----------+-------------------------------------------------------+
```

### Detail d'une tache

```
+------------------------------------------------------------------+
|  [=] TaskFlow                    [Rechercher...]  [Mode] [Avatar] |
+----------+-------------------------------------------------------+
|          |                                                        |
| Dashboard|  < Retour aux taches                                   |
| Taches   |                                                        |
| Board    |  Configurer le projet Next.js                          |
| Projets  |  ====================================                  |
|          |                                                        |
|          |  Statut: [En cours v]    Priorite: [Haute v]           |
|          |  Assignee: Sophie M.     Echeance: 15 janvier 2025     |
|          |  Projet: Alpha           Tags: [nextjs] [config]       |
|          |                                                        |
|          |  Description                                           |
|          |  --------------------------------------------------    |
|          |  Configurer le projet Next.js 15 avec :                |
|          |  - TypeScript strict                                   |
|          |  - Tailwind CSS v4                                     |
|          |  - ESLint + Prettier                                   |
|          |  - Structure de dossiers                               |
|          |                                                        |
|          |  [Modifier]  [Supprimer]                               |
|          |                                                        |
+----------+-------------------------------------------------------+
```

---

## Commencer le projet

```bash
# Creer le projet
npx create-next-app@latest taskflow --typescript --tailwind --app --src-dir --eslint

# Se deplacer dans le projet
cd taskflow

# Installer les dependances supplementaires
pnpm add zustand @tanstack/react-query react-hook-form @hookform/resolvers zod
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D @vitejs/plugin-react jsdom msw @playwright/test

# Activer le mode strict TypeScript (deja actif par defaut avec create-next-app)
# Verifier dans tsconfig.json : "strict": true

# Lancer le serveur de developpement
pnpm dev
```

---

## Conseils

1. **Ne pas tout coder d'un coup** : suis la progression module par module. Chaque module ajoute une brique.
2. **Commencer simple** : les premiers modules utilisent des donnees en mémoire. La persistance vient plus tard.
3. **Tester au fur et à mesure** : n'attends pas le module 07 pour écrire tes premiers tests.
4. **Commiter souvent** : un commit par fonctionnalite ajoutee. Cela t'entrainera a Git.
5. **Déployer tot** : deploie sur Vercel des le module 06 pour voir ton application en ligne.
