# Parcours React 19 + Next.js 15

> **Prérequis validés** : formation Vue 3 (00) + formation Angular 19+ (01).
> Tu connais la réactivité, les composants, la DI et RxJS ; ce parcours te fait passer au niveau opérationnel ESN sur le troisième framework front.
>
> **Ce cours se fait APRÈS Vue (00) et Angular (01).** Ce cours est le troisième framework dans l'ordre pédagogique. Si tu n'as pas fait 00-Vue et 01-Angular, commence par là.

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
| 03 | State Management (client) | 5 | 3 | ~7 h |
| 04 | Routing | 3 | 1 | ~4 h |
| 05 | Formulaires | 3 | 2 | ~5 h |
| 05b | Async State (TanStack Query) | 1 | 1 | ~2 h |
| 06 | Next.js App Router | 5 | 3 + 1 bonus | ~8 h |
| 07 | Tests | 2 | 2 | ~3 h |
| 08 | Performance & Patterns | 3 | 2 | ~5 h |
| 09a | Accessibilité | 2 | 1 | ~3 h |
| 09b | Styling | 2 | 1 | ~3 h |
| 10 | Auth & Sécurité | 1 | 1 | ~2 h |
| 11 | CI/CD & Déploiement | 1 | 0 | ~2 h |
| 12 | Recettes ESN | 2 | 1 | ~3 h |
| 13 | Mobile (Capacitor) | 2 | 1 | ~4 h |
| | **Total** | **~47** | **~28** | **~68 h** |

---

## Détail par module

### Module 00 — De Vue/Angular à React (~3 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Modèle mental : React vs Vue vs Angular | `00-de-vue-angular-a-react/01-react-mental-model.md` |
| 02 | Table d'équivalences triple | `00-de-vue-angular-a-react/02-equivalences-triple.md` |
| 03 | Premier projet React (Vite + TS) | `00-de-vue-angular-a-react/03-premier-projet-react.md` |

Exercice : `exercices/00-premier-composant.md`

Quizzes :
- `quizzes/quiz-00-01-react-mental-model.html`
- `quizzes/quiz-00-02-equivalences-triple.html`
- `quizzes/quiz-00-03-premier-projet-react.html`

### Module 01 — Composants & JSX (~8 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | JSX en profondeur | `01-composants-jsx/01-jsx-en-profondeur.md` |
| 02 | Props et children | `01-composants-jsx/02-props-et-children.md` |
| 03 | Composants et composition | `01-composants-jsx/03-composants-et-composition.md` |
| 04 | Rendu conditionnel et listes | `01-composants-jsx/04-rendu-conditionnel-et-listes.md` |
| 05 | Événements et formulaires basiques | `01-composants-jsx/05-evenements-et-formulaires-basiques.md` |

Exercices : `exercices/01-card-component.md`, `exercices/01-liste-filtrable.md`, `exercices/01-composant-generique.md`, `exercices/01-layout-compose.md`

Quizzes :
- `quizzes/quiz-01-01-jsx-en-profondeur.html`
- `quizzes/quiz-01-02-props-et-children.html`
- `quizzes/quiz-01-03-composants-et-composition.html`
- `quizzes/quiz-01-04-rendu-conditionnel-et-listes.html`
- `quizzes/quiz-01-05-evenements-et-formulaires.html`

### Module 02 — Hooks fondamentaux (~8 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | useState en profondeur | `02-hooks-fondamentaux/01-usestate.md` |
| 02 | useEffect et le cycle de vie | `02-hooks-fondamentaux/02-useeffect.md` |
| 03 | useRef et accès au DOM | `02-hooks-fondamentaux/03-useref-et-dom.md` |
| 04 | useCallback, useMemo et React.memo | `02-hooks-fondamentaux/04-usecallback-usememo.md` |
| 05 | Custom hooks | `02-hooks-fondamentaux/05-custom-hooks.md` |

