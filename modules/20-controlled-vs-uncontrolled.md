---
titre: Contrôlé vs non-contrôlé
cours: 04-react
notions: [composant contrôlé value + onChange, composant non-contrôlé defaultValue + ref, source de vérité état vs DOM, quand choisir contrôlé ou non-contrôlé, warning changing controlled to uncontrolled, lecture par FormData, form action et useActionState en survol, useFormStatus en survol]
outcomes: [distinguer un champ contrôlé d'un champ non-contrôlé et choisir le bon selon le besoin, lire les données d'un formulaire non-contrôlé via FormData, éviter le warning controlled to uncontrolled en gérant correctement la valeur initiale]
prerequis: [19-protection-et-lazy]
next: 21-react-hook-form
libs: [{ name: react, version: "^19" }]
tribuzen: formulaire d'invitation contrôlé (validation live) et formulaire de recherche non-contrôlé (FormData) de l'admin TribuZen
last-reviewed: 2026-07
---

# Contrôlé vs non-contrôlé

> **Outcomes — tu sauras FAIRE :** distinguer un champ contrôlé d'un champ non-contrôlé et choisir le bon selon le besoin, lire les données d'un formulaire non-contrôlé via `FormData`, éviter le warning « controlled to uncontrolled » en gérant la valeur initiale.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu intègres l'admin TribuZen. Deux formulaires arrivent dans le même sprint :

- **Inviter un membre** : dès que l'admin tape l'email, on veut valider le format en direct, afficher une erreur rouge sous le champ, et désactiver le bouton « Envoyer l'invitation » tant que l'email est invalide.
- **Rechercher une famille** : un simple champ de recherche. On ne veut rien valider pendant la frappe, juste récupérer la valeur quand l'admin appuie sur « Rechercher ».

Un collègue a écrit les deux de la même façon, avec `useState` sur chaque champ :

```tsx
// SearchFamilies.tsx — sur-dimensionné pour un simple champ de recherche
function SearchFamilies() {
  const [query, setQuery] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); search(query); }}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button type="submit">Rechercher</button>
    </form>
  );
}
```

Ce champ re-rend le composant à **chaque frappe** alors que la valeur n'est lue qu'une seule fois, à la soumission. Ce module te donne le critère pour décider : quand React doit-il posséder la valeur (contrôlé), et quand peut-on la laisser au DOM (non-contrôlé) ?

---

## 2. Théorie complète, concise

### 2.1 Une seule question : qui détient la source de vérité ?

Un champ de formulaire a toujours une valeur courante. La seule question qui distingue les deux approches :

- **Contrôlé** — la valeur vit dans le state React. Le DOM n'est qu'un miroir de ce state.
- **Non-contrôlé** — la valeur vit dans le DOM. React ne la connaît pas tant qu'il ne va pas la lire.

Tout le reste (validation, performance, ergonomie) découle de ce choix de propriétaire.

### 2.2 Composant contrôlé — `value` + `onChange`

React possède la valeur. Le champ reçoit sa valeur du state (`value`), et chaque frappe remonte au state (`onChange`) :

```tsx
import { useState } from 'react';

function ControlledEmail() {
  const [email, setEmail] = useState('');

  return (
    <input
      type="email"
      value={email}                              // la valeur VIENT du state
      onChange={(e) => setEmail(e.target.value)} // chaque frappe MET À JOUR le state
    />
  );
}
```

Cycle complet à chaque frappe :
1. L'utilisateur tape « a ».
2. `onChange` se déclenche, `e.target.value === "a"`.
3. `setEmail("a")` planifie un re-render.
4. React re-rend, le champ reçoit `value="a"`.

La boucle est fermée : l'affichage ne peut jamais diverger du state. C'est ce qui rend la **validation live** possible — le state est toujours à jour, on valide à chaque frappe.

### 2.3 Composant non-contrôlé — `defaultValue` + `ref`

Le DOM possède la valeur. On donne une valeur initiale avec `defaultValue` (pas `value`), et on lit la valeur courante via une `ref` au moment où on en a besoin :

