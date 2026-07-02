---
titre: Custom hooks
cours: 04-react
notions: [règles des hooks, extraction de logique réutilisable, convention use*, composition de hooks, retour tuple vs objet, custom hooks typés génériques, useToggle, useLocalStorage, useFetch]
outcomes: [extraire une logique stateful répétée dans un custom hook, respecter les règles des hooks en factorisant, composer plusieurs hooks pour un hook de plus haut niveau]
prerequis: [11-usecallback-usememo]
next: 13-usereducer
libs: [{ name: react, version: "^19" }]
tribuzen: hooks de données de l'admin TribuZen (useFamilies, useInvitationForm) réutilisés sur plusieurs écrans
last-reviewed: 2026-07
---

# Custom hooks

> **Outcomes — tu sauras FAIRE :** extraire une logique stateful répétée dans un custom hook, respecter les règles des hooks en factorisant, composer plusieurs hooks pour construire un hook de plus haut niveau.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu intègres l'admin TribuZen. Deux écrans ont besoin de la liste des familles : `FamilyListPage` (le tableau principal) et `InvitationPage` (un `<select>` pour choisir la famille à inviter). Un collègue a copié-collé la même logique dans les deux :

```tsx
// FamilyListPage.tsx
function FamilyListPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetch('/api/families', { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: Family[]) => setFamilies(json))
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  return <FamilyTable families={families} />;
}

// InvitationPage.tsx — EXACTEMENT les mêmes 12 lignes de fetch, re-collées
function InvitationPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ...même useEffect, même try/catch, même AbortController...
}
```

**Trois problèmes immédiats :**
1. **Duplication** — les 12 lignes de fetch vivent à deux endroits. Un bug d'`AbortController` corrigé ici doit être re-corrigé là-bas.
2. **Le composant mélange deux responsabilités** — comment charger les données ET comment les afficher.
3. **Impossible de tester la logique de chargement isolément** — elle est prisonnière du composant.

Ce module te donne l'outil pour extraire cette logique une fois : le **custom hook** `useFamilies()`.

---

## 2. Théorie complète, concise

### 2.1 Qu'est-ce qu'un custom hook

Un custom hook est **une simple fonction JavaScript** qui :
- commence par `use` (convention obligatoire — le linter s'appuie dessus) ;
- peut appeler d'autres hooks (`useState`, `useEffect`, d'autres custom hooks) ;
- retourne ce qu'elle veut : une valeur, un tuple, un objet.

Il n'y a **aucune API spéciale** : `useToggle` n'est pas fourni par React, c'est toi qui l'écris. Un custom hook n'extrait pas de l'UI, il extrait de la **logique stateful** (état + effets + callbacks).

```tsx
import { useState } from 'react';

// Custom hook — extrait la logique d'un booléen basculable
function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = () => setValue((prev) => !prev);
  const setOn = () => setValue(true);
  const setOff = () => setValue(false);

  return { value, toggle, setOn, setOff } as const;
}

// Utilisation — le composant ne connaît que l'interface du hook
function SidebarToggle() {
  const { value: isOpen, toggle } = useToggle(false);
  return (
    <button onClick={toggle}>
      {isOpen ? 'Masquer' : 'Afficher'} la sidebar
    </button>
  );
}
```

### 2.2 Les règles des hooks (rappel et pourquoi)

Un custom hook **appelle des hooks**, donc il est soumis aux mêmes règles, vérifiées par `eslint-plugin-react-hooks` :

```tsx
// Règle 1 — appeler les hooks au NIVEAU SUPÉRIEUR
function useThing() {
  const [a, setA] = useState(0);   // toujours appelé, même ordre
  const b = useToggle();           // toujours appelé
  return { a, setA, b };
}

// Règle 1 violée — hook dans une condition
function useBad({ enabled }: { enabled: boolean }) {
  if (enabled) {
    const [x, setX] = useState(0); // l'ordre des hooks change selon enabled
  }
}

// Règle 1 violée — hook après un return anticipé
function useAlsoBad({ user }: { user: User | null }) {
  if (!user) return null;
  const [name, setName] = useState(user.name); // n'est plus appelé si user null
}

// Règle 2 — appeler des hooks UNIQUEMENT dans un composant ou un custom hook
function formatTotal(items: Item[]) {
  const [t, setT] = useState(0); // interdit : ni composant, ni hook (pas de use*)
  return t;
}
```

