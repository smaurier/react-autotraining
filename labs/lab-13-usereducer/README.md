# Lab 13 — useReducer

> **Outcome :** à la fin, tu sais migrer un groupe de `useState` corrélés vers un `useReducer` typé (union discriminée), écrire un reducer pur, et l'étendre à la gestion d'une collection.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu reprends le **formulaire d'invitation** de l'admin TribuZen. Une première version existe, écrite avec **quatre `useState`** ; elle marche mais elle est fragile (setters corrélés, états impossibles représentables). Ta mission : la **migrer vers `useReducer`**, puis ajouter une **liste de membres** pilotée par un second reducer.

**Point de départ — la version fragile à remplacer (à copier dans `InvitationForm.tsx`) :**

```tsx
import { useState } from 'react';

// Simule l'appel réseau : réussit si l'email contient '@', échoue sinon
function sendInvite(email: string): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() => (email.includes('@') ? resolve() : reject(new Error('Email invalide'))), 600),
  );
}

export function InvitationForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'mod'>('member');
  const [status, setStatus] = useState<'draft' | 'submitting' | 'success' | 'error'>('draft');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await sendInvite(email);
      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
  }
  // … JSX …
}
```

**Contraintes :**
- Un **seul** `useReducer` remplace les quatre `useState`.
- Les actions sont une **union discriminée** sur `type` — pas de `string` libre, pas d'action sans discriminant.
- Le reducer est **pur** : l'appel `sendInvite` reste dans `handleSubmit`, jamais dans le reducer.
- `SUBMIT_STARTED` doit **ignorer** l'action si `status === 'submitting'` (anti double-envoi).
- Un cas `default` exhaustif avec `const _exhaustive: never = action`.
- **Pas de gap-fill** — tu écris le reducer et le composant complets depuis le starter.

### Starter minimal

Projet Vite (`pnpm create vite@latest tribuzen-lab13 --template react-ts`) :

```
src/
  features/
    invitations/
      invitationReducer.ts   ← à écrire (State, Action, reducer)
      InvitationForm.tsx      ← à écrire (dispatch, JSX)
    members/
      membersReducer.ts       ← étape 5
      MemberList.tsx          ← étape 5
  App.tsx                     ← branche <InvitationForm /> puis <MemberList />
```

Lance `pnpm dev` et valide dans le navigateur à chaque étape.

---

## Étapes (en friction)

1. **Écris `invitationReducer.ts`** — déclare `State` (`email`, `role`, `status`, `error`), `INITIAL`, et l'union `Action` (`FIELD_CHANGED`, `SUBMIT_STARTED`, `SUBMIT_SUCCEEDED`, `SUBMIT_FAILED`, `RESET`).
2. **Écris le `reducer`** — une branche par action, retour immuable. `SUBMIT_STARTED` remet `error: null` **et** passe `submitting` en une seule transition ; ajoute l'anti double-envoi. Termine par le `default` avec `never`.
3. **Écris `InvitationForm.tsx`** — `useReducer(reducer, INITIAL)`, un `handleSubmit` qui `dispatch` avant/après `sendInvite`, et le JSX (input email, select rôle, bouton désactivé en `submitting`, messages `success`/`error`).
4. **Vérifie dans le navigateur** : email sans `@` → message d'erreur ; email valide → « envoyée » + champ vidé ; double-clic rapide sur Envoyer → un seul envoi.
5. **Étends à la liste de membres** — écris `membersReducer.ts` (state = `Member[]`, actions `ADDED` / `REMOVED` / `PROMOTED`) et `MemberList.tsx`. La promotion suit l'ordre `member → mod → admin`.

---

## Corrigé complet commenté