```tsx
import { useRef, type FormEvent } from 'react';

function UncontrolledSearch() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // on lit la valeur du DOM au dernier moment
    const query = inputRef.current?.value ?? '';
    console.log('Recherche :', query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue="" />
      <button type="submit">Rechercher</button>
    </form>
  );
}
```

Aucune frappe ne re-rend le composant. React ne touche pas au champ après le premier rendu — le navigateur gère la saisie tout seul, comme en HTML pur.

> **`value` vs `defaultValue` :** `value` = React impose la valeur à chaque render (contrôlé). `defaultValue` = React pose la valeur **au premier render seulement**, puis laisse le DOM libre (non-contrôlé). Utiliser `value` sans `onChange` fige le champ en lecture seule — c'est le piège #1.

### 2.4 Lire un formulaire non-contrôlé sans `ref` : `FormData`

Poser une `ref` sur chaque champ devient vite verbeux. L'API navigateur `FormData` lit tous les champs nommés d'un `<form>` d'un coup — à condition que chaque champ ait un attribut `name` :

```tsx
function InviteForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData); // { email: "...", role: "..." }
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" />
      <select name="role">
        <option value="member">Membre</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit">Inviter</button>
    </form>
  );
}
```

`FormData` est la façon idiomatique de récupérer un formulaire non-contrôlé : zéro state, zéro ref, juste des `name`. `Object.fromEntries` transforme le `FormData` en objet simple.

### 2.5 Le critère de choix

| Besoin | Approche |
|---|---|
| Valider / formater pendant la frappe | **Contrôlé** — le state est toujours à jour |
| Activer/désactiver un bouton selon la valeur | **Contrôlé** — la valeur pilote le rendu |
| Afficher la valeur ailleurs (compteur, aperçu) | **Contrôlé** — un seul état partagé |
| Champ lu une seule fois à la soumission | **Non-contrôlé** — pas de re-render inutile |
| Champ `file` (upload) | **Non-contrôlé obligatoire** — `value` est read-only par sécurité |
| Intégration d'une lib DOM tierce | **Non-contrôlé** — la lib manipule le DOM directement |

Règle par défaut : **contrôlé** pour les formulaires métier (invitation, inscription, édition), **non-contrôlé** pour les champs jetables (recherche, filtre rapide) et les uploads.

### 2.6 Le warning « controlled to uncontrolled »

C'est le bug le plus fréquent des formulaires React. Il survient quand la prop `value` passe de `undefined`/`null` à une chaîne (ou l'inverse) entre deux renders :

```tsx
// ❌ user.name est undefined au premier render (fetch pas encore arrivé)
function EditName({ user }: { user?: { name: string } }) {
  const [name, setName] = useState(user?.name); // undefined si user absent
  return <input value={name} onChange={(e) => setName(e.target.value)} />;
}
// value passe de undefined → "Alice" quand le fetch résout
// React : "A component is changing an uncontrolled input to be controlled"
```

React décide au **premier render** si un champ est contrôlé (`value` défini) ou non-contrôlé (`value === undefined`). Changer d'avis en cours de vie déclenche le warning. La correction : garantir que `value` n'est **jamais** `undefined` :

```tsx
// ✅ valeur initiale toujours définie — chaîne vide plutôt que undefined
const [name, setName] = useState(user?.name ?? '');

// ✅ ou en inline si la valeur peut redevenir null
<input value={name ?? ''} onChange={(e) => setName(e.target.value)} />
```

Symétriquement pour les checkboxes : `checked={value ?? false}`, jamais `checked={undefined}`.

### 2.7 React 19 : `<form action>`, `useActionState`, `useFormStatus` (survol)

React 19 industrialise les formulaires non-contrôlés. On peut passer une **fonction** à `action` sur un `<form>` ; React appelle cette fonction avec le `FormData` du formulaire, réinitialise le formulaire, et gère l'état pending :

```tsx
// La fonction action reçoit directement le FormData — pas de onSubmit ni preventDefault
function InviteForm() {
  async function inviteAction(formData: FormData) {
    const email = formData.get('email') as string;
    await sendInvite(email);
  }

  return (
    <form action={inviteAction}>
      <input name="email" type="email" />
      <button type="submit">Inviter</button>
    </form>
  );
}
```

