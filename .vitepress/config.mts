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

  themeConfig: {
    nav: [
      { text: 'Cours', link: '/cours/00-de-vue-angular-a-react/01-react-mental-model' },
      { text: 'Exercices', link: '/exercices/01-premier-composant/README' },
      { text: 'Quizzes', link: '/quizzes/' },
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
          text: 'Phase 3 — State Management',
          items: [
            { text: 'Context API', link: '/cours/03-state-management/01-context-api' },
            { text: 'Zustand', link: '/cours/03-state-management/02-zustand' },
            { text: 'Redux Toolkit', link: '/cours/03-state-management/03-redux-toolkit' },
            { text: 'TanStack Query', link: '/cours/03-state-management/04-tanstack-query' }
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
        }
      ],
      '/exercices/': [
        {
          text: 'Exercices pratiques',
          items: [
            { text: '01 — Premier composant', link: '/exercices/01-premier-composant/README' },
            { text: '02 — Compteur avec hooks', link: '/exercices/02-compteur-hooks/README' },
            { text: '03 — Liste de tâches', link: '/exercices/03-liste-de-taches/README' },
            { text: '04 — Catalogue produits', link: '/exercices/04-catalogue-produits/README' },
            { text: '05 — Chronomètre', link: '/exercices/05-chronometre/README' },
            { text: '06 — Hooks avancés', link: '/exercices/06-hooks-avances/README' },
            { text: '07 — Custom hooks', link: '/exercices/07-custom-hooks/README' },
            { text: '08 — Context theme', link: '/exercices/08-context-theme/README' },
            { text: '09 — Zustand store', link: '/exercices/09-zustand-store/README' },
            { text: '10 — React Query', link: '/exercices/10-react-query/README' },
            { text: '11 — Routing multi-pages', link: '/exercices/11-routing-multi-pages/README' },
            { text: '12 — Formulaire RHF', link: '/exercices/12-formulaire-rhf/README' },
            { text: '13 — Formulaire multi-étapes', link: '/exercices/13-formulaire-multi-etapes/README' },
            { text: '14 — Next.js blog', link: '/exercices/14-nextjs-blog/README' },
            { text: '15 — Server Components', link: '/exercices/15-server-components/README' },
            { text: '16 — API Routes', link: '/exercices/16-api-routes/README' },
            { text: '17 — Tests composants', link: '/exercices/17-tests-composants/README' },
            { text: '18 — Tests intégration', link: '/exercices/18-tests-integration/README' },
            { text: '20 — Performance audit', link: '/exercices/20-performance-audit/README' },
            { text: '21 — Composition patterns', link: '/exercices/21-composition-patterns/README' },
            { text: '22 — Tailwind dashboard', link: '/exercices/22-tailwind-dashboard/README' },
            { text: '23 — Auth NextAuth', link: '/exercices/23-auth-nextauth/README' },
            { text: '25 — Entretien React', link: '/exercices/25-entretien-react/README' }
          ]
        }
      ],
      '/quizzes/': [
        {
          text: 'Quizzes',
          items: [
            { text: 'Quiz 09 — Accessibilité', link: '/quizzes/quiz-09-accessibilite.html' },
            { text: 'Quiz 10 — React 19', link: '/quizzes/quiz-10-react19.html' }
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
