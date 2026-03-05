# Cours 40 — Pipeline CI avec GitHub Actions

> **Objectif** : Mettre en place une pipeline d'intégration continue (CI) complète pour un projet React/Next.js avec GitHub Actions. Couvrir les étapes install, lint, typecheck, test et build, optimiser avec le caching pnpm et les jobs parallèles, et configurer les branch protection rules. Fournir un fichier `.github/workflows/ci.yml` complet et prêt à l'emploi.

---

## Rappel du cours précédent

<details>
<summary>1. Quelles sont les principales protections XSS fournies par React ?</summary>

React échappe automatiquement toutes les expressions JSX (`{variable}`), empêchant l'injection de HTML/script. Les deux exceptions dangereuses sont `dangerouslySetInnerHTML` (injection HTML directe) et les attributs `href` (URLs `javascript:`). Pour injecter du HTML sûr, utiliser DOMPurify.
</details>

<details>
<summary>2. Quelle est la règle concernant NEXT_PUBLIC_ et les secrets ?</summary>

Les variables préfixées `NEXT_PUBLIC_` sont incluses dans le bundle JavaScript client — elles sont visibles par tous les utilisateurs. Ne jamais préfixer un secret (clé API, URL de base de données, token) avec `NEXT_PUBLIC_`. Les variables sans préfixe ne sont accessibles que côté serveur.
</details>

<details>
<summary>3. Quels headers de sécurité configurer dans next.config.ts ?</summary>

Content-Security-Policy (ressources autorisées), X-Frame-Options: DENY (anti-clickjacking), X-Content-Type-Options: nosniff (empêche le MIME sniffing), Referrer-Policy, Permissions-Policy (désactiver caméra, micro, géoloc par défaut).
</details>

---

## Analogie

Une pipeline CI, c'est comme une **chaîne de contrôle qualité en usine**. Chaque voiture (commit) passe par plusieurs stations : inspection visuelle (lint), vérification des dimensions (typecheck), crash test (tests), et peinture finale (build). Si une station détecte un défaut, la voiture est rejetée avant d'atteindre le client. GitHub Actions est le **tapis roulant automatisé** qui fait passer chaque commit par toutes les stations.

---

## Théorie

### 1. Pourquoi une pipeline CI ?

| Sans CI | Avec CI |
|---------|---------|
| "Ca marche sur ma machine" | Environnement reproductible |
| Erreurs de types découvertes en prod | Typecheck à chaque push |
| Tests oubliés | Tests automatiques obligatoires |
| Code non formaté mergé | Lint bloquant |
| Build cassé découvert tard | Build vérifié avant merge |

### 2. Structure d'un workflow GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI                    # Nom du workflow
on:                         # Quand s'exécuter
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:                       # Les étapes
  nom-du-job:
    runs-on: ubuntu-latest  # Machine virtuelle
    steps:
      - uses: actions/checkout@v4   # Récupérer le code
      - run: echo "Hello CI"        # Commande
```

### 3. Workflow complet React/Next.js avec pnpm

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

# Annuler les runs précédents sur la même branche/PR
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ───────────────────────────────────────────────
  # Job 1 : Lint + Typecheck (rapide, ~1 min)
  # ───────────────────────────────────────────────
  quality:
    name: Lint & Typecheck
    runs-on: ubuntu-latest

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
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm tsc --noEmit

  # ───────────────────────────────────────────────
  # Job 2 : Tests (en parallèle avec Job 1)
  # ───────────────────────────────────────────────
  test:
    name: Tests
    runs-on: ubuntu-latest

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
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test -- --coverage

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  # ───────────────────────────────────────────────
  # Job 3 : Build (après lint + test OK)
  # ───────────────────────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [quality, test]  # Attend que les deux jobs précédents réussissent

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
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
        env:
          # Variables d'environnement pour le build
          NEXT_PUBLIC_APP_URL: https://monapp.com

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .next/
          retention-days: 1
```