> **Pourquoi ?** React identifie chaque hook **par son ordre d'appel** entre deux rendus. Une condition ou une boucle change cet ordre, et React ne peut plus associer chaque `useState` à son état. La convention `use*` sert au linter à savoir *où* ces règles doivent s'appliquer : une fonction qui commence par `use` est traitée comme un hook.

### 2.3 Extraire un custom hook depuis un composant

La méthode est mécanique : on **déplace l'état et les effets**, on **garde le JSX** dans le composant.

1. Repérer le bloc `useState` + `useEffect` + callbacks qui forme une unité logique.
2. Le couper-coller dans une fonction `useXxx()`.
3. Retourner ce dont le composant a besoin.
4. Remplacer le bloc dans le composant par un appel au hook.

```tsx
// AVANT — logique dans le composant
function FamilyListPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ...useEffect de fetch...
  return <FamilyTable families={families} />;
}

// APRÈS — logique dans le hook, composant nettoyé
function useFamilies() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ...useEffect de fetch...
  return { families, isLoading };
}

function FamilyListPage() {
  const { families, isLoading } = useFamilies();
  if (isLoading) return <Spinner />;
  return <FamilyTable families={families} />;
}
```

> **Point crucial :** extraire un hook ne partage **pas** l'état entre composants. Chaque composant qui appelle `useFamilies()` obtient sa **propre instance** d'état (son propre `families`, son propre `isLoading`). On partage la *logique*, pas les *données*. Pour partager les données, il faut Context (module 14) ou un state manager.

### 2.4 Tuple ou objet : que retourner ?

```tsx
// Tuple — quand l'appelant doit renommer librement (comme useState)
function useCounter(start = 0) {
  const [count, setCount] = useState(start);
  const increment = () => setCount((c) => c + 1);
  return [count, increment] as const; // as const → tuple typé [number, () => void]
}
const [likes, addLike] = useCounter(); // renommage libre par position

// Objet — quand il y a 3+ valeurs, ou des champs optionnels
function useFamilies() {
  // ...
  return { families, isLoading, error, refetch }; // nommage explicite, ordre libre
}
const { families, error } = useFamilies(); // on prend ce qu'on veut
```