`useActionState` enveloppe l'action pour exposer son résultat (erreurs de validation serveur, message de succès) et un booléen `isPending` :

```tsx
import { useActionState } from 'react';

function InviteForm() {
  const [error, submitAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const email = formData.get('email') as string;
      if (!email.includes('@')) return 'Email invalide';
      await sendInvite(email);
      return null; // pas d'erreur
    },
    null, // état initial
  );

  return (
    <form action={submitAction}>
      <input name="email" type="email" />
      {error && <span role="alert">{error}</span>}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Envoi…' : 'Inviter'}
      </button>
    </form>
  );
}
```

`useFormStatus` lit l'état d'envoi du `<form>` parent **depuis un composant enfant** (typiquement un bouton réutilisable), sans faire descendre de props :

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus(); // lit le <form> ancêtre le plus proche
  return <button type="submit" disabled={pending}>{pending ? 'Envoi…' : 'Envoyer'}</button>;
}
```

> Ces trois API reposent sur le modèle **non-contrôlé + FormData**. Elles ne remplacent pas le contrôlé pour la validation live champ par champ — c'est le rôle de React Hook Form (module suivant). On les couvre en profondeur plus tard ; ici, reconnaître la syntaxe suffit.

---

## 3. Worked examples

### Exemple 1 — Formulaire d'invitation contrôlé avec validation live (TribuZen)

Le cas concret n°1 : valider l'email pendant la frappe et piloter le bouton.

```tsx
import { useState } from 'react';

type Role = 'member' | 'admin';

interface InviteState {
  email: string;
  role: Role;
}

function InviteMemberForm() {
  // contrôlé : React possède les valeurs → validation live possible
  const [form, setForm] = useState<InviteState>({ email: '', role: 'member' });

  // handler unique grâce au computed property name [name]
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // dérivé du state à chaque render — pas besoin d'un state d'erreur séparé
  const emailError =
    form.email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)
      ? 'Format d\'email invalide'
      : '';

  const canSubmit = form.email.length > 0 && emailError === '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    console.log('Invitation envoyée :', form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email
        <input
          name="email"
          type="email"
          value={form.email}            // contrôlé
          onChange={handleChange}
        />
      </label>
      {/* l'erreur s'affiche EN DIRECT car emailError est recalculé à chaque frappe */}
      {emailError && <span style={{ color: 'red' }}>{emailError}</span>}

      <label>
        Rôle
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="member">Membre</option>
          <option value="admin">Admin</option>
        </select>
      </label>

      {/* bouton piloté par le state : impossible d'envoyer un email invalide */}
      <button type="submit" disabled={!canSubmit}>
        Envoyer l'invitation
      </button>
    </form>
  );
}
```

**Points clés du corrigé :**
- `emailError` et `canSubmit` sont **dérivés** du state à chaque render — pas de `useState` pour l'erreur, donc jamais de désynchronisation.
- La validation live n'est possible que parce que le champ est contrôlé : le state contient toujours la dernière frappe.
- Un seul `handleChange` sert email + select grâce à `[name]: value`.

### Exemple 2 — Formulaire de recherche non-contrôlé avec `FormData` (TribuZen)

Le cas concret n°2 : lire la valeur une seule fois, sans re-render pendant la frappe.

```tsx
import type { FormEvent } from 'react';

interface SearchCriteria {
  query: string;
  onlyActive: boolean;
}

