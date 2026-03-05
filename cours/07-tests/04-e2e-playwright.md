# Cours 32 — Tests E2E avec Playwright

> **Objectif** : configurer Playwright avec React/Next.js, écrire des tests end-to-end avec le Page Object pattern, maîtriser les sélecteurs accessibles, tester des formulaires et la navigation, et intégrer les tests dans la CI.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre MSW et `vi.mock(fetch)` ?</summary>

MSW intercepte les requêtes au **niveau réseau** : le vrai `fetch` s'exécute, mais la requête est interceptée avant d'atteindre le serveur. `vi.mock(fetch)` remplace la fonction `fetch` elle-même. MSW est plus réaliste car il teste le code de sérialisation, les headers, les cookies, etc.
</details>

<details>
<summary>2. Comment override un handler MSW pour un seul test ?</summary>

On utilise `server.use(http.get("/api/...", () => HttpResponse.json(...)))` dans le test. Le handler est réinitialisé après le test grâce à `server.resetHandlers()` dans `afterEach`.
</details>

<details>
<summary>3. Que signifie `onUnhandledRequest: "error"` dans la config MSW ?</summary>

Cela force MSW à lancer une erreur si un test fait un `fetch` vers une URL qui n'a pas de handler correspondant. Cela évite les appels réseau accidentels vers de vrais serveurs pendant les tests.
</details>

---

## Analogie

Si les tests unitaires vérifient que chaque **pièce de puzzle** est correcte, et les tests d'intégration que les pièces **s'emboîtent** bien ensemble, les tests E2E vérifient que **le puzzle entier** forme l'image attendue.

Playwright est un **robot utilisateur** : il ouvre un vrai navigateur, clique sur des boutons, remplit des formulaires, navigue entre les pages, et vérifie que tout fonctionne comme un humain le ferait. C'est le test le plus proche de la réalité.

---

## Théorie

### Pourquoi Playwright ?

| Critère | Cypress | Playwright |
|---|---|---|
| Navigateurs | Chrome, Firefox, Edge | Chrome, Firefox, Safari, Edge |
| Vitesse | Moyen | Très rapide (parallèle natif) |
| Multi-onglets | Non | Oui |
| Network interception | Oui | Oui (plus puissant) |
| Mobile | Émulation limitée | Émulation complète |
| Langage | JavaScript | JS, TS, Python, Java, C# |
| API | Chaînable | Async/await |
| Framework-agnostic | Oui | Oui |

> **Point clé** : Playwright est le **même outil** que tu utiliserais pour Angular, Vue ou React. Les tests E2E sont indépendants du framework.

### Installation

```bash
npm init playwright@latest
```

Cela crée :
- `playwright.config.ts` — configuration
- `tests/` — dossier des tests E2E
- `tests-examples/` — exemples (supprimer)

```tsx
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Test mobile
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Démarrer le serveur Next.js avant les tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

```json
// package.json (scripts)
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### Premier test E2E

```tsx
// e2e/home.spec.ts
import { test, expect } from "@playwright/test";

test("la page d'accueil affiche le titre", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/mon app/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Bienvenue"
  );
});

test("la navigation fonctionne", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: /à propos/i }).click();

  await expect(page).toHaveURL("/about");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "À propos"
  );
});
```

### Sélecteurs : les mêmes principes que RTL

Playwright utilise des sélecteurs accessibles, comme React Testing Library :

```tsx
// ✅ Priorité 1 : rôles ARIA (le meilleur)
page.getByRole("button", { name: /envoyer/i });
page.getByRole("heading", { level: 2 });
page.getByRole("link", { name: /accueil/i });
page.getByRole("textbox", { name: /email/i });
page.getByRole("checkbox", { name: /accepter/i });

// ✅ Priorité 2 : labels
page.getByLabel(/adresse email/i);

// ✅ Priorité 3 : texte visible
page.getByText(/bienvenue/i);

// ✅ Priorité 4 : placeholder
page.getByPlaceholder(/rechercher/i);

// ⚠️ Dernier recours : data-testid
page.getByTestId("custom-element");

// ❌ ÉVITER : sélecteurs CSS fragiles
page.locator(".btn-primary"); // Couplé au CSS
page.locator("#submit-btn");  // Couplé à l'implémentation
```

### Page Object pattern

Le Page Object pattern encapsule les interactions avec une page dans une classe, rendant les tests plus lisibles et maintenables.

```tsx
// e2e/pages/login.page.ts
import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  private readonly page: Page;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/mot de passe/i);
    this.submitButton = page.getByRole("button", { name: /se connecter/i });
    this.errorMessage = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string | RegExp) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectRedirectTo(path: string) {
    await expect(this.page).toHaveURL(path);
  }
}
```

```tsx
// e2e/pages/dashboard.page.ts
import type { Page, Locator } from "@playwright/test";

export class DashboardPage {
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly userMenu: Locator;
  private readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.userMenu = page.getByRole("button", { name: /profil/i });
    this.logoutButton = page.getByRole("menuitem", { name: /déconnexion/i });
  }

  async expectVisible() {
    await expect(this.heading).toContainText(/dashboard/i);
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}
```