**Règle :** ≤ 2 valeurs souvent renommées → tuple. 3+ valeurs → objet (plus lisible, pas de dépendance à l'ordre). Le `as const` sur un tuple fige les types en positions (`[number, () => void]`) au lieu d'un `(number | (() => void))[]` inutilisable.

### 2.5 Custom hooks typés génériques

Un hook réutilisable est souvent **générique** : il fonctionne pour n'importe quel type de donnée.

```tsx
import { useState, useEffect } from 'react';

// <T> — le type de la donnée stockée est fourni à l'appel
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue; // localStorage indisponible (SSR, quota, mode privé)
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`localStorage KO pour "${key}"`, err);
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// À l'appel, T est inféré ou explicite
const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
const [lang, setLang] = useLocalStorage('lang', 'fr'); // T = string, inféré
```

Note le `useState(() => ...)` avec **initialiseur paresseux** : la lecture du `localStorage` ne s'exécute qu'au premier rendu, pas à chaque re-render.

### 2.6 Composer des hooks (hooks appelant des hooks)

Un custom hook peut appeler d'autres custom hooks. C'est la vraie puissance : construire du haut niveau à partir de briques.

```tsx
// Brique bas niveau — retarde une valeur
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id); // annule si value change avant la fin
  }, [value, delayMs]);
  return debounced;
}

// Brique bas niveau — fetch générique avec états
function useFetch<T>(url: string): { data: T | null; isLoading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) { setIsLoading(false); return; }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json: T) => setData(json))
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [url]);

  return { data, isLoading, error };
}

// Hook de HAUT niveau — composé des deux briques ci-dessus
function useSearch<T>(baseUrl: string, query: string, delay = 300) {
  const debouncedQuery = useDebounce(query, delay);
  const url = debouncedQuery ? `${baseUrl}?q=${encodeURIComponent(debouncedQuery)}` : '';
  return useFetch<T[]>(url); // on renvoie directement le résultat du hook composé
}
```

Chaque hook reste testable et remplaçable isolément. `useSearch` ne sait pas *comment* on debounce ni *comment* on fetch — il orchestre.

### 2.7 Custom hook vs composable Vue / service Angular

| Aspect | Vue 3 composable | Angular service | React custom hook |
|---|---|---|---|
| Convention | `useXxx()` | `@Injectable()` + `inject()` | `useXxx()` |
| Réactivité | `ref()`, `computed()` | `signal()`, `computed()` | `useState`, `useMemo` |
| Effets | `watchEffect`, `onMounted` | `effect()`, `ngOnInit` | `useEffect` |
| Instanciation | selon l'usage | singleton `providedIn: 'root'` | **une instance d'état par composant** |
| Partage d'état | `ref()` hors composant | service partagé | Context / state manager |

> **Différence clé à retenir :** un service Angular `providedIn: 'root'` est un **singleton partagé**. Un custom hook crée **un état neuf par composant appelant**. Si trois composants appellent `useFamilies()`, il y a trois fetchs et trois états indépendants — à moins de remonter l'état dans un Context.

---

## 3. Worked examples

### Exemple 1 — `useFamilies()` : extraire le fetch de l'admin TribuZen

On résout le cas concret d'ouverture. Objectif : un hook réutilisé tel quel par `FamilyListPage` et `InvitationPage`.

```tsx
// ─── src/hooks/useFamilies.ts ───────────────────────────────────
import { useState, useEffect } from 'react';
import type { Family } from '@/types/family';

interface UseFamiliesResult {
  families: Family[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Toute la logique de chargement des familles vit ICI, une seule fois.
function useFamilies(): UseFamiliesResult {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // incrémenté par refetch()

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch('/api/families', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Family[]) => setFamilies(json))
      .catch((err) => {
        // On ignore l'annulation volontaire (démontage / re-fetch)
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort(); // cleanup : annule le fetch en vol
  }, [reloadKey]); // re-exécute quand refetch() bump reloadKey

  const refetch = () => setReloadKey((k) => k + 1);

  return { families, isLoading, error, refetch };
}

export default useFamilies;

// ─── src/pages/FamilyListPage.tsx ───────────────────────────────
import useFamilies from '@/hooks/useFamilies';

function FamilyListPage() {
  const { families, isLoading, error, refetch } = useFamilies();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  return <FamilyTable families={families} />;
}

// ─── src/pages/InvitationPage.tsx ───────────────────────────────
import useFamilies from '@/hooks/useFamilies';

function InvitationPage() {
  // Le MÊME hook, zéro duplication. Chaque page a sa propre instance.
  const { families, isLoading } = useFamilies();

  return (
    <select disabled={isLoading}>
      {families.map((f) => (
        <option key={f.id} value={f.id}>{f.name}</option>
      ))}
    </select>
  );
}
```

**Ce que l'extraction apporte :**
- Les 12 lignes de fetch existent **une seule fois**. Un correctif profite aux deux écrans.
- Chaque composant se lit en 3 lignes : appeler le hook, brancher le JSX.
- `useFamilies` est testable seul (via `renderHook`, hors scope de ce module — on ne simule pas de tests ici).
- `InvitationPage` ignore `error`/`refetch` : l'objet de retour permet de ne prendre que ce qu'on veut.

### Exemple 2 — `useInvitationForm()` : composer état + validation

Le formulaire d'invitation de l'admin réapparaît dans un modal ET dans une page pleine. On extrait sa logique (valeurs, erreurs, soumission) dans un hook.

```tsx
// ─── src/hooks/useInvitationForm.ts ─────────────────────────────
import { useState, useMemo, useCallback } from 'react';

interface InvitationValues {
  email: string;
  familyId: string;
  role: 'member' | 'mod';
}

type Errors = Partial<Record<keyof InvitationValues, string>>;

const EMPTY: InvitationValues = { email: '', familyId: '', role: 'member' };

function validate(v: InvitationValues): Errors {
  const errors: Errors = {};
  if (!v.email.includes('@')) errors.email = 'Email invalide';
  if (!v.familyId) errors.familyId = 'Choisis une famille';
  return errors;
}

function useInvitationForm(onSubmit: (values: InvitationValues) => void) {
  const [values, setValues] = useState<InvitationValues>(EMPTY);

  // errors recalculés à chaque frappe — useMemo évite de refaire validate() inutilement
  const errors = useMemo(() => validate(values), [values]);
  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  // setField typé : la valeur doit correspondre au type du champ ciblé
  const setField = useCallback(
    <K extends keyof InvitationValues>(field: K, value: InvitationValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (Object.keys(validate(values)).length === 0) onSubmit(values);
    },
    [values, onSubmit],
  );

  const reset = useCallback(() => setValues(EMPTY), []);

  return { values, errors, isValid, setField, submit, reset };
}

export default useInvitationForm;

// ─── Utilisation dans deux hôtes différents ─────────────────────
function InvitationModal({ onClose }: { onClose: () => void }) {
  const { values, errors, isValid, setField, submit } = useInvitationForm((v) => {
    void fetch('/api/invitations', { method: 'POST', body: JSON.stringify(v) });
    onClose();
  });

  return (
    <form onSubmit={submit}>
      <input
        value={values.email}
        onChange={(e) => setField('email', e.target.value)}
        placeholder="Email"
      />
      {errors.email && <span className="error">{errors.email}</span>}
      <button type="submit" disabled={!isValid}>Inviter</button>
    </form>
  );
}
```

**Pourquoi ce hook est bien fait :**
- Il **compose** trois hooks primitifs (`useState`, `useMemo`, `useCallback`) en une API métier propre.
- Il est **agnostique de l'UI** : le modal comme la page pleine le réutilisent avec un JSX différent.
- `setField` est **générique et typé** : `setField('role', 'member')` compile, `setField('role', 'xyz')` échoue à la compilation.
- La validation est encapsulée : les hôtes n'importent pas `validate`, ils lisent `errors`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire qu'un custom hook partage l'état entre composants

```tsx
// ❌ Attente fausse : "j'extrais useFamilies, donc les familles sont chargées une fois"
function FamilyListPage() { const { families } = useFamilies(); /* fetch #1 */ }
function InvitationPage() { const { families } = useFamilies(); /* fetch #2 ! */ }
// Deux composants montés = DEUX instances d'état = DEUX fetchs.

// ✅ Pour partager l'état chargé une seule fois : remonter dans un Context (module 14)
const FamiliesContext = createContext<Family[]>([]);
// ...un provider fetch une fois, les deux pages consomment le même tableau.
```

**Règle :** un custom hook partage la **logique**, jamais les **données**. Chaque appel = état neuf.

### PIÈGE #2 — Oublier la convention `use` (ou l'utiliser à tort)

```tsx
// ❌ Fonction qui appelle des hooks mais ne commence pas par "use"
function getFamilies() {
  const [families, setFamilies] = useState<Family[]>([]); // le linter ne protège plus
  return families;
}

// ❌ Fonction en "use" qui n'appelle AUCUN hook — trompeur
function useFormatDate(d: Date) { return d.toLocaleDateString('fr'); } // simple utilitaire !

// ✅ "use" = appelle des hooks. Sinon, fonction normale.
function useFamilies() { const [f] = useState<Family[]>([]); return f; } // OK
function formatDate(d: Date) { return d.toLocaleDateString('fr'); }      // OK, pas de use
```

**Règle :** `use*` ⟺ la fonction appelle au moins un hook. Le préfixe pilote le linter ; s'en écarter désactive les vérifications ou déclenche de faux avertissements.

### PIÈGE #3 — Appeler un custom hook conditionnellement

```tsx
// ❌ Un custom hook obéit aux règles des hooks : pas d'appel conditionnel
function Panel({ showFamilies }: { showFamilies: boolean }) {
  if (showFamilies) {
    const { families } = useFamilies(); // ordre des hooks instable → crash React
  }
}

// ✅ Appeler le hook inconditionnellement, conditionner le rendu
function Panel({ showFamilies }: { showFamilies: boolean }) {
  const { families } = useFamilies(); // toujours appelé
  if (!showFamilies) return null;      // on conditionne l'affichage, pas le hook
  return <FamilyTable families={families} />;
}
```

**Signal d'alarme :** un `useXxx()` à l'intérieur d'un `if`, d'une boucle ou après un `return`.

### PIÈGE #4 — Sur-extraire (créer un hook pour une ligne)

```tsx
// ❌ Hook inutile — aucune logique stateful, juste un calcul
function useDoubled(n: number) { return n * 2; } // pas de hook interne : c'est une fonction pure

// ✅ Fonction normale pour du pur calcul ; hook seulement s'il y a état/effet
const doubled = n * 2; // inline suffit
// Extraire en hook quand il y a useState / useEffect répétés, pas avant.
```

**Règle :** extraire quand la **logique stateful** (état + effet + callbacks) est dupliquée ou dépasse la lisibilité du composant. Un calcul pur reste une fonction pure.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, la couche « hooks de données » factorise tout ce qui touche au chargement et aux formulaires, réutilisée d'écran en écran.

**`useFamilies()`** (`src/hooks/useFamilies.ts`) — charge la liste des familles avec `families` / `isLoading` / `error` / `refetch`. Consommé par `FamilyListPage` (tableau), `InvitationPage` (select), et le futur `DashboardPage` (compteur). C'est le cas concret du module, écrit complet en Exemple 1.

**`useInvitationForm()`** (`src/hooks/useInvitationForm.ts`) — encapsule valeurs, erreurs, validation et soumission du formulaire d'invitation. Réutilisé par `InvitationModal` (fenêtre) et `InvitationPage` (page pleine), avec un JSX distinct mais la même logique. Écrit en Exemple 2.

**`useToggle()`** (`src/hooks/useToggle.ts`) — brique générique pour tout état ouvert/fermé : sidebar, modal, accordéons de la fiche membre. Zéro dépendance métier.

**`useLocalStorage()`** (`src/hooks/useLocalStorage.ts`) — persiste les préférences admin (thème, langue, colonnes visibles du tableau) entre les sessions.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  hooks/
    useFamilies.ts
    useInvitationForm.ts
    useToggle.ts
    useLocalStorage.ts
    index.ts            ← barrel export
  pages/
    FamilyListPage.tsx  ← consomme useFamilies
    InvitationPage.tsx  ← consomme useFamilies + useInvitationForm
```

---

## 6. Points clés

1. Un custom hook est une fonction `useXxx()` qui appelle d'autres hooks et retourne valeur / tuple / objet — aucune API spéciale.
2. La convention `use*` est ce qui autorise le hook à appeler des hooks et pilote `eslint-plugin-react-hooks`.
3. Les règles des hooks s'appliquent au custom hook : appel au niveau supérieur, jamais dans condition / boucle / après return.
4. Extraire un hook partage la **logique**, jamais les **données** — chaque appel crée une instance d'état neuve.
5. Retourner un tuple `as const` pour ≤ 2 valeurs renommables ; un objet pour 3+ valeurs ou champs optionnels.
6. Les hooks génériques `<T>` (`useLocalStorage`, `useFetch`) rendent la logique réutilisable pour n'importe quel type.
7. Composer des hooks (un hook qui appelle des hooks) construit du haut niveau à partir de briques testables isolément.
8. Extraire seulement de la logique *stateful* dupliquée ; un calcul pur reste une fonction pure.

---

## 7. Seeds Anki

```
Qu'est-ce qui fait qu'une fonction est un custom hook en React ?|Son nom commence par "use" ET elle appelle au moins un hook (useState, useEffect, un autre custom hook). Aucune API spéciale : c'est une fonction JS ordinaire soumise aux règles des hooks.
Extraire useFamilies() dans deux composants partage-t-il les données chargées ?|Non. Chaque composant qui appelle le hook obtient sa propre instance d'état (son propre fetch). Un custom hook partage la logique, pas les données. Pour partager les données, il faut Context ou un state manager.
Pourquoi un custom hook doit-il commencer par "use" ?|La convention pilote eslint-plugin-react-hooks : il applique les règles des hooks (appel au niveau supérieur) aux fonctions en "use". Sans le préfixe, le linter ne protège plus ; avec "use" sur une fonction sans hook, il alerte à tort.
Quand retourner un tuple plutôt qu'un objet depuis un custom hook ?|Tuple as const pour 2 valeurs souvent renommées (comme useState). Objet pour 3+ valeurs ou des champs optionnels : nommage explicite, pas de dépendance à l'ordre. Le as const fige le tuple en types positionnels.
Peut-on appeler un custom hook dans un if ? Pourquoi ?|Non. Un custom hook appelle des hooks, donc il obéit aux règles des hooks : appel au niveau supérieur uniquement. Dans un if/boucle/après return, l'ordre des hooks change entre rendus et React ne peut plus associer chaque hook à son état.
Que signifie "composer des hooks" ?|Écrire un custom hook qui appelle d'autres custom hooks pour construire une abstraction de plus haut niveau (ex. useSearch = useDebounce + useFetch). Chaque brique reste testable et remplaçable isolément.
Quelle est la différence entre un custom hook React et un service Angular providedIn root ?|Le service Angular est un singleton partagé (un seul état pour toute l'app). Le custom hook crée une instance d'état neuve par composant appelant. Pour partager en React, il faut remonter l'état dans un Context.
Quand NE PAS extraire un custom hook ?|Quand il n'y a pas de logique stateful : un calcul pur (n * 2, formatage de date) reste une fonction normale. On extrait un hook seulement pour factoriser de l'état/des effets/des callbacks dupliqués.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-12-custom-hooks/README.md`. Extraire `useFamilies()` et `useToggle()` de zéro dans un projet Vite, les réutiliser sur deux écrans, et vérifier en direct que chaque instance a bien son propre état. Corrigé complet + variante J+30 + application TribuZen.
