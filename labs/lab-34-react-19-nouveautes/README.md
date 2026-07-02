# Lab 34 — React 19 : les nouveautés

> **Outcome :** à la fin, tu sais câbler un formulaire avec une Action + `useActionState` + `useFormStatus`, et afficher un toggle de statut optimiste avec `useOptimistic`, en React 19 + TypeScript.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis un mini-écran d'administration TribuZen : inviter un parent dans une famille, et activer/désactiver des familles avec un retour instantané. Cahier des charges **exact** :

1. **`InviteForm`** — formulaire d'invitation par email, câblé avec `useActionState`. L'Action valide l'email, simule un appel réseau, et retourne soit une erreur soit le succès. Un `SubmitButton` enfant lit le `pending` via `useFormStatus`.
2. **`StatusToggle`** — case à cocher qui active/désactive une famille avec `useOptimistic` : la case bascule **immédiatement**, l'appel réseau simulé confirme après un délai.
3. **`FamilyAdminPage`** — assemble un `InviteForm` et une liste de `StatusToggle`, et pose son `<title>` de page.

**Données et helpers de départ (à copier dans le projet) :**

```tsx
export interface Family {
  id: string;
  name: string;
  active: boolean;
}

export const DEMO_FAMILIES: Family[] = [
  { id: 'f1', name: 'Les Dupont', active: true },
  { id: 'f2', name: 'Les Martin', active: false },
  { id: 'f3', name: 'Les Bernard', active: true },
];

// Simule un appel réseau (700 ms). 1 chance sur 4 d'échouer, pour voir le rollback optimiste.
export function fakeToggle(id: string, next: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => (Math.random() < 0.25 ? reject(new Error('réseau')) : resolve()), 700);
  });
}

// Simule l'envoi d'une invitation (700 ms). Refuse les emails sans '@'.
export function fakeInvite(email: string): Promise<{ ok: boolean }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ok: email.includes('@') }), 700);
  });
}
```

**Contraintes :**
- `useActionState` et `use` s'importent de `react` ; `useFormStatus` de `react-dom`.
- Le `SubmitButton` **ne reçoit pas** de prop `pending` — il le lit lui-même via `useFormStatus` (donc il est enfant du `<form>`).
- `setOptimistic` **doit** être appelé dans `startTransition` — sinon l'état optimiste ne tient pas.
- **Pas de gap-fill** — tu écris chaque composant complet depuis le starter.

### Starter minimal

Crée un projet Vite React-TS et ces fichiers :

```
pnpm create vite@latest tribuzen-lab34 --template react-ts

src/
  data.ts              ← colle les helpers ci-dessus
  InviteForm.tsx       ← à écrire (useActionState + useFormStatus)
  StatusToggle.tsx     ← à écrire (useOptimistic)
  FamilyAdminPage.tsx  ← à écrire (assemble + <title>)
  App.tsx              ← branche <FamilyAdminPage />
```

Lance `pnpm dev` et valide dans le navigateur au fur et à mesure.

---

## Étapes (en friction)

1. **Écris `InviteForm.tsx`** — définis un type d'état `{ error?: string; invitedEmail?: string }`. Écris une Action `(prevState, formData) => Promise<State>` : lis `formData.get('email')`, valide, appelle `fakeInvite`, retourne l'erreur ou le succès. Branche-la avec `useActionState`, mets `formAction` sur `<form action>`.
2. **Écris `SubmitButton`** (dans le même fichier ou séparé) — appelle `useFormStatus`, `disabled={pending}`, texte « Envoi… » / « Inviter ». Rends-le **à l'intérieur** du `<form>`.
3. **Écris `StatusToggle.tsx`** — `useOptimistic(family.active)`. Dans `onChange`, ouvre un `startTransition(async () => { setOptimistic(next); await fakeToggle(...) })`. Entoure d'un `try/catch` pour ne pas planter sur l'échec simulé.
4. **Écris `FamilyAdminPage.tsx`** — pose `<title>Familles — Admin TribuZen</title>`, rends `<InviteForm />` puis la liste des `DEMO_FAMILIES` avec un `StatusToggle` chacune.
5. **Branche dans `App.tsx`** et vérifie dans le navigateur :
   - Invitation avec un email valide → « Invitation envoyée à … » ; email sans `@` → message d'erreur ; bouton désactivé pendant l'envoi.
   - Toggle : la case bascule **tout de suite**, pas après 700 ms. Quand l'échec simulé tombe, la case revient à son état d'origine.
   - L'onglet du navigateur affiche le titre de page.

