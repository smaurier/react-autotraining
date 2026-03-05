# Correction — Exercice 19 : E2E Playwright

---

## Etape 1 : Configuration Playwright

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // Interdit test.only en CI
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry", // Trace uniquement au premier retry
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Demarrer le serveur Next.js avant les tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // 2 minutes max pour demarrer
  },
});
```

---

## Etape 2 : Page Object

```ts
// e2e/pages/TaskPage.ts
import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class TaskPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newTaskInput: Locator;
  readonly addButton: Locator;
  readonly taskList: Locator;
  readonly filterAll: Locator;
  readonly filterActive: Locator;
  readonly filterCompleted: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: /taches/i });
    this.newTaskInput = page.getByLabel("Nouvelle tache");
    this.addButton = page.getByRole("button", { name: "Ajouter" });
    this.taskList = page.getByRole("list");
    this.filterAll = page.getByRole("button", { name: "Toutes" });
    this.filterActive = page.getByRole("button", { name: "Actives" });
    this.filterCompleted = page.getByRole("button", { name: "Terminées" });
  }

  /** Naviguer vers la page des taches */
  async goto(): Promise<void> {
    await this.page.goto("/tasks");
  }

  /** Ajouter une nouvelle tache */
  async addTask(title: string): Promise<void> {
    await this.newTaskInput.fill(title);
    await this.addButton.click();
    // Attendre que la tache apparaisse dans la liste
    await expect(this.page.getByText(title)).toBeVisible();
  }

  /** Cocher/decocher une tache */
  async toggleTask(title: string): Promise<void> {
    const taskRow = this.page.getByRole("listitem").filter({ hasText: title });
    const checkbox = taskRow.getByRole("checkbox");
    await checkbox.click();
  }

  /** Supprimer une tache */
  async deleteTask(title: string): Promise<void> {
    const taskRow = this.page.getByRole("listitem").filter({ hasText: title });
    const deleteButton = taskRow.getByRole("button", { name: /supprimer/i });
    await deleteButton.click();
    // Attendre que la tache disparaisse
    await expect(this.page.getByText(title)).not.toBeVisible();
  }

  /** Modifier le titre d'une tache */
  async editTask(oldTitle: string, newTitle: string): Promise<void> {
    const taskRow = this.page.getByRole("listitem").filter({ hasText: oldTitle });
    const editButton = taskRow.getByRole("button", { name: /modifier/i });
    await editButton.click();

    // Remplir le champ d'edition
    const editInput = taskRow.getByRole("textbox");
    await editInput.clear();
    await editInput.fill(newTitle);

    // Valider avec le bouton Sauvegarder ou Entree
    const saveButton = taskRow.getByRole("button", { name: /sauvegarder/i });
    await saveButton.click();

    // Verifier la mise a jour
    await expect(this.page.getByText(newTitle)).toBeVisible();
  }

  /** Filtrer les taches par statut */
  async filterByStatus(status: "all" | "active" | "completed"): Promise<void> {
    const buttonMap = {
      all: this.filterAll,
      active: this.filterActive,
      completed: this.filterCompleted,
    } as const;

    await buttonMap[status].click();
  }

  /** Obtenir le nombre de taches visibles */
  async getTaskCount(): Promise<number> {
    const items = this.page.getByRole("listitem");
    return items.count();
  }

  /** Obtenir les titres des taches visibles */
  async getTaskTitles(): Promise<string[]> {
    const items = this.page.getByRole("listitem");
    const count = await items.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text) {
        titles.push(text.trim());
      }
    }

    return titles;
  }
}
```

---

## Etape 3 : Scenarios E2E

```ts
// e2e/tasks.spec.ts
import { test, expect } from "@playwright/test";
import { TaskPage } from "./pages/TaskPage";