```tsx
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";
import { DashboardPage } from "./pages/dashboard.page";

test.describe("Authentification", () => {
  test("connexion réussie redirige vers le dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login("admin@example.com", "password123");

    await loginPage.expectRedirectTo("/dashboard");
    await dashboardPage.expectVisible();
  });

  test("identifiants invalides affichent une erreur", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login("wrong@example.com", "wrongpass");

    await loginPage.expectError(/identifiants invalides/i);
  });
});
```

### Tester les formulaires

```tsx
// e2e/contact.spec.ts
import { test, expect } from "@playwright/test";

test("soumission du formulaire de contact", async ({ page }) => {
  await page.goto("/contact");

  // Remplir le formulaire
  await page.getByLabel(/nom/i).fill("Alice Dupont");
  await page.getByLabel(/email/i).fill("alice@example.com");
  await page.getByLabel(/message/i).fill("Bonjour, ceci est un test.");

  // Cocher les conditions
  await page.getByRole("checkbox", { name: /conditions/i }).check();

  // Sélectionner un sujet
  await page.getByRole("combobox", { name: /sujet/i }).selectOption("support");

  // Soumettre
  await page.getByRole("button", { name: /envoyer/i }).click();

  // Vérifier le succès
  await expect(page.getByText(/message envoyé/i)).toBeVisible();
});

test("validation du formulaire", async ({ page }) => {
  await page.goto("/contact");

  // Soumettre sans remplir
  await page.getByRole("button", { name: /envoyer/i }).click();

  // Vérifier les erreurs de validation
  await expect(page.getByText(/nom requis/i)).toBeVisible();
  await expect(page.getByText(/email requis/i)).toBeVisible();
});
```

### Intercepter le réseau

```tsx
// e2e/api-mock.spec.ts
import { test, expect } from "@playwright/test";

test("affiche les données mockées", async ({ page }) => {
  // Intercepter les appels API
  await page.route("/api/users", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, name: "Mock Alice" },
        { id: 2, name: "Mock Bob" },
      ]),
    });
  });

  await page.goto("/users");

  await expect(page.getByText("Mock Alice")).toBeVisible();
  await expect(page.getByText("Mock Bob")).toBeVisible();
});

test("gère l'erreur API", async ({ page }) => {
  await page.route("/api/users", async (route) => {
    await route.fulfill({
      status: 500,
      body: JSON.stringify({ error: "Erreur serveur" }),
    });
  });

  await page.goto("/users");

  await expect(page.getByRole("alert")).toContainText(/erreur/i);
});
```

### Tests visuels (screenshot comparison)

```tsx
// e2e/visual.spec.ts
import { test, expect } from "@playwright/test";

test("la page d'accueil correspond au screenshot de référence", async ({
  page,
}) => {
  await page.goto("/");

  // Première exécution : crée le screenshot de référence
  // Exécutions suivantes : compare avec la référence
  await expect(page).toHaveScreenshot("home.png", {
    maxDiffPixelRatio: 0.01, // Tolérance de 1%
  });
});

test("le composant Card correspond au screenshot", async ({ page }) => {
  await page.goto("/components/card");

  const card = page.getByTestId("product-card");
  await expect(card).toHaveScreenshot("product-card.png");
});
```

```bash
# Mettre à jour les screenshots de référence
npx playwright test --update-snapshots
```

### CI : GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### Commandes utiles

```bash
# Lancer tous les tests
npx playwright test

# Lancer avec l'UI interactive (debug visuel)
npx playwright test --ui

# Lancer un fichier spécifique
npx playwright test e2e/auth.spec.ts

# Lancer en mode debug (pas à pas)
npx playwright test --debug

# Lancer sur un seul navigateur
npx playwright test --project=chromium

# Voir le rapport HTML
npx playwright show-report

# Générer du code en enregistrant des actions
npx playwright codegen http://localhost:3000
```

> **`codegen`** est un outil génial : il ouvre un navigateur, tu interagis normalement, et Playwright génère le code du test automatiquement. Parfait pour démarrer.

### Comparaison : même Playwright pour tous les frameworks

| Aspect | React / Next.js | Angular | Vue / Nuxt |
|---|---|---|---|
| Outil | Playwright | Playwright | Playwright |
| Config | Identique | Identique | Identique |
| Sélecteurs | Identiques | Identiques | Identiques |
| Page Objects | Identiques | Identiques | Identiques |
| CI | Identique | Identique | Identique |
| `webServer` | `npm run dev` | `npm run serve` | `npm run dev` |

> C'est la force des tests E2E : ils sont **framework-agnostic**. Tes compétences Playwright acquises en Angular/Vue s'appliquent directement à React.

---

## Pratique

### Exercice : tester un parcours e-commerce complet

**Objectif** : écrire des tests E2E pour un mini-site e-commerce.

