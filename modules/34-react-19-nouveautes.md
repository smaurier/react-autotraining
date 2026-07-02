---
titre: React 19 — les nouveautés
cours: 04-react
notions: [Actions et formulaires, useActionState, useFormStatus, useOptimistic, hook use() promesses et context, ref comme prop et fin de forwardRef, Document Metadata dans les composants, preload et preinit des ressources, React Compiler et mémoïsation automatique, améliorations de Suspense]
outcomes: [câbler un formulaire avec une Action et useActionState, afficher un état optimiste avec useOptimistic, lire une promesse ou un context avec use(), remplacer forwardRef par ref comme prop]
prerequis: [33-error-boundaries-suspense]
next: 35-fondamentaux-wcag-react
libs: [{ name: react, version: "^19" }]
tribuzen: admin web TribuZen — form d'invitation (useActionState), toggle de statut famille (useOptimistic), lecture d'une promesse de config (use()), metadata par page
last-reviewed: 2026-07
---

# React 19 — les nouveautés

> **Outcomes — tu sauras FAIRE :** câbler un formulaire avec une Action et `useActionState`, afficher un état optimiste avec `useOptimistic`, lire une promesse ou un context avec `use()`, remplacer `forwardRef` par `ref` comme prop.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, un collègue a écrit le formulaire d'invitation d'un parent dans une famille. Voici la version React 18 « classique » :

```tsx
// InviteForm.tsx — style React 18, tout à la main
function InviteForm({ familyId }: { familyId: string }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();              // à ne pas oublier
    setPending(true);               // état de chargement manuel
    setError(null);
    try {
      const res = await fetch(`/api/families/${familyId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Invitation refusée');
      setSuccess(true);
      setEmail('');                 // reset manuel
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);            // ne jamais oublier le finally
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button disabled={pending}>{pending ? 'Envoi…' : 'Inviter'}</button>
      {error && <p>{error}</p>}
      {success && <p>Invitation envoyée</p>}
    </form>
  );
}
```

**Ce qui cloche :** quatre `useState` (`email`, `error`, `pending`, `success`), un `e.preventDefault()`, un `try/catch/finally` à câbler correctement, un reset manuel. C'est le même boilerplate à chaque formulaire de l'app.

React 19 réduit tout ça à **une Action + `useActionState`** : plus de `preventDefault`, `pending` fourni par React, l'état de résultat centralisé. Ce module couvre cette API et les autres nouveautés majeures de React 19 : `useOptimistic`, `use()`, `ref` comme prop, la métadonnée dans les composants, le préchargement de ressources et le React Compiler.

---

## 2. Théorie complète, concise

> **Note d'actualité (source).** Les API suivantes ont été confirmées via Context7 sur `react@19` : `useActionState` (signature `(action, initialState) → [state, formAction, isPending]`), `useOptimistic`, `useFormStatus`, `use()` (promesses + context), et le retrait de `forwardRef` (`ref` comme prop). La Document Metadata et `preload/preinit` sont des features React 19 documentées mais **non ressorties directement** par la requête Context7 — traitées ici depuis la doc de référence, à revérifier avant tout usage critique.

### 2.1 Les Actions et la prop `action` du `<form>`

En React 19, un `<form>` accepte une fonction dans sa prop `action`. React appelle cette fonction avec le `FormData` du formulaire, gère `preventDefault` pour toi, et réinitialise le formulaire non contrôlé après succès.

```tsx
// La fonction reçoit directement le FormData — pas de preventDefault
function ContactForm() {
  async function submit(formData: FormData) {
    const email = formData.get('email') as string;
    await fetch('/api/contact', { method: 'POST', body: JSON.stringify({ email }) });
  }

  return (
    <form action={submit}>
      <input name="email" type="email" required />
      <button type="submit">Envoyer</button>
    </form>
  );
}
```

Une fonction passée à `action` (ou déclenchée dans une transition) est appelée une **Action**. Elle croise directement les Server Actions traitées au module 27 — côté serveur, la même fonction porte la directive `"use server"` et s'exécute sur le back.

### 2.2 `useActionState` — état + pending du formulaire

`useActionState` enveloppe une Action pour lui donner un **état de retour persistant** et un **indicateur `isPending`**.

```tsx
const [state, formAction, isPending] = useActionState(action, initialState);
```

- `action` a la signature `(prevState, formData) => newState` — elle reçoit l'état précédent **en premier argument** (différence clé avec une Action nue).
- `initialState` est la valeur de `state` au premier rendu.
- Retour : `[state courant, formAction à brancher sur le <form>, isPending booléen]`.

```tsx
import { useActionState } from 'react';

