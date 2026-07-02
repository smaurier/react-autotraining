---
titre: useReducer
cours: 04-react
notions: [quand préférer useReducer à useState, reducer comme fonction pure, actions typées en union discriminée, dispatch stable, state machine simple, lazy init avec troisième argument, migration useState vers useReducer]
outcomes: [choisir useReducer plutôt que useState quand les transitions d'état sont complexes, écrire un reducer pur avec des actions typées en union discriminée, migrer un groupe de useState corrélés vers un reducer]
prerequis: [12-custom-hooks]
next: 14-context-api
libs: [{ name: react, version: "^19" }]
tribuzen: reducer du formulaire d'invitation multi-étapes de l'admin TribuZen (draft/submitting/success/error)
last-reviewed: 2026-07
---

# useReducer

> **Outcomes — tu sauras FAIRE :** choisir `useReducer` plutôt que `useState` quand les transitions d'état sont complexes, écrire un reducer pur avec des actions typées en union discriminée, migrer un groupe de `useState` corrélés vers un reducer.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, tu construis le **formulaire d'invitation** d'un nouveau membre : l'admin remplit un email et un rôle, clique « Envoyer », le serveur répond OK ou en erreur. Un collègue a codé ça avec quatre `useState` :

```tsx
// InvitationForm.tsx — AVANT, quatre useState corrélés
function InvitationForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'mod'>('member');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'ko'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setStatus('sending');
    setError(null);            // oublier ce reset = l'ancienne erreur reste affichée
    try {
      await sendInvite(email, role);
      setStatus('ok');
      setEmail('');            // reset du champ… mais pas de role, incohérent ?
    } catch (e) {
      setStatus('ko');
      setError((e as Error).message);
    }
  }
  // ...
}
```

**Trois problèmes immédiats :**
1. **Les setters sont corrélés mais indépendants.** « Passer en envoi » = `setStatus('sending')` **et** `setError(null)`. Oublier l'un des deux est un bug silencieux.
2. **Les états impossibles sont représentables.** Rien n'empêche `status: 'ok'` avec `error: 'timeout'` en même temps. Le typage ne protège pas la cohérence.
3. **La logique de transition est éparpillée** dans les handlers, mêlée au rendu — impossible à relire d'un coup, impossible à tester sans monter le composant.

`useReducer` centralise toutes ces transitions dans **une seule fonction pure**. Ce module te montre quand et comment.

---

## 2. Théorie complète, concise

### 2.1 Ce qu'est `useReducer`

`useReducer` est un hook d'état, comme `useState`, mais où **la mise à jour passe par une fonction de transition** — le *reducer* — au lieu d'un setter direct.

```tsx
const [state, dispatch] = useReducer(reducer, initialState);
```

| Élément | Rôle |
|---|---|
| `state` | l'état courant, en lecture seule |
| `dispatch` | la **seule** façon de demander un changement : on lui passe une *action* |
| `reducer` | fonction pure `(state, action) => nouveauState` |
| `action` | objet qui décrit **ce qui arrive** (pas comment muter) |

Le flux est toujours le même : le composant appelle `dispatch(action)` → React appelle `reducer(state, action)` → le retour devient le nouveau state → re-render.

```tsx
dispatch({ type: 'FIELD_CHANGED', field: 'email', value: 'a@b.c' });
//        └── une action = une intention nommée, pas une valeur brute
```

### 2.2 Le reducer est une fonction pure

C'est la règle non négociable. Un reducer :
- **ne mute pas** `state` (il retourne un **nouvel** objet) ;
- **n'a pas d'effet de bord** : pas de `fetch`, pas de `setTimeout`, pas d'écriture `localStorage`, pas de `Math.random()` ni `Date.now()` en dépendance de sortie ;
- pour un même `(state, action)`, retourne **toujours** le même résultat.

```tsx
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };   // ✅ nouvel objet
    // ❌ NE JAMAIS FAIRE : state.count++ ; return state;  (mutation)
    default:
      return state;   // action inconnue → état inchangé
  }
}
```

Pourquoi cette discipline ? Parce qu'une fonction pure est **prévisible et testable** : on peut l'appeler dans un test sans React (`reducer(etat, action)` et on vérifie le retour). Les effets de bord (l'appel réseau) restent **dans le composant ou un hook**, jamais dans le reducer.

### 2.3 Actions typées : l'union discriminée TypeScript

Le cœur de la robustesse en TS. On décrit **toutes** les actions possibles comme une **union discriminée** — un ensemble d'objets qui partagent un champ littéral commun (`type`) servant de discriminant.

```tsx
type Action =
  | { type: 'FIELD_CHANGED'; field: 'email' | 'role'; value: string }
  | { type: 'SUBMIT_STARTED' }
  | { type: 'SUBMIT_SUCCEEDED' }
  | { type: 'SUBMIT_FAILED'; error: string }
  | { type: 'RESET' };
```

Trois bénéfices concrets :
1. **Payload typé par branche.** Dans `case 'SUBMIT_FAILED'`, TypeScript *sait* que `action.error` existe. Dans `case 'SUBMIT_STARTED'`, y accéder est une erreur de compilation — chaque action ne porte que ses champs.
2. **Autocomplétion du `dispatch`.** `dispatch({ type: '...' })` propose la liste exacte et exige le bon payload.
3. **Exhaustivité vérifiable** (voir 2.5) : TS peut te forcer à traiter toutes les branches.

### 2.4 `dispatch` est stable

`dispatch` a une **identité stable** pour toute la vie du composant : React garantit qu'il ne change **jamais** entre les rendus. Conséquences pratiques :
- tu peux l'omettre des tableaux de dépendances (`useEffect`, `useCallback`) sans le lister — il est stable comme la fonction setter de `useState` ;
- le passer en prop à un enfant `memo` ne casse **pas** la mémoïsation (contrairement à un handler recréé à chaque rendu) ;
- c'est pour ça que le couple `useReducer` + `Context` est si propre : on diffuse `dispatch` dans tout l'arbre sans provoquer de re-renders parasites (module suivant, `14-context-api`).

```tsx
useEffect(() => {
  const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
  return () => clearInterval(id);
}, []);   // dispatch stable → pas besoin de le mettre en dépendance
```

### 2.5 Une petite state machine

`useReducer` brille quand l'état suit des **transitions explicites** — une machine à états. Le statut d'un formulaire async est l'exemple canonique :

```tsx
type Status = 'draft' | 'submitting' | 'success' | 'error';
```

Le reducer devient la **table de transition** : depuis `submitting`, seuls `SUBMIT_SUCCEEDED` et `SUBMIT_FAILED` ont un sens. On peut même ignorer une action hors contexte au lieu de créer un état impossible :

```tsx
case 'SUBMIT_STARTED':
  if (state.status === 'submitting') return state;   // déjà en cours → ignore
  return { ...state, status: 'submitting', error: null };
```

Pour garantir qu'on traite toutes les branches, on ajoute un cas `default` **exhaustif** via le type `never` :

```tsx
default: {
  const _exhaustive: never = action;   // ❗ erreur TS si une action n'est pas gérée
  return state;
}
```

Si tu ajoutes plus tard une action au type `Action` sans la gérer dans le `switch`, TypeScript refuse de compiler ici — filet de sécurité gratuit.

### 2.6 Lazy init — le troisième argument

`useReducer` accepte un **3e argument** : une fonction d'initialisation, utile quand l'état de départ est coûteux à calculer ou dérivé d'une prop.

```tsx
function init(seedEmail: string): State {
  return { status: 'draft', email: seedEmail, role: 'member', error: null };
}

// React appelle init(seedEmail) UNE fois, au montage
const [state, dispatch] = useReducer(reducer, seedEmail, init);
```

Le 2e argument devient l'**entrée** de `init`, pas l'état direct. Cela permet aussi de réutiliser `init` dans une action `RESET` (`return init(action.seed)`), au lieu de dupliquer l'objet initial.

### 2.7 useState ou useReducer ? La décision

`useReducer` n'est **pas** un « meilleur `useState` ». C'est un outil pour un problème précis.

| Situation | Choix |
|---|---|
| Un booléen, un compteur, un champ isolé | `useState` |
| 2-3 valeurs **indépendantes** | `useState` (un par valeur) |
| Plusieurs valeurs qui **changent ensemble** / se contraignent | `useReducer` |
| Le prochain état dépend **fortement** du précédent | `useReducer` |
| Machine à états (statuts, étapes) | `useReducer` |
| Logique de transition à **tester** hors composant | `useReducer` |
| État à partager loin dans l'arbre | `useReducer` + Context (module 14) |
| Données **serveur** (liste d'utilisateurs, posts) | ni l'un ni l'autre → TanStack Query |

Règle courte : **plusieurs `setX` appelés systématiquement ensemble = signal fort pour un reducer.**

### 2.8 Migrer `useState` → `useReducer`

Méthode mécanique en 4 temps :
1. **Regrouper** les `useState` corrélés en un seul type `State`.
2. **Nommer les intentions** : chaque endroit qui appelle plusieurs setters devient **une** action.
3. **Écrire le reducer** : une branche `case` par action, retour immuable.
4. **Remplacer** les setters par des `dispatch({ type: ... })`.

Le rendu (JSX) bouge à peine : on lit `state.x` au lieu de `x`, on `dispatch` au lieu de `setX`.

---

## 3. Worked examples

### Exemple 1 — Le formulaire d'invitation TribuZen (migration complète)

On reprend le cas concret et on le convertit intégralement.

```tsx
// InvitationForm.tsx — APRÈS, un seul reducer
import { useReducer } from 'react';
import { sendInvite } from '@/api/invitations';

// ─── 1. L'état, regroupé et typé ────────────────────────────────
type Role = 'member' | 'mod';
type Status = 'draft' | 'submitting' | 'success' | 'error';

interface State {
  email: string;
  role: Role;
  status: Status;
  error: string | null;
}

const INITIAL: State = { email: '', role: 'member', status: 'draft', error: null };

// ─── 2. Les actions, union discriminée ──────────────────────────
type Action =
  | { type: 'FIELD_CHANGED'; field: 'email' | 'role'; value: string }
  | { type: 'SUBMIT_STARTED' }
  | { type: 'SUBMIT_SUCCEEDED' }
  | { type: 'SUBMIT_FAILED'; error: string }
  | { type: 'RESET' };

// ─── 3. Le reducer, fonction pure = table de transition ─────────
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FIELD_CHANGED':
      // un seul point d'entrée pour tous les champs
      return { ...state, [action.field]: action.value };

    case 'SUBMIT_STARTED':
      if (state.status === 'submitting') return state; // anti double-envoi
      return { ...state, status: 'submitting', error: null };

    case 'SUBMIT_SUCCEEDED':
      // succès = on vide le formulaire ET on repasse en draft, atomiquement
      return { ...INITIAL, status: 'success' };

    case 'SUBMIT_FAILED':
      return { ...state, status: 'error', error: action.error };

    case 'RESET':
      return INITIAL;

    default: {
      const _exhaustive: never = action; // garde d'exhaustivité
      return state;
    }
  }
}

// ─── 4. Le composant ────────────────────────────────────────────
export function InvitationForm() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { email, role, status, error } = state;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'SUBMIT_STARTED' });      // UNE action = la transition entière
    try {
      await sendInvite(email, role);            // effet de bord : DANS le composant
      dispatch({ type: 'SUBMIT_SUCCEEDED' });
    } catch (err) {
      dispatch({ type: 'SUBMIT_FAILED', error: (err as Error).message });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        disabled={status === 'submitting'}
        onChange={(e) => dispatch({ type: 'FIELD_CHANGED', field: 'email', value: e.target.value })}
      />
      <select
        value={role}
        disabled={status === 'submitting'}
        onChange={(e) => dispatch({ type: 'FIELD_CHANGED', field: 'role', value: e.target.value })}
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
```

**Ce que la migration apporte :**
- « Passer en envoi » (`status: 'submitting'` **+** `error: null`) est **atomique** dans une seule branche — plus d'oubli possible.
- L'effet de bord (`sendInvite`) reste dans `handleSubmit` ; le reducer, lui, reste pur et testable.
- Le rendu ne connaît que `state` et `dispatch` — la logique de transition a quitté le JSX.

### Exemple 2 — Liste de membres avec actions typées (add / remove / promote)

Deuxième forme classique : le reducer gère une **collection**. Ici la liste des membres d'une famille dans l'admin.

```tsx
import { useReducer } from 'react';

interface Member {
  id: string;
  name: string;
  role: 'member' | 'mod' | 'admin';
}

type Action =
  | { type: 'ADDED'; member: Member }
  | { type: 'REMOVED'; id: string }
  | { type: 'PROMOTED'; id: string }               // member → mod → admin
  | { type: 'RESET'; members: Member[] };

const NEXT_ROLE: Record<Member['role'], Member['role']> = {
  member: 'mod',
  mod: 'admin',
  admin: 'admin', // déjà au sommet
};

// state = un simple tableau (le state n'est pas obligé d'être un objet)
function membersReducer(state: Member[], action: Action): Member[] {
  switch (action.type) {
    case 'ADDED':
      // garde l'immutabilité : nouveau tableau, pas de push
      return [...state, action.member];

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

export function MemberList({ initial }: { initial: Member[] }) {
  const [members, dispatch] = useReducer(membersReducer, initial);

  return (
    <ul>
      {members.map((m) => (
        <li key={m.id}>
          {m.name} — <em>{m.role}</em>
          <button onClick={() => dispatch({ type: 'PROMOTED', id: m.id })}>
            Promouvoir
          </button>
          <button onClick={() => dispatch({ type: 'REMOVED', id: m.id })}>
            Retirer
          </button>
        </li>
      ))}
    </ul>
  );
}
```

**Points saillants :**
- Le `state` d'un reducer **n'est pas obligé d'être un objet** — ici c'est un `Member[]`.
- Chaque opération de collection (`map`, `filter`, spread) retourne un **nouveau** tableau : immutabilité respectée.
- `PROMOTED` encapsule la règle métier « rôle suivant » dans le reducer, pas dans le JSX.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Muter le state au lieu de le recréer

```tsx
// ❌ Mutation : React ne détecte pas le changement, pas de re-render
case 'ADDED':
  state.push(action.member);   // mute le tableau existant
  return state;                // même référence → React croit "rien n'a changé"

// ✅ Nouveau tableau
case 'ADDED':
  return [...state, action.member];
```

React compare les **références** (`Object.is`). Si tu renvoies le même objet muté, le rendu ne se déclenche pas. Un reducer retourne **toujours** une nouvelle référence quand l'état change.

### PIÈGE #2 — Mettre l'effet de bord dans le reducer

```tsx
// ❌ Le reducer n'est plus pur : appel réseau + non déterminisme
case 'SUBMIT_STARTED':
  fetch('/api/invite', { method: 'POST' });   // effet de bord interdit ici
  return { ...state, status: 'submitting' };
```

Le reducer doit rester une fonction pure `(state, action) => state`. Les `fetch`, timers, `localStorage` vivent dans le composant (handler, `useEffect`) ou un custom hook. **Le reducer décide de l'état, pas des effets.**

### PIÈGE #3 — Croire que `useReducer` remplace toujours `useState`

```tsx
// ❌ Sur-ingénierie : un booléen ne mérite pas un reducer
const [open, dispatch] = useReducer(
  (s: boolean, a: 'toggle') => (a === 'toggle' ? !s : s),
  false,
);

// ✅ useState suffit largement
const [open, setOpen] = useState(false);
```

`useReducer` a un coût de boilerplate. Pour un état simple et isolé, `useState` est plus lisible. Réserve le reducer aux **transitions complexes ou corrélées**.

### PIÈGE #4 — Oublier le discriminant `type` (union non discriminée)

```tsx
// ❌ Pas de champ littéral commun → TS ne peut pas rétrécir le type
type Action = { add?: Member } | { remove?: string };
// dans le switch, impossible de savoir laquelle est présente proprement

// ✅ Union discriminée : 'type' littéral commun sert de sélecteur
type Action =
  | { type: 'ADDED'; member: Member }
  | { type: 'REMOVED'; id: string };
```

Sans champ discriminant (`type`), TypeScript ne peut pas **rétrécir** (`narrow`) l'action dans chaque `case`, et tu perds tout le typage du payload. Le discriminant est ce qui fait fonctionner le pattern.

### PIÈGE #5 — Recalculer `dispatch` ou le croire instable

```tsx
// ❌ Inutile : dispatch est déjà stable, useCallback ne sert à rien
const stableDispatch = useCallback(dispatch, []);

// ✅ Utilise dispatch tel quel, y compris en dépendance omise
useEffect(() => { dispatch({ type: 'RESET' }); }, []); // pas besoin de le lister
```

`dispatch` est garanti stable par React pour toute la vie du composant. Pas de `useCallback`, pas de warning de lint à contourner.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, deux endroits utilisent un reducer plutôt qu'une grappe de `useState` :

**`InvitationForm`** (`src/features/invitations/InvitationForm.tsx`) — le formulaire d'invitation d'un membre. C'est une **machine à états** `draft → submitting → success | error`. Le reducer (Exemple 1) garantit qu'on ne peut pas être `success` **et** porter une `error`, et rend l'anti double-envoi trivial (`SUBMIT_STARTED` ignore l'action si `status === 'submitting'`). L'appel réseau `sendInvite` reste dans le handler ; le reducer reste pur, donc testable sans monter le composant.

**`MemberList`** (`src/features/members/MemberList.tsx`) — la gestion de la liste des membres d'une famille : ajout, retrait, promotion de rôle. Les actions typées (`ADDED`, `REMOVED`, `PROMOTED`) centralisent les règles métier (l'ordre `member → mod → admin`) et garantissent l'immutabilité de la collection.

Quand ces états devront être **partagés** entre plusieurs écrans (barre latérale + tableau principal), on gardera le **même reducer** et on diffusera `state` + `dispatch` via Context — c'est exactement le sujet du module suivant, `14-context-api`. Le reducer écrit ici est **réutilisé tel quel**, sans réécriture.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/features/
  invitations/
    InvitationForm.tsx
    invitationReducer.ts     ← reducer isolé, importé + testable seul
  members/
    MemberList.tsx
    membersReducer.ts
```

---

## 6. Points clés

1. `useReducer(reducer, initialState)` renvoie `[state, dispatch]` ; `dispatch(action)` est la **seule** façon de changer l'état.
2. Le reducer est une **fonction pure** `(state, action) => newState` : pas de mutation, pas d'effet de bord, résultat déterministe.
3. Les actions se typent en **union discriminée** sur le champ `type` — payload correct par branche, autocomplétion, exhaustivité.
4. Un cas `default` avec `const _exhaustive: never = action` force TS à couvrir toutes les actions.
5. `dispatch` a une **identité stable** : pas de `useCallback`, omissible en dépendance, idéal avec `Context` et les enfants `memo`.
6. Choisir `useReducer` quand plusieurs valeurs **changent ensemble**, quand le prochain état dépend du précédent, ou pour une **machine à états** ; sinon `useState`.
7. Le 3e argument (`init`) permet une **initialisation paresseuse** et un `RESET` propre réutilisant la même fonction.
8. Migration `useState → useReducer` : regrouper l'état, nommer les intentions en actions, écrire le reducer, remplacer les setters par `dispatch`.

---

## 7. Seeds Anki

```
Quels sont les deux éléments retournés par useReducer et à quoi servent-ils ?|Un tuple [state, dispatch]. state est l'état courant en lecture seule ; dispatch(action) est la seule façon de demander une transition — React appelle alors reducer(state, action) pour produire le nouvel état.
Quelles sont les trois règles d'un reducer pur ?|1) ne pas muter le state (retourner un nouvel objet) ; 2) aucun effet de bord (pas de fetch, timer, localStorage, aléatoire) ; 3) déterministe : même (state, action) → même retour.
Qu'est-ce qu'une union discriminée pour typer les actions et qu'apporte-t-elle ?|Un ensemble d'objets partageant un champ littéral commun (type) : { type:'ADDED'; member } | { type:'REMOVED'; id }. Elle donne un payload typé par branche du switch, l'autocomplétion du dispatch et la vérification d'exhaustivité.
Pourquoi peut-on omettre dispatch des dépendances d'un useEffect ?|Parce que React garantit que dispatch a une identité stable pour toute la vie du composant : il ne change jamais entre les rendus, comme le setter de useState.
Quand préférer useReducer à useState ?|Quand plusieurs valeurs d'état changent ensemble / se contraignent, quand le prochain état dépend fortement du précédent, ou pour une machine à états (statuts, étapes). Pour un état simple et isolé, useState reste préférable.
Comment forcer TypeScript à vérifier qu'un reducer traite toutes les actions ?|Dans le cas default, écrire const _exhaustive: never = action; : si une action du type union n'est pas gérée par un case, TS refuse de compiler car elle n'est pas assignable à never.
À quoi sert le troisième argument de useReducer ?|C'est une fonction d'initialisation paresseuse : useReducer(reducer, arg, init) appelle init(arg) une seule fois au montage. Utile pour un état initial coûteux/dérivé et pour réutiliser init dans une action RESET.
Quelle est la méthode pour migrer plusieurs useState corrélés vers useReducer ?|1) regrouper les valeurs en un type State ; 2) nommer chaque groupe de setters comme une action ; 3) écrire le reducer avec une branche par action (retour immuable) ; 4) remplacer les setX par des dispatch({ type: ... }).
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-13-usereducer/README.md`. Migrer le formulaire d'invitation TribuZen de quatre `useState` vers un reducer typé, puis étendre le reducer à la liste de membres (add / remove / promote).
