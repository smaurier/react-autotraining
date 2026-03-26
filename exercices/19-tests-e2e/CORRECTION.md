# Correction — Exercice 19 : Tests E2E avec Playwright

---

## playwright.config.ts

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  use: {
    headless: true,
    screenshot: 'only-on-failure',
  },
  reporter: 'html',
});
```

---

## e2e/register.spec.ts — Solution complète

```ts
import { test, expect, Page } from '@playwright/test';

// Helper réutilisable
async function fillRegisterForm(
  page: Page,
  { email = '', password = '', confirm = '' } = {}
) {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^mot de passe$/i).fill(password);
  await page.getByLabel(/confirmer/i).fill(confirm);
  await page.getByRole('button', { name: /créer mon compte/i }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/register');
});

test('inscription réussie → redirection /dashboard', async ({ page }) => {
  await fillRegisterForm(page, {
    email: 'test@example.com',
    password: 'Secur3Pass!',
    confirm: 'Secur3Pass!',
  });

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText(/bienvenue/i)).toBeVisible();
});

test('email manquant → message d\'erreur', async ({ page }) => {
  await fillRegisterForm(page, { password: 'Secur3Pass!', confirm: 'Secur3Pass!' });

  await expect(page.getByText(/email requis/i)).toBeVisible();
  await expect(page).toHaveURL('/register');
});

test('password trop court → message d\'erreur', async ({ page }) => {
  await fillRegisterForm(page, {
    email: 'test@example.com',
    password: 'abc12',
    confirm: 'abc12',
  });

  await expect(page.getByText(/8 caractères minimum/i)).toBeVisible();
});

test('passwords non concordants → message d\'erreur', async ({ page }) => {
  await fillRegisterForm(page, {
    email: 'test@example.com',
    password: 'Secur3Pass!',
    confirm: 'DifferentPass!',
  });

  await expect(page.getByText(/ne correspondent pas/i)).toBeVisible();
});

test('focus automatique sur le champ email', async ({ page }) => {
  const emailInput = page.getByLabel(/email/i);
  await expect(emailInput).toBeFocused();
});
```

---

## Points clés

| Bonne pratique | Explication |
|---|---|
| `getByLabel` | Lie le test à l'accessibilité (le label doit exister) |
| `getByRole('button', { name })` | Résistant aux changements de classe CSS |
| `toHaveURL` | Vérifie la navigation côté Playwright (pas `window.location`) |
| `toBeFocused` | Vérifie le focus sans JavaScript arbitraire |
| `beforeEach` | Isole chaque test — pas d'état partagé |
| Pas de `waitForTimeout` | Playwright attend automatiquement avec les `expect` async |

---

## Erreurs fréquentes

```ts
// ❌ Fragile — dépend du markup HTML
await page.click('form > div:nth-child(3) > button');

// ✅ Robuste — lié au rôle ARIA
await page.getByRole('button', { name: /créer/i }).click();

// ❌ Attente artificielle
await page.waitForTimeout(2000);

// ✅ Attente sémantique
await expect(page.getByText(/bienvenue/i)).toBeVisible();
```