Exercices : `exercices/02-compteur-avance.md`, `exercices/02-hook-fetch.md`, `exercices/02-hook-localstorage.md`

Quizzes :
- `quizzes/quiz-02-01-usestate.html`
- `quizzes/quiz-02-02-useeffect.html`
- `quizzes/quiz-02-03-useref-et-dom.html`
- `quizzes/quiz-02-04-usecallback-usememo.html`
- `quizzes/quiz-02-05-custom-hooks.html`

### Module 03 — State Management — client state (~7 h)

> ⚠️ Ce module couvre exclusivement le **client state** (données qui vivent dans l’app, pas sur un serveur). Pour les données serveur (fetch, cache, revalidation), voir le module 05b.

| Cours | Titre | Fichier |
|---|---|---|
| 00 | useReducer et logique de state complexe | `03-state-management/00-usereducer.md` |
| 01 | Context API (thème, auth, i18n) | `03-state-management/01-context-api.md` |
| 02 | Zustand : store externe léger | `03-state-management/02-zustand.md` |
| 03 | Redux Toolkit | `03-state-management/03-redux-toolkit.md` |
| — | Quand utiliser quoi ? (arbre de décision) | voir fin du cours `00-usereducer.md` |

Exercices : `exercices/03-todo-reducer.md`, `exercices/03-theme-context.md`, `exercices/03-store-zustand.md`

Quizzes :
- `quizzes/quiz-03-01-context-api.html`
- `quizzes/quiz-03-02-zustand.html`
- `quizzes/quiz-03-03-redux-toolkit.html`

### Module 05b — Async State : TanStack Query (~2 h)

> **Pourquoi ici et pas dans le module 03 ?** TanStack Query gère du **server state** (données qui vivent sur un serveur, qui périment, et qui doivent être sync’es). C’est une catégorie fondamentalement différente du client state de Zustand ou Context. Ce module se place après les formulaires car `useMutation` s’utilise souvent avec des formulaires de soumission.

| Cours | Titre | Fichier |
|---|---|---|
| 01 | TanStack Query : server state | `05b-tanstack-query/01-tanstack-query.md` |

Exercice : `exercices/10-react-query/ENONCE.md`

Quizzes :
- `quizzes/quiz-03-04-tanstack-query.html`

### Module 04 — Routing (~4 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | React Router v7 : bases | `04-routing/01-react-router-basique.md` |
| 02 | Paramètres et loaders | `04-routing/02-parametres-et-loaders.md` |
| 03 | Protection des routes et lazy loading | `04-routing/03-protection-et-lazy.md` |

Exercice : `exercices/04-routing-app.md`

Quizzes :
- `quizzes/quiz-04-01-react-router-basique.html`
- `quizzes/quiz-04-02-parametres-et-loaders.html`
- `quizzes/quiz-04-03-protection-et-lazy.html`

### Module 05 — Formulaires (~5 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Controlled vs uncontrolled | `05-formulaires/01-controlled-vs-uncontrolled.md` |
| 02 | React Hook Form + Zod | `05-formulaires/02-react-hook-form.md` |
| 03 | Patterns formulaires avancés | `05-formulaires/03-patterns-formulaires-avances.md` |

Exercices : `exercices/05-formulaire-inscription.md`, `exercices/05-formulaire-multi-etapes.md`

Quizzes :
- `quizzes/quiz-05-01-controlled-vs-uncontrolled.html`
- `quizzes/quiz-05-02-react-hook-form.html`
- `quizzes/quiz-05-03-patterns-formulaires-avances.html`

### Module 06 — Next.js App Router (~8 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Next.js fondamentaux | `06-nextjs/01-nextjs-fondamentaux.md` |
| 02 | Server Components vs Client Components | `06-nextjs/02-server-components.md` |
| 03 | Data fetching | `06-nextjs/03-data-fetching.md` |
| 04 | API routes et Server Actions | `06-nextjs/04-api-routes-et-server-actions.md` |
| 05 | Middleware et configuration | `06-nextjs/05-middleware-et-config.md` |