interface State { error?: string; ok?: boolean }

async function invite(_prev: State, formData: FormData): Promise<State> {
  const email = formData.get('email') as string;
  if (!email.includes('@')) return { error: 'Email invalide' };
  const res = await fetch('/api/invite', { method: 'POST', body: formData });
  if (!res.ok) return { error: 'Invitation refusée' };
  return { ok: true };
}

function InviteForm() {
  const [state, formAction, isPending] = useActionState(invite, {});
  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <button disabled={isPending}>{isPending ? 'Envoi…' : 'Inviter'}</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.ok && <p>Invitation envoyée</p>}
    </form>
  );
}
```

> `useActionState` vient de `react` (pas de `react-dom`). Il remplace l'ancien `useFormState` de la canary, renommé et déplacé.

### 2.3 `useFormStatus` — le pending pour un composant enfant

`useFormStatus` (importé de `react-dom`) lit l'état de soumission du `<form>` parent **le plus proche**. Il doit vivre dans un composant **enfant** du formulaire, pas dans celui qui rend le `<form>`.

```tsx
import { useFormStatus } from 'react-dom';

// Composant enfant : il lit le statut du <form> au-dessus de lui
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Envoi…' : label}</button>;
}

function InviteForm() {
  async function invite(formData: FormData) {
    await fetch('/api/invite', { method: 'POST', body: formData });
  }
  return (
    <form action={invite}>
      <input name="email" type="email" required />
      <SubmitButton label="Inviter" />
    </form>
  );
}
```

Intérêt : un bouton réutilisable qui connaît le pending **sans** qu'on lui passe une prop — utile pour un design system où le bouton ne sait rien du formulaire.

### 2.4 `useOptimistic` — afficher avant la confirmation serveur

`useOptimistic` affiche immédiatement un état « supposé » pendant qu'une Action async tourne. Quand l'action se termine et que le parent re-rend avec les vraies données, l'état optimiste est **remplacé automatiquement** (pas de rollback à écrire).

Deux formes :

```tsx
// Forme simple : un miroir de la valeur, mis à jour directement
const [optimisticValue, setOptimistic] = useOptimistic(realValue);

// Forme reducer : (état courant, valeur optimiste) => nouvel état
const [optimisticList, addOptimistic] = useOptimistic(
  list,
  (current, added: Item) => [...current, added],
);
```

`useOptimistic` **doit** être déclenché dans une transition ou une Action (via `startTransition` ou la prop `action`), sinon l'état optimiste ne survit pas.

```tsx
import { useOptimistic, startTransition } from 'react';

function FamilyStatusToggle({ family, toggle }: {
  family: { id: string; active: boolean };
  toggle: (id: string, next: boolean) => Promise<void>;
}) {
  // Miroir optimiste de family.active
  const [active, setOptimisticActive] = useOptimistic(family.active);

  return (
    <label>
      <input
        type="checkbox"
        checked={active}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            setOptimisticActive(next);   // UI bascule tout de suite
            await toggle(family.id, next); // le serveur confirme (ou pas)
          });
        }}
      />
      Famille active
    </label>
  );
}
```

### 2.5 Le hook `use()` — lire une promesse ou un context

`use()` lit la valeur d'une ressource *usable* : une **promesse** ou un **context**. Contrairement aux autres hooks, il peut être appelé **conditionnellement** (dans un `if`, une boucle).

**Lire une promesse** — le composant *suspend* jusqu'à résolution ; c'est `Suspense` (module 33) qui affiche le fallback :

```tsx
import { use, Suspense } from 'react';

interface Config { theme: 'light' | 'dark'; maxFamilies: number }

function ConfigBanner({ configPromise }: { configPromise: Promise<Config> }) {
  const config = use(configPromise);   // suspend tant que non résolu
  return <p>Thème {config.theme} — {config.maxFamilies} familles max</p>;
}

