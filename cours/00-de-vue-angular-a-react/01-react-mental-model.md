# Cours 01 — Modèle mental : React vs Vue vs Angular

<!-- nav-cours-précédent -->
> **Cours précédent** : [Angular](../../../09-angular/cours/12-recettes-esn/02-entretien-technique.md). Si tu arrives ici sans avoir fait les cours précédents, consulte le [guide de démarrage](../../../GUIDE-DEMARRAGE.md).


> **Module 00 — De Vue/Angular à React**
> Durée estimée : 45 min
> Prérequis : avoir terminé les formations Vue 3 et Angular 19+

> **Ressource transversale** : consulte [`00-pieges-frequents.md`](../00-pieges-frequents.md) régulièrement — il liste les pièges courants quand on vient de Vue/Angular vers React.

---

## Objectif

Comprendre la **philosophie** de React et en quoi elle diffère fondamentalement de Vue et Angular. Ce cours ne contient pas de code à exécuter : il pose le cadre mental avant de mettre les mains dans le code.

---

## 1. React = "just JavaScript"

### Ce que cela signifie

React est une **bibliothèque** (pas un framework) centrée sur le rendu d'interfaces utilisateur. Contrairement à Vue et Angular, React ne fournit pas :

- de langage de template (pas de `v-if`, pas de `@for`)
- de système d'injection de dépendances (pas de `provide`/`inject`, pas de DI Angular)
- de CLI opinionée (pas de `ng generate`, pas de structure de dossiers imposée)
- de module de routing intégré
- de gestion de formulaires intégrée
- de solution de state management intégrée

**Tout est du JavaScript (où TypeScript).** Les conditions sont des `if` ou des ternaires. Les boucles sont des `.map()`. Les composants sont des fonctions. Le style est au choix.

### Comparaison des philosophies

| Aspect | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Nature | Framework progressif | Framework complet | Bibliothèque UI |
| Approche | Convention + flexibilité | Convention + structure | Liberté + composition |
| Motto | "The Progressive Framework" | "The Platform" | "A library for building UIs" |
| Opinion | Moyenne | Forte | Faible |
| Courbe d'apprentissage | Douce | Raide | Douce puis profonde |

### Ce que cela implique pour toi

Venant de Vue et Angular, tu vas ressentir un manque de structure au début. C'est normal. React te donne des briques de base très solides et te laisse choisir comment les assembler. La contrepartie : il y a des dizaines de façons de faire la même chose, et la "bonne" façon dépend du contexte.

---

## 2. Flux de données unidirectionnel

### Le principe

En React, les données descendent du parent vers les enfants via les **props**. Les enfants communiquent avec le parent via des **callbacks** (fonctions passées en props).

```
     [App]
      |
   props ↓   callback ↑
      |
   [Child]
```

### Comparaison

| Pattern | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Parent -> Enfant | `defineProps()` | `input()` | `props` |
| Enfant -> Parent | `defineEmits()` | `output()` | Callback en prop |
| Bidirectionnel | `v-model` + `defineModel()` | `model()` | Controlled input (state + onChange) |

### Pourquoi c'est important

Le flux unidirectionnel rend le code **prévisible** : quand tu vois un composant, tu sais d'où viennent ses données (les props) et comment il communique (les callbacks). Il n'y a pas de "magie" bidirectionnelle cachée.

> **Analogie** : imagine un organigramme d'entreprise. Les directives descendent du haut vers le bas (props). Les rapports remontent de bas en haut (callbacks). Jamais un employé ne modifie directement le document du directeur.

---

## 3. JSX = JavaScript + HTML

### Qu'est-ce que JSX ?

JSX est une extension syntaxique de JavaScript qui permet d'écrire du markup dans le code. Ce **n'est pas** un langage de template : c'est du JavaScript déguisé en HTML.

```tsx
// Ce JSX...
const element = <h1 className="title">Bonjour {name}</h1>;

// ...est compilé en cet appel JavaScript :
const element = React.createElement('h1', { className: 'title' }, `Bonjour ${name}`);
```

### Comparaison des syntaxes de template

| Fonctionnalité | Vue template | Angular template | React JSX |
|---|---|---|---|
| Interpolation | `{{ value }}` | `{{ value }}` | `{value}` |
| Attribut dynamique | `:href="url"` | `[href]="url"` | `href={url}` |
| Condition | `v-if` / `v-else` | `@if` / `@else` | `{condition && <X />}` ou ternaire |
| Boucle | `v-for="item in items"` | `@for (item of items)` | `{items.map(item => <X />)}` |
| Événement | `@click="handler"` | `(click)="handler()"` | `onClick={handler}` |
| Classe CSS | `:class="{ active: isActive }"` | `[class.active]="isActive"` | `className={isActive ? 'active' : ''}` |
| Classe CSS (attribut) | `class` | `class` | `className` |
| Label (for) | `for` | `for` | `htmlFor` |

### L'avantage clé

Avec JSX, tu as toute la puissance de JavaScript à disposition. Pas besoin d'apprendre une syntaxe spéciale pour les conditions, les boucles ou la logique. Si tu sais écrire du JavaScript, tu sais écrire du JSX.

---

## 4. Hooks = la réactivité de React

### Le concept