Exercices : `exercices/06-page-dynamique.md`, `exercices/06-server-action-form.md`, `exercices/06-dashboard-streaming.md`, `exercices/06-bonus-fullstack.md`

Quizzes :
- `quizzes/quiz-06-01-nextjs-fondamentaux.html`
- `quizzes/quiz-06-02-server-components.html`
- `quizzes/quiz-06-03-data-fetching.html`
- `quizzes/quiz-06-04-api-routes-server-actions.html`
- `quizzes/quiz-06-05-middleware-et-config.html`

### Module 07 — Tests (~3 h)

> *Prérequis Vue* : Vitest (describe/it/expect, mocking) et Playwright E2E sont acquis. On se concentre ici sur les spécificités React.

| Cours | Titre | Fichier |
|---|---|---|
| 02 | Tests de composants avec React Testing Library | `07-tests/02-tests-composants-rtl.md` |
| 03 | Tests d'intégration et MSW | `07-tests/03-tests-api-msw.md` |

Exercices : `exercices/07-tests-composant.md`, `exercices/07-tests-hook.md`

Quizzes :
- `quizzes/quiz-07-02-tests-composants-rtl.html`
- `quizzes/quiz-07-03-tests-api-msw.html`

### Module 08 — Performance & Patterns (~5 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Performance React | `08-performance-patterns/01-performance-react.md` |
| 02 | Patterns de composition | `08-performance-patterns/02-patterns-composition.md` |
| 03 | Error boundaries et Suspense | `08-performance-patterns/03-error-boundaries-suspense.md` |
| 04 | Nouveautés React 19 | `08-performance-patterns/04-react-19-nouveautes.md` |

Exercices : `exercices/08-optimisation-liste.md`, `exercices/08-compound-component.md`

Quizzes :
- `quizzes/quiz-08-01-performance-react.html`
- `quizzes/quiz-08-02-patterns-composition.html`
- `quizzes/quiz-08-03-error-boundaries-suspense.html`

### Module 09a — Accessibilité (~3 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Fondamentaux WCAG et React | `09-accessibilite/01-fondamentaux-wcag-react.md` |
| 02 | Patterns ARIA avancés | `09-accessibilite/02-aria-patterns-avances.md` |

Exercice : `exercices/24-accessibilite/ENONCE.md`

Quizzes :
- `quizzes/quiz-09-accessibilite.html`
- `quizzes/quiz-09-01-fondamentaux-wcag-react.html`
- `quizzes/quiz-09-02-aria-patterns-avances.html`

### Module 09b — Styling (~3 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Tailwind CSS | `09-styling/01-tailwind-css.md` |
| 02 | CSS Modules et alternatives | `09-styling/02-css-modules-et-alternatives.md` |

Exercice : `exercices/09-design-system.md`

Quizzes :
- `quizzes/quiz-09-styling-01-tailwind-css.html`
- `quizzes/quiz-09-styling-02-css-modules.html`

### Module 10 — Auth & Sécurité (~2 h)

> *Prérequis Vue* : JWT, OAuth, XSS, CSP et sécurité front sont acquis. On se concentre ici sur Auth.js v5 (NextAuth) pour Next.js.

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Auth avec NextAuth.js / Auth.js | `10-auth-securite/01-auth-nextauth.md` |

Exercice : `exercices/10-auth-flow.md`

Quizzes :
- `quizzes/quiz-10-01-auth-nextauth.html`
- `quizzes/quiz-10-react19.html`

### Module 11 — CI/CD & Déploiement (~2 h)

> *Prérequis Vue* : GitHub Actions et les pipelines CI/CD sont acquis. On se concentre ici sur le déploiement Next.js (Vercel, Docker standalone, SSR).

| Cours | Titre | Fichier |
|---|---|---|
| 02 | Déploiement Vercel / Docker | `11-cicd-deploiement/02-deploiement.md` |

