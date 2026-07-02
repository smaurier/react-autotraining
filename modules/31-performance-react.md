---
titre: Performance React
cours: 04-react
notions: [modèle de rendu et cascade de re-renders, diagnostic avec React DevTools Profiler, React.memo, useMemo et useCallback en rappel, stabilité des props, virtualisation de longues listes en survol, code splitting et lazy en rappel, React Compiler et mémoïsation automatique React 19]
outcomes: [diagnostiquer un re-render inutile au React DevTools Profiler avant toute optimisation, appliquer une mémoïsation ciblée (React.memo + callbacks stables) uniquement là où le Profiler le justifie, expliquer ce que le React Compiler mémoïse automatiquement en React 19]
prerequis: [30-tests-api-msw]
next: 32-patterns-composition
libs: [{ name: react, version: "^19" }]
tribuzen: liste admin de 800 familles qui rame — diagnostic Profiler, mémoïsation ciblée de FamilyRow, stabilisation des callbacks
last-reviewed: 2026-07
---

# Performance React

> **Outcomes — tu sauras FAIRE :** diagnostiquer un re-render inutile au React DevTools Profiler avant d'optimiser, appliquer une mémoïsation ciblée seulement là où le Profiler le justifie, expliquer ce que le React Compiler mémoïse automatiquement en React 19.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

L'admin TribuZen affiche la liste des familles. En prod, un support te remonte que la page « rame » : chaque frappe dans le champ de recherche gèle l'interface une demi-seconde. Tu ouvres le code du collègue :

```tsx
// FamilyListPage.tsx — la version qui rame
interface Family {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  status: 'active' | 'pending' | 'archived';
}

function FamilyListPage({ families }: { families: Family[] }) {
  const [search, setSearch] = useState('');

  // 800 familles filtrées à CHAQUE frappe
  const visible = families.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <ul>
        {visible.map((family) => (
          <FamilyRow
            key={family.id}
            family={family}
            onArchive={(id) => archiveFamily(id)}
          />
        ))}
      </ul>
    </div>
  );
}

function FamilyRow({ family, onArchive }: { family: Family; onArchive: (id: string) => void }) {
  // Rendu « coûteux » : formatage, badge, calculs par ligne
  return (
    <li>
      {family.name} — {family.city} ({family.memberCount})
      <button onClick={() => onArchive(family.id)}>Archiver</button>
    </li>
  );
}
```

**La tentation du débutant :** saupoudrer `useMemo`, `useCallback` et `React.memo` partout « pour que ça aille plus vite ». C'est l'inverse de la bonne méthode.

**La méthode de ce module :**
1. **Mesurer d'abord** — le React DevTools Profiler te dit *quels* composants re-rendent et *combien de temps* ça prend. Sans mesure, tu optimises à l'aveugle.
2. **Comprendre la cause** — ici, 800 `FamilyRow` re-rendent à chaque frappe alors que leurs données ne changent pas.
3. **Corriger de façon ciblée** — mémoïser `FamilyRow`, stabiliser le callback `onArchive`, et pas une ligne de plus.

Et le twist React 19 : le **React Compiler** mémoïse une grande partie de ça **automatiquement**. On verra où il te dispense d'écrire `memo`/`useMemo` à la main, et où il ne suffit pas.

---

## 2. Théorie complète, concise

### 2.1 Quand un composant re-rend

Un composant re-rend dans exactement trois situations :

1. **Son propre state change** (`useState`, `useReducer`).
2. **Son parent re-rend** — par défaut, tous les enfants re-rendent en cascade.
3. **Un contexte auquel il souscrit change** (`useContext`).

La misconception centrale : « les props ont changé, donc l'enfant re-rend ». Faux. C'est l'inverse : le parent re-rend → l'enfant re-rend → **il reçoit de nouvelles props au passage**, changées ou non.

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      {/* Child re-rend à CHAQUE clic, alors que title est constant */}
      <Child title="Statique" />
    </div>
  );
}

