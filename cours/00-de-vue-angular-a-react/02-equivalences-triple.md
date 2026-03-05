# Cours 02 — Table d'équivalences triple : Vue / Angular / React

> **Module 00 — De Vue/Angular à React**
> Durée estimée : 60 min | Prérequis : Cours 01 — Modèle mental

---

## Objectif

Créer un pont entre ce que tu sais déjà (Vue 3, Angular 19+) et React 19. Pour chaque concept : le code dans les trois frameworks, côte à côte.

---

## 1. Variable réactive — ref / signal / useState

**Vue 3**
```vue
<script setup lang="ts">
const count = ref(0);
function increment() { count.value++; }
</script>
<template><button @click="increment">{{ count }}</button></template>
```

**Angular 19+**
```typescript
@Component({ template: `<button (click)="increment()">{{ count() }}</button>` })
export class CounterComponent {
  count = signal(0);
  increment() { this.count.update(c => c + 1); }
}
```

**React 19**
```tsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

> Vue : `count.value++` (proxy). Angular : `count.update()` (setter). React : `setCount()` (**immutable**). En React `count` est une **valeur**, pas un objet réactif.

---

## 2. Valeur calculée — computed / computed / useMemo

**Vue 3**
```ts
const price = ref(100), tax = ref(0.2);
const total = computed(() => price.value * (1 + tax.value));
```

**Angular 19+**
```ts
price = signal(100); tax = signal(0.2);
total = computed(() => this.price() * (1 + this.tax()));
```

**React 19**
```tsx
const [price] = useState(100), [tax] = useState(0.2);
const total = price * (1 + tax); // variable suffit
// Ou si coûteux : const total = useMemo(() => price * (1 + tax), [price, tax]);
```

> Vue/Angular : `computed` est lazy et mis en cache. React : `useMemo` est un hint. Pour un calcul simple, une variable suffit.

---

## 3. Effet de bord — watchEffect / effect / useEffect

**Vue 3**
```ts
const userId = ref(1);
watchEffect(() => { console.log(`Fetch user ${userId.value}`); });
```

**Angular 19+**
```ts
userId = signal(1);
constructor() { effect(() => { console.log(`Fetch user ${this.userId()}`); }); }
```

**React 19**
```tsx
const [userId, setUserId] = useState(1);
useEffect(() => { console.log(`Fetch user ${userId}`); }, [userId]);
```

> Vue/Angular : dépendances trackées **automatiquement**. React : déclarées **manuellement** dans `[userId]`. Le linter `eslint-plugin-react-hooks` t'y aide.

---

## 4. Props — defineProps / input / props

**Vue 3**
```vue
<script setup lang="ts">
const props = defineProps<{ title: string; count: number }>();
</script>
<template><h2>{{ title }} ({{ count }})</h2></template>
```

**Angular 19+**
```typescript
@Component({ template: `<h2>{{ title() }} ({{ count() }})</h2>` })
export class ChildComponent {
  title = input.required<string>();
  count = input.required<number>();
}
```

**React 19**
```tsx
interface Props { title: string; count: number; }
function Child({ title, count }: Props) {
  return <h2>{title} ({count})</h2>;
}
```

> React : les props sont les **paramètres de la fonction**. Pas de macro, pas de décorateur.

---

## 5. Événements — defineEmits / output / callback props

**Vue 3**
```vue
<script setup lang="ts">
const emit = defineEmits<{ (e: 'delete', id: number): void }>();
</script>
<template><button @click="emit('delete', 42)">Supprimer</button></template>
```

**Angular 19+**
```typescript
@Component({ template: `<button (click)="delete.emit(42)">Supprimer</button>` })
export class Child { delete = output<number>(); }
```

**React 19**
```tsx
function Child({ onDelete }: { onDelete: (id: number) => void }) {
  return <button onClick={() => onDelete(42)}>Supprimer</button>;
}
// Parent : <Child onDelete={handleDelete} />
```

> React : **pas d'événements custom**. On passe une fonction callback en prop. Convention : `onXxx`.

---

## 6. Binding bidirectionnel — v-model / ngModel / controlled input

**Vue 3**
```vue
<script setup lang="ts">const name = ref('');</script>
<template><input v-model="name" /> <p>Bonjour {{ name }}</p></template>
```

**Angular 19+**
```html
<input [(ngModel)]="name" /> <p>Bonjour {{ name }}</p>
```

**React 19**
```tsx
const [name, setName] = useState('');
return <>
  <input value={name} onChange={e => setName(e.target.value)} />
  <p>Bonjour {name}</p>