```tsx
// ─── src/features/invitations/invitationReducer.ts ──────────────
export type Role = 'member' | 'mod';
export type Status = 'draft' | 'submitting' | 'success' | 'error';

export interface State {
  email: string;
  role: Role;
  status: Status;
  error: string | null;
}

export const INITIAL: State = { email: '', role: 'member', status: 'draft', error: null };

// Union discriminée : le champ 'type' sert de sélecteur, chaque action
// ne porte QUE son payload propre.
export type Action =
  | { type: 'FIELD_CHANGED'; field: 'email' | 'role'; value: string }
  | { type: 'SUBMIT_STARTED' }
  | { type: 'SUBMIT_SUCCEEDED' }
  | { type: 'SUBMIT_FAILED'; error: string }
  | { type: 'RESET' };

// Fonction PURE : pas de fetch, pas de mutation, retour déterministe.
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FIELD_CHANGED':
      // clé calculée : un seul point d'entrée pour email ET role
      return { ...state, [action.field]: action.value };

    case 'SUBMIT_STARTED':
      if (state.status === 'submitting') return state; // anti double-envoi
      // transition atomique : status + reset error ensemble, jamais l'un sans l'autre
      return { ...state, status: 'submitting', error: null };

    case 'SUBMIT_SUCCEEDED':
      // succès = formulaire vidé + status success, en une seule référence
      return { ...INITIAL, status: 'success' };

    case 'SUBMIT_FAILED':
      return { ...state, status: 'error', error: action.error };

    case 'RESET':
      return INITIAL;

    default: {
      // si une action du type union n'est pas gérée, TS refuse de compiler ici
      const _exhaustive: never = action;
      return state;
    }
  }
}

// ─── src/features/invitations/InvitationForm.tsx ────────────────
import { useReducer } from 'react';
import { reducer, INITIAL } from './invitationReducer';

// Effet de bord simulé — vit HORS du reducer
function sendInvite(email: string): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() => (email.includes('@') ? resolve() : reject(new Error('Email invalide'))), 600),
  );
}

export function InvitationForm() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { email, role, status, error } = state;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'SUBMIT_STARTED' }); // UNE action = la transition entière
    try {
      await sendInvite(email);            // l'effet de bord reste dans le handler
      dispatch({ type: 'SUBMIT_SUCCEEDED' });
    } catch (err) {
      dispatch({ type: 'SUBMIT_FAILED', error: (err as Error).message });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="email@tribuzen.app"
        value={email}
        disabled={status === 'submitting'}
        onChange={(e) =>
          dispatch({ type: 'FIELD_CHANGED', field: 'email', value: e.target.value })
        }
      />
      <select
        value={role}
        disabled={status === 'submitting'}
        onChange={(e) =>
          dispatch({ type: 'FIELD_CHANGED', field: 'role', value: e.target.value })
        }
      >
        <option value="member">Membre</option>
        <option value="mod">Modérateur</option>
      </select>

      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Envoi…' : 'Inviter'}
      </button>

      {status === 'success' && <p role="status">Invitation envoyée ✅</p>}
      {status === 'error' && <p role="alert">Échec : {error}</p>}
    </form>
  );
}

// ─── src/features/members/membersReducer.ts ─────────────────────
export interface Member {
  id: string;
  name: string;
  role: 'member' | 'mod' | 'admin';
}

// Règle métier de promotion isolée dans le reducer
const NEXT_ROLE: Record<Member['role'], Member['role']> = {
  member: 'mod',
  mod: 'admin',
  admin: 'admin', // déjà au sommet, idempotent
};

export type MembersAction =
  | { type: 'ADDED'; member: Member }
  | { type: 'REMOVED'; id: string }
  | { type: 'PROMOTED'; id: string }
  | { type: 'RESET'; members: Member[] };

// state = un tableau : le state d'un reducer n'est pas obligé d'être un objet
export function membersReducer(state: Member[], action: MembersAction): Member[] {
  switch (action.type) {
    case 'ADDED':
      return [...state, action.member];              // nouveau tableau, pas de push
    case 'REMOVED':
      return state.filter((m) => m.id !== action.id);
    case 'PROMOTED':
      return state.map((m) =>
        m.id === action.id ? { ...m, role: NEXT_ROLE[m.role] } : m,
      );
    case 'RESET':
      return action.members;
    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}

// ─── src/features/members/MemberList.tsx ────────────────────────
import { useReducer } from 'react';
import { membersReducer, type Member } from './membersReducer';

const SEED: Member[] = [
  { id: 'a', name: 'Alice', role: 'admin' },
  { id: 'b', name: 'Bruno', role: 'member' },
];

export function MemberList() {
  const [members, dispatch] = useReducer(membersReducer, SEED);

  return (
    <div>
      <button
        onClick={() =>
          dispatch({ type: 'ADDED', member: { id: crypto.randomUUID(), name: 'Nouveau', role: 'member' } })
        }
      >
        + Ajouter
      </button>
      <ul>
        {members.map((m) => (
          <li key={m.id}>
            {m.name} — <em>{m.role}</em>
            <button onClick={() => dispatch({ type: 'PROMOTED', id: m.id })}>Promouvoir</button>
            <button onClick={() => dispatch({ type: 'REMOVED', id: m.id })}>Retirer</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── src/App.tsx ────────────────────────────────────────────────
import { InvitationForm } from './features/invitations/InvitationForm';
import { MemberList } from './features/members/MemberList';

function App() {
  return (
    <div style={{ padding: '2rem', display: 'grid', gap: '2rem', maxWidth: 480 }}>
      <section>
        <h1>TribuZen Admin — Lab 13</h1>
        <h2>Inviter un membre</h2>
        <InvitationForm />
      </section>
      <section>
        <h2>Membres</h2>
        <MemberList />
      </section>
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- « Passer en envoi » (`status: 'submitting'` **+** `error: null`) est atomique dans **une** branche — impossible d'oublier un setter, contrairement à la version `useState`.
- Le reducer ne contient **aucun** effet de bord : `sendInvite` vit dans `handleSubmit`, donc `invitationReducer` est testable sans React.
- Les états impossibles (`success` avec `error`) ne sont pas atteignables : chaque transition reconstruit un état cohérent.
- `SUBMIT_STARTED` renvoie `state` inchangé si déjà `submitting` → l'anti double-envoi vit dans le reducer, pas dans le JSX.
- `membersReducer` respecte l'immutabilité (`spread`, `filter`, `map`) et encapsule la règle `NEXT_ROLE` ; le `default: never` garantit l'exhaustivité des deux reducers.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes, sans rouvrir ce corrigé ni le module 13 :**

1. Ajoute une action `RETRIED` au reducer d'invitation : depuis `status: 'error'`, elle repasse en `draft` **en gardant** l'`email` et le `role` déjà saisis (pour ne pas retaper). Affiche un bouton « Réessayer » quand `status === 'error'`.
2. Ajoute une **initialisation paresseuse** : `useReducer(reducer, seedEmail, init)` où `init(seed)` pré-remplit l'email depuis une prop `seedEmail`. Réutilise `init` dans un `RESET` propre.
3. Dans `membersReducer`, ajoute une action `RENAMED` (`{ type: 'RENAMED'; id; name }`) et empêche `PROMOTED` de dépasser `admin` (déjà géré par `NEXT_ROLE` — vérifie-le).

**Critère de réussite :** l'erreur d'email conserve la saisie au « Réessayer », le champ pré-rempli s'affiche au montage, et TypeScript reste vert (le `default: never` t'oblige à traiter les nouvelles actions).

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces reducers vivent isolés de leurs composants pour rester testables :

```
tribuzen/src/features/
  invitations/
    invitationReducer.ts     ← reducer pur, importable en test
    InvitationForm.tsx
  members/
    membersReducer.ts
    MemberList.tsx
```

**Différences par rapport au lab :**
- `sendInvite` sera un vrai appel API (client HTTP TribuZen) au lieu du `setTimeout` simulé — mais il reste **hors** du reducer, dans le handler ou un custom hook `useInviteMutation`.
- Quand le statut d'invitation et la liste de membres devront être partagés entre la barre latérale et le tableau principal, on gardera **le même reducer** et on diffusera `state` + `dispatch` via **Context** (module 14) — `dispatch` stable évite les re-renders parasites.
- Les styles inline seront remplacés par les tokens du design system TribuZen ; la logique de transition ne change pas.

**Commit cible :**
```
refactor(invitations): InvitationForm — useState corrélés → useReducer typé
feat(members): membersReducer — add/remove/promote en actions typées
```