1. Crée les Page Objects suivants :
   - `ProductListPage` : liste de produits avec filtre
   - `ProductDetailPage` : détail d'un produit avec bouton "Ajouter au panier"
   - `CartPage` : panier avec total et bouton "Commander"
2. Écris les tests E2E :
   - Navigation de la liste vers le détail d'un produit
   - Ajout d'un produit au panier
   - Vérification du total dans le panier
   - Parcours complet : liste -> détail -> ajouter -> panier -> vérifier

<details>
<summary>Solution</summary>

```tsx
// e2e/pages/product-list.page.ts
import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class ProductListPage {
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly searchInput: Locator;
  private readonly productLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.searchInput = page.getByPlaceholder(/rechercher/i);
    this.productLinks = page.getByRole("link").filter({ hasText: /voir/i });
  }

  async goto() {
    await this.page.goto("/products");
  }

  async expectVisible() {
    await expect(this.heading).toContainText(/produits/i);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async clickProduct(name: string) {
    await this.page
      .getByRole("article")
      .filter({ hasText: name })
      .getByRole("link", { name: /voir/i })
      .click();
  }

  async expectProductCount(count: number) {
    await expect(this.page.getByRole("article")).toHaveCount(count);
  }
}

// e2e/pages/product-detail.page.ts
import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class ProductDetailPage {
  private readonly page: Page;
  private readonly title: Locator;
  private readonly price: Locator;
  private readonly addToCartButton: Locator;
  private readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole("heading", { level: 1 });
    this.price = page.getByTestId("product-price");
    this.addToCartButton = page.getByRole("button", {
      name: /ajouter au panier/i,
    });
    this.successMessage = page.getByText(/ajouté au panier/i);
  }

  async expectTitle(name: string) {
    await expect(this.title).toContainText(name);
  }

  async addToCart() {
    await this.addToCartButton.click();
    await expect(this.successMessage).toBeVisible();
  }
}

// e2e/pages/cart.page.ts
import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class CartPage {
  private readonly page: Page;
  private readonly heading: Locator;
  private readonly total: Locator;
  private readonly items: Locator;
  private readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.total = page.getByTestId("cart-total");
    this.items = page.getByRole("listitem");
    this.checkoutButton = page.getByRole("button", { name: /commander/i });
  }

  async goto() {
    await this.page.goto("/cart");
  }

  async expectItemCount(count: number) {
    await expect(this.items).toHaveCount(count);
  }

  async expectTotal(total: string) {
    await expect(this.total).toContainText(total);
  }

  async checkout() {
    await this.checkoutButton.click();
  }
}

// e2e/ecommerce.spec.ts
import { test, expect } from "@playwright/test";
import { ProductListPage } from "./pages/product-list.page";
import { ProductDetailPage } from "./pages/product-detail.page";
import { CartPage } from "./pages/cart.page";

test.describe("Parcours e-commerce", () => {
  test("naviguer de la liste vers le détail", async ({ page }) => {
    const listPage = new ProductListPage(page);
    const detailPage = new ProductDetailPage(page);

    await listPage.goto();
    await listPage.expectVisible();
    await listPage.clickProduct("T-shirt React");

    await detailPage.expectTitle("T-shirt React");
  });

  test("ajouter un produit au panier", async ({ page }) => {
    const detailPage = new ProductDetailPage(page);

    await page.goto("/products/t-shirt-react");
    await detailPage.addToCart();
  });

  test("parcours complet : liste -> détail -> panier", async ({ page }) => {
    const listPage = new ProductListPage(page);
    const detailPage = new ProductDetailPage(page);
    const cartPage = new CartPage(page);

    // 1. Liste des produits
    await listPage.goto();
    await listPage.expectVisible();

    // 2. Cliquer sur un produit
    await listPage.clickProduct("T-shirt React");
    await detailPage.expectTitle("T-shirt React");

    // 3. Ajouter au panier
    await detailPage.addToCart();

    // 4. Aller au panier
    await cartPage.goto();
    await cartPage.expectItemCount(1);
  });

  test("filtrer les produits", async ({ page }) => {
    const listPage = new ProductListPage(page);

    await listPage.goto();
    await listPage.search("React");
    await listPage.expectProductCount(1);
  });
});
```

</details>

---

## Résumé

| Concept | À retenir |
|---|---|
| Playwright | Tests E2E multi-navigateurs, rapides, avec API async/await |
| `page.goto` / `page.getByRole` | Navigation et sélecteurs accessibles (comme RTL) |
| Page Object pattern | Encapsule les interactions dans des classes réutilisables |
| `page.route` | Intercepte les appels réseau (comme MSW mais au niveau E2E) |
| `toHaveScreenshot` | Tests de régression visuelle |
| `codegen` | Génère du code en enregistrant tes actions dans le navigateur |
| `webServer` | Démarre automatiquement le serveur avant les tests |
| Framework-agnostic | Mêmes tests Playwright pour React, Angular et Vue |

---

> **Prochain cours** : [Profiling et React DevTools](../08-performance-patterns/01-profiling-devtools.md) — identifier les problèmes de performance et optimiser tes composants React.