test.describe("Gestion des taches", () => {
  let taskPage: TaskPage;

  test.beforeEach(async ({ page }) => {
    taskPage = new TaskPage(page);
    await taskPage.goto();
  });

  // Scenario 1 : Navigation
  test("affiche le titre de la page des taches", async () => {
    // Verifier que le heading est visible
    await expect(taskPage.heading).toBeVisible();

    // Verifier que l'input d'ajout est present
    await expect(taskPage.newTaskInput).toBeVisible();

    // Verifier que le bouton Ajouter est present
    await expect(taskPage.addButton).toBeVisible();
  });

  // Scenario 2 : Creation d'une tache
  test("cree une tache et l'affiche dans la liste", async () => {
    const taskTitle = "Nouvelle tache de test";

    // Ajouter la tache
    await taskPage.addTask(taskTitle);

    // Verifier qu'elle apparait dans la liste
    await expect(taskPage.page.getByText(taskTitle)).toBeVisible();

    // Verifier que l'input a ete vide apres l'ajout
    await expect(taskPage.newTaskInput).toHaveValue("");

    // Verifier que le compteur a augmente
    const count = await taskPage.getTaskCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // Scenario 3 : Modification d'une tache
  test("modifie le titre d'une tache existante", async () => {
    // Creer d'abord une tache
    await taskPage.addTask("Tache originale");

    // Modifier son titre
    await taskPage.editTask("Tache originale", "Tache modifiee");

    // Verifier que le nouveau titre est visible
    await expect(taskPage.page.getByText("Tache modifiee")).toBeVisible();

    // Verifier que l'ancien titre n'est plus la
    await expect(
      taskPage.page.getByText("Tache originale")
    ).not.toBeVisible();
  });

  // Scenario 4 : Suppression d'une tache
  test("supprime une tache de la liste", async () => {
    // Creer une tache
    await taskPage.addTask("Tache a supprimer");

    // Compter les taches avant suppression
    const countBefore = await taskPage.getTaskCount();

    // Supprimer la tache
    await taskPage.deleteTask("Tache a supprimer");

    // Verifier que le compteur a diminue
    const countAfter = await taskPage.getTaskCount();
    expect(countAfter).toBe(countBefore - 1);

    // Verifier que la tache n'est plus visible
    await expect(
      taskPage.page.getByText("Tache a supprimer")
    ).not.toBeVisible();
  });

  // Scenario 5 : Filtrage par statut
  test("filtre les taches par statut", async () => {
    // Creer des taches
    await taskPage.addTask("Tache active 1");
    await taskPage.addTask("Tache active 2");
    await taskPage.addTask("Tache a completer");

    // Completer une tache
    await taskPage.toggleTask("Tache a completer");

    // Filtre : Actives
    await taskPage.filterByStatus("active");
    await expect(taskPage.page.getByText("Tache active 1")).toBeVisible();
    await expect(taskPage.page.getByText("Tache active 2")).toBeVisible();
    // La tache completee ne doit pas etre visible
    const completedVisible = await taskPage.page
      .getByRole("listitem")
      .filter({ hasText: "Tache a completer" })
      .isVisible()
      .catch(() => false);
    expect(completedVisible).toBe(false);

    // Filtre : Terminées
    await taskPage.filterByStatus("completed");
    await expect(
      taskPage.page.getByText("Tache a completer")
    ).toBeVisible();

    // Filtre : Toutes
    await taskPage.filterByStatus("all");
    const totalCount = await taskPage.getTaskCount();
    expect(totalCount).toBeGreaterThanOrEqual(3);
  });
});
```

---

## Ce que tu aurais pu oublier

1. **Le Page Object isole les selecteurs** : si l'UI change (un label est renomme, un bouton deplace), seul le Page Object doit etre modifie — pas les tests.

2. **`getByRole` est prefere a `getByTestId`** : Playwright, comme Testing Library, encourage les selecteurs accessibles. `getByRole("button", { name: "Ajouter" })` est plus resilient que `page.locator("[data-testid=add-button]")`.

3. **Auto-waiting de Playwright** : pas besoin de `waitForTimeout(1000)`. Les methodes comme `click()`, `fill()`, `toBeVisible()` attendent automatiquement que l'element soit pret.

4. **`webServer` dans la config** : sans cette option, il faut demarrer manuellement le serveur Next.js avant de lancer les tests. `webServer` automatise cela.

5. **`reuseExistingServer: !process.env.CI`** : en local, si le serveur est deja demarre, Playwright le reutilise. En CI, il demarre toujours un nouveau serveur.

6. **`fullyParallel: true`** : les tests s'executent en parallele par defaut. Attention aux effets de bord si les tests partagent un etat (base de donnees, etc.).

7. **Screenshots uniquement en cas d'echec** : `screenshot: "only-on-failure"` economise de l'espace disque tout en aidant au debug.

8. **Le pattern `filter({ hasText })` est puissant** : il permet de cibler un element dans un contexte precis, comme le bouton "Supprimer" de la tache "Tache a supprimer".
