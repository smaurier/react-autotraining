# Cours 42 — Patterns ESN : architecture et conventions projet React

> **Objectif** : Maîtriser l'architecture "feature-based" utilisée en ESN pour les projets React/Next.js, les conventions de nommage, les barrel exports, la stratégie de gestion d'erreur (Error Boundaries + toasts), le monitoring avec Sentry, les feature flags, et le workflow Git avec conventional commits. Ce cours est une boîte à outils de patterns prêts à l'emploi pour vos missions.

---

## Rappel du cours précédent

<details>
<summary>1. Quel est l'avantage de Vercel pour Next.js par rapport à un hébergement Docker ?</summary>

Vercel est zero config : chaque push sur `main` déploie en production, chaque PR crée un preview deployment automatique. Le CDN est mondial, le SSL automatique, et les Server Components / Edge Functions sont supportés nativement. Docker offre plus de contrôle mais demandé plus de maintenance (Nginx, SSL, monitoring).
</details>

<details>
<summary>2. A quoi sert le mode output: "standalone" dans next.config.ts ?</summary>

Il génère un build autonome dans `.next/standalone` qui contient uniquement les fichiers nécessaires au runtime (server.js + dépendances incluses), sans avoir besoin de `node_modules`. L'image Docker résultante est beaucoup plus légère (~150MB vs ~1GB).
</details>

<details>
<summary>3. Quels sont les trois stages d'un Dockerfile multi-stage pour Next.js ?</summary>

(1) `deps` : installer les dépendances (`pnpm install --frozen-lockfile`), (2) `builder` : compiler l'application (`pnpm build`), (3) `runner` : image finale minimale avec uniquement les fichiers de production (standalone + static + public).
</details>

---

## Analogie

Un projet ESN, c'est comme un **restaurant bien organisé** : chaque poste (entrées, plats, desserts) a son propre espace de travail avec ses ustensiles et ses ingrédients (feature-based). Le chef suit des recettes standardisées (conventions de nommage), l'équipe communique par tickets sur un tableau (conventional commits), et le système de ventilation (monitoring) alerte en cas de problème avant que la fumée ne soit visible par les clients.

---

## Théorie

### 1. Architecture feature-based

La structure de dossiers recommandée pour un projet Next.js en ESN :

```
src/
├── app/                    # Routes Next.js (App Router)
│   ├── (auth)/             # Groupe de routes (pas de segment URL)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx      # Layout avec sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── tasks/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   ├── layout.tsx          # Layout racine
│   ├── error.tsx           # Error Boundary global
│   ├── loading.tsx         # Loading global
│   └── page.tsx            # Page d'accueil
│
├── components/             # Composants UI partagés
│   ├── ui/                 # shadcn/ui (Button, Card, Dialog, etc.)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── layout/             # Composants de mise en page
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   └── shared/             # Composants métier partagés
│       ├── data-table.tsx
│       └── pagination.tsx
│
├── features/               # Logique métier par domaine
│   ├── tasks/
│   │   ├── components/     # Composants spécifiques aux tâches
│   │   │   ├── task-card.tsx
│   │   │   ├── task-form.tsx
│   │   │   └── task-list.tsx
│   │   ├── hooks/          # Hooks spécifiques
│   │   │   ├── use-tasks.ts
│   │   │   └── use-task-mutations.ts
│   │   ├── api/            # Appels API / Server Actions
│   │   │   └── task-actions.ts
│   │   ├── types/          # Types spécifiques
│   │   │   └── task.ts
│   │   └── index.ts        # Barrel export
│   └── auth/
│       ├── components/
│       │   └── login-form.tsx
│       ├── hooks/
│       │   └── use-auth.ts
│       ├── api/
│       │   └── auth-actions.ts
│       ├── types/
│       │   └── auth.ts
│       └── index.ts
│
├── hooks/                  # Hooks utilitaires partagés
│   ├── use-debounce.ts
│   ├── use-local-storage.ts
│   └── use-media-query.ts
│
├── lib/                    # Utilitaires et configuration
│   ├── utils.ts            # cn(), formatDate(), etc.
│   ├── api-client.ts       # Configuration fetch / axios
│   ├── query-client.ts     # Configuration React Query
│   └── env.ts              # Validation des variables d'environnement
│
└── types/                  # Types partagés globaux
    ├── api.ts              # Types de réponse API génériques
    └── global.d.ts         # Déclarations de types globales
```

**Principes clés :**

