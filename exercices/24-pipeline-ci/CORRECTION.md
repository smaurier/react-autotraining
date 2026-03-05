# Correction — Exercice 24 : Pipeline CI

---

## Etape 1 : Fichier .nvmrc

```
# .nvmrc
20
```

---

## Etape 2 : Scripts package.json

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

## Etape 3 : Workflow CI principal

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Annuler les runs precedents sur la meme branche
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ===== JOB 1 : Verification de la qualite =====
  quality:
    name: Lint, Type Check & Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      # 1. Checkout du code
      - name: Checkout
        uses: actions/checkout@v4

      # 2. Setup pnpm
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      # 3. Setup Node.js avec cache pnpm
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"

      # 4. Installation des dependances
      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # 5. Lint
      - name: Lint
        run: pnpm lint

      # 6. Type checking
      - name: Type check
        run: pnpm type-check

      # 7. Tests unitaires
      - name: Run tests
        run: pnpm test

      # 8. Upload des resultats de couverture (optionnel)
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  # ===== JOB 2 : Build de production =====
  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: quality # Ne s'execute que si quality reussit

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # Cache du build Next.js pour accelerer les builds suivants
      - name: Cache Next.js build
        uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
          restore-keys: |
            nextjs-${{ hashFiles('pnpm-lock.yaml') }}-

      - name: Build
        run: pnpm build

      # Sauvegarder l'artifact pour le deploiement
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: nextjs-build
          path: .next/
          retention-days: 1

  # ===== JOB 3 : Deploiement Vercel =====
  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: build
    # Uniquement sur push vers main (pas sur les PR)
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # Installer le CLI Vercel
      - name: Install Vercel CLI
        run: pnpm add -g vercel

      # Pull de la configuration Vercel
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      # Build pour Vercel
      - name: Build for Vercel
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      # Deployer
      - name: Deploy to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> "$GITHUB_OUTPUT"
```

---

## Etape 4 : Workflow E2E (optionnel)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Build application
        run: pnpm build

      - name: Run E2E tests
        run: pnpm test:e2e

      # Upload traces et screenshots en cas d'echec
      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Upload test traces
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: test-results/
          retention-days: 7
```

---

## Etape 5 : Secrets GitHub necessaires

Pour le deploiement Vercel, configurer les secrets suivants dans les parametres du depot GitHub :

```
VERCEL_TOKEN      → Token d'API Vercel (depuis vercel.com/account/tokens)
VERCEL_ORG_ID     → ID de l'organisation Vercel
VERCEL_PROJECT_ID → ID du projet Vercel
```

Pour les recuperer :

```bash
# Installer et lier le projet Vercel
pnpm add -g vercel
vercel login
vercel link

# Les IDs sont dans .vercel/project.json
cat .vercel/project.json
```

---

## Ce que tu aurais pu oublier

1. **`--frozen-lockfile`** est essentiel en CI : il empeche pnpm de modifier le `pnpm-lock.yaml` et garantit que les memes versions sont installees qu'en local.

2. **`concurrency` avec `cancel-in-progress`** : si tu pushes 3 commits rapidement, les 2 premiers runs sont annules automatiquement. Cela economise du temps et des credits.

3. **Le cache pnpm** est gere par `actions/setup-node` avec l'option `cache: "pnpm"`. Il faut que `pnpm/action-setup` s'execute avant.

4. **`needs: quality`** cree une dependance entre les jobs : le build ne s'execute que si quality passe. Sans cela, les jobs s'executent en parallele.

5. **`if: github.event_name == 'push'`** : le deploiement ne s'execute que sur les push directs vers main, pas sur les pull requests. Cela evite de deployer du code non merge.

6. **Le cache Next.js** (`.next/cache`) accelere les builds suivants. Le cache est indexe par le hash du lockfile et des fichiers source.

7. **Les artifacts ont une duree de vie limitee** : `retention-days: 1` pour les builds (temporaires) et `retention-days: 7` pour les rapports de tests.

8. **Playwright necessite `--with-deps`** : cette option installe les dependances systeme necessaires au navigateur (chromium, etc.) sur l'image Ubuntu.
