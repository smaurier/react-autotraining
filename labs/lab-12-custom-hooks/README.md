# Lab 12 — Custom hooks

> **Outcome :** à la fin, tu sais extraire une logique stateful dupliquée dans un custom hook typé (`useFamilies`, `useToggle`), le réutiliser sur deux écrans, et vérifier que chaque appel crée sa propre instance d'état.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu factorises la couche « hooks de données » de l'admin TribuZen. Deux écrans ont besoin de la liste des familles ; aujourd'hui la logique de fetch est copiée-collée. Cahier des charges **exact** :

1. **`useFamilies()`** — custom hook qui charge les familles via `fetch`, expose `families`, `isLoading`, `error`, `refetch`. Gère l'annulation avec `AbortController`.
2. **`useToggle()`** — custom hook générique pour un booléen basculable : `value`, `toggle`, `setOn`, `setOff`.
3. **`FamilyListPage`** — consomme `useFamilies()`, affiche un tableau, un bouton « Réessayer » sur erreur.
4. **`InvitationPage`** — consomme **le même** `useFamilies()` dans un `<select>`, plus un `useToggle()` pour ouvrir/fermer un panneau d'aide.

**Endpoint de test (aucun backend requis)** — utilise un faux endpoint JSON local. Crée `public/api/families.json` (Vite le sert à `/api/families.json`) :

```json
[
  { "id": "f1", "name": "Les Dupont" },
  { "id": "f2", "name": "Famille Martin" },
  { "id": "f3", "name": "Tribu Nguyen" }
]
```

**Type partagé (à mettre dans `src/types/family.ts`) :**

```tsx
export interface Family {
  id: string;
  name: string;
}
```

**Contraintes :**
- La logique de fetch existe **une seule fois** — interdit de la dupliquer entre les deux pages.
- `useFamilies` et `useToggle` respectent les règles des hooks (appel au niveau supérieur uniquement).
- `useToggle` retourne un **objet** (`as const`), pas un tuple.
- **Pas de gap-fill** — tu écris chaque hook complet depuis le starter.

### Starter minimal

```
pnpm create vite@latest tribuzen-hooks --template react-ts
```

```
public/
  api/
    families.json    ← les 3 familles ci-dessus
src/
  types/
    family.ts        ← interface Family
  hooks/
    useFamilies.ts   ← à écrire
    useToggle.ts     ← à écrire
  pages/
    FamilyListPage.tsx   ← à écrire, consomme useFamilies
    InvitationPage.tsx   ← à écrire, consomme useFamilies + useToggle
  App.tsx            ← affiche les deux pages côte à côte
```

Lance `pnpm dev` et valide dans le navigateur au fur et à mesure.

---

## Étapes (en friction)

1. **Écris `useToggle.ts`** — `useState(initial)`, plus `toggle`/`setOn`/`setOff`. Retourne `{ value, toggle, setOn, setOff } as const`.
2. **Écris `useFamilies.ts`** — trois `useState` (`families`, `isLoading`, `error`), un `useState` `reloadKey` pour le refetch. `useEffect` qui fetch `/api/families.json` avec `AbortController`, cleanup `controller.abort()`. Ignore l'`AbortError` dans le `catch`. Expose `refetch` qui incrémente `reloadKey`.
3. **Écris `FamilyListPage.tsx`** — appelle `useFamilies()`. Affiche `Chargement…` si `isLoading`, un message + bouton « Réessayer » (`onClick={refetch}`) si `error`, sinon la liste `<ul>`.
4. **Écris `InvitationPage.tsx`** — appelle `useFamilies()` (2e instance !) pour peupler un `<select>`, et `useToggle()` pour un panneau d'aide affiché conditionnellement.
5. **Branche les deux dans `App.tsx`** et ouvre le navigateur. Ouvre l'onglet Réseau : tu dois voir **deux** requêtes `families.json` — preuve que chaque appel a sa propre instance d'état.
6. **Vérifie les cas limites** : renomme le fichier en `families.jsonX` → les deux pages affichent l'erreur ; le bouton « Réessayer » relance le fetch ; le toggle d'aide ouvre/ferme sans toucher aux familles.

---

## Corrigé complet commenté

