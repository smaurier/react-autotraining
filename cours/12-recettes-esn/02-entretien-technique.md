# Cours 43 — Entretien technique React : 30 questions et préparation

> **Objectif** : Se préparer aux entretiens techniques React en ESN en maîtrisant les 30 questions les plus fréquemment posées, réparties en trois niveaux (fondamentaux, intermédiaire, avancé). Disposer d'une checklist de préparation et d'un exercice de simulation d'entretien.

---

## Rappel du cours précédent

<details>
<summary>1. Qu'est-ce qu'une architecture feature-based ?</summary>

Chaque domaine métier (tasks, auth, invoices) a son propre dossier dans `features/` contenant ses composants, hooks, API et types. Les dépendances sont unidirectionnelles : une feature importe depuis `components/` et `lib/`, jamais depuis une autre feature. Les pages dans `app/` importent depuis les features.
</details>

<details>
<summary>2. Qu'est-ce qu'un conventional commit ?</summary>

Un message de commit structuré : `<type>(<scope>): <description>`. Les types principaux sont `feat` (nouvelle fonctionnalité), `fix` (correction), `refactor` (restructuration), `test`, `docs`, `chore` (maintenance). Cela permet la génération automatique de changelogs et une meilleure lisibilité de l'historique.
</details>

<details>
<summary>3. Comment fonctionne un barrel export ?</summary>

Un fichier `index.ts` à la racine de chaque feature qui ré-exporte les éléments publics. Cela permet des imports propres (`import { TaskList } from "@/features/tasks"`) au lieu d'imports dans les sous-dossiers. C'est l'API publique de la feature.
</details>

---

## Analogie

Un entretien technique, c'est comme un **oral d'examen** : on ne vous demande pas de réciter le cours par coeur, mais de **démontrer que vous comprenez les concepts** et que vous pouvez les appliquer. Les questions sont des **portes** : la première réponse montre que vous connaissez le sujet, et les questions de suivi vérifient la profondeur de votre compréhension. Le plus important n'est pas de tout savoir, mais de savoir **raisonner à voix haute** et dire "je ne sais pas, mais voici comment je chercherais".

---

## Théorie

### Groupe 1 — Fondamentaux (10 questions)

<details>
<summary><strong>Q1. Qu'est-ce que JSX et comment fonctionne-t-il ?</strong></summary>

JSX est une extension syntaxique de JavaScript qui permet d'écrire du markup dans le code. Ce n'est **pas** du HTML — c'est transformé par le compilateur en appels `React.createElement()` (ou `_jsx()`). Entre `{}`, on peut mettre toute **expression** JavaScript (ternaire, `.map()`, variable), mais pas de **statement** (`if`, `for`). Les attributs utilisent camelCase (`className` au lieu de `class`, `htmlFor` au lieu de `for`).
</details>

<details>
<summary><strong>Q2. Qu'est-ce que le Virtual DOM et pourquoi React l'utilise ?</strong></summary>

