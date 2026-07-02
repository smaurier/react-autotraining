---
titre: React mental model
cours: 04-react
notions: [approche déclarative vs impérative, composants et arbre de composants, flux de données unidirectionnel, état et re-render, JSX en aperçu, virtual DOM et réconciliation, différences de modèle mental avec Vue et Angular]
outcomes: [expliquer le modèle mental déclaratif de React, comprendre le flux de données unidirectionnel et le re-render, situer React par rapport à Vue et Angular]
prerequis: [TypeScript labs 01-10]
next: 01-equivalences-triple
libs: [{ name: react, version: "^19" }]
tribuzen: poser le modèle mental React pour l'admin web de TribuZen (SPA Vite + React Router ; Next.js à partir du module 24)
last-reviewed: 2026-07
---

# React mental model

> **Outcomes — tu sauras FAIRE :** expliquer le modèle mental déclaratif de React, tracer le flux de données unidirectionnel dans un arbre de composants, distinguer re-render et mise à jour DOM, situer React par rapport à Vue et Angular.
> **Difficulté :** :star:
>
> **Portée :** ce module est purement conceptuel — pas de code à exécuter. Il pose le cadre mental avant d'écrire le moindre composant. La syntaxe JSX, `useState` et les hooks sont introduits au **module 02**. Les équivalences Vue/Angular ligne à ligne sont au **module 01**.

## 1. Cas concret d'abord