Quizzes :
- `quizzes/quiz-11-02-deploiement.html`

### Module 12 — Recettes ESN (~3 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Patterns ESN | `12-recettes-esn/01-patterns-esn.md` |
| 02 | Entretien technique | `12-recettes-esn/02-entretien-technique.md` |

Exercice : `exercices/12-audit-projet.md`

Quizzes :
- `quizzes/quiz-12-01-patterns-esn.html`
- `quizzes/quiz-12-02-entretien-technique.html`

### Module 13 — Capacitor (~4 h)

| Cours | Titre | Fichier |
|---|---|---|
| 01 | Capacitor fondamentaux | `13-capacitor/01-capacitor-fondamentaux.md` |
| 02 | Plugins avancés | `13-capacitor/02-capacitor-plugins-avances.md` |

Exercice : déployer ton app React comme app mobile avec Capacitor

Quizzes :
- `quizzes/quiz-13-01-capacitor-fondamentaux.html`
- `quizzes/quiz-13-02-capacitor-plugins-avances.html`

---

## Tracker de révision

Copie ce tableau et coche au fur et à mesure.

| Module | Cours | Date fait | Relecture J+1 | Exercice J+7 | Vérif. J+30 |
|---|---|---|---|---|---|
| 00 | 01 — Modèle mental | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 00 | 02 — Équivalences | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 00 | 03 — Premier projet | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 01 — JSX en profondeur | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 02 — Props et children | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 03 — Composants et composition | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 04 — Rendu conditionnel et listes | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 01 | 05 — Événements et formulaires basiques | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 01 — useState | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 02 — useEffect | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 03 — useRef et DOM | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 04 — useCallback/useMemo | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 02 | 05 — Custom hooks | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 03 | 00 — useReducer | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 03 | 01 — Context API | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 03 | 02 — Zustand | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 03 | 03 — Redux Toolkit | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 04 | 01 — React Router bases | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 04 | 02 — Paramètres et loaders | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 04 | 03 — Protection et lazy loading | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 05 | 01 — Controlled vs uncontrolled | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 05 | 02 — React Hook Form | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 05 | 03 — Patterns formulaires avancés | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 05b | TanStack Query | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 01 — Next.js fondamentaux | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 02 — Server Components | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 03 — Data fetching | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 04 — API routes/Server Actions | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 06 | 05 — Middleware et config | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 07 | 02 — Tests composants RTL | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 07 | 03 — Tests API/MSW | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 08 | 01 — Performance React | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 08 | 02 — Patterns composition | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 08 | 03 — Error boundaries/Suspense | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 08 | 04 — Nouveautés React 19 | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 09a | 01 — Fondamentaux WCAG | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 09a | 02 — Patterns ARIA avancés | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 09b | 01 — Tailwind CSS | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 09b | 02 — CSS Modules et alternatives | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 10 | 01 — Auth NextAuth | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 11 | 02 — Déploiement | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 12 | 01 — Patterns ESN | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 12 | 02 — Entretien technique | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 13 | 01 — Capacitor fondamentaux | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |
| 13 | 02 — Plugins avancés | _ _ /_ _ /_ _ | [ ] | [ ] | [ ] |

---

## Conseils pour optimiser ton apprentissage

1. **Ne saute pas le module 00** : même si tu connais React, les équivalences Vue/Angular te donneront un cadre mental solide.
2. **Fais les exercices** : lire du code ne suffit pas. L'apprentissage actif est 3x plus efficace que la lecture passive.
3. **Utilise le fichier `00-pieges-frequents.md`** : c'est ta référence rapide. Relis-le une fois par semaine pendant le premier mois.
4. **Travaille sur le projet fil rouge** : à partir du module 03, commence à appliquer chaque concept dans le projet `taskflow`.
5. **Espace tes sessions** : mieux vaut 1 h par jour pendant 10 semaines que 10 h en un week-end.
