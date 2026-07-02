# Lab 09 — useEffect et la synchronisation avec l'extérieur

> **Outcome :** à la fin, tu sais écrire un `useEffect` qui fetche une liste avec protection anti-race-condition (flag `ignore`), remplacer un effet inutile par une valeur dérivée, et synchroniser `document.title` avec cleanup — le tout en React 19 + TypeScript.
> **Vrai outil :** React 19 + Vite dev server (HMR + console + onglet Network du navigateur).
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis la page « Familles d'un espace » de l'admin TribuZen. Le vrai backend n'est pas là : tu utilises un **fetch mocké** fourni ci-dessous qui simule une latence réseau **variable** (c'est ce qui rend la race condition observable).

Objectifs :

1. **`FamilyListPage`** — recharge la liste des familles quand `spaceId` change, avec un `useEffect` **sécurisé** contre les race conditions (flag `ignore`).
2. **Compteur dérivé** — affiche « N familles » sans `useState` ni `useEffect` : c'est une valeur dérivée.
3. **`DocumentEditor`** — un champ « titre du document » qui synchronise `document.title` de l'onglet via `useEffect`, avec un cleanup qui restaure le titre précédent.
4. **Observer StrictMode** — constater le double-montage en dev et vérifier que ton cleanup le rend inoffensif.

**Mock à copier tel quel (à mettre dans `src/api/families.ts`) :**

```ts
export interface Family {
  id: string;
  name: string;
}

const DATA: Record<string, Family[]> = {
  A: [
    { id: 'a1', name: 'Les Dupont' },
    { id: 'a2', name: 'Les Martin' },
  ],
  B: [
    { id: 'b1', name: 'Les Nguyen' },
    { id: 'b2', name: 'Les Garcia' },
    { id: 'b3', name: 'Les Petit' },
  ],
};

// Latence VARIABLE et volontairement inversée : l'espace A répond LENTEMENT,
// l'espace B répond vite. Sans protection, passer A→B affiche les familles de A.
export function fetchFamilies(spaceId: string): Promise<Family[]> {
  const delay = spaceId === 'A' ? 1500 : 300;
  return new Promise((resolve) => {
    setTimeout(() => resolve(DATA[spaceId] ?? []), delay);
  });
}
```

**Contraintes :**
- Le compteur « N familles » **ne doit pas** être un state ni venir d'un effet.
- Le fetch **doit** utiliser un flag `ignore` posé par le cleanup.
- `<StrictMode>` **reste activé** (le défaut Vite) — ton code doit être correct malgré le double-run.
- **Pas de gap-fill** : tu écris chaque composant complet depuis le starter.

### Starter minimal

```
pnpm create vite@latest tribuzen-lab-09 --template react-ts
```

```
src/
  api/
    families.ts          ← copie le mock ci-dessus
  features/
    family/
      FamilyListPage.tsx ← à écrire
    docs/
      DocumentEditor.tsx ← à écrire
  App.tsx                ← boutons A/B + <FamilyListPage> + <DocumentEditor>
```

Lance `pnpm dev`, ouvre la console et l'onglet Network, et clique vite sur A puis B.

---

## Étapes (en friction)

1. **`FamilyListPage`** — props `{ spaceId: string }`. State `families: Family[]` et `status: 'loading' | 'ok' | 'error'`. Dans le `useEffect([spaceId])` : `let ignore = false`, `setStatus('loading')`, appelle `fetchFamilies(spaceId)`, et **ne setState que `if (!ignore)`**. Retourne `() => { ignore = true; }`.
2. **Compteur dérivé** — dans le même composant, `const count = families.length;` au rendu. Affiche `<h1>{count} familles</h1>`. Aucun effet pour ça.
3. **`DocumentEditor`** — state `title`. `useEffect([title])` : sauve `document.title` dans une variable locale, écris `document.title = \`TribuZen — ${title || 'Sans titre'}\``, et retourne un cleanup qui **restaure** la variable sauvée.
4. **`App`** — un `useState<'A' | 'B'>('A')` pour `spaceId`, deux boutons pour le changer, et les deux composants montés. Clique A→B **rapidement**.
5. **Reproduis le bug d'abord** : écris volontairement le fetch **sans** le flag `ignore`, clique A→B vite, observe que la liste finit sur A (le mauvais espace) car A répond après B. Puis ajoute le flag et re-teste.
6. **Observe StrictMode** : mets un `console.log('setup')` / `console.log('cleanup')` dans un effet et constate setup → cleanup → setup au montage. Vérifie que ta liste reste correcte malgré ça.

