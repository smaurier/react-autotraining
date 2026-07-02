# Lab 20 — Contrôlé vs non-contrôlé

> **Outcome :** à la fin, tu sais écrire un formulaire contrôlé avec validation live, un formulaire non-contrôlé lu via `FormData`, et tu sais provoquer puis corriger le warning « controlled to uncontrolled ».
> **Vrai outil :** React 19 + TypeScript + Vite dev server (frappe et validation visibles en direct dans le navigateur, warnings visibles dans la console).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis les deux formulaires de l'admin TribuZen dans le même écran :

1. **`InviteMemberForm`** — **contrôlé**. Champs : `email` (input) + `role` (select `member` | `admin`). Valide le format d'email **pendant la frappe**, affiche l'erreur sous le champ, désactive « Envoyer l'invitation » tant que l'email est vide ou invalide.
2. **`SearchFamiliesForm`** — **non-contrôlé**. Champs : `query` (input texte) + `onlyActive` (checkbox, cochée par défaut). Lit les valeurs **seulement à la soumission** via `FormData`, sans aucun `useState`, et appelle `onSearch(criteria)`.
3. **Bug volontaire** — dans une 3e étape, tu provoques le warning « changing an uncontrolled input to be controlled » puis tu le corriges.

**Contraintes :**
- `InviteMemberForm` : un seul objet de state + un seul `handleChange` (computed property name `[name]`). L'erreur et l'état du bouton sont **dérivés** du state, pas stockés dans un `useState` séparé.
- `SearchFamiliesForm` : **zéro `useState`, zéro `ref`** — uniquement `FormData` et des `name`. Une checkbox décochée est absente du `FormData`.
- **Pas de gap-fill** — tu écris chaque composant complet depuis le starter.

### Starter minimal

Crée un projet Vite (`pnpm create vite@latest tribuzen-forms --template react-ts`) puis ces fichiers :

```
src/
  features/
    members/
      InviteMemberForm.tsx    ← à écrire (contrôlé)
    families/
      SearchFamiliesForm.tsx  ← à écrire (non-contrôlé)
  App.tsx                     ← branche les deux formulaires
```