### 4. Visualisation du pipeline

```
git push / PR
     │
     ├──► quality (lint + typecheck)  ─┐
     │                                  ├──► build (si les deux OK)
     └──► test (tests unitaires)  ─────┘
```

Les jobs `quality` et `test` s'exécutent **en parallèle**. Le job `build` attend que les deux réussissent (`needs: [quality, test]`).

### 5. Caching pnpm pour des builds plus rapides

L'action `actions/setup-node@v4` avec `cache: "pnpm"` cache automatiquement le store pnpm :

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: "pnpm"  # ← Cache le store pnpm entre les runs
```

**Impact sur les temps :**

| Etape | Sans cache | Avec cache |
|-------|-----------|------------|
| `pnpm install` | ~45s | ~10s |
| Gain total sur 3 jobs | — | ~1 min 45s |

> Le flag `--frozen-lockfile` est crucial en CI : il garantit que les versions installées correspondent exactement au `pnpm-lock.yaml`. Si le lockfile est désynchronisé, le build échoue immédiatement.

### 6. Scripts package.json recommandés

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### 7. Branch protection rules

Configurer dans GitHub : Settings → Branches → Add rule

| Règle | Configuration |
|-------|---------------|
| Branch name pattern | `main` |
| Require pull request before merging | ✅ |
| Require approvals | ✅ (1 minimum) |
| Require status checks to pass | ✅ |
| Status checks required | `quality`, `test`, `build` |
| Require branches to be up to date | ✅ |
| Require conversation resolution | ✅ |
| Include administrators | ✅ |

> Avec ces règles, il est **impossible** de merger sur `main` sans que la CI passe et qu'une review soit approuvée.

### 8. Ajout optionnel : tests E2E avec Playwright

```yaml
  # Job optionnel : tests E2E (plus lent, ~3-5 min)
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [build]

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
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Build application
        run: pnpm build
        env:
          NEXT_PUBLIC_APP_URL: http://localhost:3000

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### 9. Bonnes pratiques CI

| Pratique | Pourquoi |
|----------|----------|
| `concurrency` + `cancel-in-progress` | Annuler les runs obsolètes (économie de minutes) |
| `--frozen-lockfile` | Reproductibilité des builds |
| Jobs parallèles | Feedback plus rapide (lint + test en parallèle) |
| `needs` pour les dépendances | Ne pas build si lint/test échoue |
| `if: always()` pour les artifacts | Récupérer les rapports même en échec |
| Upload coverage | Suivre l'évolution de la couverture |
| Secrets GitHub | Variables secrètes dans Settings → Secrets |

---

## Pratique

### Exercice : écrire une pipeline CI complète

Créez le fichier `.github/workflows/ci.yml` pour votre projet avec :

1. Déclenchement sur push (main) et pull_request (main)
2. Concurrency pour annuler les runs obsolètes
3. Job `quality` : install → lint → typecheck
4. Job `test` : install → tests avec coverage → upload artifact
5. Job `build` : install → build (dépend de quality + test)
6. Caching pnpm
7. Node.js 20

<details>
<summary>Voir la solution</summary>

La solution complète est le workflow YAML présenté en section 3 de ce cours. Les points clés :

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  build:
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| GitHub Actions | CI/CD intégré à GitHub, gratuit pour les repos publics |
| Pipeline type | lint → typecheck → test → build |
| Parallélisme | `quality` et `test` en parallèle, `build` attend les deux |
| Caching pnpm | `cache: "pnpm"` dans `setup-node` (gain ~35s par job) |
| `--frozen-lockfile` | Obligatoire en CI pour la reproductibilité |
| Branch protection | Merge impossible sans CI verte + review approuvée |
| Concurrency | Annuler les runs en cours quand un nouveau push arrive |

> **Prochain cours** : [Cours 41 — Déploiement](./02-deploiement.md)