Les **hooks** sont des fonctions qui permettent à un composant fonction d'avoir du state, des effets de bord, du contexte, etc. Ils remplacent les anciennes class components.

### Comparaison des systèmes de réactivité

| Concept | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Variable réactive | `ref()` | `signal()` | `useState()` |
| Valeur calculée | `computed()` | `computed()` | `useMemo()` |
| Effet de bord | `watchEffect()` | `effect()` | `useEffect()` |
| Granularité | Fine (proxy) | Fine (signal) | Composant entier (re-render) |
| Tracking | Automatique | Automatique | Manuel (tableau de dépendances) |

### La différence fondamentale

En Vue et Angular, la réactivité est **fine** : quand une `ref` ou un `signal` change, seuls les endroits qui le lisent sont mis à jour.

En React, quand un `useState` change, **tout le composant** est ré-exécuté (la fonction entière). React compare ensuite le résultat avec le DOM virtuel précédent et n'applique que les différences au vrai DOM.

> **Analogie** : Vue/Angular sont comme un système d'irrigation goutte à goutte (seul le plant qui a besoin d'eau la reçoit). React est comme un arrosage par aspersion (tout le jardin est arrosé, mais un filtre intelligent ne laisse passer l'eau que là où c'est nécessaire).

### Est-ce un problème de performance ?

Non, dans la grande majorité des cas. Le re-render d'un composant est extrêmement rapide (< 1ms). Le compilateur React 19 optimise automatiquement les cas courants. Tu n'auras besoin de `React.memo`, `useMemo` ou `useCallback` que dans des cas mesurés comme problématiques.

---

## 5. Écosystème : choisis tes outils

| Besoin | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Routing | Vue Router | Angular Router | React Router / TanStack Router |
| State management | Pinia | Services + Signals | Zustand / Jotai / Redux Toolkit |
| Formulaires | VeeValidate + Zod | Reactive Forms | React Hook Form + Zod |
| HTTP | ofetch / axios | HttpClient | fetch / axios / TanStack Query |
| SSR/SSG | Nuxt 3 | Angular SSR | Next.js 15 / Remix |
| Tests unitaires | Vitest | Vitest / Jest | Vitest |
| Tests composants | Vue Testing Library | Angular Testing Library | React Testing Library |
| Tests E2E | Playwright | Playwright | Playwright |
| Styling | Scoped CSS / UnoCSS | ViewEncapsulation / Tailwind | CSS Modules / Tailwind / styled |

### Le choix de cette formation

Dans ce parcours, nous utiliserons la stack suivante :

- **React 19** + **TypeScript**
- **Next.js 15** (App Router) pour le SSR et le routing
- **Zustand** pour le state management externe
- **React Hook Form** + **Zod** pour les formulaires
- **TanStack Query** pour le data fetching (côté client)
- **Vitest** + **React Testing Library** + **Playwright** pour les tests
- **Tailwind CSS** + **shadcn/ui** pour le styling

C'est la stack la plus répandue en ESN à ce jour.

---

## 6. Tableau récapitulatif : Vue vs Angular vs React

| Critère | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Rendu | VDOM + réactivité fine | Zoneless + Signals | VDOM + re-render composant |
| Composant | SFC `.vue` | Classe/standalone `.component.ts` | Fonction `.tsx` |
| Template | HTML-like avec directives | HTML-like avec `@`-syntax | JSX (JavaScript) |
| Réactivité | Proxy (`ref`, `reactive`) | Signals (`signal`, `computed`) | Hooks (`useState`, `useMemo`) |
| DI | `provide` / `inject` | Injector hiérarchique | `Context` / stores externes |
| CLI | `create-vue` (Vite) | `ng` (Webpack/esbuild) | `create-next-app` / Vite |
| Taille bundle | ~33 KB | ~90 KB | ~6 KB (React seul) |
| Part de marché | ~18% | ~17% | ~40% |
| Offres d'emploi FR | Bonne | Très bonne | Excellente |

---

## 7. Ce qui va te surprendre (et c'est normal)

Voici les points qui déroutent le plus les développeurs Vue/Angular arrivant sur React :

1. **Pas de two-way binding intégré** : tu gères `value` + `onChange` manuellement (où via React Hook Form).
2. **Les hooks ont des règles strictes** : toujours au top-level, toujours dans le même ordre.
3. **Le state est immutable** : jamais de mutation directe, toujours un nouveau objet/tableau.
4. **Pas de "computed" paresseux** : `useMemo` est un hint, pas une garantie (React peut le recalculer).
5. **useEffect =/= watchEffect** : les dépendances sont déclarées manuellement.
6. **Pas de scoped CSS natif** : il faut choisir CSS Modules, Tailwind ou une autre solution.
7. **La structure de projet est libre** : c'est à toi (où à Next.js) de l'organiser.

---

## À retenir

- React est une **bibliothèque**, pas un framework. Tu choisis chaque outil.
- Le flux de données est **unidirectionnel** : props vers le bas, callbacks vers le haut.
- JSX est du **JavaScript**, pas un langage de template.
- Les hooks sont le système de **réactivité** de React, avec un re-render de tout le composant.
- L'**immutabilité** du state est le contrat fondamental de React.

---

## Prochaine étape

Cours suivant : [02 — Table d'équivalences triple](./02-equivalences-triple.md)