---

## Corrigé complet commenté

```tsx
// ─── src/data.ts ────────────────────────────────────────────────
export interface Family {
  id: string;
  name: string;
  active: boolean;
}

export const DEMO_FAMILIES: Family[] = [
  { id: 'f1', name: 'Les Dupont', active: true },
  { id: 'f2', name: 'Les Martin', active: false },
  { id: 'f3', name: 'Les Bernard', active: true },
];

export function fakeToggle(id: string, next: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => (Math.random() < 0.25 ? reject(new Error('réseau')) : resolve()), 700);
  });
}

export function fakeInvite(email: string): Promise<{ ok: boolean }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ok: email.includes('@') }), 700);
  });
}

// ─── src/InviteForm.tsx ─────────────────────────────────────────
import { useActionState } from 'react';   // useActionState vient de react
import { useFormStatus } from 'react-dom'; // useFormStatus vient de react-dom
import { fakeInvite } from './data';

// État de retour persistant de l'Action, entre deux soumissions
interface InviteState {
  error?: string;
  invitedEmail?: string;
}

// Action de useActionState : (prevState, formData) — prevState EN PREMIER
async function inviteAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const email = (formData.get('email') as string)?.trim() ?? '';

  // Validation locale : on RETOURNE une erreur, on ne throw pas
  if (!email.includes('@')) {
    return { error: 'Adresse email invalide' };
  }

  const { ok } = await fakeInvite(email);
  if (!ok) return { error: 'Le serveur a refusé l’invitation' };

  return { invitedEmail: email }; // succès : la valeur persiste dans state
}

// Enfant du <form> : lit le pending sans prop, via useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Envoi…' : 'Inviter'}
    </button>
  );
}

export function InviteForm() {
  // 3-tuple : état courant, action à brancher sur le form, pending
  const [state, formAction, isPending] = useActionState(inviteAction, {});

  return (
    <form action={formAction} style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
      <label>
        Email du parent
        <input name="email" type="email" required disabled={isPending} />
      </label>

      {/* SubmitButton est enfant du <form> → useFormStatus fonctionne */}
      <SubmitButton />

      {state.error && <p role="alert" style={{ color: 'crimson' }}>{state.error}</p>}
      {state.invitedEmail && (
        <p style={{ color: 'green' }}>Invitation envoyée à {state.invitedEmail}</p>
      )}
    </form>
  );
}

// ─── src/StatusToggle.tsx ───────────────────────────────────────
import { useOptimistic, startTransition, useState } from 'react';
import { fakeToggle, type Family } from './data';

export function StatusToggle({ family }: { family: Family }) {
  // realActive = l'état "confirmé" ; il ne change que si le serveur réussit
  const [realActive, setRealActive] = useState(family.active);

  // Miroir optimiste de realActive : bascule instantanément
  const [active, setOptimistic] = useOptimistic(realActive);

  function handleChange(next: boolean) {
    // useOptimistic EXIGE une transition/Action pour survivre au rendu
    startTransition(async () => {
      setOptimistic(next);            // UI bascule tout de suite
      try {
        await fakeToggle(family.id, next);
        setRealActive(next);          // succès : on committe l'état réel
      } catch {
        // échec : on ne touche pas realActive → à la fin de la transition,
        // l'affichage revient à l'ancienne valeur (rollback automatique)
      }
    });
  }

  return (
    <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <input
        type="checkbox"
        checked={active}
        onChange={(e) => handleChange(e.target.checked)}
      />
      {active ? 'Active' : 'Inactive'}
    </label>
  );
}

// ─── src/FamilyAdminPage.tsx ────────────────────────────────────
import { InviteForm } from './InviteForm';
import { StatusToggle } from './StatusToggle';
import { DEMO_FAMILIES } from './data';

export function FamilyAdminPage() {
  return (
    <section style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
      {/* React 19 hoist <title>/<meta> dans le <head> automatiquement */}
      <title>Familles — Admin TribuZen</title>
      <meta name="description" content="Gestion des invitations et statuts de familles" />

      <div>
        <h2>Inviter un parent</h2>
        <InviteForm />
      </div>

      <div>
        <h2>Statut des familles</h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
          {DEMO_FAMILIES.map((f) => (
            <li key={f.id}>
              {f.name} — <StatusToggle family={f} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── src/App.tsx ────────────────────────────────────────────────
import { FamilyAdminPage } from './FamilyAdminPage';

function App() {
  return <FamilyAdminPage />;
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- `useActionState` remplace 4 `useState` (email, error, pending, success) + le `try/catch/finally` : l'Action retourne un état, React fournit `isPending` et reset le champ non contrôlé après succès.
- `SubmitButton` est un **enfant** du `<form>` : c'est la seule position où `useFormStatus` voit le bon `pending`.
- `StatusToggle` sépare `realActive` (état confirmé) du miroir `useOptimistic` : sur échec, on ne committe pas `realActive`, donc la fin de la transition ramène l'affichage à l'ancienne valeur — le « rollback » optimiste, sans code de rollback explicite.
- `setOptimistic` est dans `startTransition` : hors transition, l'état optimiste ne survivrait pas au rendu.
- `<title>`/`<meta>` posés dans la page sont hoistés dans le `<head>` par React 19.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes :**

1. Ajoute une **liste optimiste d'invitations envoyées** : `useOptimistic` sur un tableau `Invitation[]`, avec un reducer `(current, added) => [...current, added]`. Chaque email invité apparaît immédiatement dans la liste avec la mention « (en cours…) » et une opacité réduite, avant que `fakeInvite` réponde.
2. Fais lire à `FamilyAdminPage` une **promesse de config** `Promise<{ maxFamilies: number }>` avec le hook `use()` sous un `Suspense` — la promesse est créée **dans `App.tsx`** (hors du composant qui l'appelle) et passée en prop.
3. Remplace le `<button>` natif de `SubmitButton` par un composant `Button` **auquel tu passes une `ref`** — sans `forwardRef`, juste `ref` comme prop React 19.
4. **Sans ouvrir ce corrigé** ni le module 34.

**Critère de réussite :** l'invitation apparaît en liste instantanément puis se « confirme » ; le quota config s'affiche après le fallback Suspense ; la `ref` sur le bouton fonctionne (ex. `.focus()` au montage) sans `forwardRef`.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen` (Vite + React 19), ces composants vivent ici :

```
tribuzen/src/
  features/family/
    InviteForm.tsx      # useActionState + useFormStatus
    StatusToggle.tsx    # useOptimistic
  app/
    FamilyAdminPage.tsx # assemble + <title>/<meta>
    config.ts           # crée la Promise<Config> stable, lue avec use()
```

**Différences par rapport au lab :**
- `fakeInvite` / `fakeToggle` seront remplacés par de vrais appels (`fetch` vers l'API TribuZen, puis **Server Actions** `"use server"` côté back — modules 20/27). La signature de l'Action et le câblage `useActionState` restent identiques côté client.
- `StatusToggle` recevra `onToggle` en prop depuis le container parent (`FamilyListPage`) qui fait le `PATCH` et invalide le cache — le pattern optimiste ne change pas.
- Les styles inline seront remplacés par les tokens du design system TribuZen.

**Commit cible :**
```
feat(family): InviteForm — Action + useActionState + useFormStatus
feat(family): StatusToggle — bascule optimiste avec useOptimistic
```