function SearchFamiliesForm({
  onSearch,
}: {
  onSearch: (criteria: SearchCriteria) => void;
}) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // lecture unique à la soumission — aucun state, aucune ref
    const formData = new FormData(e.currentTarget);
    onSearch({
      query: (formData.get('query') as string).trim(),
      // une checkbox absente n'apparaît pas dans FormData → get() renvoie null
      onlyActive: formData.get('onlyActive') === 'on',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* non-contrôlé : pas de value, pas de onChange, juste name */}
      <input name="query" defaultValue="" placeholder="Nom de famille…" />
      <label>
        <input name="onlyActive" type="checkbox" defaultChecked />
        Familles actives uniquement
      </label>
      <button type="submit">Rechercher</button>
    </form>
  );
}
```

**Points clés du corrigé :**
- Zéro `useState`, zéro re-render pendant la frappe — le navigateur gère la saisie.
- Chaque champ a un `name` : c'est la clé lue par `FormData.get(name)`.
- Piège des checkboxes non-contrôlées : une case **décochée** est absente du `FormData` (`get` renvoie `null`), une case cochée vaut `"on"`. D'où le test `=== 'on'`.
- `defaultValue` / `defaultChecked` posent l'état initial sans le contrôler.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — `value` sans `onChange`

```tsx
// ❌ champ figé : React impose value="Alice" à chaque render, la frappe est ignorée
<input value="Alice" />
// Console : "You provided a `value` prop to a form field without an `onChange` handler."

// ✅ soit contrôlé complet
<input value={name} onChange={(e) => setName(e.target.value)} />

// ✅ soit non-contrôlé avec valeur initiale
<input defaultValue="Alice" />

// ✅ soit lecture seule assumée
<input value="Alice" readOnly />
```

**Règle :** `value` engage un contrat — il faut `onChange` (ou `readOnly`). Pour juste initialiser, c'est `defaultValue`.

### PIÈGE #2 — Mélanger `value` et `defaultValue`

```tsx
// ❌ les deux ensemble : defaultValue est ignoré, React warn
<input value={name} defaultValue="Alice" onChange={handleChange} />
```

Un champ est **soit** contrôlé (`value`) **soit** non-contrôlé (`defaultValue`), jamais les deux. `defaultValue` n'a de sens que sur un champ non-contrôlé.

### PIÈGE #3 — Passer de non-contrôlé à contrôlé en cours de route

```tsx
// ❌ value démarre à undefined (donnée pas encore chargée) puis devient une string
const [name, setName] = useState(user?.name); // undefined tant que user absent
<input value={name} onChange={(e) => setName(e.target.value)} />;
// Warning : "changing an uncontrolled input to be controlled"

// ✅ valeur toujours définie dès le premier render
const [name, setName] = useState(user?.name ?? '');
```

**Cause racine :** React verrouille le mode (contrôlé/non-contrôlé) au premier render selon que `value` est défini ou non. Ne jamais laisser `value` valoir `undefined`. Réflexe : `value={x ?? ''}`, `checked={b ?? false}`.

### PIÈGE #4 — Oublier le `name` sur un formulaire `FormData`

```tsx
// ❌ pas de name → le champ est invisible pour FormData
<input defaultValue="" />
const data = new FormData(e.currentTarget);
data.get('query'); // null — le champ n'a pas de clé

// ✅ name obligatoire pour être lu par FormData
<input name="query" defaultValue="" />
```

En non-contrôlé via `FormData`, c'est l'attribut `name` qui sert de clé — pas l'`id`, pas la `ref`. Un champ sans `name` n'est jamais soumis.

### PIÈGE #5 — Tout contrôler par réflexe

Contrôler un champ lu une seule fois (recherche, filtre) ajoute un re-render par frappe sans bénéfice. Le non-contrôlé + `FormData` est plus simple et plus performant pour ces cas. Contrôlé n'est pas « la bonne pratique par défaut » — c'est l'outil de la validation/synchro live.

---

## 5. Ancrage TribuZen

L'admin TribuZen contient les deux familles de formulaires, et le choix contrôlé/non-contrôlé y est un critère de conception explicite.

**Formulaire d'invitation** (`src/features/members/InviteMemberForm.tsx`) — **contrôlé**. L'admin saisit un email et un rôle. On valide le format d'email en direct, on affiche l'erreur sous le champ, et le bouton « Envoyer l'invitation » reste désactivé tant que l'email est invalide. La validation live impose le contrôlé (state toujours à jour). C'est l'Exemple 1 du module. À terme, ce formulaire migrera vers React Hook Form (module 21) pour éviter les re-renders globaux, mais la logique de validation reste la même.

**Barre de recherche de familles** (`src/features/families/SearchFamiliesForm.tsx`) — **non-contrôlé**. Un champ texte + une checkbox « actives uniquement ». La valeur n'est lue qu'à la soumission via `FormData`. Aucun re-render pendant la frappe, aucun state. C'est l'Exemple 2 du module.

**Upload d'avatar** (`src/features/members/AvatarUpload.tsx`) — **non-contrôlé obligatoire**. Un `<input type="file">` : sa `value` est read-only par sécurité navigateur, on lit le fichier via `ref.current.files` ou `FormData`.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/features/
  members/
    InviteMemberForm.tsx     ← contrôlé + validation live
    AvatarUpload.tsx         ← non-contrôlé (input file)
  families/
    SearchFamiliesForm.tsx   ← non-contrôlé + FormData
```