---

## Corrigé complet commenté

```tsx
// ─── src/api/families.ts ─────────────────────────────────────────
export interface Family {
  id: string;
  name: string;
}

const DATA: Record<string, Family[]> = {
  A: [
    { id: 'a1', name: 'Les Dupont' },
    { id: 'a2', name: 'Les Martin' },
  ],
  B: [
    { id: 'b1', name: 'Les Nguyen' },
    { id: 'b2', name: 'Les Garcia' },
    { id: 'b3', name: 'Les Petit' },
  ],
};

// A répond en 1500ms, B en 300ms → race condition visible sans protection
export function fetchFamilies(spaceId: string): Promise<Family[]> {
  const delay = spaceId === 'A' ? 1500 : 300;
  return new Promise((resolve) => {
    setTimeout(() => resolve(DATA[spaceId] ?? []), delay);
  });
}

// ─── src/features/family/FamilyListPage.tsx ──────────────────────
import { useState, useEffect } from 'react';
import { fetchFamilies, type Family } from '../../api/families';

interface FamilyListPageProps {
  spaceId: string;
}

function FamilyListPage({ spaceId }: FamilyListPageProps) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  // Valeur DÉRIVÉE — calculée au rendu, pas de state ni d'effet dédié
  const count = families.length;

  useEffect(() => {
    // Chaque exécution de l'effet possède SA propre variable ignore (closure).
    let ignore = false;
    setStatus('loading');

    fetchFamilies(spaceId)
      .then((data) => {
        // Si spaceId a déjà changé, le cleanup a mis ignore = true → on jette la réponse.
        if (!ignore) {
          setFamilies(data);
          setStatus('ok');
        }
      })
      .catch(() => {
        if (!ignore) setStatus('error');
      });

    // Cleanup : invalide CETTE exécution au changement de spaceId / au démontage.
    return () => {
      ignore = true;
    };
  }, [spaceId]);

  if (status === 'loading') return <p>Chargement…</p>;
  if (status === 'error') return <p>Erreur de chargement.</p>;

  return (
    <section>
      <h1>{count} familles</h1>
      <ul>
        {families.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
    </section>
  );
}

export default FamilyListPage;

// ─── src/features/docs/DocumentEditor.tsx ────────────────────────
import { useState, useEffect } from 'react';

function DocumentEditor({ initialTitle = '' }: { initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    // Sauver l'ancien titre pour pouvoir le restaurer au cleanup
    const previous = document.title;
    // Synchroniser le système externe (l'onglet du navigateur) avec le state
    document.title = `TribuZen — ${title || 'Sans titre'}`;

    return () => {
      // set up → clean up : on remet le titre d'avant en quittant l'éditeur
      document.title = previous;
    };
  }, [title]);

  return (
    <label style={{ display: 'block', marginTop: '1.5rem' }}>
      Titre du document{' '}
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
    </label>
  );
}

export default DocumentEditor;

// ─── src/App.tsx ─────────────────────────────────────────────────
import { useState } from 'react';
import FamilyListPage from './features/family/FamilyListPage';
import DocumentEditor from './features/docs/DocumentEditor';

function App() {
  const [spaceId, setSpaceId] = useState<'A' | 'B'>('A');

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>TribuZen Admin — Lab 09</h2>

      {/* Clique A puis B RAPIDEMENT : A est lent (1500ms), B rapide (300ms) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setSpaceId('A')} disabled={spaceId === 'A'}>
          Espace A (lent)
        </button>
        <button onClick={() => setSpaceId('B')} disabled={spaceId === 'B'}>
          Espace B (rapide)
        </button>
      </div>

      <p>Espace courant : <strong>{spaceId}</strong></p>
      <FamilyListPage spaceId={spaceId} />

      <hr style={{ margin: '2rem 0' }} />
      <DocumentEditor initialTitle="Compte-rendu réunion" />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- **Race condition neutralisée** : chaque exécution de l'effet a sa propre closure `ignore`. Passer A→B met `ignore = true` sur l'exécution de A ; quand la réponse lente de A arrive, elle est jetée. Seule la dernière exécution (B) applique son résultat. La liste finit **toujours** sur l'espace courant.
- **Compteur dérivé** : `count = families.length` est calculé au rendu. Impossible d'être en retard d'un rendu, aucun rendu superflu, aucun effet.
- **`DocumentEditor`** : `document.title` est hors de React — c'est un *vrai* cas de `useEffect`. Le cleanup restaure le titre précédent quand le composant se démonte ou que `title` change (set up → clean up).
- **StrictMode-safe** : le double-montage dev déclenche setup → cleanup → setup. Le cleanup pose `ignore = true` puis le remount refait un fetch propre ; `document.title` est restauré puis re-synchronisé. Rien ne casse.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes, sans rouvrir ce corrigé ni le module 09 :**

1. Remplace le flag `ignore` par un **`AbortController`** : passe `controller.signal` à un vrai `fetch` (utilise `https://jsonplaceholder.typicode.com/users?_limit=3` comme endpoint), et `controller.abort()` dans le cleanup. Gère `err.name === 'AbortError'` comme un cas **normal** (ne pas passer en `status: 'error'`).
2. Ajoute un **debounce de recherche** : un `<input>` de filtre dont la valeur, après 400ms sans frappe (`setTimeout` + cleanup `clearTimeout`), déclenche le refetch. Le cleanup du timer doit annuler le `setTimeout` précédent à chaque frappe.
3. Ajoute un compteur **dérivé** « N résultats filtrés » basé sur la liste + le filtre — toujours sans `useState` pour le compte.

