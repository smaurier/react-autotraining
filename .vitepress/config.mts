import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'React Course',
  description: 'Formation React 19 + Next.js 15 : de Vue/Angular vers React staffable ESN',
  lang: 'fr-FR',
  srcDir: '.',

  vite: {
    server: {
      port: 5170,
      strictPort: false
    }
  },

  ignoreDeadLinks: true,

  // Refonte v1 : le cours vit dans `modules/` + `labs/`. L'ancien `cours/` (archive/source
  // d'audit) contient du JSX React que le compilateur Vue de VitePress ne peut pas parser
  // → exclu du build (conservé sur disque comme archive git). Nav basculée sur modules/ à la fin.
  srcExclude: ['cours/**', 'quizzes/**'],

  // Docs statiques : neutralise l'interpolation Vue `{{ }}` (délimiteurs improbables) pour que
  // les moustaches en prose et les expressions `${{ }}` (GitHub Actions) ne cassent pas le SSR.
  // NB : override `delimiters` retiré (il cassait le {{ }} du thème par défaut).
  // cf docs/curriculum/DETTE-vitepress-delimiters.md


  themeConfig: {
    nav: [
      { text: 'Cours', link: '/cours/00-de-vue-angular-a-react/01-react-mental-model' },
      { text: 'Exercices', link: '/exercices/01-premier-composant/ENONCE' },
      { text: 'Quizzes', link: '/quizzes/quiz-00-01-react-mental-model' },
      { text: 'Projet fil rouge', link: '/projet-fil-rouge/README' }
    ],

    sidebar: {
      '/cours/': [
        {
          text: 'Phase 0 — Transition vers React',
          items: [
            { text: 'React Mental Model', link: '/cours/00-de-vue-angular-a-react/01-react-mental-model' },
            { text: 'Equivalences triple (Vue/Angular/React)', link: '/cours/00-de-vue-angular-a-react/02-equivalences-triple' },
            { text: 'Premier projet React', link: '/cours/00-de-vue-angular-a-react/03-premier-projet-react' },
            { text: 'Pièges fréquents', link: '/cours/00-pieges-frequents' },
            { text: 'Parcours recommandé', link: '/cours/parcours' }
          ]
        },
        {
          text: 'Phase 1 — Composants & JSX',
          items: [
            { text: 'JSX en profondeur', link: '/cours/01-composants-jsx/01-jsx-en-profondeur' },
            { text: 'Props & Children', link: '/cours/01-composants-jsx/02-props-et-children' },
            { text: 'Composants & Composition', link: '/cours/01-composants-jsx/03-composants-et-composition' },
            { text: 'Rendu conditionnel & Listes', link: '/cours/01-composants-jsx/04-rendu-conditionnel-et-listes' },
            { text: 'Événements & Formulaires basiques', link: '/cours/01-composants-jsx/05-evenements-et-formulaires-basiques' }
          ]
        },
        {
          text: 'Phase 2 — Hooks fondamentaux',
          items: [
            { text: 'useState', link: '/cours/02-hooks-fondamentaux/01-usestate' },
            { text: 'useEffect', link: '/cours/02-hooks-fondamentaux/02-useeffect' },
            { text: 'useRef & DOM', link: '/cours/02-hooks-fondamentaux/03-useref-et-dom' },
            { text: 'useCallback & useMemo', link: '/cours/02-hooks-fondamentaux/04-usecallback-usememo' },
            { text: 'Custom Hooks', link: '/cours/02-hooks-fondamentaux/05-custom-hooks' }
          ]
        },
        {
          text: 'Phase 3 — State Management (client state)',
          items: [
            { text: 'useReducer', link: '/cours/03-state-management/00-usereducer' },
            { text: 'Context API', link: '/cours/03-state-management/01-context-api' },
            { text: 'Zustand', link: '/cours/03-state-management/02-zustand' },
            { text: 'Redux Toolkit', link: '/cours/03-state-management/03-redux-toolkit' }
          ]
        },
        {
          text: 'Phase 4 — Routing',
          items: [
            { text: 'React Router basique', link: '/cours/04-routing/01-react-router-basique' },
            { text: 'Paramètres & Loaders', link: '/cours/04-routing/02-parametres-et-loaders' },
            { text: 'Protection & Lazy loading', link: '/cours/04-routing/03-protection-et-lazy' }
          ]
        },
        {
          text: 'Phase 5 — Formulaires',
          items: [
            { text: 'Controlled vs Uncontrolled', link: '/cours/05-formulaires/01-controlled-vs-uncontrolled' },
            { text: 'React Hook Form', link: '/cours/05-formulaires/02-react-hook-form' },
            { text: 'Patterns formulaires avancés', link: '/cours/05-formulaires/03-patterns-formulaires-avances' }
          ]
        },
        {
          text: 'Phase 5b — Async State (server state)',
          items: [
            { text: 'TanStack Query', link: '/cours/05b-tanstack-query/01-tanstack-query' }
          ]
        },
        {
          text: 'Phase 6 — Next.js 15',
          items: [
            { text: 'Next.js fondamentaux', link: '/cours/06-nextjs/01-nextjs-fondamentaux' },
            { text: 'Server Components', link: '/cours/06-nextjs/02-server-components' },
            { text: 'Data Fetching', link: '/cours/06-nextjs/03-data-fetching' },
            { text: 'API Routes & Server Actions', link: '/cours/06-nextjs/04-api-routes-et-server-actions' },
            { text: 'Middleware & Config', link: '/cours/06-nextjs/05-middleware-et-config' }
          ]
        },
        {
          text: 'Phase 7 — Tests',
          items: [
            { text: 'Tests composants (RTL)', link: '/cours/07-tests/02-tests-composants-rtl' },
            { text: 'Tests API (MSW)', link: '/cours/07-tests/03-tests-api-msw' }
          ]
        },
        {
          text: 'Phase 8 — Performance & Patterns',
          items: [
            { text: 'Performance React', link: '/cours/08-performance-patterns/01-performance-react' },
            { text: 'Patterns composition', link: '/cours/08-performance-patterns/02-patterns-composition' },
            { text: 'Error Boundaries & Suspense', link: '/cours/08-performance-patterns/03-error-boundaries-suspense' },
            { text: 'React 19 nouveautés', link: '/cours/08-performance-patterns/04-react-19-nouveautes' }
          ]
        },
        {
          text: 'Phase 9 — Accessibilité & Styling',
          items: [
            { text: 'Fondamentaux WCAG React', link: '/cours/09-accessibilite/01-fondamentaux-wcag-react' },
            { text: 'ARIA patterns avancés', link: '/cours/09-accessibilite/02-aria-patterns-avances' },
            { text: 'Tailwind CSS', link: '/cours/09-styling/01-tailwind-css' },
            { text: 'CSS Modules & alternatives', link: '/cours/09-styling/02-css-modules-et-alternatives' }
          ]
        },
        {
          text: 'Phase 10+ — Production',
          items: [
            { text: 'Auth & Sécurité (NextAuth)', link: '/cours/10-auth-securite/01-auth-nextauth' },
            { text: 'Déploiement', link: '/cours/11-cicd-deploiement/02-deploiement' },
            { text: 'Patterns ESN', link: '/cours/12-recettes-esn/01-patterns-esn' },
            { text: 'Entretien technique', link: '/cours/12-recettes-esn/02-entretien-technique' }
          ]
        },
        {
          text: 'Phase 11 — Mobile (Capacitor)',
          items: [
            { text: 'Capacitor fondamentaux', link: '/cours/13-capacitor/01-capacitor-fondamentaux' },
            { text: 'Plugins avancés', link: '/cours/13-capacitor/02-capacitor-plugins-avances' }
          ]
        }
      ],
      '/exercices/': [
        {
          text: 'Exercices pratiques',
          items: [
            { text: '01 — Premier composant', link: '/exercices/01-premier-composant/ENONCE' },
            { text: '02 — Compteur avec hooks', link: '/exercices/02-compteur-hooks/ENONCE' },
            { text: '03 — Liste de tâches', link: '/exercices/03-liste-de-taches/ENONCE' },
            { text: '04 — Catalogue produits', link: '/exercices/04-catalogue-produits/ENONCE' },
            { text: '05 — Chronomètre', link: '/exercices/05-chronometre/ENONCE' },
            { text: '06 — Hooks avancés', link: '/exercices/06-hooks-avances/ENONCE' },
            { text: '07 — Custom hooks', link: '/exercices/07-custom-hooks/ENONCE' },
            { text: '08 — Context theme', link: '/exercices/08-context-theme/ENONCE' },
            { text: '09 — Zustand store', link: '/exercices/09-zustand-store/ENONCE' },
            { text: '10 — React Query', link: '/exercices/10-react-query/ENONCE' },
            { text: '11 — Routing multi-pages', link: '/exercices/11-routing-multi-pages/ENONCE' },
            { text: '12 — Formulaire RHF', link: '/exercices/12-formulaire-rhf/ENONCE' },
            { text: '13 — Formulaire multi-étapes', link: '/exercices/13-formulaire-multi-etapes/ENONCE' },
            { text: '14 — Next.js blog', link: '/exercices/14-nextjs-blog/ENONCE' },
            { text: '15 — Server Components', link: '/exercices/15-server-components/ENONCE' },
            { text: '16 — API Routes', link: '/exercices/16-api-routes/ENONCE' },
            { text: '16b — Middleware Next.js', link: '/exercices/16b-middleware-nextjs/ENONCE' },
            { text: '17 — Tests composants', link: '/exercices/17-tests-composants/ENONCE' },
            { text: '18 — Tests intégration', link: '/exercices/18-tests-integration/ENONCE' },
            { text: '19 — Tests E2E Playwright', link: '/exercices/19-tests-e2e/ENONCE' },
            { text: '20 — Performance audit', link: '/exercices/20-performance-audit/ENONCE' },
            { text: '21 — Composition patterns', link: '/exercices/21-composition-patterns/ENONCE' },
            { text: '22 — Tailwind dashboard', link: '/exercices/22-tailwind-dashboard/ENONCE' },
            { text: '23 — Auth NextAuth', link: '/exercices/23-auth-nextauth/ENONCE' },
            { text: '24 — Accessibilité', link: '/exercices/24-accessibilite/ENONCE' },
            { text: '25 — Entretien React', link: '/exercices/25-entretien-react/ENONCE' },
            { text: '26 — App mobile Capacitor', link: '/exercices/26-app-mobile-capacitor/ENONCE' }
          ]
        }
      ],
      '/quizzes/': [
        {
          text: 'Module 00 — Transition vers React',
          items: [
            { text: 'React Mental Model', link: '/quizzes/quiz-00-01-react-mental-model.html' },
            { text: 'Équivalences triple', link: '/quizzes/quiz-00-02-equivalences-triple.html' },
            { text: 'Premier projet React', link: '/quizzes/quiz-00-03-premier-projet-react.html' }
          ]
        },
        {
          text: 'Module 01 — Composants & JSX',
          items: [
            { text: 'JSX en profondeur', link: '/quizzes/quiz-01-01-jsx-en-profondeur.html' },
            { text: 'Props & Children', link: '/quizzes/quiz-01-02-props-et-children.html' },
            { text: 'Composants & Composition', link: '/quizzes/quiz-01-03-composants-et-composition.html' },
            { text: 'Rendu conditionnel & Listes', link: '/quizzes/quiz-01-04-rendu-conditionnel-et-listes.html' },
            { text: 'Événements & Formulaires', link: '/quizzes/quiz-01-05-evenements-et-formulaires.html' }
          ]
        },
        {
          text: 'Module 02 — Hooks fondamentaux',
          items: [
            { text: 'useState', link: '/quizzes/quiz-02-01-usestate.html' },
            { text: 'useEffect', link: '/quizzes/quiz-02-02-useeffect.html' },
            { text: 'useRef & DOM', link: '/quizzes/quiz-02-03-useref-et-dom.html' },
            { text: 'useCallback & useMemo', link: '/quizzes/quiz-02-04-usecallback-usememo.html' },
            { text: 'Custom Hooks', link: '/quizzes/quiz-02-05-custom-hooks.html' }
          ]
        },
        {
          text: 'Module 03 — State Management (client state)',
          items: [
            { text: 'Context API', link: '/quizzes/quiz-03-01-context-api.html' },
            { text: 'Zustand', link: '/quizzes/quiz-03-02-zustand.html' },
            { text: 'Redux Toolkit', link: '/quizzes/quiz-03-03-redux-toolkit.html' }
          ]
        },
        {
          text: 'Module 05b — Async State (server state)',
          items: [
            { text: 'TanStack Query', link: '/quizzes/quiz-03-04-tanstack-query.html' }
          ]
        },
        {
          text: 'Module 04 — Routing',
          items: [
            { text: 'React Router basique', link: '/quizzes/quiz-04-01-react-router-basique.html' },
            { text: 'Paramètres & Loaders', link: '/quizzes/quiz-04-02-parametres-et-loaders.html' },
            { text: 'Protection & Lazy', link: '/quizzes/quiz-04-03-protection-et-lazy.html' }
          ]
        },
        {
          text: 'Module 05 — Formulaires',
          items: [
            { text: 'Controlled vs Uncontrolled', link: '/quizzes/quiz-05-01-controlled-vs-uncontrolled.html' },
            { text: 'React Hook Form', link: '/quizzes/quiz-05-02-react-hook-form.html' },
            { text: 'Patterns formulaires avancés', link: '/quizzes/quiz-05-03-patterns-formulaires-avances.html' }
          ]
        },
        {
          text: 'Module 06 — Next.js 15',
          items: [
            { text: 'Next.js fondamentaux', link: '/quizzes/quiz-06-01-nextjs-fondamentaux.html' },
            { text: 'Server Components', link: '/quizzes/quiz-06-02-server-components.html' },
            { text: 'Data Fetching', link: '/quizzes/quiz-06-03-data-fetching.html' },
            { text: 'API Routes & Server Actions', link: '/quizzes/quiz-06-04-api-routes-server-actions.html' },
            { text: 'Middleware & Config', link: '/quizzes/quiz-06-05-middleware-et-config.html' }
          ]
        },
        {
          text: 'Module 07 — Tests',
          items: [
            { text: 'Tests composants (RTL)', link: '/quizzes/quiz-07-02-tests-composants-rtl.html' },
            { text: 'Tests API (MSW)', link: '/quizzes/quiz-07-03-tests-api-msw.html' }
          ]
        },
        {
          text: 'Module 08 — Performance & Patterns',
          items: [
            { text: 'Performance React', link: '/quizzes/quiz-08-01-performance-react.html' },
            { text: 'Patterns composition', link: '/quizzes/quiz-08-02-patterns-composition.html' },
            { text: 'Error Boundaries & Suspense', link: '/quizzes/quiz-08-03-error-boundaries-suspense.html' },
            { text: 'React 19 nouveautés', link: '/quizzes/quiz-10-react19.html' }
          ]
        },
        {
          text: 'Module 09 — Accessibilité & Styling',
          items: [
            { text: 'Fondamentaux WCAG React', link: '/quizzes/quiz-09-01-fondamentaux-wcag-react.html' },
            { text: 'ARIA patterns avancés', link: '/quizzes/quiz-09-02-aria-patterns-avances.html' },
            { text: 'Accessibilité (synthèse)', link: '/quizzes/quiz-09-accessibilite.html' },
            { text: 'Tailwind CSS', link: '/quizzes/quiz-09-styling-01-tailwind-css.html' },
            { text: 'CSS Modules', link: '/quizzes/quiz-09-styling-02-css-modules.html' }
          ]
        },
        {
          text: 'Module 10+ — Production',
          items: [
            { text: 'Auth NextAuth', link: '/quizzes/quiz-10-01-auth-nextauth.html' },
            { text: 'Déploiement', link: '/quizzes/quiz-11-02-deploiement.html' },
            { text: 'Patterns ESN', link: '/quizzes/quiz-12-01-patterns-esn.html' },
            { text: 'Entretien technique', link: '/quizzes/quiz-12-02-entretien-technique.html' }
          ]
        },
        {
          text: 'Module 13 — Capacitor',
          items: [
            { text: 'Capacitor fondamentaux', link: '/quizzes/quiz-13-01-capacitor-fondamentaux.html' },
            { text: 'Plugins avancés', link: '/quizzes/quiz-13-02-capacitor-plugins-avances.html' }
          ]
        }
      ]
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: 'Sur cette page'
    },

    docFooter: {
      prev: 'Précédent',
      next: 'Suivant'
    }
  }
})
