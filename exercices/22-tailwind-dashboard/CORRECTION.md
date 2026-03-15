# Correction — Exercice 22 : Tailwind dashboard

---

## Étape 1 : Types

```ts
// src/types/dashboard.ts

export interface StatCard {
  id: string;
  label: string;
  value: number;
  variation: number; // pourcentage, positif ou negatif
  icon: string;      // emoji ou nom d'icone
}

export interface TaskRow {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in-progress" | "done";
  assignee: string;
  dueDate: string;
}

export type Theme = "light" | "dark";
```

---

## Étape 2 : Toggle Dark Mode

```tsx
// src/components/dashboard/DarkModeToggle.tsx
"use client";

import { useState, useEffect } from "react";
import type { Theme } from "@/types/dashboard";

export function DarkModeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  // Charger le theme depuis localStorage au montage
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: Theme = stored ?? (prefersDark ? "dark" : "light");

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  function toggleTheme(): void {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium
                 transition-colors hover:bg-gray-300
                 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      aria-label={`Passer en mode ${theme === "light" ? "sombre" : "clair"}`}
    >
      {theme === "light" ? "Mode sombre" : "Mode clair"}
    </button>
  );
}
```

---

## Étape 3 : Sidebar

```tsx
// src/components/dashboard/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "D" },
  { label: "Taches", href: "/dashboard/tasks", icon: "T" },
  { label: "Projets", href: "/dashboard/projects", icon: "P" },
  { label: "Equipe", href: "/dashboard/team", icon: "E" },
  { label: "Parametres", href: "/dashboard/settings", icon: "S" },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const pathname = usePathname();

  return (
    <>
      {/* Bouton hamburger — visible uniquement sur mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-md bg-white p-2 shadow-md
                   lg:hidden
                   dark:bg-gray-800 dark:text-white"
        aria-label="Ouvrir le menu"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Fermer le menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 transform bg-white
                     shadow-lg transition-transform duration-300 ease-in-out
                     dark:bg-gray-900 dark:text-white
                     lg:translate-x-0
                     ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6 dark:border-gray-700">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            TaskFlow
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5
                               text-sm font-medium transition-colors
                               ${
                                 isActive
                                   ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                   : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                               }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-xs font-bold dark:bg-gray-700">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
```

---

## Étape 4 : Cartes de statistiques

```tsx
// src/components/dashboard/StatsCards.tsx
import type { StatCard } from "@/types/dashboard";

const stats: StatCard[] = [
  { id: "completed", label: "Taches completees", value: 42, variation: 12, icon: "C" },
  { id: "in-progress", label: "En cours", value: 15, variation: -3, icon: "P" },
  { id: "overdue", label: "En retard", value: 4, variation: 8, icon: "R" },
  { id: "total", label: "Total projets", value: 7, variation: 2, icon: "T" },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="rounded-xl border border-gray-200 bg-white p-6
                     shadow-sm transition-shadow hover:shadow-md
                     dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {stat.icon}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium
                         ${
                           stat.variation >= 0
                             ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                             : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                         }`}
            >
              {stat.variation >= 0 ? "+" : ""}
              {stat.variation}%
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            {stat.value}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
```

---

## Étape 5 : Tableau de taches

```tsx
// src/components/dashboard/TaskTable.tsx
import type { TaskRow } from "@/types/dashboard";

const tasks: TaskRow[] = [
  { id: "1", title: "Configurer le projet Next.js", priority: "high", status: "done", assignee: "Sophie M.", dueDate: "2025-01-15" },
  { id: "2", title: "Creer les composants de base", priority: "medium", status: "in-progress", assignee: "Pierre D.", dueDate: "2025-01-20" },
  { id: "3", title: "Implementer l'authentification", priority: "urgent", status: "todo", assignee: "Marie L.", dueDate: "2025-01-25" },
  { id: "4", title: "Ecrire les tests unitaires", priority: "medium", status: "todo", assignee: "Sophie M.", dueDate: "2025-02-01" },
  { id: "5", title: "Deployer en staging", priority: "low", status: "todo", assignee: "Pierre D.", dueDate: "2025-02-05" },
  { id: "6", title: "Revue de code sprint 1", priority: "high", status: "in-progress", assignee: "Marie L.", dueDate: "2025-01-18" },
  { id: "7", title: "Optimiser les performances", priority: "medium", status: "todo", assignee: "Sophie M.", dueDate: "2025-02-10" },
  { id: "8", title: "Rediger la documentation", priority: "low", status: "todo", assignee: "Pierre D.", dueDate: "2025-02-15" },
];