**Critère de réussite :** taper vite dans le filtre ne lance qu'**un** fetch (le dernier), l'onglet Network montre les requêtes annulées (`canceled`), et changer d'espace pendant un fetch en cours l'annule proprement sans erreur affichée.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces effets vivent ici :

```
tribuzen/src/
  features/
    family/
      FamilyListPage.tsx   # useEffect fetch + flag ignore (ou AbortController)
      useFamilies.ts       # étape suivante : extraire l'effet en custom hook
    docs/
      DocumentEditor.tsx   # useEffect → document.title, cleanup restaure
```

**Différences par rapport au lab :**
- Le mock `fetchFamilies` sera un vrai appel API (client `fetch`/`ky` avec `signal`), puis migré vers **TanStack Query** (`useQuery({ queryKey: ['families', spaceId] })`) qui gère cache, dédoublonnage et annulation à ta place — mais tu sauras ce qu'il fait sous le capot.
- L'effet de `FamilyListPage` sera extrait dans un **custom hook** `useFamilies(spaceId)` retournant `{ families, status }` (préparation du module hooks personnalisés).
- Le compteur dérivé restera une simple variable / `useMemo` — jamais un state synchronisé par effet.

**Commit cible :**
```
feat(family): FamilyListPage — fetch familles par espace, anti-race (flag ignore)
feat(docs): DocumentEditor — sync document.title avec cleanup
refactor(family): supprime le compteur par effet au profit d'une valeur dérivée
```