function Child({ title }: { title: string }) {
  console.log('Child rendu'); // s'affiche à chaque clic
  return <h2>{title}</h2>;
}
```

Un re-render n'est pas forcément un problème : React compare le résultat au DOM existant (diff) et n'écrit dans le DOM que les différences. Le coût devient réel quand le rendu lui-même est cher (calcul, gros arbre, longue liste) ou multiplié par des centaines d'éléments — exactement notre cas TribuZen.

### 2.2 Diagnostiquer AVANT d'optimiser — le React DevTools Profiler

Règle d'or, non négociable : **on ne mémoïse rien sans avoir mesuré**. La mémoïsation a un coût (mémoire, comparaison de props, complexité de lecture). L'appliquer sans preuve dégrade souvent le code sans gain.

Le Profiler (extension **React Developer Tools**, onglet **Profiler**) :

1. Cliquer **Record**.
2. Reproduire l'action lente (taper dans la recherche).
3. Stopper → lire le **flamegraph** et la vue **Ranked**.

Ce qu'on cherche :

- **Composants qui re-rendent sans changer** — DevTools peut afficher « Why did this render? » (activer *Record why each component rendered* dans les réglages du Profiler). Un composant grisé/large qui rend alors que ses données sont identiques = candidat.
- **Rendus longs** — au-delà de ~16 ms, on perd une frame à 60 fps.
- **Cascade** — un re-render racine qui propage à tout l'arbre.

> Le Profiler transforme « ça rame » (ressenti) en « `FamilyRow` re-rend 800 fois par frappe, 8 ms au total » (fait mesuré). C'est ce fait, pas l'intuition, qui autorise à optimiser.

### 2.3 React.memo — figer un composant sur ses props

`React.memo` enveloppe un composant : il **saute le re-render si les props sont identiques** (comparaison superficielle, `Object.is` prop à prop).

```tsx
const FamilyRow = React.memo(function FamilyRow({
  family,
  onArchive,
}: {
  family: Family;
  onArchive: (id: string) => void;
}) {
  return (
    <li>
      {family.name} — {family.city}
      <button onClick={() => onArchive(family.id)}>Archiver</button>
    </li>
  );
});
```

Piège immédiat : `memo` compare **par référence**. Si le parent passe un objet ou une fonction recréé à chaque rendu, la comparaison échoue toujours et `memo` ne sert à rien.

```tsx
// ❌ memo neutralisé : nouvelle fonction onArchive à chaque rendu du parent
<FamilyRow family={family} onArchive={(id) => archiveFamily(id)} />
```

C'est pour ça que `memo` va **presque toujours de pair avec la stabilisation des props** (2.5).

### 2.4 useMemo et useCallback — rappel du module 11

Rappel condensé (détail complet : module `11-usecallback-usememo`) :

- `useMemo(fn, deps)` mémorise une **valeur calculée** ; ne recalcule que si une dépendance change.
- `useCallback(fn, deps)` mémorise une **référence de fonction** ; utile seulement si la fonction est passée à un composant `memo` ou sert de dépendance à un `useEffect`.

```tsx
// Filtrer 800 familles : mémoïser évite de refiltrer quand seul un autre state change
const visible = useMemo(
  () => families.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
  [families, search],
);

// Stabiliser le callback pour que React.memo(FamilyRow) tienne
const handleArchive = useCallback((id: string) => archiveFamily(id), []);
```

`useCallback(fn, [])` renvoie **la même référence** entre les rendus → `memo(FamilyRow)` voit une prop `onArchive` inchangée → il saute le re-render. C'est le duo gagnant : `memo` sur l'enfant + `useCallback` sur le callback parent.

### 2.5 Stabilité des props — le vrai levier

Mémoïser un enfant ne sert que si **toutes** ses props sont stables. Sources classiques d'instabilité :

```tsx
// ❌ objets/fonctions recréés à chaque rendu → référence neuve à chaque fois
<FamilyRow
  family={family}
  style={{ padding: 8 }}                 // nouvel objet
  onArchive={() => archiveFamily(id)}    // nouvelle fonction
  tags={family.tags ?? []}               // nouveau tableau si tags absent