| Principe | Règle |
|----------|-------|
| Feature isolation | Chaque feature contient tout ce dont elle a besoin |
| Dépendances unidirectionnelles | `features/tasks` peut importer de `components/` et `lib/`, jamais de `features/auth/` |
| `app/` est léger | Les pages importent depuis `features/`, elles ne contiennent pas de logique |
| `components/ui/` est agnostique | Pas de logique métier dans les composants UI |

### 2. Conventions de nommage

| Elément | Convention | Exemple |
|---------|-----------|---------|
| Fichiers composants | kebab-case | `task-card.tsx` |
| Fichiers hooks | kebab-case avec `use-` | `use-tasks.ts` |
| Fichiers utilitaires | kebab-case | `api-client.ts` |
| Composants (export) | PascalCase | `export function TaskCard()` |
| Hooks (export) | camelCase avec `use` | `export function useTasks()` |
| Types/Interfaces | PascalCase | `interface TaskFormData` |
| Constantes | UPPER_SNAKE_CASE | `const MAX_TASKS = 100` |
| Variables d'env | UPPER_SNAKE_CASE | `NEXT_PUBLIC_APP_URL` |

```tsx
// ✅ Bonne convention
// features/tasks/components/task-card.tsx
export function TaskCard({ task }: TaskCardProps) { ... }

// ❌ Mauvaise convention
// features/tasks/components/TaskCard.tsx  ← fichier en PascalCase
// features/tasks/components/taskCard.tsx  ← fichier en camelCase
```

### 3. Barrel exports avec index.ts

```tsx
// features/tasks/index.ts
export { TaskCard } from "./components/task-card";
export { TaskForm } from "./components/task-form";
export { TaskList } from "./components/task-list";
export { useTasks } from "./hooks/use-tasks";
export { useTaskMutations } from "./hooks/use-task-mutations";
export type { Task, TaskFormData } from "./types/task";
```

```tsx
// app/(dashboard)/tasks/page.tsx
// ✅ Import propre depuis le barrel
import { TaskList, useTasks } from "@/features/tasks";

// ❌ Import direct dans les entrailles de la feature
import { TaskList } from "@/features/tasks/components/task-list";
```

> **Attention** : les barrel exports peuvent causer des problèmes de tree-shaking dans certains cas. En Next.js App Router, chaque page est un point d'entrée séparé, donc l'impact est limité. Mais dans les Server Components, évitez d'exporter des composants client et serveur depuis le même `index.ts`.

### 4. Stratégie de gestion d'erreur

```
                    ┌─────────────────────────┐
                    │   Error Boundary global  │ ← Erreurs fatales
                    │   (app/error.tsx)        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Error Boundaries locaux │ ← Erreurs par section
                    │  (react-error-boundary)  │
                    └────────────┬────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
  ┌───────▼───────┐    ┌────────▼────────┐    ┌────────▼────────┐
  │  try/catch    │    │  React Query    │    │  Toast          │
  │  (actions)    │    │  (onError)      │    │  (notifications)│
  └───────────────┘    └─────────────────┘    └─────────────────┘
```

```tsx
// lib/toast.ts — Utiliser sonner (la bibliothèque de toast standard)
// npm install sonner

// app/layout.tsx
import { Toaster } from "sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
```

```tsx
// features/tasks/hooks/use-task-mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createTask, deleteTask } from "../api/task-actions";

export function useTaskMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tâche créée avec succès");
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  const remove = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tâche supprimée");
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  return { create, remove };
}
```

### 5. Monitoring avec Sentry

```bash
npx @sentry/wizard@latest -i nextjs
```

```tsx
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,     // 10% des transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreur
  environment: process.env.NODE_ENV,
});
```

```tsx
// Utilisation dans un Error Boundary
import * as Sentry from "@sentry/nextjs";

<ErrorBoundary
  onError={(error, info) => {
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
  }}
  FallbackComponent={ErrorFallback}
>
  <App />
</ErrorBoundary>
```

### 6. Feature flags

```tsx
// lib/feature-flags.ts
type FeatureFlag = "new-dashboard" | "dark-mode" | "ai-assistant";

// Simple : flags dans les variables d'environnement
const flags: Record<FeatureFlag, boolean> = {
  "new-dashboard": process.env.NEXT_PUBLIC_FF_NEW_DASHBOARD === "true",
  "dark-mode": process.env.NEXT_PUBLIC_FF_DARK_MODE === "true",
  "ai-assistant": process.env.NEXT_PUBLIC_FF_AI_ASSISTANT === "true",
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return flags[flag] ?? false;
}
```

```tsx
// Composant FeatureGate
import { isFeatureEnabled } from "@/lib/feature-flags";

export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: Parameters<typeof isFeatureEnabled>[0];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!isFeatureEnabled(flag)) return <>{fallback}</>;
  return <>{children}</>;
}

// Utilisation
<FeatureGate flag="new-dashboard" fallback={<OldDashboard />}>
  <NewDashboard />
</FeatureGate>
```