Tu rejoins l'équipe qui construit l'admin web de TribuZen (React 19, SPA Vite + React Router — l'admin passera à Next.js au module 24). Ton premier ticket : relire une PR qui ajoute une page `FamilyList`. Tu ouvres le fichier et tu lis :

```tsx
// src/pages/FamilyListPage.tsx (React 19, Vite + React Router)
export default function FamilyListPage() {
  const [search, setSearch] = useState('')
  const filtered = families.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filtrer…"
      />
      <ul>
        {filtered.map(f => (
          <FamilyCard key={f.id} family={f} />
        ))}
      </ul>
    </div>
  )
}
```

Tu viens de Vue. Trois choses te déstabilisent :

1. **Pas de `<template>` séparé** — le HTML est mélangé au JavaScript dans `return (...)`.
2. **Pas de `v-model`** — `value={search}` + `onChange` à la main.
3. **La fonction entière se ré-exécute** à chaque frappe — pas seulement le DOM qui change.

Ce module explique pourquoi chaque point est une conséquence logique du modèle mental React, pas un oubli.

---

## 2. Théorie complète, concise

### 2.1 Approche déclarative vs impérative

**Impératif** : tu décris *comment* modifier le DOM pas à pas.

```tsx
// Approche impérative (DOM natif)
const input = document.getElementById('search') as HTMLInputElement
const list  = document.getElementById('list')!

input.addEventListener('input', () => {
  list.innerHTML = ''                          // 1. vider
  families
    .filter(f => f.name.includes(input.value)) // 2. filtrer
    .forEach(f => {                            // 3. reconstruire
      const li = document.createElement('li')
      li.textContent = f.name
      list.appendChild(li)
    })
})
```

**Déclaratif** : tu décris *quoi* afficher en fonction de l'état courant. React se charge du *comment*.

```tsx
// Approche déclarative (React)
function FamilyList({ families }: { families: Family[] }) {
  const [search, setSearch] = useState('')

  // Déclaration : "le rendu EST cette expression"
  return (
    <ul>
      {families
        .filter(f => f.name.includes(search))
        .map(f => <li key={f.id}>{f.name}</li>)}
    </ul>
  )
}
```

La différence fondamentale : avec React, tu n'écris jamais de mutation DOM. Tu décris l'UI cible, React fait la transition.

### 2.2 Composants et arbre de composants

Un composant React est **une fonction TypeScript** qui retourne du JSX. C'est tout.

```tsx
// Composant = fonction qui retourne du JSX
function FamilyCard({ family }: { family: Family }) {
  return (
    <div className="card">
      <h2>{family.name}</h2>
      <span>{family.memberCount} membres</span>
    </div>
  )
}
```

Les composants s'imbriquent pour former un **arbre** — exactement comme le DOM :

```
AdminDashboard
├── Header
│   └── NavBar
├── FamilyList
│   ├── SearchInput
│   └── FamilyCard  ×N
└── Footer
```

Chaque nœud de l'arbre est une invocation de fonction. `<FamilyCard family={f} />` est du sucre syntaxique pour `FamilyCard({ family: f })`.

### 2.3 Flux de données unidirectionnel

Les données descendent du parent vers l'enfant via les **props**. Les enfants ne modifient jamais les props — ils remontent des événements via des **callbacks**.

```
         [FamilyList]
          state: search = "zen"
               |
         props ↓ (filtered)          callback ↑ (onSearch)
               |
         [SearchInput]
```

```tsx
// Parent — possède l'état, descend les données, reçoit les callbacks
function FamilyList() {
  const [search, setSearch] = useState('')

  return (
    <>
      {/* onSearch est un callback qui remonte vers le parent */}
      <SearchInput value={search} onSearch={setSearch} />
    </>
  )
}

// Enfant — reçoit les données, appelle le callback pour remonter
function SearchInput({
  value,
  onSearch,
}: {
  value: string
  onSearch: (v: string) => void
}) {
  return (
    <input
      value={value}
      onChange={e => onSearch(e.target.value)}
    />
  )
}
```

**Règle d'or :** un enfant ne peut jamais écrire directement dans l'état de son parent. Il appelle une fonction que le parent lui a fournie.

### 2.4 État et re-render

En React, l'état (`useState`) est **immutable** : on ne le mute pas, on le remplace. Quand `setState` est appelé, React **re-exécute toute la fonction composant** du haut en bas.

```tsx
function Counter() {
  const [count, setCount] = useState(0)
  // ↑ À chaque re-render, count est une nouvelle valeur locale — pas une ref mutable

  console.log('render', count) // s'affiche à chaque clic

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  )
}
```

Séquence d'un clic :

1. `setCount(1)` est appelé.
2. React programme un re-render.
3. `Counter()` est ré-exécutée — `count` vaut maintenant `1`.
4. React compare le JSX retourné avec le précédent (reconciliation).
5. Seule la différence est appliquée au DOM réel.

**Différence clé avec Vue/Angular :** Vue et Angular ont une réactivité *fine* (seul ce qui lit la ref/signal change). React a une réactivité *par composant* (tout le composant est recalculé). Le virtual DOM est le mécanisme qui rend ça efficace.

#### React 19 : le compilateur automatise la mémoïsation

React 19 embarque le **React Compiler** (anciennement React Forget). Il analyse statiquement le code et insère automatiquement les équivalents de `useMemo` / `useCallback` là où c'est pertinent. En pratique : tu n'as presque plus besoin de les écrire manuellement.

```tsx
// React 19 + compilateur — le compilateur mémoïse filtered automatiquement
function FamilyList({ families }: { families: Family[] }) {
  const [search, setSearch] = useState('')
  const filtered = families.filter(f => f.name.includes(search))
  // Avant React 19 : useMemo(() => families.filter(...), [families, search])
  // Avec compilateur : inutile — React gère ça seul
  return <ul>{filtered.map(f => <FamilyCard key={f.id} family={f} />)}</ul>
}
```

### 2.5 JSX en aperçu

JSX est une **extension syntaxique JavaScript** compilée par Babel/SWC. Ce n'est pas du HTML — c'est du JavaScript déguisé en markup.

```tsx
// JSX (ce que tu écris)
const el = <h1 className="title">Bonjour {name}</h1>

// JavaScript compilé (ce que le moteur JS exécute)
const el = React.createElement('h1', { className: 'title' }, `Bonjour ${name}`)
```

Règles à retenir pour le moment (la syntaxe complète est au module 02) :

| HTML | JSX |
|------|-----|
| `class="..."` | `className="..."` |
| `for="..."` | `htmlFor="..."` |
| `<!-- commentaire -->` | `{/* commentaire */}` |
| Attribut booléen : `disabled` | `disabled={true}` ou simplement `disabled` |

Toute expression JavaScript est valide entre `{` et `}` — une valeur, un appel de fonction, un ternaire, un `.map()`.

### 2.6 Virtual DOM et réconciliation

Le **virtual DOM** est une représentation JavaScript légère de l'arbre UI. React maintient deux arbres en mémoire : le rendu précédent et le rendu actuel.

Processus de **réconciliation** :

```
État change
     ↓
Composant re-render → nouveau virtual DOM
     ↓
Diff (nouveau vs précédent)
     ↓
Patch minimal appliqué au DOM réel
```

La réconciliation utilise la prop `key` pour identifier les nœuds dans les listes. Sans `key` unique et stable, React peut faire des erreurs de correspondance (un composant réutilisé pour un autre item).

```tsx
// ✅ key stable et unique — React sait quel nœud correspond à quel item
{families.map(f => <FamilyCard key={f.id} family={f} />)}

// ❌ key = index — si l'ordre change, React réutilise les mauvais composants
{families.map((f, i) => <FamilyCard key={i} family={f} />)}
```

**Comparaison avec Vue/Angular :**

| | React 19 | Vue 3 | Angular 19+ |
|---|---|---|---|
| Stratégie de rendu | Virtual DOM + diff | Virtual DOM + réactivité fine | Zoneless + signals |
| Granularité | Composant entier | Expression réactive | Signal/expression |
| Optimisation manuelle | Rarement nécessaire (compilateur) | Rare (proxy automatique) | Rare (signals) |

### 2.7 Différences de modèle mental avec Vue et Angular

| Dimension | Vue 3 | Angular 19+ | React 19 |
|-----------|-------|-------------|----------|
| Nature | Framework progressif | Framework complet | Bibliothèque UI |
| Composant | SFC `.vue` (template séparé) | Classe + décorateur `.component.ts` | Fonction `.tsx` (JSX inline) |
| Réactivité | `ref()` / `reactive()` — proxy auto | `signal()` / `computed()` — tracking auto | `useState()` — re-render composant |
| Template | HTML + directives (`v-if`, `v-for`) | HTML + `@if`, `@for` | JSX = JavaScript pur |
| Two-way binding | `v-model` natif | `[(ngModel)]` / `model()` | `value` + `onChange` explicites |
| DI / services | `provide` / `inject` | Injector hiérarchique | Context API / stores externes |
| Structure | Semi-imposée | Imposée (modules, services, pipes) | Libre (Next.js peut l'imposer) |
| Routing | Vue Router (optionnel) | Angular Router (intégré) | Next.js App Router / TanStack |

**Ce qui change le plus dans ta tête :**

- Vue : "je modifie une `ref`, le template se met à jour." → React : "j'appelle `setState`, la fonction se ré-exécute, le DOM est réconcilié."
- Vue : `v-if` / `v-for` dans le template. → React : ternaire JavaScript et `.map()` dans le JSX.
- Angular : `@Component` avec une classe et du DI. → React : une fonction. Rien d'autre.

---

## 3. Worked examples

### Exemple 1 — Même UI, trois paradigmes

Un compteur simple — identique visuellement, mais le modèle mental diffère.

```tsx
// ── Vue 3 (SFC) ──────────────────────────────────────────────────────
// <script setup lang="ts">
// import { ref } from 'vue'
// const count = ref(0)        // ref reactive — mutation directe
// </script>
// <template>
//   <button @click="count++">{{ count }}</button>
// </template>

// ── Angular 19+ ──────────────────────────────────────────────────────
// @Component({ template: `<button (click)="inc()">{{ count() }}</button>` })
// export class CounterComponent {
//   count = signal(0)         // signal — .set() ou .update()
//   inc() { this.count.update(n => n + 1) }
// }

// ── React 19 ─────────────────────────────────────────────────────────
function Counter() {
  const [count, setCount] = useState(0) // tuple [valeur, setter]

  // La fonction entière se ré-exécute à chaque clic
  // count est une constante locale — pas une ref mutable
  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  )
}
```

**Ce que l'exemple montre :**
- Vue mute directement la ref (`count++`). React remplace l'état (`setCount(count + 1)`).
- Vue et Angular trackent automatiquement les dépendances. React re-exécute tout le composant.
- Le JSX React est du JavaScript : `onClick={() => setCount(count + 1)}` est une arrow function ordinaire.

### Exemple 2 — Flux de données dans l'arbre TribuZen

```tsx
// AdminDashboard — possède l'état de recherche, le descend
function AdminDashboard() {
  const [search, setSearch] = useState('')

  return (
    <main>
      {/* Props descendantes : value + callback */}
      <SearchBar value={search} onChange={setSearch} />
      {/* FamilyList reçoit search en lecture seule */}
      <FamilyList search={search} />
    </main>
  )
}

// SearchBar — reçoit la valeur et remonte les changements
function SearchBar({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  // onChange est le seul canal vers le parent — pas de mutation directe
  return (
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Rechercher une famille…"
    />
  )
}

// FamilyList — consommateur pur de search, filtre et affiche
function FamilyList({ search }: { search: string }) {
  const results = MOCK_FAMILIES.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <ul>
      {results.map(f => (
        <FamilyCard key={f.id} family={f} />
      ))}
    </ul>
  )
}
```

**Lecture du flux :** `AdminDashboard` possède `search`. Il descend la valeur à `SearchBar` (pour l'afficher) et à `FamilyList` (pour filtrer). Quand l'utilisateur tape, `SearchBar` appelle `onChange` → `setSearch` dans `AdminDashboard` → re-render de l'arbre → `FamilyList` reçoit le nouveau `search`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — "Re-render = le DOM est entièrement reconstruit"

**Faux.** Le re-render en React signifie que la *fonction composant* est ré-exécutée et produit un nouveau virtual DOM. React compare ensuite ce virtual DOM au précédent (diff) et n'applique au DOM réel que les nœuds qui ont changé.

```tsx
function FamilyCard({ family }: { family: Family }) {
  console.log('render FamilyCard', family.id) // ← s'exécute à chaque re-render du parent
  return <div>{family.name}</div>
  // Mais si family.name n'a pas changé → aucune modification du DOM réel
}
```

**Le correct :** re-render ≠ repaint DOM. Le virtual DOM est le filtre entre les deux.

### PIÈGE #2 — "setState met l'état à jour immédiatement"

**Faux.** `setState` *programme* un re-render. La valeur dans la fermeture courante ne change pas.

```tsx
function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    console.log(count) // ← toujours l'ancienne valeur !
    // count est une constante locale capturée dans cette exécution
  }

  return <button onClick={handleClick}>{count}</button>
}
```

**Le correct :** lire le nouvel état après le re-render (au prochain appel de la fonction), pas immédiatement après `setState`.

### PIÈGE #3 — "Muter l'état directement comme en Vue"

```tsx
// ❌ Mutation directe — React ne détecte AUCUN changement, pas de re-render
const [families, setFamilies] = useState<Family[]>([])

function addFamily(f: Family) {
  families.push(f)          // mutation directe de l'array
  // setFamilies n'est PAS appelé → React ignore ce changement
}

// ✅ Remplacement immutable — React détecte le nouvel array
function addFamily(f: Family) {
  setFamilies([...families, f]) // nouvel array → re-render déclenché
}
```

**Le correct :** toujours passer une *nouvelle* valeur à `setState`. Ne jamais muter l'objet existant.

### PIÈGE #4 — "useEffect = watchEffect (dépendances automatiques)"

**Faux.** `watchEffect` de Vue traque automatiquement les réactifs qu'il lit. `useEffect` de React exige un tableau de dépendances *déclaré manuellement*. Oublier une dépendance → effet périmé (stale closure).

```tsx
// ❌ Dépendance manquante — userId est lu mais non déclaré
useEffect(() => {
  fetchFamily(userId).then(setFamily)
}, []) // eslint-plugin-react-hooks signale cet oubli

// ✅ Toutes les dépendances déclarées
useEffect(() => {
  fetchFamily(userId).then(setFamily)
}, [userId]) // re-déclenché quand userId change
```

**Le correct :** écouter l'avertissement `react-hooks/exhaustive-deps` du linter — il détecte les dépendances manquantes.

### PIÈGE #5 — "React est un framework comme Vue ou Angular"

React est une **bibliothèque UI** — elle gère uniquement le rendu. Routing, state management, formulaires, HTTP : tout s'apporte séparément. Vue et Angular ont des solutions intégrées ou officielles ; React délègue ces choix à l'écosystème (Next.js, Zustand, React Hook Form, TanStack Query…).

---

## 5. Ancrage TribuZen

L'**admin web de TribuZen** démarre en **SPA (Vite + React Router)** — c'est ce que tu bootstrappes dès le module 02 et dans tous les labs qui suivent. Chaque page de l'admin est un composant React rendu côté client. L'admin **évoluera vers Next.js (App Router) à partir du module 24**, quand le rendu serveur et le SEO deviendront un besoin réel ; les concepts de ce module (arbre de composants, props, flux unidirectionnel) restent identiques dans les deux cas.

L'arbre de l'admin illustre directement les concepts de ce module :

```
src/App.tsx                    ← AdminLayout + routes React Router
  ├── components/AdminNav.tsx  ← NavBar (navigation)
  └── pages/
        ├── FamilyListPage.tsx ← charge les familles, les descend en props
        │     └── FamilyCard.tsx ← composant feuille
        ├── MembersPage.tsx
        └── StatsPage.tsx
```

**Flux de données dans TribuZen admin :**

- `FamilyListPage` charge les familles depuis l'API, les descend comme props à `FamilyCard`.
- Le filtre de recherche est un `useState` dans un composant `SearchInput` — il remonte la valeur via callback vers `FamilyListPage` (ou via un store si l'état doit traverser plusieurs niveaux).
- Chaque `FamilyCard` reçoit une `family` en prop et ne connaît pas l'état global.

Ce flux — **données descendantes par les props, événements montants par les callbacks** — est le même en SPA aujourd'hui et sous Next.js (server/client components) à partir du module 24.

---

## 6. Points clés

1. React est une **bibliothèque UI** (pas un framework) — tu choisis chaque outil complémentaire.
2. L'approche **déclarative** signifie décrire l'UI cible ; React gère la transition vers le DOM.
3. Un composant React est une **fonction TypeScript** qui retourne du JSX — rien d'autre.
4. Les données descendent via les **props**, les événements remontent via des **callbacks** — flux unidirectionnel strict.
5. `useState` provoque le **re-render du composant entier** — la fonction est ré-exécutée du haut en bas.
6. Re-render ≠ mise à jour DOM complète — le **virtual DOM** filtre et n'applique que les différences.
7. L'état est **immutable** — toujours passer une nouvelle valeur à `setState`, jamais muter l'existant.
8. **JSX = JavaScript** — les conditions sont des ternaires, les boucles sont des `.map()`, pas des directives.
9. React 19 embarque le **compilateur** qui mémoïse automatiquement — `useMemo`/`useCallback` manuels deviennent rares.

---

## 7. Seeds Anki

```
Quelle est la différence fondamentale entre approche déclarative et impérative ?|Impératif : on décrit comment modifier le DOM étape par étape. Déclaratif : on décrit l'UI cible en fonction de l'état ; React gère la transition. On n'écrit jamais de mutation DOM en React.
Que se passe-t-il exactement quand setState est appelé ?|React programme un re-render : la fonction composant est ré-exécutée du haut en bas avec la nouvelle valeur d'état. La valeur dans la fermeture courante ne change pas immédiatement.
Pourquoi ne faut-il jamais muter l'état directement en React ?|React détecte les changements par référence. Muter l'objet existant ne change pas la référence → React ne déclenche pas de re-render → l'UI ne se met pas à jour. Toujours passer une nouvelle valeur à setState.
Qu'est-ce que la réconciliation et quel rôle joue la prop key ?|La réconciliation est le diff entre le virtual DOM précédent et le nouveau. React n'applique que les différences au DOM réel. La prop key identifie chaque nœud dans une liste — sans key stable, React peut réutiliser un composant pour le mauvais item.
En quoi le re-render React diffère-t-il de la réactivité fine de Vue/Angular ?|Vue/Angular trackent automatiquement les dépendances et ne mettent à jour que les expressions qui lisent la valeur modifiée (granularité fine). React re-exécute toute la fonction composant ; le virtual DOM filtre ensuite ce qui change dans le DOM réel.
Quelle est la différence entre useEffect et watchEffect (Vue) ?|watchEffect traque automatiquement les réactifs lus à l'intérieur. useEffect exige un tableau de dépendances déclaré manuellement. Oublier une dépendance crée une stale closure — le linter react-hooks/exhaustive-deps détecte cet oubli.
Qu'apporte le React Compiler introduit dans React 19 ?|Il analyse le code statiquement et insère automatiquement les équivalents de useMemo/useCallback là où c'est pertinent. En pratique, la mémoïsation manuelle devient rarement nécessaire dans un projet React 19 avec compilateur activé.
```

---

> La pratique commence au **module 02** — installation, premier composant, `useState` et JSX complet sur le vrai projet TribuZen admin.