/>
```

Trois réflexes :
- Sortir les objets/styles constants **hors** du composant (constante de module).
- Envelopper les callbacks dans `useCallback` (ou passer l'id et gérer l'action au parent).
- Éviter les valeurs par défaut inline (`?? []`) qui fabriquent une référence à chaque rendu ; en extraire une constante partagée.

La prop `key` n'est **pas** une optimisation de perf : elle sert à l'identité des éléments de liste. Une `key` stable (`family.id`, jamais l'index) évite que React démonte/remonte des lignes à tort.

### 2.6 React 19 : le React Compiler mémoïse automatiquement

**Nouveauté majeure React 19.** Le **React Compiler** (build-time, via un plugin Babel/SWC) analyse tes composants et **insère la mémoïsation à ta place** : il mémoïse les valeurs calculées, stabilise les callbacks et les éléments JSX, sans que tu écrives `useMemo`, `useCallback` ni, dans beaucoup de cas, `React.memo`.

Conséquences pratiques :

- Sur un projet où le Compiler est activé, **la plupart des `useMemo`/`useCallback` manuels deviennent inutiles** : le compilateur fait le travail, souvent plus finement (il mémoïse par sous-expression, pas par hook global).
- Le mantra ne change pas : **mesure avant d'optimiser**. Avec le Compiler, la première « optimisation » est souvent *ne rien écrire* et vérifier au Profiler que c'est déjà rapide.
- Le Compiler s'appuie sur le respect des **Règles de React** (composants purs, pas de mutation de props/state pendant le rendu). Du code impur peut être ignoré par le compilateur (« bail out ») — ESLint (`eslint-plugin-react-hooks` avec les règles du compilateur) te signale les composants non compilables.

```tsx
// Avec le React Compiler activé : PAS de useMemo/useCallback à écrire.
// Le compilateur mémoïse `visible` et stabilise `handleArchive` automatiquement.
function FamilyListPage({ families }: { families: Family[] }) {
  const [search, setSearch] = useState('');
  const visible = families.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );
  const handleArchive = (id: string) => archiveFamily(id);
  return (
    <ul>
      {visible.map((f) => (
        <FamilyRow key={f.id} family={f} onArchive={handleArchive} />
      ))}
    </ul>
  );
}
```

Ce que le Compiler ne fait **pas** pour toi :
- Il n'accélère pas un algorithme O(n²) : la mémoïsation évite un recalcul, pas un mauvais algo.
- Il ne virtualise pas une liste de 10 000 lignes (2.7).
- Il n'est pas encore partout : sur un projet **sans** Compiler activé, la mémoïsation manuelle (2.3–2.5) reste ta seule option. **Vérifie si le Compiler est activé avant de supprimer des `memo`.**

### 2.7 Virtualisation de longues listes — en survol

Même parfaitement mémoïsée, une liste de milliers de lignes reste lente : le coût est de **monter des milliers de nœuds DOM**. La **virtualisation** ne rend que les lignes visibles dans la fenêtre (+ un petit buffer), et recycle les nœuds au scroll.

```tsx
// Survol conceptuel avec @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualFamilyList({ families }: { families: Family[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: families.length,        // 10 000 lignes logiques
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,        // hauteur estimée d'une ligne (px)
  });
  // Seules ~20 lignes existent réellement dans le DOM à un instant donné
  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      {/* ... rendu des items virtuels ... */}
    </div>
  );
}
```

Seuil pratique : en-dessous de ~100–200 lignes, mémoïsation suffit. Au-delà de quelques centaines de lignes affichées **simultanément**, la virtualisation devient le vrai levier (bibliothèques : `@tanstack/react-virtual`, `react-window`).

### 2.8 Code splitting et lazy — rappel du module 19

Rappel (détail : module `19-protection-et-lazy`). La perf, ce n'est pas que le rendu : c'est aussi **le poids du bundle** au premier chargement. `React.lazy` + `Suspense` découpent le code pour ne charger un composant lourd qu'à la demande.

```tsx
import { lazy, Suspense } from 'react';

// Le panneau de stats (graphiques lourds) n'est téléchargé qu'à l'ouverture
const FamilyStatsPanel = lazy(() => import('./FamilyStatsPanel'));

