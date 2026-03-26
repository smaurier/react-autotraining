---
layout: home

hero:
  name: "React Course"
  text: "React 19 + Next.js 15"
  tagline: "Formation progressive React : de Vue/Angular vers React staffable ESN — TypeScript strict, hooks, Server Components, tests"
  actions:
    - theme: brand
      text: Commencer le cours
      link: /cours/00-de-vue-angular-a-react/01-react-mental-model
    - theme: alt
      text: Voir les exercices
      link: /exercices/01-premier-composant/README

features:
  - title: Transition douce
    details: Le cours commence par les équivalences Vue/Angular → React pour ne pas repartir de zéro. Mental model, syntaxe, patterns — tout est comparé.
  - title: Cours complets
    details: 13 chapitres couvrant JSX, hooks, state management, routing, formulaires, Next.js, tests, performance, accessibilité et auth.
  - title: 23 Exercices pratiques
    details: Exercices progressifs avec énoncés et corrections — du composant simple jusqu'au projet Next.js complet.
  - title: Projet fil rouge
    details: TaskFlow — une app Next.js 15 construite progressivement tout au long du cours.
---

## Structure du cours

| # | Chapitre | Thèmes |
|---|----------|--------|
| 0 | [Transition vers React](/cours/00-de-vue-angular-a-react/01-react-mental-model) | Mental model, équivalences Vue/Angular/React |
| 1 | [Composants & JSX](/cours/01-composants-jsx/01-jsx-en-profondeur) | JSX, props, composition, rendu conditionnel |
| 2 | [Hooks fondamentaux](/cours/02-hooks-fondamentaux/01-usestate) | useState, useEffect, useRef, useMemo, custom hooks |
| 3 | [State Management](/cours/03-state-management/01-context-api) | Context, Zustand, Redux Toolkit, TanStack Query |
| 4 | [Routing](/cours/04-routing/01-react-router-basique) | React Router 7, loaders, protection, lazy loading |
| 5 | [Formulaires](/cours/05-formulaires/01-controlled-vs-uncontrolled) | Controlled, React Hook Form, Zod, patterns avancés |
| 6 | [Next.js 15](/cours/06-nextjs/01-nextjs-fondamentaux) | App Router, Server Components, data fetching, Server Actions |
| 7 | [Tests](/cours/07-tests/02-tests-composants-rtl) | Vitest, React Testing Library, MSW |
| 8 | [Performance & Patterns](/cours/08-performance-patterns/01-performance-react) | Memoization, composition, Error Boundaries, React 19 |
| 9 | [A11y & Styling](/cours/09-accessibilite/01-fondamentaux-wcag-react) | WCAG, ARIA, Tailwind CSS, CSS Modules |
| 10+ | [Production](/cours/10-auth-securite/01-auth-nextauth) | Auth, CI/CD, patterns ESN, entretien technique |

## Démarrage rapide

```bash
pnpm install
pnpm docs:dev
```

Ouvre [http://localhost:5170](http://localhost:5170)

**Prérequis** : avoir complété les formations Vue 3 (`01-vue`) et Angular (`02-angular`)