const priorityStyles: Record<TaskRow["priority"], string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<TaskRow["status"], string> = {
  todo: "A faire",
  "in-progress": "En cours",
  done: "Terminee",
};

const statusStyles: Record<TaskRow["status"], string> = {
  todo: "text-gray-500 dark:text-gray-400",
  "in-progress": "text-blue-600 dark:text-blue-400",
  done: "text-green-600 dark:text-green-400",
};

export function TaskTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Titre</th>
            <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Priorite</th>
            <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Statut</th>
            <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Assignee</th>
            <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Echeance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                {task.title}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityStyles[task.priority]}`}
                >
                  {task.priority}
                </span>
              </td>
              <td className={`px-6 py-4 font-medium ${statusStyles[task.status]}`}>
                {statusLabels[task.status]}
              </td>
              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                {task.assignee}
              </td>
              <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                {new Date(task.dueDate).toLocaleDateString("fr-FR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Étape 6 : Layout du dashboard

```tsx
// src/app/dashboard/layout.tsx
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DarkModeToggle } from "@/components/dashboard/DarkModeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />

      {/* Contenu principal — decale a droite sur desktop */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between
                          border-b border-gray-200 bg-white/80 px-6 backdrop-blur
                          dark:border-gray-700 dark:bg-gray-900/80">
          <div className="flex items-center gap-4">
            {/* Espace pour le hamburger sur mobile */}
            <div className="w-10 lg:hidden" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Barre de recherche */}
            <input
              type="search"
              placeholder="Rechercher..."
              className="hidden rounded-lg border border-gray-300 bg-gray-50
                         px-4 py-2 text-sm focus:border-blue-500 focus:outline-none
                         focus:ring-1 focus:ring-blue-500
                         dark:border-gray-600 dark:bg-gray-800 dark:text-white
                         sm:block"
            />
            <DarkModeToggle />
          </div>
        </header>

        {/* Zone de contenu */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Étape 7 : Page du dashboard

```tsx
// src/app/dashboard/page.tsx
import { StatsCards } from "@/components/dashboard/StatsCards";
import { TaskTable } from "@/components/dashboard/TaskTable";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Titre de section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Vue d&apos;ensemble
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Resume de l&apos;activite de vos projets
        </p>
      </div>

      {/* Cartes de statistiques */}
      <StatsCards />

      {/* Tableau des taches */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Taches recentes
        </h3>
        <TaskTable />
      </div>
    </div>
  );
}
```

---

## Ce que tu aurais pu oublier

1. **`dark:` ne fonctionne que si le mode est configure** : dans `tailwind.config.ts`, il faut `darkMode: "class"` pour que les classes `dark:` s'activent avec la classe `dark` sur `<html>`.

2. **`lg:ml-64`** pour decaler le contenu a droite de la sidebar : la sidebar fait `w-64` (256px), donc le contenu doit etre decale de la même largeur.

3. **`lg:translate-x-0`** pour que la sidebar soit toujours visible sur desktop : même si elle est `-translate-x-full` par defaut (cachee mobile), le breakpoint `lg:` l'affiche.

4. **`overflow-x-auto`** sur le tableau : sur mobile, le tableau peut deborder. Le scroll horizontal evite de casser le layout.

5. **`backdrop-blur`** sur le header sticky : cet effet permet de voir le contenu defiler sous le header tout en gardant la lisibilite.

6. **`Record<Status, string>`** pour les maps de styles : cela garantit que chaque valeur possible est couverte, et TypeScript signale si on oublie un cas.

7. **`localStorage` n'est pas disponible en SSR** : le `useEffect` est nécessaire pour lire le theme car `localStorage` n'existe pas cote serveur. Sans le `useEffect`, on aurait une erreur d'hydratation.

8. **Les breakpoints Tailwind sont mobile-first** : `sm:` s'applique à partir de 640px, `md:` à partir de 768px, `lg:` à partir de 1024px. Écrire d'abord le style mobile, puis ajouter les variantes.