function App({ configPromise }: { configPromise: Promise<Config> }) {
  return (
    <Suspense fallback={<p>Chargement config…</p>}>
      <ConfigBanner configPromise={configPromise} />
    </Suspense>
  );
}
```

> **Règle critique :** ne crée **jamais** la promesse dans le composant qui appelle `use()` — une nouvelle promesse à chaque rendu = boucle infinie. Crée-la dans le parent, un loader, ou un cache. Si la promesse rejette, l'erreur remonte à l'`ErrorBoundary` (ordre `ErrorBoundary > Suspense > use()`, cf. module 33).

**Lire un context** — remplace `useContext`, mais utilisable dans une condition :

```tsx
import { use } from 'react';

function Row({ urgent }: { urgent: boolean }) {
  if (urgent) {
    const theme = use(ThemeContext);  // impossible avec useContext (hook conditionnel interdit)
    return <span className={theme}>Urgent</span>;
  }
  return <span>Normal</span>;
}
```

### 2.6 `ref` comme prop — fin de `forwardRef`

En React 19, un composant fonction reçoit `ref` comme **prop normale**. `forwardRef` n'est plus nécessaire (il reste supporté mais sera déprécié).

```tsx
// ❌ Avant React 19 — forwardRef obligatoire
const Input18 = forwardRef<HTMLInputElement, { label: string }>(
  function Input({ label }, ref) {
    return <input ref={ref} aria-label={label} />;
  }
);

// ✅ React 19 — ref est une prop typée comme les autres
function Input({ label, ref }: { label: string; ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} aria-label={label} />;
}
```

C'est un des retraits documentés au changelog React 19, avec `propTypes`, `defaultProps` sur les fonctions, les string refs et `ReactDOM.render`.

### 2.7 Document Metadata dans les composants

`<title>`, `<meta>` et `<link>` peuvent être rendus dans **n'importe quel composant** : React les *hoist* automatiquement dans le `<head>` et déduplique.

```tsx
function FamilyPage({ family }: { family: { name: string } }) {
  return (
    <article>
      <title>{family.name} — Admin TribuZen</title>
      <meta name="description" content={`Gestion de la famille ${family.name}`} />
      <h1>{family.name}</h1>
    </article>
  );
}
```

> En Next.js, on garde `metadata` / `generateMetadata` (module 27). Cette API brute est surtout pour les SPA sans framework — ce qu'est l'admin TribuZen côté Vite.

### 2.8 Préchargement de ressources — `preload` / `preinit`

`react-dom` expose des fonctions pour indiquer au navigateur de précharger des ressources depuis n'importe quel composant. React insère les balises `<link>` correctes dans le `<head>`.

```tsx
import { preload, preinit, preconnect, prefetchDNS } from 'react-dom';

preinit('/theme.css', { as: 'style' });                      // charge ET applique
preload('/fonts/inter.woff2', { as: 'font', crossOrigin: 'anonymous' }); // charge, sans exécuter
preconnect('https://cdn.tribuzen.app');                      // ouvre la connexion
prefetchDNS('https://analytics.tribuzen.app');               // résout le DNS
```

Distinction : `preload` télécharge une ressource pour plus tard ; `preinit` la télécharge **et** l'initialise (exécute un script, applique une feuille de style).

### 2.9 React Compiler — mémoïsation automatique

Le React Compiler (ex-« React Forget ») est un compilateur build-time qui **insère la mémoïsation automatiquement**. Il rend `useMemo`, `useCallback` et `memo` inutiles dans la plupart des cas.

```tsx
// ✅ Tu écris du code simple, sans mémoïsation manuelle
function SortedMembers({ members, onPick }: {
  members: Member[];
  onPick: (id: string) => void;
}) {
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <ul>
      {sorted.map((m) => <li key={m.id} onClick={() => onPick(m.id)}>{m.name}</li>)}
    </ul>
  );
}
// Le compilateur produit l'équivalent mémoïsé (cache par dépendance) au build.
```

Ce qu'il **n'est pas** : ni un bundler (Vite/Webpack restent), ni un runtime (le comportement ne change pas, seules les perfs). Il **exige** des composants qui respectent les règles de React : pas de mutation de props (`[...members].sort()` et non `members.sort()`), pas de side-effect dans le rendu, hooks au top-level. `eslint-plugin-react-compiler` détecte les violations avant le build.

Activation Vite : ajouter `babel-plugin-react-compiler` aux plugins Babel de `@vitejs/plugin-react`. En Next.js 15+ : `experimental.reactCompiler: true`.

### 2.10 Améliorations de Suspense

React 19 affine Suspense (module 33) : `startTransition` accepte désormais des fonctions **async**, ce qui intègre proprement les Actions et le pending pendant un appel serveur. Les fallbacks Suspense sont aussi commités plus tôt sur le rendu client, réduisant les « flashs » de fallback quand une donnée arrive vite.

---

## 3. Worked examples

### Exemple 1 — Le formulaire d'invitation TribuZen refait avec `useActionState`

Reprise directe du cas concret. Le boilerplate à 4 `useState` disparaît.

```tsx
// ─── features/family/InviteForm.tsx ─────────────────────────────
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

