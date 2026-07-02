# Lab 11 — useCallback et useMemo

> **Outcome :** à la fin, tu sais optimiser une liste lourde de l'admin TribuZen avec le trio `useMemo` + `useCallback` + `React.memo`, prouver le gain au Profiler, et reconnaître quand le React Compiler rend cette mémoïsation superflue.
> **Vrai outil :** React 19 + Vite dev server + React DevTools Profiler (mesure réelle des re-renders dans le navigateur).
> **Feedback :** le coach valide visuellement + au Profiler en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu optimises la page **liste des familles** de l'admin TribuZen. Elle affiche 800 familles, avec recherche live, tri, et sélection d'une ligne. Sans optimisation, chaque frappe re-render les 800 lignes et rejoue le filtre/tri.

**Objectif exact :**
1. Partir d'une version **non optimisée** qui rame (fournie ci-dessous).
2. Ajouter un **compteur de rendus** par `FamilyRow` (via `useRef`) pour *voir* les re-renders.
3. Optimiser avec `useMemo` (filtre/tri), `useCallback` (`handleSelect`), `React.memo` (`FamilyRow`).
4. Vérifier au Profiler : taper dans la recherche ne doit re-render que les lignes réellement affichées, et sélectionner une ligne ne doit **pas** rejouer le filtre/tri.

**Données de départ (à copier dans le projet) :**

```tsx
export interface Family {
  id: string;
  name: string;
  memberCount: number;
}

// 800 familles générées
const ALL_FAMILIES: Family[] = Array.from({ length: 800 }, (_, i) => ({
  id: `f${i + 1}`,
  name: `Famille ${String(i + 1).padStart(3, '0')}`,
  memberCount: 1 + (i % 7),
}));
```

**Version non optimisée (point de départ — à corriger) :**

```tsx
function FamilyListPage() {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'members'>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Recalculé à chaque rendu + fonction recréée à chaque rendu
  const visible = ALL_FAMILIES
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sortBy === 'name' ? a.name.localeCompare(b.name) : b.memberCount - a.memberCount,
    );
  const handleSelect = (id: string) => setSelectedId(id);
  // ...
}
```

**Contraintes :**
- `FamilyRow` doit être un composant **séparé** enveloppé dans `React.memo`.
- Le compteur de rendus utilise `useRef` (incrémenté dans le corps du composant) — **pas** de `useState`.
- **Pas de gap-fill** : tu réécris le composant complet à partir du starter.
- Aucun fichier `exercise.ts` / `solution.ts` : tu travailles dans un vrai projet Vite.

### Starter minimal

```
pnpm create vite@latest tribuzen-lab-11 --template react-ts
```

```
src/
  features/
    family/
      FamilyRow.tsx        ← à écrire (memo + compteur useRef)
      FamilyListPage.tsx   ← à écrire (useMemo + useCallback)
  App.tsx                  ← branche <FamilyListPage />
```

Lance `pnpm dev`, ouvre React DevTools → onglet Profiler.

---

## Étapes (en friction)

1. **Écris `FamilyRow.tsx`** — props `family: Family` et `onSelect: (id: string) => void`. Ajoute `const renders = useRef(0); renders.current += 1;` et affiche le compteur dans une cellule. Enveloppe l'export dans `memo(...)`.
2. **Écris `FamilyListPage.tsx` — version naïve d'abord** : filtre/tri inline, `handleSelect` inline. Lance, tape dans la recherche, observe au Profiler que **toutes** les lignes re-render et que les compteurs explosent.
3. **Mémoïse le calcul** : enveloppe le `filter().sort()` dans `useMemo(..., [query, sortBy])`. Vérifie que sélectionner une ligne ne rejoue plus le tri (ajoute un `console.log` dans le calcul pour le prouver).
4. **Stabilise le callback** : `handleSelect` dans `useCallback(..., [])`. Vérifie au Profiler que les `FamilyRow` non modifiés ne re-render plus.
5. **Vérifie le tandem** : retire temporairement le `memo` de `FamilyRow` → les compteurs remontent malgré le `useCallback`. Remets-le. Comprends que les trois pièces sont indissociables.
6. **Bonus discernement** : retire `useCallback` en gardant `memo` → les lignes re-render à nouveau. Conclusion : `useCallback` seul ou `memo` seul ne suffit pas.

---

## Corrigé complet commenté

