# Exercice 24 — Pipeline CI

**Module** : 11-CI/CD & Deploiement · **Difficulte** : ⭐⭐
**Duree estimee** : 60 minutes
**Cours** : `cours/11-cicd-deploiement/01-pipeline-ci.md`

---

## Objectif

Configurer un pipeline CI/CD complet avec GitHub Actions pour un projet Next.js 15 : lint, verification des types, tests unitaires, build de production, et deploiement sur Vercel. Le pipeline utilise le cache pnpm pour accelerer les builds.

C'est l'exercice qui prepare ton projet a un usage professionnel en ESN : chaque push et chaque pull request sont automatiquement verifies avant integration.

---

## Consignes

1. **Creer le workflow principal** `.github/workflows/ci.yml` :
   - Declencheurs : `push` sur `main`, `pull_request` sur `main`.
   - Environnement : Ubuntu latest, Node.js 20.
   - Cache pnpm avec la cle hash du `pnpm-lock.yaml`.

2. **Job "quality"** — verifications de qualite :
   - **Step 1** : Checkout du code.
   - **Step 2** : Setup pnpm (via `pnpm/action-setup`).
   - **Step 3** : Setup Node.js avec cache pnpm.
   - **Step 4** : Installation des dependances (`pnpm install --frozen-lockfile`).
   - **Step 5** : Lint (`pnpm lint`).
   - **Step 6** : Type check (`pnpm tsc --noEmit`).
   - **Step 7** : Tests unitaires (`pnpm test`).

3. **Job "build"** — build de production :
   - Depend du job "quality" (ne s'execute que si quality passe).
   - Build Next.js (`pnpm build`).
   - Uploader l'artifact `.next/` pour le deploiement.

4. **Job "deploy"** (optionnel) — deploiement Vercel :
   - Depend du job "build".
   - Ne s'execute que sur `push` vers `main` (pas sur les PR).
   - Utiliser le CLI Vercel ou l'integration GitHub.

5. **Creer les scripts npm** dans `package.json` :
   - `lint`, `type-check`, `test`, `build`.

6. **Creer un fichier `.nvmrc`** avec la version Node.js.

---

## Contraintes TypeScript

- Le workflow YAML doit etre syntaxiquement correct.
- Les variables d'environnement sensibles utilisent les secrets GitHub.
- Le type checking (`tsc --noEmit`) doit passer sans erreur.
- Le fichier `package.json` doit avoir les scripts necessaires.

---

## Bonus

- [ ] Ajouter un job de tests E2E avec Playwright (avec upload des traces en artifact).
- [ ] Ajouter un badge de statut CI dans le README.
- [ ] Configurer Dependabot pour les mises a jour automatiques.
- [ ] Ajouter une notification Slack en cas d'echec.

---

## Fichiers

```
.github/
  workflows/
    ci.yml
.nvmrc
package.json (scripts section)
```

---

## Criteres de reussite

| Critere                                          | Attendu |
| ------------------------------------------------ | ------- |
| Le workflow se declenche sur push et PR vers main | oui    |
| Le cache pnpm accelere les builds suivants       | oui     |
| Le lint, type check et tests s'executent dans le job quality | oui |
| Le build ne s'execute que si le job quality passe | oui    |
| Le deploy ne s'execute que sur push vers main    | oui     |
| `--frozen-lockfile` est utilise pour l'installation | oui  |
| Le YAML est syntaxiquement correct               | oui     |

---

## Ressources

- [GitHub Actions — Documentation](https://docs.github.com/en/actions)
- [pnpm — GitHub Action](https://github.com/pnpm/action-setup)
- [Vercel — GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github)