// L'état de retour de l'Action : soit une erreur, soit un succès
interface InviteState {
  error?: string;
  invitedEmail?: string;
}

// L'Action reçoit (prevState, formData). Elle est async et retourne le prochain état.
async function inviteAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const email = (formData.get('email') as string)?.trim();

  // Validation côté client — retour immédiat, pas de throw
  if (!email || !email.includes('@')) {
    return { error: 'Adresse email invalide' };
  }

  const res = await fetch('/api/families/f1/invite', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) return { error: 'Le serveur a refusé l’invitation' };
  return { invitedEmail: email };   // succès : on garde l'email invité
}

// Bouton enfant : lit le pending du <form> via useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Envoi…' : 'Inviter'}
    </button>
  );
}

export function InviteForm() {
  // 3-tuple : état courant, formAction à brancher, isPending
  const [state, formAction, isPending] = useActionState(inviteAction, {});

  return (
    <form action={formAction}>
      <label>
        Email du parent
        <input name="email" type="email" required disabled={isPending} />
      </label>

      <SubmitButton />

      {/* state.error / state.invitedEmail persistent entre les soumissions */}
      {state.error && <p role="alert" style={{ color: 'crimson' }}>{state.error}</p>}
      {state.invitedEmail && (
        <p style={{ color: 'green' }}>Invitation envoyée à {state.invitedEmail}</p>
      )}
    </form>
  );
}
```

**Ce qui a disparu vs la version React 18 :**
- Plus de `e.preventDefault()` — React s'en charge via la prop `action`.
- Plus de `useState` pour `pending` — fourni par `useActionState` (`isPending`) **et** par `useFormStatus` (`pending`) pour l'enfant.
- Plus de `try/catch/finally` — l'Action retourne un état d'erreur au lieu de lever.
- Reset du champ non contrôlé automatique après une soumission réussie.

### Exemple 2 — Toggle de statut famille optimiste + config via `use()`

Deux nouveautés combinées dans une page d'admin : la config est lue avec `use()` (suspend), et le toggle de statut est optimiste.

```tsx
// ─── features/family/FamilyAdminPage.tsx ────────────────────────
import { use, useOptimistic, startTransition, Suspense } from 'react';

interface Config { maxFamilies: number }
interface Family { id: string; name: string; active: boolean }

// ── Toggle optimiste ──────────────────────────────────────────
function StatusToggle({ family, onToggle }: {
  family: Family;
  onToggle: (id: string, next: boolean) => Promise<void>;
}) {
  // Miroir optimiste : bascule instantanément, revient si le serveur échoue
  const [active, setOptimistic] = useOptimistic(family.active);

  function handleChange(next: boolean) {
    // useOptimistic exige une transition/Action pour vivre
    startTransition(async () => {
      setOptimistic(next);
      await onToggle(family.id, next);
    });
  }

  return (
    <label>
      <input
        type="checkbox"
        checked={active}
        onChange={(e) => handleChange(e.target.checked)}
      />
      {active ? 'Active' : 'Inactive'}
    </label>
  );
}

// ── Bandeau config lu avec use() ──────────────────────────────
function ConfigBanner({ configPromise }: { configPromise: Promise<Config> }) {
  const config = use(configPromise);        // suspend jusqu'à résolution
  return <small>Quota : {config.maxFamilies} familles</small>;
}

