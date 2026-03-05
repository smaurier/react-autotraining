# Parcours React 19 + Next.js 15

> **Prérequis validés** : formation Vue 3 + formation Angular 19+.
> Tu connais déjà React à un niveau intermédiaire ; ce parcours te fait passer au niveau opérationnel ESN.

---

## Principes pédagogiques (sciences cognitives)

| Principe | Mise en pratique |
|---|---|
| **1 cours = 1 session** | Chaque fichier `.md` correspond à une seule session de travail (30-90 min). Ne pas en enchaîner plusieurs le même jour. |
| **24 h minimum entre deux cours** | Le sommeil consolide la mémoire. Laisse au moins une nuit entre deux sessions. |
| **Tenter avant de regarder la solution** | Chaque exercice comporte un énoncé séparé de la solution. Passe au moins 20 min à chercher seul avant de lire le corrigé. |
| **Révision espacée J+1 / J+7 / J+30** | Relis tes notes du cours à J+1, refais l'exercice à J+7, vérifie que tu sais encore expliquer le concept à J+30. |
| **Reformulation active** | Après chaque cours, écris 3 phrases résumant ce que tu as appris, avec tes propres mots. |
| **Analogies avec Vue/Angular** | Chaque concept est systématiquement mis en parallèle avec ce que tu connais déjà. |

---

## Vue d'ensemble des modules

| # | Module | Cours | Exercices | Durée estimée |
|---|---|---|---|---|
| 00 | De Vue/Angular à React | 3 | 1 | ~3 h |
| 01 | Composants & JSX | 5 | 4 | ~8 h |
| 02 | Hooks fondamentaux | 5 | 3 | ~8 h |
| 03 | State Management | 4 | 3 | ~6 h |
| 04 | Routing | 3 | 1 | ~4 h |
| 05 | Formulaires | 3 | 2 | ~5 h |
| 06 | Next.js App Router | 5 | 3 + 1 bonus | ~8 h |
| 07 | Tests | 2 | 2 | ~3 h |
| 08 | Performance & Patterns | 3 | 2 | ~5 h |
| 09 | Styling | 2 | 1 | ~3 h |
| 10 | Auth & Sécurité | 1 | 1 | ~2 h |
| 11 | CI/CD & Déploiement | 1 | 0 | ~2 h |
| 12 | Recettes ESN | 2 | 1 | ~3 h |
| | **Total** | **~41** | **~24** | **~60 h** |

---

## Détail par module

### Module 00 — De Vue/Angular à React (~3 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Modèle mental : React vs Vue vs Angular | `00-de-vue-angular-a-react/01-react-mental-model.md` |
| 02 | Table d'équivalences triple | `00-de-vue-angular-a-react/02-equivalences-triple.md` |
| 03 | Premier projet React (Vite + TS) | `00-de-vue-angular-a-react/03-premier-projet-react.md` |

Exercice : `exercices/00-premier-composant.md`

### Module 01 — Composants & JSX (~8 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Anatomie d'un composant React | `01-composants-jsx/01-anatomie-composant.md` |
| 02 | Props, children et typage TypeScript | `01-composants-jsx/02-props-children-typage.md` |
| 03 | Rendu conditionnel et listes | `01-composants-jsx/03-rendu-conditionnel-listes.md` |
| 04 | Événements et gestion du DOM | `01-composants-jsx/04-evenements-dom.md` |
| 05 | Composition vs héritage | `01-composants-jsx/05-composition-vs-heritage.md` |

Exercices : `exercices/01-card-component.md`, `exercices/01-liste-filtrable.md`, `exercices/01-composant-generique.md`, `exercices/01-layout-compose.md`

### Module 02 — Hooks fondamentaux (~8 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | useState en profondeur | `02-hooks-fondamentaux/01-usestate.md` |
| 02 | useEffect et le cycle de vie | `02-hooks-fondamentaux/02-useeffect.md` |
| 03 | useRef et accès au DOM | `02-hooks-fondamentaux/03-useref.md` |
| 04 | useMemo, useCallback et React.memo | `02-hooks-fondamentaux/04-usememo-usecallback.md` |
| 05 | Hooks personnalisés | `02-hooks-fondamentaux/05-hooks-personnalises.md` |

Exercices : `exercices/02-compteur-avance.md`, `exercices/02-hook-fetch.md`, `exercices/02-hook-localstorage.md`

### Module 03 — State Management (~6 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | useReducer et logique complexe | `03-state-management/01-usereducer.md` |
| 02 | Context API (thème, auth, i18n) | `03-state-management/02-context-api.md` |
| 03 | Zustand : store externe léger | `03-state-management/03-zustand.md` |
| 04 | Quand utiliser quoi (arbre de décision) | `03-state-management/04-quand-utiliser-quoi.md` |

Exercices : `exercices/03-todo-reducer.md`, `exercices/03-theme-context.md`, `exercices/03-store-zustand.md`

### Module 04 — Routing (~4 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | React Router v7 : bases | `04-routing/01-react-router-bases.md` |
| 02 | Routes imbriquées, layouts, loaders | `04-routing/02-routes-imbriquees.md` |
| 03 | Navigation programmatique et guards | `04-routing/03-navigation-guards.md` |

Exercice : `exercices/04-routing-app.md`

### Module 05 — Formulaires (~5 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Controlled vs uncontrolled | `05-formulaires/01-controlled-uncontrolled.md` |
| 02 | React Hook Form + Zod | `05-formulaires/02-react-hook-form-zod.md` |
| 03 | Formulaires complexes (multi-step, arrays) | `05-formulaires/03-formulaires-complexes.md` |

