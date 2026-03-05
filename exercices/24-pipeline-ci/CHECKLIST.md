# Checklist — Exercice 24 : Pipeline CI

## Validation

- [ ] Le fichier `.github/workflows/ci.yml` est syntaxiquement correct (YAML valide)
- [ ] Le workflow se declenche sur `push` vers `main` et `pull_request` vers `main`
- [ ] `concurrency` avec `cancel-in-progress` est configure pour eviter les runs en double
- [ ] pnpm est installe via `pnpm/action-setup` avant `setup-node`
- [ ] Node.js est configure avec `node-version-file: ".nvmrc"` et `cache: "pnpm"`
- [ ] `pnpm install --frozen-lockfile` est utilise pour l'installation
- [ ] Le job "quality" execute : lint, type-check, tests
- [ ] Le job "build" depend du job "quality" (`needs: quality`)
- [ ] Le cache Next.js (`.next/cache`) est configure pour accelerer les builds
- [ ] Le job "deploy" ne s'execute que sur `push` vers `main` (pas sur les PR)
- [ ] Les secrets Vercel sont references via `${{ secrets.VERCEL_TOKEN }}`
- [ ] Les scripts `lint`, `type-check`, `test`, `build` sont definis dans `package.json`
- [ ] Le fichier `.nvmrc` specifie la version Node.js 20
