---
titre: useCallback et useMemo
cours: 04-react
notions: [identité référentielle, useMemo mémoïse une valeur, useCallback mémoïse une fonction, React.memo comparaison superficielle, le trio memo+useMemo+useCallback, quand mémoïser vs quand c'est inutile, React Compiler et mémoïsation automatique, tableau de dépendances]
outcomes: [mémoïser un calcul coûteux avec useMemo, stabiliser une référence de fonction avec useCallback pour un enfant React.memo, décider quand la mémoïsation manuelle est utile ou superflue à l'ère du React Compiler]
prerequis: [10-useref-et-dom]
next: 12-custom-hooks
libs: [{ name: react, version: "^19" }]
tribuzen: mémoïsation du filtre/tri de la liste des familles de l'admin TribuZen + stabilisation du callback passé aux FamilyRow mémoïsés
last-reviewed: 2026-07
---

# useCallback et useMemo

> **Outcomes — tu sauras FAIRE :** mémoïser un calcul coûteux avec `useMemo`, stabiliser une référence de fonction avec `useCallback` pour un enfant `React.memo`, décider quand la mémoïsation manuelle est utile ou superflue à l'ère du React Compiler.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu reprends la page **liste des familles** de l'admin TribuZen. Elle affiche 800 familles, avec un champ de recherche et un tri par nom/nombre de membres. Un collègue signale que la saisie dans le champ de recherche « rame » : chaque frappe fige l'interface un court instant.

```tsx
// FamilyListPage.tsx — AVANT optimisation
function FamilyListPage({ families }: { families: Family[] }) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'members'>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Recalculé À CHAQUE rendu — même quand seul selectedId change
  const visible = families
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : b.memberCount - a.memberCount,
    );

  // NOUVELLE fonction à chaque rendu — casse le React.memo de FamilyRow
  const handleSelect = (id: string) => setSelectedId(id);

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {visible.map((f) => (
        <FamilyRow key={f.id} family={f} onSelect={handleSelect} />
      ))}
    </>
  );
}
```

**Deux causes au ralentissement :**
1. Le `filter().sort()` sur 800 familles se **rejoue à chaque rendu**, même quand la frappe ne touche ni `query` ni `sortBy` (ex : sélection d'une ligne).
2. `handleSelect` est **recréé à chaque rendu** : sa référence change, donc les `FamilyRow` — même enveloppés dans `React.memo` — se re-rendent tous à chaque frappe.

Ce module te donne `useMemo` (pour le calcul) et `useCallback` (pour la fonction), et surtout le discernement pour savoir **quand ça vaut le coup** — car en React 19, le compilateur peut faire ce travail à ta place.

---

## 2. Théorie complète, concise

### 2.1 Identité référentielle : la racine du problème

À chaque rendu, une fonction React ré-exécute son corps de haut en bas. Tout objet, tableau ou fonction **littéral** est donc **recréé** — nouvelle adresse mémoire, nouvelle identité.

```tsx
function Parent() {
  const config = { theme: 'dark' };     // nouvel objet à chaque rendu
  const onClick = () => doSomething();  // nouvelle fonction à chaque rendu
  return <Child config={config} onClick={onClick} />;
}
```

`config` et `onClick` ont des **valeurs** identiques d'un rendu à l'autre, mais des **références** différentes. Or React compare les props par référence (`Object.is`). Pour une primitive (`string`, `number`, `boolean`), `'dark' === 'dark'` est `true` — pas de souci. Pour un objet ou une fonction, `{} === {}` est **toujours** `false`.

**Conséquence :** un enfant qui reçoit un objet/une fonction en prop « voit » toujours une prop nouvelle, même si rien n'a changé sémantiquement.

### 2.2 `useMemo` — mémoïser une **valeur** calculée

`useMemo` met en cache le **résultat** d'une fonction de calcul et ne le recalcule que si une dépendance change.

```tsx
import { useMemo } from 'react';

const value = useMemo(() => expensiveCompute(a, b), [a, b]);
//                    ^ fonction de calcul          ^ tableau de dépendances
```

Entre deux rendus où `[a, b]` sont référentiellement identiques, `useMemo` renvoie **la même valeur** sans ré-exécuter le calcul.

```tsx
// Calcul coûteux : filtrage + tri sur une grande liste
const visible = useMemo(() => {
  return families
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
}, [families, query]); // recalcule seulement si families ou query change
```

Deux usages légitimes :
- **Éviter un recalcul lourd** (tri, filtrage, agrégation sur beaucoup d'éléments).
- **Stabiliser la référence** d'un objet/tableau passé à un enfant `memo` ou utilisé dans un `useEffect deps`.

### 2.3 `useCallback` — mémoïser une **fonction**

`useCallback` met en cache la **fonction elle-même** (pas son résultat). C'est un raccourci de `useMemo` spécialisé pour les fonctions :

```tsx
// Ces deux lignes sont strictement équivalentes :
const fn = useCallback((id: string) => select(id), [select]);
const fn = useMemo(() => (id: string) => select(id), [select]);
```

```tsx
// Référence stable tant que les deps ne changent pas
const handleSelect = useCallback((id: string) => {
  setSelectedId(id);
}, []); // setSelectedId est stable (setter React) → deps vides
```

`useCallback` ne sert **à rien tout seul**. Il n'a de valeur que si la fonction est :
- passée à un enfant enveloppé dans `React.memo`, **ou**
- listée dans les dépendances d'un autre hook (`useEffect`, `useMemo`…).

### 2.4 `React.memo` — mémoïser un **composant**

`React.memo` enveloppe un composant et **saute son re-render** si ses props n'ont pas changé (comparaison superficielle, prop par prop, via `Object.is`).

```tsx
import { memo } from 'react';

interface FamilyRowProps {
  family: Family;
  onSelect: (id: string) => void;
}

const FamilyRow = memo(function FamilyRow({ family, onSelect }: FamilyRowProps) {
  return (
    <tr onClick={() => onSelect(family.id)}>
      <td>{family.name}</td>
      <td>{family.memberCount}</td>
    </tr>
  );
});
```

`React.memo` est **cassé** dès qu'une prop change de référence à chaque rendu. Passer `onSelect={() => ...}` inline annule tout le bénéfice. D'où le tandem obligatoire avec `useCallback`.

### 2.5 Le trio : `memo` + `useCallback` + `useMemo`

Ces trois outils forment un système cohérent. Isolés, ils sont souvent inutiles ; ensemble, ils empêchent la propagation des re-renders.

```tsx
function Dashboard({ families }: { families: Family[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useMemo(() => computeStats(families), [families]); // 1. valeur stable
  const handleSelect = useCallback((id: string) => {               // 2. fonction stable
    setSelectedId(id);
  }, []);

  return (
    <>
      <StatsPanel stats={stats} />
      {/* 3. FamilyGrid en memo → ne re-render que si families/onSelect changent */}
      <FamilyGrid families={families} onSelect={handleSelect} />
    </>
  );
}
```

Retire `useCallback` : `handleSelect` change à chaque rendu → `FamilyGrid` se re-render même si `families` est identique → `memo` inutile.

### 2.6 Le tableau de dépendances

Comme pour `useEffect`, le tableau de dépendances doit lister **toute** valeur réactive lue dans la fonction (props, state, valeurs dérivées). En oublier une = **bug silencieux** : la valeur mémoïsée reste « périmée » (stale).

```tsx
// ❌ query manquant : le filtre garde l'ancienne recherche
const visible = useMemo(() => filterBy(families, query), [families]);

// ✅ toutes les valeurs lues sont déclarées
const visible = useMemo(() => filterBy(families, query), [families, query]);
```

Le plugin ESLint `react-hooks/exhaustive-deps` détecte ces oublis — le garder actif.

> **Contraste Vue / Angular :** `computed()` (Vue) et `computed()` (Angular signals) **trackent leurs dépendances automatiquement**. En React, tu les déclares à la main. Avantage : pas de « magie ». Inconvénient : oubli possible.

### 2.7 React 19 : le React Compiler change la donne

Point le plus important de ce module. Le **React Compiler** (stable dans l'écosystème React 19) mémoïse **automatiquement** composants et valeurs à la compilation. Il insère l'équivalent de `useMemo`/`useCallback`/`memo` pour toi, à partir d'une analyse du code.

**Concrètement, quand le compilateur est activé** (via `babel-plugin-react-compiler` / le plugin de build) :
- La plupart des `useMemo`/`useCallback` **manuels deviennent superflus** — le compilateur produit une mémoïsation au moins aussi fine.
- Tu écris du code « naïf » (fonctions et objets inline) et les re-renders inutiles sont éliminés à la compilation.

```tsx
// Avec le React Compiler activé, ce code naïf est mémoïsé automatiquement.
// Plus besoin de useCallback/useMemo à la main dans le cas courant.
function FamilyListPage({ families }: { families: Family[] }) {
  const [query, setQuery] = useState('');
  const visible = families.filter((f) => f.name.includes(query)); // auto-mémoïsé
  const handleSelect = (id: string) => setSelectedId(id);         // auto-mémoïsé
  // ...
}
```

**Nuance essentielle — n'optimise pas prématurément :**
- Si le compilateur est activé dans ton projet : **écris du code simple**, laisse-le optimiser, n'ajoute `useMemo`/`useCallback` que si le Profiler prouve un vrai problème résiduel.
- Si le compilateur n'est **pas** activé (beaucoup de bases de code en 2026 ne l'ont pas encore) : la mémoïsation manuelle reste ton outil — mais **mesure d'abord** avec le React DevTools Profiler.
- Dans les deux cas : la mémoïsation a un **coût** (mémoire + comparaison des deps). Sur un calcul trivial ou un composant qui rend vite, elle coûte plus qu'elle ne rapporte.

> **Règle 2026 :** connaître `useMemo`/`useCallback` reste indispensable (lecture de code, projets sans compilateur, cas limites). Mais le réflexe par défaut n'est plus « je mémoïse tout » — c'est « j'écris clair, je mesure, j'optimise le point chaud avéré ».

### 2.8 Quand la mémoïsation manuelle est **inutile**

```tsx
// ❌ Calcul trivial — le coût du memo dépasse le gain
const doubled = useMemo(() => count * 2, [count]);
const doubled = count * 2; // ✅

// ❌ Fonction passée à un enfant NON mémoïsé — useCallback ne sert à rien
const onClick = useCallback(() => log(), []);
<PlainButton onClick={onClick} />; // PlainButton n'est pas memo() → aucun bénéfice

// ❌ Primitive dérivée — comparée par valeur, pas besoin de memo
const label = useMemo(() => `Total : ${count}`, [count]);
const label = `Total : ${count}`; // ✅
```

---

## 3. Worked examples

### Exemple 1 — Optimiser la liste des familles (TribuZen, sans compilateur)

On résout le cas concret du §1, en supposant un projet **sans** React Compiler (mémoïsation manuelle justifiée par le Profiler).

```tsx
// FamilyListPage.tsx — APRÈS optimisation
import { useState, useMemo, useCallback, memo } from 'react';

interface Family {
  id: string;
  name: string;
  memberCount: number;
}

type SortBy = 'name' | 'members';

// ─── Ligne mémoïsée : ne re-render que si family ou onSelect change ───
interface FamilyRowProps {
  family: Family;
  onSelect: (id: string) => void;
}

const FamilyRow = memo(function FamilyRow({ family, onSelect }: FamilyRowProps) {
  return (
    <tr onClick={() => onSelect(family.id)}>
      <td>{family.name}</td>
      <td>{family.memberCount}</td>
    </tr>
  );
});

function FamilyListPage({ families }: { families: Family[] }) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 1. Calcul coûteux mémoïsé : ne se rejoue QUE si families/query/sortBy changent.
  //    Sélectionner une ligne (selectedId) ne déclenche plus le filter+sort.
  const visible = useMemo(() => {
    return families
      .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) =>
        sortBy === 'name'
          ? a.name.localeCompare(b.name)
          : b.memberCount - a.memberCount,
      );
  }, [families, query, sortBy]);

  // 2. Référence stable : indispensable pour que le memo de FamilyRow tienne.
  //    setSelectedId est stable → deps vides.
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return (
    <div>
      <input
        placeholder="Rechercher une famille…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={() => setSortBy((s) => (s === 'name' ? 'members' : 'name'))}>
        Tri : {sortBy === 'name' ? 'nom' : 'membres'}
      </button>
      {selectedId && <p>Sélection : {selectedId}</p>}

      <table>
        <tbody>
          {visible.map((f) => (
            <FamilyRow key={f.id} family={f} onSelect={handleSelect} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FamilyListPage;
```

**Ce que chaque pièce apporte :**
- `useMemo` supprime le filter+sort superflu quand seule la sélection change.
- `useCallback` fige `handleSelect` → les `FamilyRow` non modifiés ne se re-rendent plus.
- `memo` sur `FamilyRow` transforme la stabilité de référence en **skip de rendu** effectif.
- Retire n'importe laquelle des trois pièces et le bénéfice s'effondre — c'est un système.

### Exemple 2 — Le même code, avec React Compiler activé

Sur un projet React 19 où le compilateur est branché dans le build, on **retire** la mémoïsation manuelle et on garde un code plat.

```tsx
// FamilyListPage.tsx — avec React Compiler, code naïf suffisant
import { useState } from 'react';

// Plus besoin de memo() : le compilateur mémoïse le composant automatiquement.
function FamilyRow({ family, onSelect }: FamilyRowProps) {
  return (
    <tr onClick={() => onSelect(family.id)}>
      <td>{family.name}</td>
      <td>{family.memberCount}</td>
    </tr>
  );
}

function FamilyListPage({ families }: { families: Family[] }) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Écrit naïvement : le compilateur détecte les deps [families, query, sortBy]
  // et met en cache le résultat automatiquement.
  const visible = families
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : b.memberCount - a.memberCount,
    );

  // Fonction inline : le compilateur la stabilise automatiquement.
  const handleSelect = (id: string) => setSelectedId(id);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {visible.map((f) => (
        <FamilyRow key={f.id} family={f} onSelect={handleSelect} />
      ))}
    </div>
  );
}
```

**Lecture comparée :** même comportement runtime (pas de re-render superflu), mais **zéro bruit de mémoïsation** dans le code. C'est la direction de React : le code exprime l'intention, le compilateur gère la performance. Tant que ton projet n'a pas le compilateur, tu restes sur l'Exemple 1.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — `useCallback` sans enfant `memo` en face

```tsx
// ❌ Croire que useCallback « optimise » à lui seul
const handleClick = useCallback(() => save(), []);
<SaveButton onClick={handleClick} />; // SaveButton n'est pas memo() → il re-render quand même
```

`useCallback` ne fait que **stabiliser une référence**. Sans `React.memo` (ou un `useEffect deps`) en aval qui exploite cette stabilité, il n'apporte rien — juste du surcoût. **Le stabiliser et le consommateur mémoïsé vont par paire.**

### PIÈGE #2 — `React.memo` cassé par une prop inline

```tsx
// ❌ memo neutralisé par un objet/fonction recréé à chaque rendu
const Row = memo(RowBase);
<Row data={row} style={{ color: 'red' }} onSelect={() => pick(row.id)} />;
//                     ^ nouvel objet             ^ nouvelle fonction → memo inutile
```

La comparaison superficielle de `memo` voit `style` et `onSelect` changer à chaque fois. **Une seule prop instable suffit à annuler tout le `memo`.** Stabiliser TOUTES les props objet/fonction, ou ne pas mettre `memo`.

### PIÈGE #3 — Oublier une dépendance (valeur stale)

```tsx
// ❌ multiplier n'est pas dans les deps → useMemo garde l'ancien facteur
const scaled = useMemo(() => values.map((v) => v * multiplier), [values]);
// ✅
const scaled = useMemo(() => values.map((v) => v * multiplier), [values, multiplier]);
```

Une dépendance oubliée fige la valeur mémoïsée sur un ancien état. Bug **silencieux** (pas d'erreur, juste un résultat faux). Garder `react-hooks/exhaustive-deps` actif.

### PIÈGE #4 — Tout mémoïser « au cas où »

```tsx
// ❌ « memo everything » : complexité + surcoût mémoire pour rien
function Tag({ label, onClose }: TagProps) {
  const upper = useMemo(() => label.toUpperCase(), [label]);   // trivial
  const close = useCallback(() => onClose(), [onClose]);        // pas d'enfant memo
  return <span onClick={close}>{upper}</span>;
}

// ✅ code simple : rendu déjà instantané
function Tag({ label, onClose }: TagProps) {
  return <span onClick={onClose}>{label.toUpperCase()}</span>;
}
```

La mémoïsation a un coût réel (mémoire + comparaison). Sur un calcul trivial ou un composant rapide, elle **dégrade** la lisibilité sans gain mesurable. **Mesure avec le Profiler avant d'optimiser** — et à l'ère du React Compiler, laisse-le faire par défaut.

### PIÈGE #5 — Croire que la mémoïsation « garantit » un seul rendu

`memo`/`useMemo` réduisent les re-renders **inutiles**, ils ne les suppriment pas tous. Un changement de state local, un changement de contexte, ou un changement réel de prop provoque toujours un rendu — c'est le fonctionnement normal de React, pas un bug à « corriger » à coups de memo.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, la page **liste des familles** (`FamilyListPage`) est le point chaud de performance : jusqu'à ~800 familles, recherche live, tri, et sélection d'une ligne pour ouvrir un panneau latéral.

- **`useMemo` sur le filtre/tri** (`src/features/family/FamilyListPage.tsx`) — le calcul `filter().sort()` ne doit se rejouer que sur changement de `query`, `sortBy` ou de la liste source, pas quand l'utilisateur sélectionne une ligne ou survole un bouton.
- **`useCallback` sur `handleSelect`** — passé à chaque `FamilyRow`. Sans stabilité de référence, sélectionner ou taper re-render les 800 lignes.
- **`React.memo` sur `FamilyRow`** (`src/features/family/FamilyRow.tsx`) — transforme la référence stable en skip de rendu réel. C'est le trio complet du §3, Exemple 1.

**Stratégie compilateur :** le repo `smaurier/tribuzen` cible React 19. Si le React Compiler est activé dans le build Vite, on **retire** la mémoïsation manuelle de `FamilyListPage`/`FamilyRow` (Exemple 2) et on garde un code plat, en validant au Profiler qu'il n'y a pas de régression. Sinon, on garde le trio manuel. Décision documentée dans l'ADR perf de la feature.

Fichiers cibles :
```
tribuzen/src/features/family/
  FamilyListPage.tsx   ← useMemo (filtre/tri) + useCallback (handleSelect)
  FamilyRow.tsx        ← React.memo
```

---

## 6. Points clés

1. À chaque rendu, objets/tableaux/fonctions littéraux sont recréés — nouvelle **référence**, même valeur ; React compare les props par référence.
2. `useMemo(fn, deps)` mémoïse une **valeur** calculée : recalcule seulement si une dépendance change.
3. `useCallback(fn, deps)` mémoïse une **fonction** : même référence tant que les deps sont stables. Inutile sans consommateur mémoïsé en aval.
4. `React.memo(Comp)` saute le re-render si les props n'ont pas changé (comparaison superficielle) — cassé par une seule prop objet/fonction instable.
5. `memo` + `useCallback` + `useMemo` forment un **système** : retirer une pièce annule le bénéfice des autres.
6. Le tableau de deps doit lister toute valeur réactive lue ; un oubli = valeur stale (bug silencieux). Garder `exhaustive-deps`.
7. React 19 + **React Compiler** = mémoïsation **automatique** : le code naïf suffit, `useMemo`/`useCallback` manuels deviennent souvent superflus.
8. Ne pas optimiser prématurément : mesurer au Profiler, mémoïser le point chaud avéré, pas « tout au cas où ».

---

## 7. Seeds Anki

```
Pourquoi une fonction ou un objet littéral pose-t-il problème en prop React ?|Il est recréé à chaque rendu (nouvelle référence). React compare les props par référence (Object.is) : l'enfant voit une prop « nouvelle » même si la valeur est identique, ce qui casse React.memo et re-déclenche les useEffect qui en dépendent.
Quelle est la différence entre useMemo et useCallback ?|useMemo mémoïse une VALEUR calculée (le résultat de la fonction). useCallback mémoïse la FONCTION elle-même. useCallback(fn, deps) équivaut à useMemo(() => fn, deps).
Pourquoi useCallback est-il inutile s'il n'y a pas de React.memo en face ?|useCallback ne fait que stabiliser une référence. Sans un enfant memo() (ou un hook avec deps) qui exploite cette stabilité, l'enfant re-render de toute façon : on paie le coût du memo sans aucun bénéfice.
Qu'est-ce qui casse un React.memo ?|Une seule prop objet/tableau/fonction recréée à chaque rendu (ex : style={{...}} ou onClick={() => ...} inline). La comparaison superficielle la voit changer et re-render le composant malgré le memo.
Que se passe-t-il si on oublie une dépendance dans useMemo/useCallback ?|La valeur mémoïsée reste « périmée » (stale) : elle garde l'ancienne valeur de la dépendance oubliée. Bug silencieux (pas d'erreur, résultat faux). Le lint react-hooks/exhaustive-deps le détecte.
En quoi le React Compiler (React 19) change-t-il l'usage de useMemo/useCallback ?|Il mémoïse automatiquement composants et valeurs à la compilation. Quand il est activé, la plupart des useMemo/useCallback manuels deviennent superflus : on écrit du code naïf et le compilateur élimine les re-renders inutiles.
Quelle est la règle d'or avant de mémoïser en React ?|Ne pas optimiser prématurément. Mesurer d'abord avec le React DevTools Profiler, puis mémoïser le point chaud avéré. La mémoïsation a un coût (mémoire + comparaison) ; sur un calcul trivial elle coûte plus qu'elle ne rapporte.
Comment React se compare-t-il à Vue/Angular pour le tracking de dépendances ?|Vue computed() et Angular computed() (signals) trackent les dépendances automatiquement. React exige un tableau de deps manuel : avantage = pas de magie, inconvénient = oubli possible menant à une valeur stale.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-11-usecallback-usememo/README.md`. Optimiser la liste des familles de l'admin TribuZen avec le trio `useMemo` + `useCallback` + `React.memo`, puis retirer la mémoïsation en scénario React Compiler. Corrigé complet + variante J+30 inclus.