Exercices : `exercices/05-formulaire-inscription.md`, `exercices/05-formulaire-multi-etapes.md`

### Module 06 — Next.js App Router (~8 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Architecture App Router | `06-nextjs/01-app-router-architecture.md` |
| 02 | Server Components vs Client Components | `06-nextjs/02-server-vs-client.md` |
| 03 | Data fetching et Server Actions | `06-nextjs/03-data-fetching-actions.md` |
| 04 | Metadata, SEO et streaming | `06-nextjs/04-metadata-seo-streaming.md` |
| 05 | Middleware et API Routes | `06-nextjs/05-middleware-api-routes.md` |

Exercices : `exercices/06-page-dynamique.md`, `exercices/06-server-action-form.md`, `exercices/06-dashboard-streaming.md`, `exercices/06-bonus-fullstack.md`

### Module 07 — Tests (~3 h)

> *Prérequis Vue* : Vitest (describe/it/expect, mocking) et Playwright E2E sont acquis. On se concentre ici sur les spécificités React.

| Cours | Titre | Fichier |
|---|---|---|
| 02 | React Testing Library | `07-tests/02-react-testing-library.md` |
| 03 | Tests d'intégration et MSW | `07-tests/03-integration-msw.md` |

Exercices : `exercices/07-tests-composant.md`, `exercices/07-tests-hook.md`

### Module 08 — Performance & Patterns (~5 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Profiling et React DevTools | `08-performance-patterns/01-profiling-devtools.md` |
| 02 | Code splitting et lazy loading | `08-performance-patterns/02-code-splitting-lazy.md` |
| 03 | Patterns avancés (compound, render props, HOC) | `08-performance-patterns/03-patterns-avances.md` |

Exercices : `exercices/08-optimisation-liste.md`, `exercices/08-compound-component.md`

### Module 09 — Styling (~3 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | CSS Modules, Tailwind CSS | `09-styling/01-css-modules-tailwind.md` |
| 02 | Bibliothèques de composants (shadcn/ui) | `09-styling/02-shadcn-ui.md` |

Exercice : `exercices/09-design-system.md`

### Module 10 — Auth & Sécurité (~2 h)

> *Prérequis Vue* : JWT, OAuth, XSS, CSP et sécurité front sont acquis. On se concentre ici sur Auth.js v5 (NextAuth) pour Next.js.

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Auth avec NextAuth.js / Auth.js | `10-auth-securite/01-nextauth.md` |

Exercice : `exercices/10-auth-flow.md`

### Module 11 — CI/CD & Déploiement (~2 h)

> *Prérequis Vue* : GitHub Actions et les pipelines CI/CD sont acquis. On se concentre ici sur le déploiement Next.js (Vercel, Docker standalone, SSR).

| Cours | Titre | Fichier |
|---|---|---|
| 02 | Déploiement Vercel / Docker | `11-cicd-deploiement/02-deploiement.md` |

### Module 12 — Recettes ESN (~3 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Architecture projet client type | `12-recettes-esn/01-architecture-projet.md` |
| 02 | Checklist production et bonnes pratiques | `12-recettes-esn/02-checklist-production.md` |

Exercice : `exercices/12-audit-projet.md`

---

## Tracker de révision

Copie ce tableau et coche au fur et à mesure.

| Module | Cours | Date fait | Relecture J+1 | Exercice J+7 | Vérif. J+30 |
|---|---|---|---|---|---|
| 00 | 01 — Modèle mental | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 00 | 02 — Équivalences | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 00 | 03 — Premier projet | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 01 — Anatomie composant | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 02 — Props & typage | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 03 — Rendu conditionnel | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 04 — Événements | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 05 — Composition | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 01 — useState | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 02 — useEffect | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 03 — useRef | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 04 — useMemo/useCallback | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 05 — Hooks perso | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 03 | 01 — useReducer | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 03 | 02 — Context API | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 03 | 03 — Zustand | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 03 | 04 — Arbre de décision | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 04 | 01 — Router bases | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 04 | 02 — Routes imbriquées | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 04 | 03 — Navigation/guards | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 05 | 01 — Controlled/uncontrolled | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 05 | 02 — React Hook Form | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 05 | 03 — Formulaires complexes | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 01 — App Router | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 02 — Server/Client Comp. | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 03 — Data fetching | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 04 — Metadata/SEO | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 05 — Middleware/API | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 07 | 02 — Testing Library | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 07 | 03 — Intégration/MSW | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 08 | 01 — Profiling | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 08 | 02 — Code splitting | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 08 | 03 — Patterns avancés | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 09 | 01 — CSS Modules/Tailwind | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 09 | 02 — shadcn/ui | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 10 | 01 — NextAuth | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 11 | 02 — Déploiement | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 12 | 01 — Architecture projet | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 12 | 02 — Checklist prod | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |

---

## Conseils pour optimiser ton apprentissage

1. **Ne saute pas le module 00** : même si tu connais React, les équivalences Vue/Angular te donneront un cadre mental solide.
2. **Fais les exercices** : lire du code ne suffit pas. L'apprentissage actif est 3x plus efficace que la lecture passive.
3. **Utilise le fichier `00-pieges-frequents.md`** : c'est ta référence rapide. Relis-le une fois par semaine pendant le premier mois.
4. **Travaille sur le projet fil rouge** : à partir du module 03, commence à appliquer chaque concept dans le projet `taskflow`.
5. **Espace tes sessions** : mieux vaut 1 h par jour pendant 10 semaines que 10 h en un week-end.