```tsx
// ─── src/types/family.ts ────────────────────────────────────────
export interface Family {
  id: string;
  name: string;
}

// ─── src/hooks/useToggle.ts ─────────────────────────────────────
import { useState } from 'react';

// Hook générique — aucune connaissance métier, réutilisable partout
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = () => setValue((prev) => !prev);
  const setOn = () => setValue(true);
  const setOff = () => setValue(false);

  // as const → type figé { value: boolean; toggle: () => void; ... }
  return { value, toggle, setOn, setOff } as const;
}

export default useToggle;

// ─── src/hooks/useFamilies.ts ───────────────────────────────────
import { useState, useEffect } from 'react';
// Import relatif — le starter Vite ne configure pas l'alias @/ (hooks → types)
import type { Family } from '../types/family';

interface UseFamiliesResult {
  families: Family[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Toute la logique de chargement vit ICI, une seule fois
function useFamilies(): UseFamiliesResult {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // bumpé par refetch()

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch('/api/families.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Family[]) => setFamilies(json))
      .catch((err) => {
        // AbortError = annulation volontaire (démontage / refetch) → on ignore
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort(); // cleanup : annule le fetch en vol
  }, [reloadKey]); // re-exécute quand refetch() incrémente reloadKey

  const refetch = () => setReloadKey((k) => k + 1);

  return { families, isLoading, error, refetch };
}

export default useFamilies;

// ─── src/pages/FamilyListPage.tsx ───────────────────────────────
// Import relatif — le starter Vite ne configure pas l'alias @/ (pages → hooks)
import useFamilies from '../hooks/useFamilies';

function FamilyListPage() {
  const { families, isLoading, error, refetch } = useFamilies();

  if (isLoading) return <p>Chargement…</p>;
  if (error) {
    return (
      <p>
        Erreur : {error} <button onClick={refetch}>Réessayer</button>
      </p>
    );
  }

  return (
    <section>
      <h2>Familles</h2>
      <ul>
        {families.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
    </section>
  );
}

export default FamilyListPage;

// ─── src/pages/InvitationPage.tsx ───────────────────────────────
// Imports relatifs — le starter Vite ne configure pas l'alias @/ (pages → hooks)
import useFamilies from '../hooks/useFamilies';
import useToggle from '../hooks/useToggle';

function InvitationPage() {
  // 2e instance indépendante de useFamilies → 2e fetch, 2e état
  const { families, isLoading } = useFamilies();
  // useToggle pilote l'ouverture d'un panneau d'aide
  const { value: helpOpen, toggle: toggleHelp } = useToggle(false);

  return (
    <section>
      <h2>Inviter dans une famille</h2>

      <select disabled={isLoading}>
        {families.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      <button onClick={toggleHelp}>{helpOpen ? 'Masquer' : 'Aide'}</button>
      {helpOpen && <p>Sélectionne la famille destinataire de l'invitation.</p>}
    </section>
  );
}

export default InvitationPage;

// ─── src/App.tsx ─────────────────────────────────────────────────
import FamilyListPage from './pages/FamilyListPage';
import InvitationPage from './pages/InvitationPage';

function App() {
  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
      <FamilyListPage />
      <InvitationPage />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- La logique de fetch existe **une seule fois** dans `useFamilies` ; les deux pages l'appellent en une ligne.
- Chaque page a sa **propre instance** d'état : l'onglet Réseau montre deux requêtes `families.json`. C'est le comportement attendu d'un custom hook (partage de logique, pas de données).
- `useToggle` retourne un objet `as const` : l'appelant renomme par déstructuration (`value: helpOpen`) et TypeScript garde les types exacts.
- L'`AbortController` + le filtre `AbortError` évitent le warning « setState sur composant démonté » et les fetchs concurrents lors d'un refetch rapide.
- `useFamilies` et `useToggle` sont appelés **au niveau supérieur**, jamais conditionnellement — règles des hooks respectées.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes :**

1. Rends `useFamilies` **générique** en `useResource<T>(url: string)` : mêmes états (`data`, `isLoading`, `error`, `refetch`) mais pour n'importe quelle URL et n'importe quel type `T`.
2. Réécris `useFamilies()` comme un **hook composé** : `return useResource<Family[]>('/api/families.json')`.
3. Ajoute `useMembers()` de la même façon (`public/api/members.json` avec `{ id, name }`) — deux hooks métier, un seul moteur `useResource`.
4. Dans `InvitationPage`, remplace le `<select>` par une recherche : ajoute un `useDebounce(query, 300)` et filtre les familles côté client.
5. **Sans ouvrir ce corrigé** ni le module 12.

**Critère de réussite :** `useResource` est le seul endroit qui contient `fetch` ; `useFamilies` et `useMembers` ne font que le paramétrer ; la recherche filtre après 300 ms d'inactivité.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces hooks vivent ici :

```
tribuzen/src/
  hooks/
    useFamilies.ts
    useInvitationForm.ts   ← voir Exemple 2 du module
    useToggle.ts
    useLocalStorage.ts
    index.ts               ← barrel : export { default as useFamilies } from './useFamilies'
  pages/
    FamilyListPage.tsx
    InvitationPage.tsx
  types/
    family.ts
```

**Différences par rapport au lab :**
- `fetch('/api/families.json')` deviendra un vrai appel API authentifié (`/api/families` + token) via un client `apiClient` partagé — la structure du hook reste identique.
- En production, `useFamilies` sera probablement remplacé par `useQuery(['families'], …)` de TanStack Query (module 05b) : le cache et le partage inter-composants viennent gratuitement. Le pattern « custom hook de données » reste valide — seul le moteur change.
- Les préférences persistées (thème, colonnes) passeront par `useLocalStorage`, réutilisé dans plusieurs pages admin.

**Commit cible :**
```
feat(hooks): useFamilies — extraction du fetch familles réutilisé sur 2 écrans
feat(hooks): useToggle — brique générique open/close admin TribuZen
```
