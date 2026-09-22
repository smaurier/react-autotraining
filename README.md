# React par exemple (TypeScript + React 19 + Next.js 15)

![VitePress](https://img.shields.io/badge/-VitePress-646CFF?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
[![fullstack-autotraining](https://img.shields.io/badge/curriculum-fullstack--autotraining-4C1?style=flat-square)](https://github.com/smaurier/fullstack-autotraining)

Formation progressive React : de Vue/Angular vers React staffable ESN.

<!-- labs-gestes:start -->
## Labs — refonte du 22/09/2026 : un lab = un geste métier complet

> Règle qualité 5 du parcours : chaque lab est **un geste métier complet**, sous deux formes — **Zéro** (construire de zéro un artefact réel et entier) ou **Intervention** (modifier de l'existant avec consommateurs, findings avant code, non-régression). Un lab n'entre en file qu'avec un **oracle exécutable** (`src/` starter · `test/` · `solution/` séparée). Les labs historiques de ce cours (un concept par lab, sans oracle) restent dans `labs/` jusqu'à remplacement et **ne sont plus la file**. Cible détaillée : [`docs/gestes-complets.md`](../docs/gestes-complets.md). État : **2/8 avec oracle**.

| # | Lab | Forme | Geste | Oracle |
|---|-----|-------|-------|--------|
| 01 | [`lab-01-feature-de-zero`](labs/lab-01-feature-de-zero/README.md) | Zéro | écran, état, appel API typé, formulaire validé, tests RTL + MSW, a11y | ✅ vérifié |
| 02 | [`lab-02-state-et-cache`](labs/lab-02-state-et-cache/README.md) | Zéro | Zustand + TanStack Query sur une feature réelle | ✅ vérifié |
| 03 | `lab-03-page-nextjs-de-zero` | Zéro | App Router, Server Components, Route Handler, devant l'API NestJS | · à écrire |
| 04 | `lab-04-recette-esn` | Zéro | un pattern réel de mission de bout en bout | · à écrire |
| 05 | `lab-05-ajouter-une-capacite` | Intervention | composant existant consommé par plusieurs écrans (le cas Elcia côté React) | · à écrire |
| 06 | `lab-06-re-render-mesure` | Intervention | profiler, trouver, corriger, prouver | · à écrire |
| 07 | `lab-07-migrer-vers-server-components` | Intervention | une page client existante | · à écrire |
| 08 | `lab-08-relire-une-pr-react` | Intervention | findings avant vérité | · à écrire |

<!-- labs-gestes:end -->

## Stack

- **Library** : React 19 (hooks, Server Components)
- **Framework** : Next.js 15 (App Router)
- **Langage** : TypeScript strict
- **State** : Zustand, TanStack Query, Context
- **Forms** : React Hook Form + Zod
- **Styling** : Tailwind CSS
- **Tests** : Vitest + React Testing Library + Playwright
- **Package manager** : pnpm

## Démarrage rapide

```bash
pnpm install
pnpm docs:dev    # → http://localhost:5170
```

## Structure

```
cours/           → Cours pédagogiques en Markdown
exercices/       → Énoncés, corrections et checklists
src/             → Code React (composants à modifier)
projet-fil-rouge/→ TaskFlow : app Next.js construite progressivement
```

## Méthode de travail

1. Lis la leçon dans `cours/`
2. Ouvre l'énoncé dans `exercices/`
3. Code en TypeScript dans `src/`
4. Lance l'app et valide le comportement
5. Compare avec la correction

## Parcours cible (ESN)

| Niveau | Compétences |
|--------|------------|
| **Débutant solide** | JSX, hooks, props, state, composants |
| **Intermédiaire** | Custom hooks, Zustand, React Query, formulaires, routing |
| **Avancé** | Next.js App Router, Server Components, tests, performance |
| **Staffable ESN** | Patterns entreprise, entretien technique, autonomie |

**Durée estimée** : ~65h (~2.5 mois à 1 cours/jour)

**Prérequis** : avoir complété les formations Vue 3 (02-vue) et Angular 19+ (03-angular)