---

## 6. Points clés

1. La seule question qui distingue les deux modes : qui possède la valeur — le state React (contrôlé) ou le DOM (non-contrôlé) ?
2. Contrôlé = `value` + `onChange` : le state est toujours à jour, ce qui rend la validation/synchro live possible.
3. Non-contrôlé = `defaultValue` + `ref` (ou `name` + `FormData`) : le DOM gère la saisie, aucun re-render pendant la frappe.
4. `FormData(e.currentTarget)` lit tous les champs `name` d'un formulaire non-contrôlé en une fois ; `Object.fromEntries` en fait un objet.
5. Le warning « controlled to uncontrolled » vient d'un `value` qui passe de `undefined` à une string — corriger avec `value={x ?? ''}`.
6. `value` sans `onChange` fige le champ ; pour juste initialiser un champ libre, utiliser `defaultValue`.
7. React 19 : `<form action={fn}>` reçoit le `FormData`, `useActionState` expose résultat + `isPending`, `useFormStatus` lit l'état pending depuis un enfant — modèle non-contrôlé industrialisé.

---

## 7. Seeds Anki

```
Quelle est LA question qui distingue un champ contrôlé d'un champ non-contrôlé ?|Qui détient la source de vérité de la valeur : le state React (contrôlé) ou le DOM (non-contrôlé). Tout le reste (validation live, perf) découle de ce choix de propriétaire.
Quelles props définissent un champ contrôlé, et lesquelles un champ non-contrôlé ?|Contrôlé : value + onChange (React possède la valeur). Non-contrôlé : defaultValue + ref, ou name + FormData (le DOM possède la valeur).
Pourquoi la validation en temps réel exige-t-elle un champ contrôlé ?|Parce que le state React contient toujours la dernière frappe : on peut recalculer l'erreur et l'état du bouton à chaque render. En non-contrôlé, la valeur n'est connue qu'à la lecture (soumission).
Comment lit-on un formulaire non-contrôlé sans poser une ref sur chaque champ ?|Avec new FormData(e.currentTarget) : lit tous les champs ayant un attribut name. Object.fromEntries(formData) en fait un objet simple. Chaque champ DOIT avoir un name.
D'où vient le warning "changing an uncontrolled input to be controlled" et comment le corriger ?|La prop value passe de undefined/null à une string entre deux renders (ex : donnée fetchée en retard). React verrouille le mode au premier render. Correction : value ne doit jamais être undefined → value={x ?? ''}, checked={b ?? false}.
Que se passe-t-il si on met value sans onChange sur un input ?|Le champ est figé en lecture seule : React réimpose value à chaque render et ignore les frappes. React affiche un warning. Il faut ajouter onChange, ou passer à defaultValue, ou assumer readOnly.
Dans un FormData non-contrôlé, que renvoie get() pour une checkbox décochée ?|null : une case décochée n'est pas soumise, donc absente du FormData. Une case cochée vaut "on". D'où le test formData.get('x') === 'on'.
À quoi servent form action, useActionState et useFormStatus en React 19 ?|Ils industrialisent le formulaire non-contrôlé : <form action={fn}> appelle fn avec le FormData ; useActionState expose le résultat (erreurs) + isPending ; useFormStatus lit l'état pending du form parent depuis un enfant, sans props.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-20-controlled-vs-uncontrolled/README.md`. Construire les deux formulaires de l'admin TribuZen — invitation contrôlée (validation live) et recherche non-contrôlée (FormData) — et provoquer puis corriger le warning « controlled to uncontrolled ».