Le Virtual DOM est une représentation légère du DOM réel en mémoire (un arbre d'objets JavaScript). Quand le state change, React crée un nouveau Virtual DOM, le compare avec le précédent (processus de **reconciliation/diffing**), et n'applique au vrai DOM que les **changements minimaux** nécessaires. C'est plus performant que de manipuler le DOM directement pour chaque changement car les opérations DOM sont coûteuses.
</details>

<details>
<summary><strong>Q3. Quelles sont les règles des hooks ?</strong></summary>

Deux règles absolues : (1) **Appeler les hooks uniquement au top level** — jamais dans une condition, boucle ou fonction imbriquée. React s'appuie sur l'ordre d'appel des hooks entre les rendus. (2) **Appeler les hooks uniquement dans des composants fonctionnels ou des custom hooks** — jamais dans des fonctions JavaScript classiques. Le plugin ESLint `eslint-plugin-react-hooks` vérifie ces règles automatiquement.
</details>

<details>
<summary><strong>Q4. Quelle est la différence entre un composant contrôlé et non contrôlé ?</strong></summary>

Un composant **contrôlé** a sa valeur gérée par le state React (`value={state}` + `onChange`). React est la "source de vérité". Un composant **non contrôlé** laisse le DOM gérer sa propre valeur, accessible via `useRef`. En pratique, les composants contrôlés sont préférés pour la validation en temps réel et les formulaires complexes. `React Hook Form` utilise des composants non contrôlés par défaut pour des raisons de performance.
</details>

<details>
<summary><strong>Q5. Pourquoi la prop key est-elle importante dans les listes ?</strong></summary>

`key` permet à React d'identifier chaque élément de manière unique lors de la reconciliation. Sans `key` stable, React ne peut pas savoir quel élément a été ajouté, supprimé ou déplacé — il recrée tous les noeuds DOM. La `key` doit être un identifiant **unique et stable** (ID de base de données, UUID), jamais l'index du tableau (sauf si la liste ne change jamais d'ordre).
</details>

<details>
<summary><strong>Q6. Quelle est la différence entre useState et useRef ?</strong></summary>

`useState` stocke une valeur qui, quand elle change, **déclenche un re-rendu** du composant. `useRef` stocke une valeur mutable qui persiste entre les rendus **sans déclencher de re-rendu**. `useRef` est utilisé pour : accéder au DOM (`ref={monRef}`), stocker des valeurs de timer, garder une valeur précédente, stocker des instances mutables.
</details>

<details>
<summary><strong>Q7. Comment fonctionne le cleanup de useEffect ?</strong></summary>

La fonction retournée par `useEffect` est appelée : (1) **avant** la prochaine exécution de l'effet (si les dépendances changent), (2) quand le composant est **démonté**. C'est essentiel pour éviter les fuites mémoire : désabonnement d'événements (`removeEventListener`), annulation de timers (`clearInterval`), annulation de requêtes (`AbortController`).

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal });
  return () => controller.abort(); // Cleanup
}, [url]);
```
</details>

<details>
<summary><strong>Q8. Qu'est-ce que la prop children et à quoi sert-elle ?</strong></summary>

`children` est une prop spéciale qui contient tout le JSX placé entre les balises ouvrante et fermante d'un composant. C'est l'équivalent React des `<slot>` Vue / `<ng-content>` Angular. Son type est `React.ReactNode`. Elle permet la **composition** : un composant wrapper (`<Card>`, `<Layout>`, `<Modal>`) peut encapsuler n'importe quel contenu sans le connaître à l'avance.
</details>

<details>
<summary><strong>Q9. Que fait React.memo et quand l'utiliser ?</strong></summary>

`React.memo()` est un HOC qui empêche le re-rendu d'un composant si ses props n'ont pas changé (comparaison superficielle). A utiliser quand : le composant est coûteux à rendre, il reçoit les mêmes props fréquemment, et il est rendu souvent à cause d'un parent qui change. A **ne pas** utiliser systématiquement — le surcoût de la comparaison des props peut dépasser le gain si le composant est simple.
</details>

<details>
<summary><strong>Q10. A quoi sert le Strict Mode de React ?</strong></summary>

`<React.StrictMode>` est un outil de développement qui : (1) **exécute les effets deux fois** pour détecter les effets mal nettoyés (cleanup manquant), (2) re-rend les composants deux fois pour détecter les rendus impurs, (3) signale les API dépréciées. Il n'a **aucun impact en production** — les double-exécutions n'existent qu'en dev.
</details>

### Groupe 2 — Intermédiaire (10 questions)

<details>
<summary><strong>Q11. Comment créer et utiliser un custom hook ?</strong></summary>

Un custom hook est une fonction qui commence par `use` et utilise d'autres hooks. Il permet d'extraire et réutiliser de la logique stateful entre composants :

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

Le hook partage la **logique**, pas le state — chaque composant qui utilise le hook a sa propre instance de state.
</details>

<details>
<summary><strong>Q12. Context API vs Zustand : quand utiliser quoi ?</strong></summary>

**Context API** : state peu fréquemment mis à jour et partagé dans l'arbre (thème, langue, utilisateur authentifié). Problème : chaque changement de contexte re-rend **tous** les composants abonnés. **Zustand** : state fréquemment mis à jour, sélecteurs fins (un composant ne re-rend que si la partie du state qu'il lit change), state partagé entre composants distants. Règle : Context pour le "rare et global", Zustand pour le "fréquent et complexe".
</details>

<details>
<summary><strong>Q13. Qu'est-ce que React Query (TanStack Query) et pourquoi l'utiliser ?</strong></summary>

React Query gère le **server state** : les données qui vivent sur le serveur (contrairement au client state comme un formulaire). Il fournit : le caching automatique, la déduplication des requêtes, la revalidation en arrière-plan, les mutations optimistes, les états loading/error/success, et la pagination/infinite scroll. Il remplace les patterns `useEffect` + `useState` + `isLoading` + `error` manuels.
</details>

<details>
<summary><strong>Q14. Quelle est la différence entre useCallback et useMemo ?</strong></summary>

`useMemo(() => computeValue(), [deps])` mémorise le **résultat** d'un calcul. `useCallback(fn, [deps])` mémorise la **référence de la fonction** elle-même. `useCallback(fn, deps)` est strictement équivalent à `useMemo(() => fn, deps)`. Les deux sont utiles pour éviter des re-rendus quand la valeur/fonction est passée en prop à un composant `memo`, ou comme dépendance d'un `useEffect`.
</details>

<details>
<summary><strong>Q15. Que sont les Server Components et pourquoi sont-ils importants ?</strong></summary>

Les React Server Components (RSC) s'exécutent **uniquement sur le serveur**. Ils ne sont jamais envoyés au client sous forme de JavaScript — seul le HTML/RSC payload est envoyé. Avantages : accès direct à la base de données, zéro impact sur la taille du bundle client, pas d'hydratation nécessaire. En Next.js 15, les composants sont Server Components par défaut. On ajoute `"use client"` uniquement pour les composants qui ont besoin d'interactivité (hooks, événements, browser APIs).
</details>

<details>
<summary><strong>Q16. Comment fonctionne Suspense ?</strong></summary>

`Suspense` affiche un fallback pendant qu'un composant enfant "suspend" (attend quelque chose). Il fonctionne avec : `React.lazy()` (code splitting), React Query (`useSuspenseQuery`), et les Server Components async de Next.js. L'ErrorBoundary doit envelopper le Suspense pour gérer les erreurs : `ErrorBoundary > Suspense > DataComponent`.
</details>

<details>
<summary><strong>Q17. Qu'est-ce qu'un Error Boundary ?</strong></summary>

Un Error Boundary est un composant qui capture les erreurs de rendu JavaScript dans son arbre enfant et affiche un fallback au lieu de planter toute l'application. C'est la **seule raison** d'écrire une class component en React moderne (car `getDerivedStateFromError` et `componentDidCatch` n'existent que dans les classes). En pratique, on utilise la bibliothèque `react-error-boundary` qui fournit un wrapper fonctionnel.
</details>

<details>
<summary><strong>Q18. Quelles bibliothèques de formulaires utiliser en React ?</strong></summary>

**React Hook Form** : la plus populaire, performante (non contrôlée par défaut), avec validation via **Zod** (schémas TypeScript-first). Formik existe mais est moins maintenu. Pour les formulaires simples (1-3 champs), du `useState` basique suffit. Pour les formulaires Next.js avec Server Actions, `useActionState` est une option native.
</details>

<details>
<summary><strong>Q19. CSS-in-JS vs Tailwind CSS : quels sont les trade-offs ?</strong></summary>

**CSS-in-JS** (styled-components, Emotion) : styles colocalisés avec le composant, thème dynamique en JS, mais runtime overhead et incompatibilité avec les Server Components. **Tailwind** : utility classes, zero runtime, purge automatique, cohérence design, mais lisibilité JSX réduite avec les longues chaînes de classes. En 2025, Tailwind est le standard pour les nouveaux projets React/Next.js. CSS-in-JS est réservé aux projets legacy.
</details>

<details>
<summary><strong>Q20. Quelle est la stratégie de test recommandée en React ?</strong></summary>

La pyramide de tests : (1) **Tests unitaires** (Vitest) : hooks, utilitaires, logique pure — rapides, nombreux. (2) **Tests d'intégration** (React Testing Library + MSW) : composants avec interactions et données mockées — le meilleur rapport coût/valeur. (3) **Tests E2E** (Playwright) : parcours utilisateur critiques — lents, peu nombreux. Principe : tester le **comportement** (ce que l'utilisateur voit), pas l'**implémentation** (le state interne).
</details>

### Groupe 3 — Avancé (10 questions)

<details>
<summary><strong>Q21. Qu'est-ce que React Fiber ?</strong></summary>

React Fiber est le moteur de reconciliation réécrit dans React 16. Il représente chaque élément de l'arbre UI comme une "fiber" (unité de travail). L'avantage principal : le rendu peut être **interrompu et repris** (rendu incrémental), permettant à React de prioriser les mises à jour urgentes (input utilisateur) par rapport aux mises à jour moins prioritaires (mise à jour d'une liste). C'est la base des fonctionnalités concurrentes.
</details>

<details>
<summary><strong>Q22. Que sont les fonctionnalités concurrentes de React ?</strong></summary>

Les concurrent features permettent à React de préparer plusieurs versions de l'UI en même temps et de les afficher de manière fluide. `useTransition` marque une mise à jour comme non urgente (la UI reste réactive pendant le calcul). `useDeferredValue` retourne une version "en retard" d'une valeur pour éviter de bloquer les interactions. `Suspense` affiche un fallback pendant les opérations lentes. Ces features sont opt-in et s'activent automatiquement dans React 18+.
</details>

<details>
<summary><strong>Q23. Qu'est-ce que l'hydratation et quels problèmes peut-elle causer ?</strong></summary>

L'hydratation est le processus où React "attache" les event listeners au HTML rendu côté serveur. React compare le HTML du serveur avec ce qu'il rendrait côté client — si les deux ne correspondent pas, c'est un **hydration mismatch** (warning en dev, comportement imprévisible en prod). Causes fréquentes : `Date.now()`, `Math.random()`, `window.innerWidth` dans le rendu initial. Solution : utiliser `useEffect` pour les valeurs qui diffèrent entre serveur et client.
</details>

<details>
<summary><strong>Q24. Comment fonctionne le streaming SSR ?</strong></summary>

Le streaming SSR permet d'envoyer le HTML au navigateur **progressivement** au lieu d'attendre que toute la page soit rendue. Next.js utilise le streaming par défaut avec les Server Components. Les composants enveloppés dans `<Suspense>` envoient d'abord le fallback, puis le contenu réel est streamé quand il est prêt. Le navigateur remplace le fallback sans rechargement. Cela améliore le TTFB (Time to First Byte) et le LCP (Largest Contentful Paint).
</details>

<details>
<summary><strong>Q25. Qu'est-ce que le React Compiler et que change-t-il ?</strong></summary>

Le React Compiler (anciennement React Forget) est un compilateur qui mémorise automatiquement les composants et les valeurs. Il élimine le besoin d'écrire `useMemo`, `useCallback` et `React.memo` manuellement. Le compilateur analyse le code au build time et ajoute la mémorisation où c'est bénéfique. Disponible en expérimental dans React 19, il sera le standard dans les futures versions. Il ne change pas l'API — le code existant continue de fonctionner.
</details>

<details>
<summary><strong>Q26. Comment diagnostiquer les problèmes de performance en React ?</strong></summary>

(1) **React DevTools Profiler** : enregistrer les rendus, identifier les composants lents et les re-rendus inutiles dans le flamegraph. (2) **React DevTools "Highlight updates"** : visualiser en temps réel quels composants re-rendent. (3) **Performance tab du navigateur** : analyser le main thread, identifier les long tasks (> 50ms). (4) **Web Vitals** : mesurer LCP, FID/INP, CLS en production. (5) **Lighthouse** : audit automatisé. La règle : **mesurer avant d'optimiser**.
</details>

<details>
<summary><strong>Q27. Qu'est-ce qu'une state machine et quand l'utiliser en React ?</strong></summary>

Une state machine est un modèle qui définit des **états finis** et les **transitions** autorisées entre eux. En React, elle remplace les multiples `useState` booléens (`isLoading`, `isError`, `isSuccess`) par un état unique avec des transitions explicites. Bibliothèque : **XState** (ou `useReducer` pour les cas simples). A utiliser pour : les workflows complexes (panier d'achat, formulaire multi-étapes, processus d'onboarding), les UI avec de nombreux états interdépendants.
</details>

<details>
<summary><strong>Q28. Qu'est-ce qu'une architecture micro-frontends ?</strong></summary>

Les micro-frontends découpent une application frontend en sous-applications indépendantes, chacune développée et déployée par une équipe différente. Technologies : Module Federation (Webpack/Rspack), import maps, ou iframes. En React, chaque micro-frontend est une application React indépendante composée dans un shell. A utiliser uniquement pour les très grandes organisations (> 5 équipes frontend). Pour la plupart des projets ESN, un monorepo avec des packages partagés est plus adapté.
</details>

<details>
<summary><strong>Q29. Qu'est-ce qu'un monorepo et quels outils utiliser ?</strong></summary>

Un monorepo contient plusieurs packages/applications dans un seul dépôt Git. Avantages : partage de code, refactoring atomique, CI unifiée. Outils : **Turborepo** (Vercel, rapide, simple), **Nx** (plus complet, plugins), **pnpm workspaces** (base pour les deux). Structure typique : `apps/` (applications) + `packages/` (bibliothèques partagées : UI, config ESLint, config TypeScript).
</details>

<details>
<summary><strong>Q30. Comment prenez-vous une décision d'architecture sur un projet React ?</strong></summary>

Processus de décision : (1) **Comprendre les contraintes** : taille d'équipe, durée du projet, besoins SSR/SEO, performances requises. (2) **Choisir le framework** : Next.js pour SSR/SEO, Vite + React pour SPA pure. (3) **State management** : useState/Context pour petit projet, Zustand pour moyen, React Query pour server state. (4) **Styling** : Tailwind + shadcn/ui (standard ESN). (5) **Testing** : Vitest + RTL + Playwright. (6) **Documenter les décisions** avec des ADR (Architecture Decision Records). La meilleure architecture est celle que toute l'équipe comprend et peut maintenir.
</details>

---

## Checklist "Je suis prêt pour une mission React"

| Catégorie | Compétence | Maîtrisé |
|-----------|-----------|----------|
| **Fondamentaux** | JSX, composants, props, children | [ ] |
| **Fondamentaux** | useState, useEffect, useRef | [ ] |
| **Fondamentaux** | Rendu conditionnel, listes, key | [ ] |
| **Fondamentaux** | Événements, formulaires contrôlés | [ ] |
| **Hooks** | Custom hooks | [ ] |
| **Hooks** | useMemo, useCallback, React.memo | [ ] |
| **State** | Context API (thème, auth) | [ ] |
| **State** | Zustand (store externe) | [ ] |
| **State** | React Query (server state) | [ ] |
| **Next.js** | App Router, Server/Client Components | [ ] |
| **Next.js** | Data fetching, Server Actions | [ ] |
| **Next.js** | Middleware, API Routes | [ ] |
| **Styling** | Tailwind CSS + cn() | [ ] |
| **Styling** | shadcn/ui composants | [ ] |
| **Tests** | Vitest + React Testing Library | [ ] |
| **Tests** | MSW pour les mocks API | [ ] |
| **Auth** | Auth.js (NextAuth v5) | [ ] |
| **Sécurité** | XSS, CSRF, CSP, env vars | [ ] |
| **CI/CD** | GitHub Actions pipeline | [ ] |
| **Déploiement** | Vercel ou Docker | [ ] |
| **Architecture** | Feature-based structure | [ ] |
| **Git** | Conventional commits, PRs | [ ] |
| **TypeScript** | Typage strict, generics de base | [ ] |
| **Outils** | React DevTools, Profiler | [ ] |

---

## Pratique

### Exercice : simulation d'entretien (30 min)

Mettez un minuteur de 30 minutes. Pour chaque question ci-dessous, répondez **à voix haute** comme en entretien. Notez les questions où vous hésitez — ce sont vos points à retravailler.

**Round 1 — Échauffement (5 min)**
1. Qu'est-ce qui différencie React d'Angular et Vue ?
2. Expliquez le concept `UI = f(state)`
3. Comment fonctionne le rendu conditionnel en JSX ?

**Round 2 — Technique (15 min)**
4. Expliquez la différence entre Server Components et Client Components
5. Vous avez une liste de 1000 éléments qui re-rend à chaque frappe dans un champ de recherche. Comment optimiser ?
6. Un collègue propose d'utiliser Context pour stocker l'état d'un panier e-commerce mis à jour fréquemment. Que lui répondez-vous ?
7. Décrivez comment vous structureriez un projet Next.js pour une équipe de 4 développeurs
8. Comment testeriez-vous un composant qui appelle une API ?

**Round 3 — Mise en situation (10 min)**
9. On vous donne un projet React existant avec des problèmes de performance. Par où commencez-vous ?
10. Le client veut ajouter de l'authentification Google à l'application Next.js. Quelle solution proposez-vous et comment l'implémentez-vous ?

<details>
<summary>Voir les points clés des réponses</summary>

**R1** : React est une bibliothèque (pas un framework), unidirectionnel (`UI = f(state)`), JSX = JavaScript pur, écosystème à assembler. Angular est un framework complet avec DI, RxJS, CLI. Vue est entre les deux avec son système de réactivité.

**R5** : (1) `useMemo` pour le filtrage, (2) `React.memo` sur les items de la liste, (3) `useDebounce` sur la valeur de recherche, (4) virtualisation avec `@tanstack/react-virtual` si la liste est très grande. Mesurer avec le Profiler avant et après.

**R6** : Context provoque un re-rendu de tous les consumers à chaque changement. Un panier mis à jour fréquemment causerait des re-rendus en cascade. Recommander Zustand avec des sélecteurs fins : `const itemCount = useCartStore(s => s.items.length)` — seul le composant qui lit `itemCount` re-rend quand il change.

**R9** : (1) React DevTools Profiler → identifier les composants lents, (2) onglet Performance du navigateur → chercher les long tasks, (3) Lighthouse → Web Vitals, (4) corriger les re-rendus inutiles (`React.memo`, colocalisation du state), (5) vérifier le bundle size (`@next/bundle-analyzer`), (6) vérifier les images (Next.js Image), (7) mesurer après chaque correction.

**R10** : Auth.js (NextAuth v5) avec le provider Google. Configuration dans `auth.ts`, route handler dans `app/api/auth/[...nextauth]/route.ts`, middleware pour protéger les routes, `SessionProvider` dans le layout, `useSession` dans les composants client, `auth()` dans les Server Components.

</details>

---

## Résumé

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| Fondamentaux (Q1-10) | JSX, Virtual DOM, hooks rules, key, useState vs useRef, cleanup, children, memo, StrictMode |
| Intermédiaire (Q11-20) | Custom hooks, Context vs Zustand, React Query, Server Components, Suspense, Error Boundaries, testing |
| Avancé (Q21-30) | Fiber, concurrent features, hydratation, streaming SSR, React Compiler, state machines, monorepo |
| Simulation | Pratiquer à voix haute, noter les hésitations |
| Checklist | 24 compétences à maîtriser avant une mission |
| Conseil clé | Raisonner à voix haute > réciter des définitions |

---

> **Félicitations !** Vous avez terminé le parcours complet React 19 + Next.js 15. Retournez au [parcours](../parcours.md) pour vérifier votre tracker de révision et planifier vos révisions J+7 et J+30.