// ── Page : la promesse est créée EN DEHORS du composant qui use() ──
export function FamilyAdminPage({ configPromise, families, toggle }: {
  configPromise: Promise<Config>;
  families: Family[];
  toggle: (id: string, next: boolean) => Promise<void>;
}) {
  return (
    <section>
      <title>Familles — Admin TribuZen</title>
      <meta name="description" content="Gestion des statuts de familles" />

      <Suspense fallback={<small>Chargement du quota…</small>}>
        <ConfigBanner configPromise={configPromise} />
      </Suspense>

      <ul>
        {families.map((f) => (
          <li key={f.id}>
            {f.name} — <StatusToggle family={f} onToggle={toggle} />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

**Points de vigilance illustrés :**
- `configPromise` est **reçu en prop**, jamais créé dans `ConfigBanner` — pas de boucle de re-fetch.
- `setOptimistic` est dans `startTransition` — sinon l'état optimiste ne tiendrait pas.
- `<title>`/`<meta>` sont posés dans le composant de page : React les hoist dans le `<head>`.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Créer la promesse dans le composant qui appelle `use()`

```tsx
// ❌ Nouvelle promesse à chaque rendu → suspend en boucle infinie
function ConfigBanner() {
  const config = use(fetch('/api/config').then((r) => r.json()));
  return <p>{config.theme}</p>;
}

// ✅ La promesse est stable : créée dans le parent / un loader / un cache
function ConfigBanner({ configPromise }: { configPromise: Promise<Config> }) {
  const config = use(configPromise);
  return <p>{config.theme}</p>;
}
```

**Règle :** `use(promise)` exige une promesse **stable entre les rendus**. Pour du fetch client courant, `useSuspenseQuery` (React Query) gère le cache pour toi.

### PIÈGE #2 — `useFormStatus` dans le composant qui rend le `<form>`

```tsx
// ❌ pending sera toujours false : useFormStatus lit le <form> PARENT
function InviteForm() {
  const { pending } = useFormStatus();  // aucun <form> parent ici
  return (
    <form action={invite}>
      <button disabled={pending}>Inviter</button>
    </form>
  );
}

// ✅ Le hook vit dans un enfant du <form>
function SubmitButton() {
  const { pending } = useFormStatus();   // le <form> est au-dessus
  return <button disabled={pending}>Inviter</button>;
}
```

### PIÈGE #3 — Confondre l'Action nue et l'Action de `useActionState`

```tsx
// Action nue passée directement à <form action> : signature (formData)
async function submit(formData: FormData) { /* … */ }

// Action de useActionState : signature (prevState, formData) — prevState EN PREMIER
async function reducerAction(prev: State, formData: FormData): Promise<State> { /* … */ }
```

**Erreur classique :** lire `formData.get()` sur le premier argument alors que c'est `prevState`. Dès qu'on passe par `useActionState`, l'état précédent arrive en premier.

### PIÈGE #4 — Attendre un rollback explicite de `useOptimistic`

`useOptimistic` n'a **pas** d'API de rollback. L'état optimiste existe seulement pendant la transition/Action ; dès que le parent re-rend avec les données serveur, il est écrasé. Si le serveur échoue, il faut que le parent **re-rende avec l'ancienne valeur** (ne pas muter l'état source) — sinon la valeur optimiste erronée reste affichée.

### PIÈGE #5 — Croire que le React Compiler dispense des règles de React

Le compilateur **n'optimise que du code conforme**. Une mutation de prop (`members.sort()` au lieu de `[...members].sort()`) ou un `fetch()` dans le corps du composant empêchent la mémoïsation, voire cassent le rendu. Le compilateur **révèle** les bugs de mutabilité au lieu de les masquer. Activer `eslint-plugin-react-compiler`.

---

## 5. Ancrage TribuZen

L'admin TribuZen tourne sous Vite + React 19 (pas Next.js), donc ces API brutes s'appliquent directement.

**`useActionState` — form d'invitation** (`src/features/family/InviteForm.tsx`) : chaque famille peut inviter des parents par email. L'Action valide l'email, poste vers `/api/families/:id/invite`, et retourne `{ error }` ou `{ invitedEmail }`. C'est le cas concret du module, écrit complet en Exemple 1.

**`useOptimistic` — toggle de statut famille** (`src/features/family/StatusToggle.tsx`) : l'admin active/désactive une famille via une case à cocher. Le toggle bascule instantanément (optimiste) pendant que le `PATCH` part au serveur — indispensable sur une liste de dizaines de familles où l'attente réseau serait perceptible.

**`use()` — promesse de config** (`src/app/FamilyAdminPage.tsx`) : la config d'instance (quota de familles, feature flags) est chargée une fois au niveau route et passée en prop `Promise<Config>`. Les composants la lisent avec `use()` sous un `Suspense`, sans `isLoading` manuel.

**Document Metadata — par page** : chaque page admin (`FamilyPage`, `MemberPage`) pose son propre `<title>`/`<meta>` directement dans le JSX, hoisté dans le `<head>` par React.

Ponts inter-cours : côté back (module 27), ces mêmes formulaires basculent sur des **Server Actions** (`"use server"`) — l'Action passée à `<form action>` devient une fonction serveur, et `useActionState` reste identique côté client.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  features/family/
    InviteForm.tsx      # useActionState + useFormStatus
    StatusToggle.tsx    # useOptimistic
  app/
    FamilyAdminPage.tsx # use(configPromise) + metadata
    config.ts           # crée la Promise<Config> stable
```

---

## 6. Points clés

1. Un `<form action={fn}>` appelle `fn(formData)` sans `preventDefault` — c'est une Action ; côté serveur elle porte `"use server"` (modules 20/27).
2. `useActionState(action, init)` renvoie `[state, formAction, isPending]` ; l'Action a la signature `(prevState, formData)`.
3. `useFormStatus()` (de `react-dom`) lit le pending du `<form>` parent — uniquement depuis un composant **enfant**.
4. `useOptimistic` affiche un état supposé pendant une transition/Action ; le remplacement est automatique, sans rollback à écrire.
5. `use()` lit une promesse (suspend, sous `Suspense`) ou un context, et peut être appelé conditionnellement ; ne jamais créer la promesse dans le composant qui l'appelle.
6. En React 19, `ref` est une prop normale — `forwardRef` n'est plus nécessaire (retiré avec `propTypes`, string refs, `ReactDOM.render`).
7. `<title>`/`<meta>`/`<link>` rendus dans un composant sont hoistés dans le `<head>` ; `preload`/`preinit` (de `react-dom`) préchargent des ressources.
8. Le React Compiler mémoïse automatiquement au build (fin de `useMemo`/`useCallback`/`memo`) mais exige un code conforme aux règles de React.

---

## 7. Seeds Anki

```
Que renvoie useActionState et quelle est la signature de son Action ?|Il renvoie un 3-tuple [state, formAction, isPending]. L'Action a la signature (prevState, formData) => newState — l'état précédent arrive EN PREMIER argument, le FormData en second.
Où doit vivre useFormStatus pour que `pending` soit correct ?|Dans un composant ENFANT du <form>. Appelé dans le composant qui rend lui-même le <form>, il n'a pas de <form> parent et `pending` reste toujours false. Il s'importe de react-dom.
Pourquoi ne jamais créer la promesse dans le composant qui appelle use() ?|Une nouvelle promesse est créée à chaque rendu, donc use() suspend indéfiniment → boucle infinie. La promesse doit être stable : créée dans le parent, un loader ou un cache, puis passée en prop.
Comment revient-on à l'état réel après un échec avec useOptimistic ?|Il n'y a pas de rollback explicite. L'état optimiste ne vit que pendant la transition/Action ; dès que le parent re-rend avec les données serveur (l'ancienne valeur si échec), l'état optimiste est écrasé automatiquement. useOptimistic doit être déclenché dans startTransition ou une Action.
En React 19, comment passe-t-on une ref à un composant fonction sans forwardRef ?|`ref` est devenu une prop normale : on la déclare dans les props (ref?: React.Ref<T>) et on l'applique au DOM. forwardRef n'est plus nécessaire (il reste supporté mais déprécié à terme).
Que fait le hook use() de particulier par rapport aux autres hooks ?|Il lit une ressource "usable" — une promesse (le composant suspend, géré par Suspense) ou un context — et il peut être appelé conditionnellement, dans un if ou une boucle, contrairement à useContext et aux autres hooks.
Quelle différence entre preload et preinit ?|preload télécharge une ressource pour un usage ultérieur sans l'exécuter ; preinit la télécharge ET l'initialise (exécute le script, applique la feuille de style). Les deux s'importent de react-dom.
Le React Compiler remplace-t-il useMemo/useCallback, et à quelle condition ?|Oui, il insère la mémoïsation automatiquement au build, rendant useMemo/useCallback/memo inutiles dans la plupart des cas. Condition : le code doit respecter les règles de React (pas de mutation de props, pas de side-effect dans le rendu, hooks au top-level).
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-34-react-19-nouveautes/README.md`. Câbler le formulaire d'invitation TribuZen avec `useActionState` + `useFormStatus`, puis ajouter un toggle de statut famille optimiste avec `useOptimistic`. Corrigé complet + variante J+30.