```tsx
// ─── src/features/family/FamilyRow.tsx ──────────────────────────
import { memo, useRef } from 'react';

export interface Family {
  id: string;
  name: string;
  memberCount: number;
}

interface FamilyRowProps {
  family: Family;
  onSelect: (id: string) => void;
}

// memo : saute le re-render si family ET onSelect sont référentiellement inchangés.
// Le compteur de rendus (useRef) prouve visuellement quand la ligne re-render.
const FamilyRow = memo(function FamilyRow({ family, onSelect }: FamilyRowProps) {
  const renders = useRef(0);
  renders.current += 1; // incrémenté à chaque rendu réel de CETTE ligne

  return (
    <tr onClick={() => onSelect(family.id)} style={{ cursor: 'pointer' }}>
      <td>{family.name}</td>
      <td>{family.memberCount}</td>
      <td style={{ color: '#999', fontSize: '0.8rem' }}>rendus : {renders.current}</td>
    </tr>
  );
});

export default FamilyRow;

// ─── src/features/family/FamilyListPage.tsx ─────────────────────
import { useState, useMemo, useCallback } from 'react';
import FamilyRow, { type Family } from './FamilyRow';

const ALL_FAMILIES: Family[] = Array.from({ length: 800 }, (_, i) => ({
  id: `f${i + 1}`,
  name: `Famille ${String(i + 1).padStart(3, '0')}`,
  memberCount: 1 + (i % 7),
}));

type SortBy = 'name' | 'members';

function FamilyListPage() {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 1. useMemo : le filtre + tri (coûteux sur 800 items) ne se rejoue QUE si
  //    query ou sortBy change. Sélectionner une ligne (selectedId) ne le déclenche plus.
  const visible = useMemo(() => {
    console.log('filter+sort recalculé'); // preuve : n'apparaît pas au clic de sélection
    return ALL_FAMILIES
      .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) =>
        sortBy === 'name'
          ? a.name.localeCompare(b.name)
          : b.memberCount - a.memberCount,
      );
  }, [query, sortBy]); // deps exhaustives : toute valeur réactive lue est déclarée

  // 2. useCallback : référence stable → le memo de FamilyRow tient réellement.
  //    setSelectedId est stable (setter React), donc deps vides.
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <input
        placeholder="Rechercher une famille…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={() => setSortBy((s) => (s === 'name' ? 'members' : 'name'))}>
        Tri : {sortBy === 'name' ? 'nom' : 'membres'}
      </button>
      <p>{visible.length} familles — sélection : {selectedId ?? 'aucune'}</p>

      <table>
        <thead>
          <tr><th>Nom</th><th>Membres</th><th>Rendus</th></tr>
        </thead>
        <tbody>
          {visible.map((f) => (
            // 3. FamilyRow en memo + onSelect stable → seules les lignes
            //    dont family change re-render.
            <FamilyRow key={f.id} family={f} onSelect={handleSelect} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FamilyListPage;

// ─── src/App.tsx ─────────────────────────────────────────────────
import FamilyListPage from './features/family/FamilyListPage';

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>TribuZen Admin — Lab 11</h1>
      <FamilyListPage />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- `useMemo([query, sortBy])` isole le calcul coûteux : le `console.log` ne s'affiche pas quand on clique une ligne (seul `selectedId` change) — preuve que le tri n'est pas rejoué.
- `useCallback([])` fige `handleSelect` : sans lui, chaque frappe recrée la fonction et re-render les 800 `FamilyRow` malgré leur `memo`.
- `memo` sur `FamilyRow` convertit la stabilité de référence en skip de rendu : les compteurs `useRef` des lignes non modifiées restent figés.
- Les trois sont **indissociables** : retirer `memo` OU `useCallback` fait remonter les compteurs. C'est ce que l'étape 5-6 fait constater.
- Le compteur utilise `useRef` (mutation hors rendu) et non `useState` : l'incrémenter ne déclenche pas de re-render supplémentaire, il reflète fidèlement le nombre de rendus.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes, sans rouvrir ce corrigé ni le module 11 :**

1. Ajoute un second calcul dérivé mémoïsé : `stats = useMemo(() => ({ total, avgMembers }), [visible])` affiché en en-tête (moyenne de membres sur les familles visibles).
2. Ajoute un bouton « Tout replier » qui met `selectedId` à `null` — vérifie au Profiler qu'il ne rejoue **pas** le filtre/tri.
3. **Scénario React Compiler** : suppose que le React Compiler est activé dans le build. Réécris `FamilyListPage` et `FamilyRow` **sans** `useMemo`, `useCallback` ni `memo` (code plat), et explique en un commentaire pourquoi les re-renders restent maîtrisés.
4. **Critère de réussite :** version manuelle → compteurs stables au Profiler ; version compilateur → même comportement runtime, zéro mémoïsation manuelle dans le code.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, cette optimisation vit ici :

```
tribuzen/src/features/family/
  FamilyListPage.tsx   ← useMemo (filtre/tri) + useCallback (handleSelect)
  FamilyRow.tsx        ← React.memo + compteur retiré en prod
```

**Différences par rapport au lab :**
- Les 800 familles viennent d'un `useQuery` (TanStack Query, module 05b), pas d'un tableau généré — `families` devient une dépendance réelle du `useMemo`.
- Le compteur `useRef` de rendus est un outil de diagnostic du lab : il n'est **pas** commité en production.
- **Décision compilateur :** si le React Compiler est activé dans le build Vite du repo, on retire la mémoïsation manuelle (scénario variante §3) et on valide au Profiler qu'il n'y a pas de régression. Sinon, on garde le trio. La décision est tracée dans un court ADR perf de la feature `family`.

**Commit cible :**
```
perf(family): mémoïse filtre/tri + stabilise handleSelect (FamilyListPage)
perf(family): FamilyRow en React.memo — supprime les re-renders de liste
```