function AdminDashboard() {
  const [showStats, setShowStats] = useState(false);
  return (
    <div>
      <button onClick={() => setShowStats(true)}>Voir les stats</button>
      {showStats && (
        <Suspense fallback={<p>Chargement…</p>}>
          <FamilyStatsPanel />
        </Suspense>
      )}
    </div>
  );
}
```

Deux axes de perf distincts, à ne pas confondre : **re-renders** (rapidité une fois chargé, 2.1–2.7) et **taille de bundle** (rapidité au chargement, code splitting).

---

## 3. Worked examples

### Exemple 1 — Corriger la liste TribuZen qui rame (projet SANS Compiler)

On part du cas concret. Contexte : projet où le React Compiler **n'est pas** activé — donc mémoïsation manuelle. Méthode complète mesure → cause → correction ciblée.

**Étape 1 — Mesurer.** Profiler → Record → taper 3 lettres dans la recherche → Stop. Lecture : chaque frappe déclenche un re-render de `FamilyListPage`, et dans la vue Ranked, `FamilyRow` apparaît **800 fois**, ~8 ms cumulés. « Why did this render? » sur une `FamilyRow` dont le nom ne correspond même pas au filtre : *props changed → onArchive*.

**Étape 2 — Diagnostic.** Deux causes :
- `onArchive={(id) => archiveFamily(id)}` : nouvelle fonction à chaque rendu → prop instable.
- `FamilyRow` non mémoïsé → re-rend même quand `family` est inchangé.

**Étape 3 — Corriger, et rien de plus.**

```tsx
import { useState, useMemo, useCallback, memo } from 'react';

interface Family {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  status: 'active' | 'pending' | 'archived';
}

function FamilyListPage({ families }: { families: Family[] }) {
  const [search, setSearch] = useState('');

  // Mémoïse le filtrage : ne refiltre que si families ou search changent
  const visible = useMemo(
    () =>
      families.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [families, search],
  );

  // Callback STABLE : même référence entre les rendus → memo(FamilyRow) tient
  const handleArchive = useCallback((id: string) => {
    archiveFamily(id);
  }, []);

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher une famille…"
      />
      <ul>
        {visible.map((family) => (
          <FamilyRow key={family.id} family={family} onArchive={handleArchive} />
        ))}
      </ul>
    </div>
  );
}

// Mémoïsé : re-rend seulement si family ou onArchive changent par référence
const FamilyRow = memo(function FamilyRow({
  family,
  onArchive,
}: {
  family: Family;
  onArchive: (id: string) => void;
}) {
  return (
    <li>
      {family.name} — {family.city} ({family.memberCount})
      <button onClick={() => onArchive(family.id)}>Archiver</button>
    </li>
  );
});
```

**Étape 4 — Re-mesurer.** Profiler à nouveau : une frappe ne re-rend plus que `FamilyListPage` + l'`input`. Les `FamilyRow` dont `family` est identique sont **skippés** (grisés « Did not render »). Le gel disparaît.

Ce qu'on n'a **pas** fait : pas de `memo` sur l'`input`, pas de `useMemo` sur `memberCount`, pas de micro-optimisation ailleurs. Le Profiler a désigné une cause unique ; on l'a traitée, point.

### Exemple 2 — Le même écran AVEC React Compiler activé

Même page, projet React 19 avec le **React Compiler** activé (plugin build + règles ESLint vertes).

```tsx
import { useState } from 'react';

function FamilyListPage({ families }: { families: Family[] }) {
  const [search, setSearch] = useState('');

  // Pas de useMemo : le Compiler mémoïse ce calcul automatiquement
  const visible = families.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Pas de useCallback : le Compiler stabilise cette fonction automatiquement
  const handleArchive = (id: string) => archiveFamily(id);

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <ul>
        {visible.map((family) => (
          <FamilyRow key={family.id} family={family} onArchive={handleArchive} />
        ))}
      </ul>
    </div>
  );
}