> **En production ESN**, utilisez un service de feature flags (LaunchDarkly, Unleash, Flagsmith) pour changer les flags sans redéployer.

### 7. Git workflow et conventional commits

```
main ─────────────────────────────── (production)
  │
  ├── develop ────────────────────── (intégration)
  │     │
  │     ├── feature/JIRA-123-task-crud  (feature)
  │     ├── fix/JIRA-456-login-error    (bugfix)
  │     └── chore/update-deps           (maintenance)
  │
  └── hotfix/critical-fix ──────────── (correctif urgent)
```

#### Conventional commits

```bash
# Format : <type>(<scope>): <description>
feat(tasks): add task creation form with validation
fix(auth): resolve session expiration redirect loop
docs(readme): update deployment instructions
style(ui): adjust button padding for mobile
refactor(api): extract shared fetch configuration
test(tasks): add unit tests for useTaskMutations hook
chore(deps): update React to 19.1
ci(github): add E2E tests to pipeline
perf(list): memoize filtered tasks computation
```

| Type | Quand l'utiliser |
|------|-----------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation uniquement |
| `style` | Formatage (pas de changement de logique) |
| `refactor` | Restructuration sans changement de comportement |
| `test` | Ajout ou modification de tests |
| `chore` | Maintenance (deps, config, CI) |
| `perf` | Amélioration de performance |
| `ci` | Changements CI/CD |

```bash
# Outil pour valider les messages de commit
npm install -D @commitlint/cli @commitlint/config-conventional
```

```js
// commitlint.config.js
module.exports = { extends: ["@commitlint/config-conventional"] };
```

---

## Pratique

### Exercice : structurer un nouveau projet ESN

Vous démarrez un projet de gestion de factures. Créez la structure de dossiers avec :

1. Feature `invoices` avec composants, hooks, API et types
2. Feature `clients` avec la même structure
3. Composants UI partagés (Table, Badge, Button)
4. Configuration de base (env validation, utils, query client)
5. Barrel exports pour chaque feature
6. Un fichier `.commitlintrc` pour les conventional commits

<details>
<summary>Voir la solution</summary>

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── clients/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   ├── layout.tsx
│   ├── error.tsx
│   ├── loading.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   └── data-table.tsx
│   └── layout/
│       ├── header.tsx
│       └── sidebar.tsx
│
├── features/
│   ├── invoices/
│   │   ├── components/
│   │   │   ├── invoice-card.tsx
│   │   │   ├── invoice-form.tsx
│   │   │   └── invoice-list.tsx
│   │   ├── hooks/
│   │   │   ├── use-invoices.ts
│   │   │   └── use-invoice-mutations.ts
│   │   ├── api/
│   │   │   └── invoice-actions.ts
│   │   ├── types/
│   │   │   └── invoice.ts
│   │   └── index.ts
│   └── clients/
│       ├── components/
│       │   ├── client-card.tsx
│       │   └── client-form.tsx
│       ├── hooks/
│       │   └── use-clients.ts
│       ├── api/
│       │   └── client-actions.ts
│       ├── types/
│       │   └── client.ts
│       └── index.ts
│
├── hooks/
│   └── use-debounce.ts
│
├── lib/
│   ├── utils.ts
│   ├── env.ts
│   └── query-client.ts
│
└── types/
    └── api.ts
```

```tsx
// features/invoices/index.ts
export { InvoiceCard } from "./components/invoice-card";
export { InvoiceForm } from "./components/invoice-form";
export { InvoiceList } from "./components/invoice-list";
export { useInvoices } from "./hooks/use-invoices";
export { useInvoiceMutations } from "./hooks/use-invoice-mutations";
export type { Invoice, InvoiceFormData } from "./types/invoice";
```

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| Feature-based | Chaque domaine métier dans `features/` avec components, hooks, api, types |
| Nommage | kebab-case fichiers, PascalCase composants, camelCase hooks |
| Barrel exports | `index.ts` par feature, imports propres depuis l'extérieur |
| Erreurs | Error Boundaries (fatal) + toasts (feedback utilisateur) + Sentry (monitoring) |
| Feature flags | `FeatureGate` composant + service de flags en production |
| Conventional commits | `feat`, `fix`, `docs`, `refactor`, `test`, `chore` + commitlint |
| Git workflow | feature branches → develop → main, PRs obligatoires |

> **Prochain cours** : [Cours 43 — Entretien technique React](./02-entretien-technique.md)