Lance `pnpm dev`, garde la console ouverte (les warnings React s'y affichent).

---

## Étapes (en friction)

1. **Écris `InviteMemberForm.tsx`** — state `{ email: '', role: 'member' }`. Un `handleChange` typé `React.ChangeEvent<HTMLInputElement | HTMLSelectElement>`. Calcule `emailError` et `canSubmit` **dérivés** du state (pas de state d'erreur). Bouton `disabled={!canSubmit}`. Vérifie dans le navigateur : tape un email invalide → erreur rouge en direct, bouton grisé ; complète l'email → erreur disparaît, bouton actif.
2. **Écris `SearchFamiliesForm.tsx`** — prop `onSearch: (c: SearchCriteria) => void`. `onSubmit` fait `new FormData(e.currentTarget)`, lit `query` (trim) et `onlyActive` (`get('onlyActive') === 'on'`). Champs non-contrôlés avec `name` + `defaultValue` / `defaultChecked`. Vérifie : décoche la case, soumets → `onlyActive: false` dans le log ; ajoute un `console.log` dans le rendu pour constater qu'il n'y a **aucun re-render** pendant la frappe.
3. **Provoque le warning** — dans `App.tsx`, simule une donnée chargée en retard : passe `initialEmail?: string` (undefined) à un `useState(initialEmail)` dans une copie du form contrôlé, branche un `value={email}`. Ouvre la console, tape dans le champ → observe « changing an uncontrolled input to be controlled ». **Puis corrige** avec `useState(initialEmail ?? '')`.

---

## Corrigé complet commenté

```tsx
// ─── src/features/members/InviteMemberForm.tsx ──────────────────
import { useState } from 'react';

type Role = 'member' | 'admin';

interface InviteState {
  email: string;
  role: Role;
}

// Regex simple : au moins un caractère avant @, après @, et après le point
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function InviteMemberForm() {
  // CONTRÔLÉ : React possède les valeurs → validation live possible
  const [form, setForm] = useState<InviteState>({ email: '', role: 'member' });

  // handler unique : [name] cible la bonne clé de l'objet state
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // DÉRIVÉ du state à chaque render — jamais désynchronisé, pas de useState d'erreur
  const emailError =
    form.email.length > 0 && !EMAIL_RE.test(form.email)
      ? "Format d'email invalide"
      : '';

  const canSubmit = form.email.length > 0 && emailError === '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return; // garde-fou : le disabled ne suffit pas seul
    console.log('Invitation envoyée :', form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email{' '}
        <input
          name="email"
          type="email"
          value={form.email}          // contrôlé : la valeur vient du state
          onChange={handleChange}     // chaque frappe met à jour le state
        />
      </label>
      {/* recalculé à CHAQUE frappe → validation live */}
      {emailError && <span style={{ color: 'red' }}>{emailError}</span>}

      <label>
        {' '}Rôle{' '}
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="member">Membre</option>
          <option value="admin">Admin</option>
        </select>
      </label>

      {/* le state pilote le bouton : impossible d'envoyer un email invalide */}
      <button type="submit" disabled={!canSubmit}>
        Envoyer l'invitation
      </button>
    </form>
  );
}

export default InviteMemberForm;

// ─── src/features/families/SearchFamiliesForm.tsx ───────────────
import type { FormEvent } from 'react';

export interface SearchCriteria {
  query: string;
  onlyActive: boolean;
}

interface Props {
  onSearch: (criteria: SearchCriteria) => void;
}

function SearchFamiliesForm({ onSearch }: Props) {
  // NON-CONTRÔLÉ : aucun state, aucune ref — le DOM gère la saisie
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget); // lecture unique à la soumission
    onSearch({
      query: (formData.get('query') as string).trim(),
      // checkbox décochée = absente du FormData → get() renvoie null (≠ 'on')
      onlyActive: formData.get('onlyActive') === 'on',
    });
  };

  // pas de re-render pendant la frappe : ce log ne s'affiche qu'au montage
  console.log('SearchFamiliesForm render');

  return (
    <form onSubmit={handleSubmit}>
      {/* name = clé lue par FormData ; defaultValue = init sans contrôle */}
      <input name="query" defaultValue="" placeholder="Nom de famille…" />
      <label>
        <input name="onlyActive" type="checkbox" defaultChecked />
        {' '}Familles actives uniquement
      </label>
      <button type="submit">Rechercher</button>
    </form>
  );
}

export default SearchFamiliesForm;

// ─── src/App.tsx ────────────────────────────────────────────────
import InviteMemberForm from './features/members/InviteMemberForm';
import SearchFamiliesForm, {
  type SearchCriteria,
} from './features/families/SearchFamiliesForm';

function App() {
  const handleSearch = (criteria: SearchCriteria) => {
    console.log('Recherche familles :', criteria);
  };

  return (
    <div style={{ padding: '2rem', display: 'grid', gap: '2rem', maxWidth: 480 }}>
      <section>
        <h2>Inviter un membre (contrôlé)</h2>
        <InviteMemberForm />
      </section>
      <section>
        <h2>Rechercher une famille (non-contrôlé)</h2>
        <SearchFamiliesForm onSearch={handleSearch} />
      </section>
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- `InviteMemberForm` est contrôlé : `emailError` et `canSubmit` sont dérivés du state à chaque render, donc jamais désynchronisés. La validation live est gratuite parce que le state contient toujours la dernière frappe.
- `SearchFamiliesForm` est non-contrôlé : zéro `useState`, zéro `ref`. Le `console.log` de rendu ne s'affiche qu'une fois — preuve qu'aucune frappe ne re-rend. `FormData` lit tout à la soumission via les `name`.
- Le test `=== 'on'` gère correctement la checkbox : décochée, elle est absente du `FormData`.

### Étape 3 — provoquer puis corriger le warning

```tsx
// ❌ VERSION QUI WARN — value part de undefined
function BuggyInvite({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail); // undefined si prop absente
  // premier render : value === undefined → React classe le champ "non-contrôlé"
  // à la 1re frappe : value devient une string → "changing uncontrolled to controlled"
  return <input value={email} onChange={(e) => setEmail(e.target.value)} />;
}

// ✅ CORRIGÉ — value toujours définie dès le premier render
function FixedInvite({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? ''); // '' au lieu de undefined
  return <input value={email} onChange={(e) => setEmail(e.target.value)} />;
}
```

Branche `<BuggyInvite />` (sans passer `initialEmail`), tape une lettre, lis le warning dans la console. Remplace par `<FixedInvite />` : le warning disparaît. Retiens le réflexe `value={x ?? ''}`.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes :**

1. Ajoute au formulaire d'invitation un champ `familyName` (input) **obligatoire** : le bouton reste désactivé si l'email OU le nom de famille est invalide/vide. Garde un seul objet de state et un seul `handleChange`.
2. Réécris `SearchFamiliesForm` en version **React 19 `<form action>`** : remplace `onSubmit` par `action={handleAction}` où `handleAction(formData: FormData)` reçoit directement le `FormData` (plus de `e.preventDefault()`). Vérifie que le formulaire se réinitialise tout seul après soumission.
3. **Sans rouvrir ce corrigé** ni le module 20.

**Critère de réussite :** l'invitation refuse d'envoyer tant qu'un des deux champs est invalide (validation live sur les deux) ; la recherche via `<form action>` logge les critères et vide le champ après envoi.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces formulaires vivent ici :

```
tribuzen/src/features/
  members/
    InviteMemberForm.tsx     ← contrôlé + validation live
    AvatarUpload.tsx         ← non-contrôlé (input file, value read-only)
  families/
    SearchFamiliesForm.tsx   ← non-contrôlé + FormData
```

**Différences par rapport au lab :**
- Les styles inline (`color: red`) seront remplacés par les composants du design system TribuZen (`<FormError>`, `<Button>`) — la logique contrôlé/non-contrôlé reste identique.
- `InviteMemberForm` enverra réellement via l'API (`POST /invitations`) et migrera vers React Hook Form (module 21) pour isoler les re-renders — la validation live restera le même critère.
- `SearchFamiliesForm` déclenchera une requête TanStack Query côté parent à partir du `SearchCriteria` retourné par `onSearch`.

**Commit cible :**
```
feat(members): InviteMemberForm — formulaire contrôlé avec validation live email
feat(families): SearchFamiliesForm — recherche non-contrôlée via FormData
```