// Pas besoin de memo() : le Compiler saute les re-renders des enfants
// dont les props n'ont pas changé.
function FamilyRow({ family, onArchive }: { family: Family; onArchive: (id: string) => void }) {
  return (
    <li>
      {family.name} — {family.city}
      <button onClick={() => onArchive(family.id)}>Archiver</button>
    </li>
  );
}
```

**Comment vérifier que ça marche vraiment :** on ne se fie pas au Compiler sur parole. Profiler → Record → taper → Stop → on confirme que les `FamilyRow` non concernées sont skippées. Si le Compiler avait « bail out » sur un composant impur, le Profiler le montrerait (re-renders persistants) et ESLint l'aurait déjà signalé.

**La leçon des deux exemples :** le code React 19 idiomatique est le code **le plus simple** (Exemple 2). La mémoïsation manuelle (Exemple 1) reste nécessaire *seulement* sur les projets sans Compiler, ou sur les rares composants que le Compiler ne peut pas traiter. Dans les deux cas, la décision vient du **Profiler**, jamais de l'intuition.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Optimiser sans mesurer

```tsx
// ❌ memo + useCallback + useMemo « au cas où », sans avoir ouvert le Profiler
const Row = memo(function Row(props) { /* ... */ });
const handler = useCallback(() => {}, []);
const value = useMemo(() => x * 2, [x]); // calcul trivial mémoïsé pour rien
```

**Pourquoi c'est faux :** la mémoïsation a un coût (mémoire, comparaison, lecture plus difficile). Appliquée sans preuve, elle alourdit le code pour un gain nul — voire négatif. **Correct :** mesurer au Profiler, identifier LE goulot, corriger seulement lui.

### PIÈGE #2 — Croire que React.memo compare en profondeur

```tsx
// ❌ memo ne sert à rien : nouvel objet/fonction à chaque rendu du parent
<FamilyRow family={{ ...family }} onArchive={() => archive(id)} />
```

**Pourquoi c'est faux :** `memo` fait une comparaison **superficielle** par référence (`Object.is`). Un objet/fonction recréé à chaque rendu est toujours « différent ». **Correct :** stabiliser les props (constantes hors composant, `useCallback`) — sinon `memo` est neutralisé.

### PIÈGE #3 — useCallback / useMemo « par défaut » en React 19

```tsx
// ❌ sur un projet React Compiler, envelopper à la main est redondant
const handleClick = useCallback(() => setOpen(true), []);
const rows = useMemo(() => data.map(toRow), [data]);
```

**Pourquoi c'est faux :** avec le React Compiler, ces mémoïsations sont **déjà générées** — les écrire à la main duplique le travail et encombre le code. **Correct :** vérifier si le Compiler est activé (plugin + règles ESLint). S'il l'est, laisser le code simple ; s'il ne l'est pas, mémoïser à la main là où le Profiler le prouve.

### PIÈGE #4 — Prendre la key comme une optimisation

```tsx
// ❌ index comme key « pour aller plus vite »
{visible.map((family, i) => <FamilyRow key={i} family={family} />)}
```

**Pourquoi c'est faux :** `key` sert à l'**identité** des éléments, pas à la vitesse. Une `key` par index casse la réconciliation dès qu'on filtre/réordonne (React associe le mauvais DOM au mauvais item, bugs d'état). **Correct :** `key={family.id}` — stable et unique.

### PIÈGE #5 — Confondre re-render lent et bundle lourd

**Pourquoi c'est faux :** `memo`/`useMemo` accélèrent le **rendu** mais ne réduisent pas le poids téléchargé ; `lazy`/`Suspense` réduisent le **bundle** initial mais ne changent rien aux re-renders. **Correct :** diagnostiquer lequel des deux est en cause (Profiler pour le rendu, onglet Network / bundle analyzer pour le poids) et appliquer le bon outil.

---

## 5. Ancrage TribuZen

L'écran de référence est la **liste admin des familles** (`src/features/family/FamilyListPage.tsx`), qui peut afficher **800+ familles**. C'est là que les problèmes de perf de TribuZen apparaissent en premier.

- **`FamilyListPage`** (container) — détient le state `search` et le tri. C'est le point de départ du Profiler quand un support signale un ralentissement de la liste.
- **`FamilyRow`** (`src/features/family/FamilyRow.tsx`) — présentationnel affiché des centaines de fois. Cible n°1 de la mémoïsation ciblée : `memo` + callback `onArchive` stable, **uniquement** après confirmation au Profiler que ces lignes re-rendent inutilement.
- **`FamilyStatsPanel`** (`src/features/family/FamilyStatsPanel.tsx`) — panneau de graphiques lourds, chargé en `lazy` + `Suspense` : il n'entre dans le bundle que si l'admin ouvre les stats.
- **Config Compiler** — le projet TribuZen cible React 19 ; quand le React Compiler est activé au build, on **retire** les `useMemo`/`useCallback`/`memo` manuels devenus redondants et on garde le Profiler comme juge de paix.

Règle d'équipe TribuZen : **aucune PR de perf n'est mergée sans une capture Profiler avant/après**. Le ressenti « ça rame » ne justifie jamais à lui seul une mémoïsation.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/features/family/
  FamilyListPage.tsx     # container : search, tri, mesure Profiler
  FamilyRow.tsx          # présentationnel mémoïsé (si Profiler le prouve)
  FamilyStatsPanel.tsx   # lazy + Suspense (code splitting)
```