</>;
```

> React : **pas de two-way binding**. Tu gères `value` (lecture) et `onChange` (écriture) séparément.

---

## 7. Rendu conditionnel — v-if / @if / JSX

**Vue 3**
```html
<div v-if="isLoading">Chargement...</div>
<div v-else-if="error">Erreur : {{ error }}</div>
<div v-else>{{ data }}</div>
```

**Angular 19+**
```html
@if (isLoading()) { <div>Chargement...</div> }
@else if (error()) { <div>Erreur : {{ error() }}</div> }
@else { <div>{{ data() }}</div> }
```

**React 19**
```tsx
if (isLoading) return <div>Chargement...</div>;
if (error) return <div>Erreur : {error}</div>;
return <div>{data}</div>;
```

> React : du **JavaScript pur** -- `if/else`, ternaires, `&&`, early returns. Pas de directive.

---

## 8. Boucle de rendu — v-for / @for / .map()

**Vue 3**
```html
<li v-for="item in items" :key="item.id">{{ item.name }}</li>
```

**Angular 19+**
```html
@for (item of items(); track item.id) { <li>{{ item.name }}</li> }
```

**React 19**
```tsx
{items.map(item => <li key={item.id}>{item.name}</li>)}
```

> `key` (React) = `:key` (Vue) = `track` (Angular). En React c'est un `.map()` standard.

---

## 9. Injection / Contexte — provide-inject / DI / Context

**Vue 3**
```ts
// Parent
provide('theme', ref('dark'));
// Descendant
const theme = inject<Ref<string>>('theme')!;
```

**Angular 19+**
```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService { theme = signal<'dark' | 'light'>('dark'); }
// Composant
private themeService = inject(ThemeService);
```

**React 19**
```tsx
const ThemeCtx = createContext<'dark' | 'light'>('dark');
// Provider
<ThemeCtx.Provider value={theme}><Page /></ThemeCtx.Provider>
// Consumer
const theme = useContext(ThemeCtx);
```

> Le Context React est simple mais peut causer des re-renders excessifs. Pour du state complexe, préférer **Zustand**.

---

## 10. State management — Pinia / Services / Zustand

**Vue 3 (Pinia)**
```ts
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0);
  function increment() { count.value++; }
  return { count, increment };
});
```

**Angular 19+ (Service + Signals)**
```typescript
@Injectable({ providedIn: 'root' })
export class CounterService {
  count = signal(0);
  increment() { this.count.update(c => c + 1); }
}
```

**React 19 (Zustand)**
```ts
import { create } from 'zustand';
export const useCounterStore = create<{ count: number; increment: () => void }>(set => ({
  count: 0,
  increment: () => set(s => ({ count: s.count + 1 })),
}));
// Composant : const { count, increment } = useCounterStore();
```

> Zustand : ~1 KB, pas de Provider. Alternatives : Jotai (atomique), Redux Toolkit (verbose).

---

## 11. Routing — Vue Router / Angular Router / React Router

**Vue 3**
```ts
const routes = [
  { path: '/', component: Home },
  { path: '/users/:id', component: UserDetail },
];
```

**Angular 19+**
```ts
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users/:id', component: UserDetailComponent },
];
```

**React 19 (React Router v7)**
```tsx
const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/users/:id', element: <UserDetail /> },
]);
// const { id } = useParams();
```

> Même modèle partout. Avec **Next.js App Router**, le routing est file-based (comme Nuxt).

---

## 12. Composant Single-File — .vue / .component.ts / .tsx

**Vue 3** : `UserCard.vue` avec `<script setup>`, `<template>`, `<style scoped>` dans un fichier.

**Angular 19+** : `user-card.component.ts` avec `@Component({ template, styles })` ou fichiers séparés.

**React 19** :
```tsx
// UserCard.tsx
import styles from './UserCard.module.css';
export function UserCard({ name }: { name: string }) {
  return <div className={styles.card}>{name}</div>;
}
```

> React n'a pas de scoped CSS natif. Solutions : CSS Modules, Tailwind, styled-components.

---

## 13. Meta-framework SSR — Nuxt / Angular SSR / Next.js

| | Nuxt 3 | Angular SSR | Next.js 15 |
|---|---|---|---|
| Routing | File-based (`pages/`) | Classique | File-based (`app/`) |
| Data fetching | `useFetch()` | `HttpClient` + resolvers | Server Components / fetch |
| API routes | `server/api/` | Express/Fastify | `app/api/` / Server Actions |
| Hydratation | Automatique | Incrémentale | Streaming + `<Suspense>` |
| Spécificité | | | **Server Components** par défaut |

> La grande nouveauté Next.js 15 : les **React Server Components** (RSC), sans équivalent direct en Vue/Angular.

---

## Tableau récapitulatif

| Concept | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Variable réactive | `ref()` | `signal()` | `useState()` |
| Calculée | `computed()` | `computed()` | `useMemo()` / variable |
| Effet | `watchEffect()` | `effect()` | `useEffect()` |
| Props | `defineProps()` | `input()` | Paramètre de fonction |
| Événements | `defineEmits()` | `output()` | Callback prop |
| Two-way binding | `v-model` | `[(ngModel)]` / `model()` | Controlled input |
| Condition | `v-if` | `@if` | `if` / ternaire / `&&` |
| Boucle | `v-for` | `@for` | `.map()` |
| DI / Contexte | `provide`/`inject` | `inject()` + services | `createContext` + `useContext` |
| Store | Pinia | Services + Signals | Zustand |
| Router | Vue Router | Angular Router | React Router / Next.js |
| Fichier composant | `.vue` (SFC) | `.component.ts` | `.tsx` |
| SSR framework | Nuxt 3 | Angular SSR | Next.js 15 |

---

## A retenir

1. **React n'a pas de template** : tout est du JavaScript/TypeScript.
2. **Pas de tracking automatique** : tu déclares les dépendances toi-même.
3. **Pas de two-way binding** : controlled input avec `value` + `onChange`.
4. **Les composants sont des fonctions** : props = paramètres, JSX = retour.
5. **Ecosystème fragmenté** : chaque besoin a plusieurs solutions. Cette formation fait des choix opinionnés.

---

## Prochaine étape

Cours suivant : [03 -- Premier projet React](./03-premier-projet-react.md)
