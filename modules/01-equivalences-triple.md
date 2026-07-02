---
titre: Équivalences Vue Angular React
cours: 04-react
notions: [composants équivalents, props vs inputs, état local, réactivité comparée, directives vs JSX, cycle de vie vs hooks, injection de dépendances vs contexte, tableau de correspondance des trois frameworks]
outcomes: [traduire un concept Vue ou Angular vers React, lire du code React en s'appuyant sur ses acquis, éviter les faux-amis entre frameworks]
prerequis: [00-react-mental-model]
next: 02-premier-projet-react
libs: [{ name: react, version: "^19" }]
tribuzen: traduire un composant Vue de TribuZen (FamilyCard) en React
last-reviewed: 2026-07
---

# Équivalences Vue / Angular / React

> **Outcomes — tu sauras FAIRE :** traduire un concept Vue ou Angular vers React, lire du code React en t'appuyant sur tes acquis, identifier les faux-amis entre frameworks.
> **Difficulté :** :star::star:
>
> **Portée :** ce module est conceptuel — table de traduction mentale. Pas de projet à créer ici. La pratique guidée (FamilyCard React complet) commence au **module 02**.

## 1. Cas concret d'abord

Tu travailles sur TribuZen. L'équipe front a un composant Vue prêt :

```vue
<!-- FamilyCard.vue (Vue 3) -->
<script setup lang="ts">
import { ref } from 'vue'

interface Family {
  id: string
  name: string
  memberCount: number
}

const props = defineProps<{ family: Family }>()
const expanded = ref(false)
</script>

<template>
  <div class="card" @click="expanded = !expanded">
    <h2>{{ props.family.name }}</h2>
    <p v-if="expanded">{{ props.family.memberCount }} membres</p>
  </div>
</template>
```

Ta mission : **écrire l'équivalent React**. Avant de continuer, essaie de repérer chaque concept Vue dans la liste ci-dessous — tu seras capable de tous les traduire à la fin de ce module :

- `defineProps<{ family: Family }>()` → ?
- `ref(false)` → ?
- `v-if="expanded"` → ?
- `@click="expanded = !expanded"` → ?

---

## 2. Théorie complète, concise

### 2.1 Composants équivalents — la fonction vs le fichier

Vue utilise un Single File Component (`.vue`) avec trois blocs séparés. Angular déclare un composant via `@Component`. React est une **fonction TypeScript qui retourne du JSX** — c'est tout.

```tsx
// Vue : FamilyCard.vue (template + script + style dans un fichier .vue)
// Angular : FamilyCardComponent avec @Component({ template, styles })
// React : une fonction dans FamilyCard.tsx
export function FamilyCard() {
  return <div>...</div>
}
```

**Différence fondamentale :** React n'a pas de couche template séparée. Le JSX est du JavaScript — les expressions y sont du vrai code.

### 2.2 Props vs inputs

| Concept | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Déclaration | `defineProps<{ title: string }>()` | `title = input.required<string>()` | Paramètre de fonction `{ title }` |
| Passage | `<Child :title="val" />` | `<app-child [title]="val" />` | `<Child title={val} />` |
| Accès | `props.title` | `this.title()` | `title` (destructuré) |

React : les props sont les **paramètres de la fonction composant**. Pas de macro, pas de décorateur — du TypeScript standard :

```tsx
interface FamilyCardProps {
  family: Family
}

function FamilyCard({ family }: FamilyCardProps) {
  // family est directement disponible — pas de props.family
  return <h2>{family.name}</h2>
}
```

### 2.3 État local — ref vs signal vs useState

Vue utilise `ref()` (objet Proxy avec `.value`). Angular utilise `signal()` (une fonction à appeler). React utilise `useState()` — qui retourne une **valeur** et une **fonction de mise à jour** :

```tsx
// Vue : const expanded = ref(false)  →  expanded.value = true
// Angular : expanded = signal(false) →  this.expanded.set(true)

// React :
const [expanded, setExpanded] = useState(false)
// expanded est une valeur JavaScript ordinaire, pas un objet réactif
// Pour changer : setExpanded(true) ou setExpanded(prev => !prev)
```

React re-rend le composant quand `setExpanded` est appelé, et la fonction composant s'exécute à nouveau avec la nouvelle valeur.

### 2.4 Réactivité comparée — tracking auto vs déclaration manuelle

Vue et Angular trackent les dépendances **automatiquement**. React n'a pas de système de tracking — tu déclares les dépendances toi-même dans `useEffect` et `useMemo` :

```tsx
// Vue : watchEffect(() => { fetch(userId.value) }) — dépendances inférées
// Angular : effect(() => { fetch(this.userId()) }) — dépendances inférées

// React : dépendances DÉCLARÉES manuellement
useEffect(() => {
  fetch(`/api/users/${userId}`)
}, [userId]) // si userId change, l'effet se ré-exécute

// Valeur calculée
// Pour un calcul simple, une variable suffit — pas besoin de useMemo
const total = price * (1 + tax)

// useMemo uniquement pour les calculs coûteux
const sortedList = useMemo(() => [...items].sort(byName), [items])
```

### 2.5 Directives vs JSX

Vue et Angular ont des directives pour le rendu conditionnel et les boucles. React utilise du **JavaScript pur** dans le JSX :

```tsx
// Conditionnel
// Vue : <p v-if="expanded">...</p>
// Angular : @if (expanded()) { <p>...</p> }
// React :
{expanded && <p>Contenu</p>}
// ou ternaire :
{expanded ? <p>Contenu</p> : null}

// Boucle
// Vue : <li v-for="m in members" :key="m.id">{{ m.name }}</li>
// Angular : @for (m of members(); track m.id) { <li>{{ m.name }}</li> }
// React :
{members.map(m => <li key={m.id}>{m.name}</li>)}
```

La clé `key` (React) est obligatoire — même rôle que `:key` (Vue) ou `track` (Angular).

### 2.6 Cycle de vie vs hooks

Vue a `onMounted`, `onUnmounted`, `onUpdated`. Angular a `ngOnInit`, `ngOnDestroy`. React a un seul hook `useEffect` qui couvre les trois cas via son tableau de dépendances :

```tsx
// onMounted — tableau vide = exécution unique au montage
useEffect(() => {
  console.log('composant monté')
  return () => {
    console.log('composant démonté') // cleanup = onUnmounted
  }
}, [])

// onUpdated pour une valeur spécifique
useEffect(() => {
  console.log('userId a changé:', userId)
}, [userId])
```

### 2.7 Injection de dépendances vs contexte

Vue a `provide`/`inject`. Angular a son système de DI avec `inject()` et `@Injectable`. React a `createContext` + `useContext` :

```tsx
// Vue : provide('theme', ref('dark')) / inject('theme')
// Angular : @Injectable({ providedIn: 'root' }) + inject(ThemeService)

// React :
const ThemeCtx = createContext<'dark' | 'light'>('dark')

// Fournisseur (ancêtre dans l'arbre)
<ThemeCtx.Provider value="dark">
  <App />
</ThemeCtx.Provider>

// Consommateur (n'importe quel descendant)
const theme = useContext(ThemeCtx) // 'dark'
```

Le Context React recalcule tous ses consommateurs à chaque changement de valeur. Pour du state global complexe, Zustand est préféré (pas de Provider, ~1 KB).

### 2.8 Tableau de correspondance des trois frameworks

| Concept | Vue 3 | Angular 19+ | React 19 |
|---|---|---|---|
| Composant | SFC `.vue` | `@Component` | Fonction `.tsx` |
| Props | `defineProps<T>()` | `input()` | Paramètre fonction |
| Événements | `defineEmits<T>()` | `output()` | Callback prop `onXxx` |
| État local | `ref()` / `reactive()` | `signal()` | `useState()` |
| Calculée | `computed()` | `computed()` | `useMemo()` / variable |
| Effet | `watchEffect()` | `effect()` | `useEffect()` |
| Condition | `v-if` | `@if` | `&&` / ternaire |
| Boucle | `v-for` | `@for` | `.map()` |
| Two-way binding | `v-model` | `[(ngModel)]` | Controlled input |
| Montage | `onMounted()` | `ngOnInit` | `useEffect(fn, [])` |
| DI / Contexte | `provide`/`inject` | `inject()` + services | `createContext` + `useContext` |
| Store global | Pinia | Services + Signals | Zustand |
| SSR | Nuxt 3 | Angular SSR | Next.js 15 |

---

## 3. Worked examples

### Exemple 1 — Traduction complète de FamilyCard (Vue → React)

On traduit le composant du cas concret, concept par concept.

**Vue (original) :**

```vue
<script setup lang="ts">
import { ref } from 'vue'

interface Family {
  id: string
  name: string
  memberCount: number
}

const props = defineProps<{ family: Family }>()
const expanded = ref(false)
</script>

<template>
  <div class="card" @click="expanded = !expanded">
    <h2>{{ props.family.name }}</h2>
    <p v-if="expanded">{{ props.family.memberCount }} membres</p>
  </div>
</template>
```

**React (traduit) :**

```tsx
import { useState } from 'react'

interface Family {
  id: string
  name: string
  memberCount: number
}

interface FamilyCardProps {
  family: Family
}

export function FamilyCard({ family }: FamilyCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card" onClick={() => setExpanded(prev => !prev)}>
      <h2>{family.name}</h2>
      {expanded && <p>{family.memberCount} membres</p>}
    </div>
  )
}
```

**Table de traduction ligne à ligne :**

| Vue | React | Note |
|---|---|---|
| `defineProps<{ family: Family }>()` | `{ family }: FamilyCardProps` | Props = paramètre fonction |
| `ref(false)` | `useState(false)` | Retourne `[valeur, setter]` |
| `expanded = !expanded` | `setExpanded(prev => !prev)` | Jamais mutation directe |
| `@click="..."` | `onClick={...}` | camelCase en React |
| `v-if="expanded"` | `{expanded && ...}` | JavaScript pur dans JSX |
| `{{ props.family.name }}` | `{family.name}` | Accolades simples, pas `{{ }}` |
| `class="card"` | `className="card"` | Faux-ami JSX — `class` est réservé JS |

### Exemple 2 — Événements : de defineEmits à callback prop

Vue communique vers le parent via `defineEmits`. React utilise une fonction passée en prop.

**Vue :**

```vue
<script setup lang="ts">
const emit = defineEmits<{ (e: 'select', id: string): void }>()
</script>

<template>
  <button @click="emit('select', family.id)">Ouvrir</button>
</template>
```

**React :**

```tsx
interface FamilyCardProps {
  family: Family
  onSelect: (id: string) => void
}

export function FamilyCard({ family, onSelect }: FamilyCardProps) {
  return (
    <button onClick={() => onSelect(family.id)}>Ouvrir</button>
  )
}

// Côté parent :
// <FamilyCard family={f} onSelect={id => console.log(id)} />
```

React n'a pas d'événements custom. On passe une fonction callback. Convention universelle : préfixe `on` + nom d'action (`onSelect`, `onDelete`, `onSubmit`...).

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Muter l'état directement (faux-ami Vue)

En Vue, `expanded.value = !expanded.value` est la bonne pratique. En React, muter directement la valeur ne déclenche aucun re-rendu :

```tsx
// ❌ Ne re-rend PAS le composant — React ne voit pas le changement
let expanded = false
expanded = !expanded

// ✅ Toujours passer par le setter — c'est lui qui déclenche le re-rendu
const [expanded, setExpanded] = useState(false)
setExpanded(prev => !prev)
```

React compare les valeurs par référence. Une mutation en place ne crée pas une nouvelle référence, donc le composant n'est pas mis à jour.

### PIÈGE #2 — class vs className (faux-ami HTML)

JSX est du JavaScript transpilé, pas du HTML. `class` est un mot réservé JavaScript (`class MyClass {}`). React utilise `className` :

```tsx
// ❌ Avertissement React + bug potentiel en mode strict
<div class="card">

// ✅ Obligatoire en JSX
<div className="card">
```

Vue accepte `class` dans les templates car il le convertit en `className` à la compilation. En React, la conversion est à ta charge.

### PIÈGE #3 — useEffect sans tableau de dépendances crée une boucle infinie

```tsx
// ❌ Exécuté après CHAQUE rendu — boucle infinie si setData est appelé dedans
useEffect(() => {
  fetch('/api/families').then(r => r.json()).then(data => setData(data))
})

// ✅ Tableau vide = exécution unique au montage (équivalent de onMounted Vue)
useEffect(() => {
  fetch('/api/families').then(r => r.json()).then(data => setData(data))
}, [])
```

Le deuxième argument de `useEffect` est obligatoire dès qu'on fetch des données.

### PIÈGE #4 — Les props React sont en lecture seule

Comme `defineProps` Vue ou `input()` Angular, les props React ne se mutent pas. La différence : en React, les props sont des variables JavaScript normales — l'immutabilité est moins visible mais tout aussi stricte.

```tsx
function FamilyCard({ family }: FamilyCardProps) {
  // ❌ Muter la prop — aucune erreur TS mais comportement imprévisible
  family.name = 'Nouveau nom'

  // ✅ Créer un état local si une modification locale est nécessaire
  const [name, setName] = useState(family.name)
}
```

---

## 5. Ancrage TribuZen

`FamilyCard` est la carte centrale du dashboard TribuZen — elle affiche le résumé d'une famille (nom, nombre de membres) et est cliquable pour ouvrir le détail.

La traduction Vue → React faite dans ce module (Exemple 1) est la base exacte du lab du **module 02**. Le composant cible dans TribuZen React sera :

```
tribuzen/
  src/
    components/
      family/
        FamilyCard.tsx         ← traduit dans ce module, complété au module 02
        FamilyCard.module.css
```

Au module 02, on ajoutera au-dessus de cette base :
- le fetch des données depuis l'API TribuZen (`useEffect` + `useState` pour `loading` et `error`)
- la navigation vers le détail famille via `useNavigate` (React Router)

Ce module t'a donné la table de traduction mentale. Le module 02 la met en pratique sur un projet réel.

---

## 6. Points clés

1. Un composant React est une fonction TypeScript qui retourne du JSX — pas de fichier `.vue`, pas de `@Component`.
2. Les props React sont les paramètres de la fonction composant — pas de `defineProps`, pas de `input()`.
3. `useState(val)` remplace `ref(val)` — retourne `[valeur, setter]`, jamais mutation directe.
4. `useEffect(fn, [deps])` couvre `onMounted` (deps vides), `onUpdated` (deps renseignées) et le cleanup `onUnmounted` (return dans fn).
5. JSX n'a pas de directives — `v-if` devient `{cond && ...}` ou ternaire, `v-for` devient `.map()`.
6. Les dépendances de `useEffect` et `useMemo` sont déclarées manuellement — React ne tracke rien automatiquement.
7. Les événements custom n'existent pas en React — on passe des callbacks en props (`onSelect`, `onDelete`...).
8. `class` → `className` en JSX : faux-ami immédiat venant de Vue et du HTML.

---

## 7. Seeds Anki

```
Comment déclare-t-on les props en React vs Vue 3 ?|Vue : defineProps<T>(). React : paramètre de fonction typé avec une interface — function Card({ title }: Props). Pas de macro, pas de registre.
Quel est l'équivalent React de ref(false) ?|const [expanded, setExpanded] = useState(false). expanded est une valeur simple (pas un objet Proxy). Pour changer : setExpanded(prev => !prev).
Comment écrire v-if="show" en JSX React ?|{show && <p>Contenu</p>} ou {show ? <p>Contenu</p> : null}. Pas de directive — du JavaScript pur dans le JSX.
Comment écrire v-for="item in items" :key="item.id" en React ?|{items.map(item => <li key={item.id}>{item.name}</li>)}. .map() standard, prop key obligatoire.
Pourquoi ne pas muter l'état directement en React (ex: count++) ?|React détecte les changements par référence — une mutation en place ne crée pas de nouvelle référence, le composant ne se re-rend pas. Toujours passer par le setter : setCount(prev => prev + 1).
Comment remplacer defineEmits en React ?|Passer une fonction callback en prop avec le préfixe on (onSelect, onDelete). Le parent fournit la fonction, l'enfant l'appelle. Pas d'événements custom en React.
Quel est l'équivalent de onMounted en React ?|useEffect(() => { ... }, []). Le tableau de dépendances vide garantit l'exécution unique au premier rendu. Le return de la fonction est le cleanup (équivalent onUnmounted).
```

---

## Pont vers le lab

> Ce module est **conceptuel** — aucun projet à créer. La pratique guidée commence au **module 02** : premier projet React avec `FamilyCard` complet (fetch, état de chargement, navigation React Router).