---

## 6. Points clés

1. Un composant re-rend si son state change, si son parent re-rend, ou si un contexte souscrit change — pas « parce que ses props ont changé ».
2. On **mesure au React DevTools Profiler AVANT** d'optimiser : « ça rame » (ressenti) doit devenir « X re-rend N fois, T ms » (fait) avant toute action.
3. `React.memo` saute le re-render si les props sont **superficiellement** égales (comparaison par référence) — inutile si les props sont recréées à chaque rendu.
4. `memo` va de pair avec la **stabilité des props** : callbacks en `useCallback`, objets/styles en constantes de module.
5. En **React 19, le React Compiler** insère la mémoïsation automatiquement — la plupart des `useMemo`/`useCallback`/`memo` manuels deviennent inutiles ; vérifier s'il est activé avant d'en supprimer.
6. Le Compiler ne corrige ni un mauvais algo, ni une liste de milliers de lignes : au-delà de quelques centaines de lignes affichées, **virtualiser** (`@tanstack/react-virtual`).
7. Perf de rendu (`memo`/Profiler) et perf de chargement (`lazy`/`Suspense`/bundle) sont deux problèmes distincts, avec des outils distincts.
8. **N'optimise pas prématurément** — le code React 19 idiomatique est le plus simple ; la mémoïsation est une réponse à une mesure, pas un réflexe.

---

## 7. Seeds Anki

```
Dans quels cas exacts un composant React re-rend-il ?|Trois cas : son state change (useState/useReducer), son parent re-rend (cascade par défaut), ou un contexte auquel il souscrit change (useContext). Pas « quand les props changent » — c'est le re-render du parent qui passe de nouvelles props.
Quelle est la règle d'or avant toute optimisation de perf React ?|Mesurer au React DevTools Profiler d'abord. On transforme un ressenti (« ça rame ») en fait (« FamilyRow re-rend 800 fois, 8 ms ») ; c'est le fait, pas l'intuition, qui autorise à mémoïser.
Que compare React.memo, et quand est-il inutile ?|Il compare les props de façon superficielle, par référence (Object.is). Il est inutile si le parent passe des objets/fonctions recréés à chaque rendu (référence toujours neuve) — d'où la nécessité de stabiliser les props (useCallback, constantes).
Pourquoi associe-t-on React.memo(enfant) et useCallback(callback parent) ?|useCallback garde la même référence de fonction entre les rendus ; sans lui, la prop callback change à chaque fois et React.memo(enfant) ne peut jamais sauter le re-render. Le duo memo + callback stable est ce qui fait tenir la mémoïsation.
Qu'apporte le React Compiler en React 19 ?|Il insère la mémoïsation automatiquement au build (valeurs calculées, callbacks stables, JSX), rendant la plupart des useMemo/useCallback/React.memo manuels inutiles. Il s'appuie sur les Règles de React ; du code impur peut être ignoré (bail out), signalé par ESLint.
Quand la mémoïsation ne suffit-elle plus, et que fait-on ?|Pour des listes de milliers de lignes affichées simultanément, le coût est de monter les nœuds DOM, pas le calcul. On virtualise (ne rendre que les lignes visibles) avec @tanstack/react-virtual ou react-window.
Quelle différence entre perf de rendu et perf de chargement ?|Rendu : rapidité une fois l'app chargée — outils memo/useMemo/Profiler. Chargement : poids du bundle au premier accès — outils React.lazy/Suspense/code splitting. Deux problèmes distincts, deux diagnostics (Profiler vs Network/bundle analyzer).
Pourquoi key n'est-elle pas une optimisation de performance ?|key sert à l'identité des éléments de liste pour la réconciliation, pas à la vitesse. Une key = index casse l'association DOM↔item lors des filtres/réordonnancements (bugs d'état). Utiliser un id stable (family.id).
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-31-performance-react/README.md`. Diagnostiquer au Profiler une liste TribuZen de 800 familles qui rame, puis appliquer une mémoïsation ciblée (`memo` + `useCallback`) — **mesurer avant, mesurer après**.
