# Lab 31 — Performance React : diagnostiquer avant d'optimiser

> **Outcome :** à la fin, tu sais utiliser le **React DevTools Profiler** pour prouver qu'une liste re-rend inutilement, puis appliquer une mémoïsation **ciblée** (`React.memo` + `useCallback`) et **re-mesurer** le gain.
> **Vrai outil :** React 19 + Vite dev server + extension **React Developer Tools** (onglet Profiler) dans le navigateur.
> **Feedback :** le coach valide en session sur captures Profiler avant/après — pas de test-runner auto-correcteur.

---

## Énoncé

Tu reprends la **liste admin des familles** de TribuZen. Générée avec 800 familles, elle « rame » : chaque frappe dans la recherche gèle l'UI. Ta mission n'est **pas** de saupoudrer des `memo` partout, mais de suivre la méthode : **mesurer → diagnostiquer → corriger juste ce qu'il faut → re-mesurer**.

Contexte du lab : projet React 19 **sans** React Compiler activé (mémoïsation manuelle). On verra à la fin ce que le Compiler changerait.

**Données de départ (starter à copier tel quel — c'est la version qui rame) :**

```tsx
// src/features/family/FamilyListPage.tsx
import { useState } from 'react';

export interface Family {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  status: 'active' | 'pending' | 'archived';
}

// Génère 800 familles de démo
export const DEMO_FAMILIES: Family[] = Array.from({ length: 800 }, (_, i) => ({
  id: `f${i}`,
  name: `Famille ${i.toString().padStart(3, '0')}`,
  city: ['Lyon', 'Paris', 'Nantes', 'Lille'][i % 4],
  memberCount: (i % 6) + 1,
  status: (['active', 'pending', 'archived'] as const)[i % 3],
}));

function archiveFamily(id: string) {
  console.log('archive', id);
}

export default function FamilyListPage({ families }: { families: Family[] }) {
  const [search, setSearch] = useState('');

  const visible = families.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher…"
      />
      <p>{visible.length} familles</p>
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

function FamilyRow({
  family,
  onArchive,
}: {
  family: Family;
  onArchive: (id: string) => void;
}) {
  // Simule un rendu un peu coûteux par ligne (calcul bidon volontaire)
  let acc = 0;
  for (let i = 0; i < 2000; i++) acc += i;

  return (
    <li>
      {family.name} — {family.city} ({family.memberCount}) [{acc > 0 ? family.status : ''}]
      <button onClick={() => onArchive(family.id)}>Archiver</button>
    </li>
  );
}
```

**Contraintes :**
- **Interdit d'ajouter le moindre `memo`/`useMemo`/`useCallback` avant d'avoir une capture Profiler** montrant le problème.
- La correction doit être **ciblée** : on ne touche que ce que le Profiler désigne.
- Après correction, une **seconde capture Profiler** doit prouver que les lignes non concernées ne re-rendent plus.

### Starter minimal

```
pnpm create vite@latest tribuzen-perf-lab --template react-ts
cd tribuzen-perf-lab
pnpm install
```

Puis :

```
src/
  features/family/
    FamilyListPage.tsx   ← colle le starter ci-dessus
  App.tsx                ← <FamilyListPage families={DEMO_FAMILIES} />
```

`App.tsx` de départ :

```tsx
import FamilyListPage, { DEMO_FAMILIES } from './features/family/FamilyListPage';

export default function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>TribuZen Admin — Lab 31</h1>
      <FamilyListPage families={DEMO_FAMILIES} />
    </div>
  );
}
```

Lance `pnpm dev`, installe **React Developer Tools** (Chrome/Firefox), ouvre l'onglet **Profiler**.

---

## Étapes (en friction)

1. **Mesure l'état initial.** Profiler → engrenage → coche *Record why each component rendered*. Puis **Record** → tape 3 lettres dans la recherche → **Stop**. Note : combien de `FamilyRow` re-rendent par frappe ? Quelle durée cumulée ? Lis « Why did this render? » sur une ligne dont le nom **ne matche pas** le filtre.
2. **Écris ton diagnostic** (2 lignes, à l'oral avec le coach) : quelles props sont instables ? Quel composant n'est pas mémoïsé ?
3. **Corrige de façon ciblée** — mémoïse `FamilyRow`, stabilise `onArchive` avec `useCallback`. Ne touche à rien d'autre.
4. **Re-mesure.** Nouvelle capture Profiler pendant une frappe. Vérifie que les `FamilyRow` inchangées sont marquées « Did not render ». Compare la durée cumulée avant/après.
5. **Cas limite — casse volontairement ta correction** : garde `memo(FamilyRow)` mais repasse `onArchive={(id) => archiveFamily(id)}` inline (retire `useCallback`). Re-mesure : les lignes re-rendent à nouveau. Conclus pourquoi `memo` seul ne suffit pas.
6. **(Bonus) `useMemo` sur le filtrage** : ajoute un second state (ex. un bouton de tri) et vérifie au Profiler que sans `useMemo`, le filtrage des 800 familles se relance même quand seul le tri change.

---

## Corrigé complet commenté

```tsx
// src/features/family/FamilyListPage.tsx
import { useState, useCallback, memo } from 'react';

export interface Family {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  status: 'active' | 'pending' | 'archived';
}

export const DEMO_FAMILIES: Family[] = Array.from({ length: 800 }, (_, i) => ({
  id: `f${i}`,
  name: `Famille ${i.toString().padStart(3, '0')}`,
  city: ['Lyon', 'Paris', 'Nantes', 'Lille'][i % 4],
  memberCount: (i % 6) + 1,
  status: (['active', 'pending', 'archived'] as const)[i % 3],
}));

function archiveFamily(id: string) {
  console.log('archive', id);
}

export default function FamilyListPage({ families }: { families: Family[] }) {
  const [search, setSearch] = useState('');

  // Le filtrage dépend de search, qui change à chaque frappe :
  // useMemo n'évite PAS le recalcul ici (deps changent), mais le GARDE
  // stable pour les autres re-renders (ex. un tri). Voir étape bonus.
  const visible = families.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  // CLÉ DU FIX #1 : référence de callback STABLE entre les rendus.
  // Sans ça, chaque FamilyRow reçoit une nouvelle fonction onArchive
  // à chaque frappe → memo(FamilyRow) est neutralisé.
  const handleArchive = useCallback((id: string) => {
    archiveFamily(id);
  }, []);

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher…"
      />
      <p>{visible.length} familles</p>
      <ul>
        {visible.map((family) => (
          // family est stable par référence (même objet dans le tableau),
          // onArchive est stable → memo peut sauter le re-render.
          <FamilyRow key={family.id} family={family} onArchive={handleArchive} />
        ))}
      </ul>
    </div>
  );
}

// CLÉ DU FIX #2 : memo → FamilyRow ne re-rend que si family ou onArchive
// changent par référence. Combiné au callback stable, une frappe qui ne
// modifie aucune famille ne re-rend AUCUNE ligne.
const FamilyRow = memo(function FamilyRow({
  family,
  onArchive,
}: {
  family: Family;
  onArchive: (id: string) => void;
}) {
  let acc = 0;
  for (let i = 0; i < 2000; i++) acc += i; // coût simulé par ligne

  return (
    <li>
      {family.name} — {family.city} ({family.memberCount}) [{acc > 0 ? family.status : ''}]
      <button onClick={() => onArchive(family.id)}>Archiver</button>
    </li>
  );
});
```

**Pourquoi ce corrigé est correct :**
- `useCallback(handleArchive, [])` renvoie **la même référence** à chaque rendu → la prop `onArchive` de chaque `FamilyRow` ne change pas → `memo` peut comparer et **skipper**.
- `memo(FamilyRow)` compare `family` (même objet du tableau, référence stable) et `onArchive` (stable) : les deux inchangés → pas de re-render de la ligne.
- On n'a **rien** mémoïsé d'autre (ni l'`input`, ni `visible` de façon obligatoire) : le Profiler ne désignait que les `FamilyRow`.
- La validation n'est pas « le code compile » mais **la seconde capture Profiler** : lignes « Did not render », durée cumulée effondrée.

**Ce que montre l'étape 5 (memo sans callback stable) :** `memo` compare par référence ; un `onArchive` inline recréé à chaque frappe est toujours « différent » → `memo` ne skippe jamais. Preuve concrète que `memo` et **stabilité des props** sont indissociables.

---

## Variante J+30 (fading)

**Même diagnostic, contraintes ajoutées — de mémoire, en 25 minutes, sans rouvrir ce corrigé ni le module 31 :**

1. Repars du starter qui rame (recopie-le, ne réutilise pas ton corrigé).
2. Diagnostique au Profiler **avant** de coder — capture obligatoire.
3. Corrige, mais cette fois ajoute aussi un **bouton de tri** (`name` ↑ / `memberCount` ↓) qui met à jour un state `sortKey`. Utilise `useMemo` pour que le tri **et** le filtre ne se recalculent que si `families`, `search` ou `sortKey` changent.
4. **Contrainte bonus :** active mentalement (ou réellement si tu sais configurer `babel-plugin-react-compiler`) le **React Compiler**, et liste les lignes de ton corrigé que tu pourrais **supprimer** (`useCallback`, `memo`) parce qu'il les génère automatiquement.

**Critère de réussite :** capture Profiler avant (lignes re-rendent) + après (lignes skippées), et une phrase juste sur ce que le React Compiler rendrait redondant.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, cet écran vit ici :

```
tribuzen/src/features/family/
  FamilyListPage.tsx     # container : search + tri, point de mesure Profiler
  FamilyRow.tsx          # présentationnel mémoïsé (si le Profiler le prouve)
  FamilyStatsPanel.tsx   # lazy + Suspense (code splitting, hors de ce lab)
```

**Différences par rapport au lab :**
- Les 800 familles viennent de l'API (`useQuery`, module 23), pas d'un `DEMO_FAMILIES` en dur. La référence du tableau `families` change à chaque refetch — d'où l'importance que `FamilyRow` compare `family` ligne à ligne.
- Le calcul « coûteux » simulé (`for` bidon) est remplacé par du vrai formatage (dates, badges de statut, calcul d'ancienneté).
- Quand le **React Compiler** est activé au build TribuZen, on **retire** `useCallback` et `memo` devenus redondants — et on garde le Profiler comme juge de paix : aucune PR de perf sans capture avant/après.

**Règle d'équipe :** on ne merge pas une optimisation sur ressenti. **Mesurer (Profiler) avant d'optimiser, re-mesurer après.**

**Commit cible :**
```
perf(family): mémoïsation ciblée de FamilyRow + callback stable (Profiler avant/après)
```
