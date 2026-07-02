---
titre: React Hook Form
cours: 04-react
notions: [useForm, register, handleSubmit, formState (errors et isSubmitting), resolver zod, schema partagé front/back, Controller pour composants contrôlés, perf par non-contrôlé, modes de validation]
outcomes: [câbler un formulaire non-contrôlé avec useForm et register, valider avec un schéma zod via zodResolver, brancher un composant contrôlé tiers avec Controller]
prerequis: [20-controlled-vs-uncontrolled]
next: 22-patterns-formulaires-avances
libs: [{ name: react, version: "^19" }, { name: react-hook-form, version: "^7" }, { name: zod, version: "^3" }]
tribuzen: formulaire admin de création de famille (nom, description, membres) avec schéma zod partagé front/back
last-reviewed: 2026-07
---

# React Hook Form

> **Outcomes — tu sauras FAIRE :** câbler un formulaire non-contrôlé avec `useForm` et `register`, valider avec un schéma zod via `zodResolver`, brancher un composant contrôlé tiers avec `Controller`.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, tu dois livrer le formulaire de **création de famille** : un nom, une description, et un nombre de places. Première tentative, en `useState` contrôlé comme au module 20 :

```tsx
// CreateFamilyForm.tsx — version useState, ça part en vrille
function CreateFamilyForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [seats, setSeats] = useState('4');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Nom trop court';
    if (description.length > 280) next.description = 'Description trop longue';
    if (Number(seats) < 1) next.seats = 'Au moins 1 place';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    await createFamily({ name, description, seats: Number(seats) });
    setSubmitting(false);
  }
  // ... 40 lignes de JSX, chaque frappe re-rend tout le formulaire
}
```

**Trois problèmes qui vont grossir :**
1. Chaque champ = un `useState` + un `onChange`. À 8 champs (le vrai formulaire famille en aura), c'est 8 états à synchroniser à la main.
2. La validation est manuelle, dupliquée, et **désynchronisée du backend** : le serveur re-valide avec ses propres règles, qui divergent silencieusement des règles front.
3. Chaque frappe dans un champ re-rend **tout** le formulaire (vu au module 20) — inutile et coûteux.

React Hook Form (RHF) résout les trois : formulaire non-contrôlé (perf), une seule ligne par champ (`register`), et un **schéma zod unique** partagé front/back comme source de vérité.

---

## 2. Théorie complète, concise

### 2.1 useForm — le point d'entrée

`useForm` est le hook central. Il retourne une boîte à outils pour un formulaire. On le type avec la forme des données.

```tsx
import { useForm } from 'react-hook-form';

interface FamilyForm {
  name: string;
  description: string;
  seats: number;
}

function CreateFamilyForm() {
  const {
    register,      // connecte un champ au formulaire
    handleSubmit,  // enrobe ton onSubmit : valide PUIS appelle
    formState: { errors, isSubmitting }, // état dérivé du formulaire
  } = useForm<FamilyForm>({
    defaultValues: { name: '', description: '', seats: 4 },
  });
  // ...
}
```

`defaultValues` est important : il fixe la valeur initiale de chaque champ **non-contrôlé** et le type de sortie. Toujours le fournir (surtout pour les nombres, cases, selects).

### 2.2 register — connecter un champ sans state

`register('name')` retourne un objet de props qu'on **spread** sur l'input natif.

```tsx
const nameProps = register('name');
// nameProps = { name: 'name', onChange: fn, onBlur: fn, ref: fn }

<input {...register('name')} />
// équivaut à : <input name="name" onChange={...} onBlur={...} ref={...} />
```

RHF branche une **ref** sur l'input : la valeur vit dans le DOM (non-contrôlé), pas dans un state React. C'est le cœur de la perf — taper dans un champ ne déclenche aucun re-render du composant. Le nom de champ passé à `register` est **typé** : `register('nom')` (faute de frappe) est une erreur TypeScript.

Pour les nombres, on convertit à la lecture avec `valueAsNumber` (sinon on récupère une string) :

```tsx
<input type="number" {...register('seats', { valueAsNumber: true })} />
```

### 2.3 handleSubmit — valider puis soumettre

`handleSubmit(onValid)` enrobe ta fonction. Il empêche le rechargement natif, lance la validation, et **n'appelle `onValid` que si tout est valide** — avec des données déjà typées.

```tsx
const onSubmit = async (data: FamilyForm) => {
  // data est typé FamilyForm et déjà validé
  await createFamily(data);
};

<form onSubmit={handleSubmit(onSubmit)}>
  {/* ... */}
</form>
```

On peut passer un 2e argument, appelé **seulement si la validation échoue** : `handleSubmit(onValid, onInvalid)`.

### 2.4 formState — l'état dérivé

`formState` expose l'état du formulaire. Les deux plus utilisés :

- **`errors`** — objet des erreurs par champ. `errors.name?.message` contient le message. Vide tant qu'aucune règle n'a échoué.
- **`isSubmitting`** — `true` pendant l'exécution du `onSubmit` async. Sert à désactiver le bouton et éviter le double envoi.

```tsx
{errors.name && <p className="error">{errors.name.message}</p>}

<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Création…' : 'Créer la famille'}
</button>
```

Autres flags utiles : `isValid`, `isDirty`, `isSubmitSuccessful`, `submitCount`. `formState` est **réactif à l'usage** : RHF ne re-rend que si tu lis effectivement le flag (proxy interne). Ne déstructure que ce dont tu te sers.

### 2.5 Validation par schéma zod — source de vérité partagée

Plutôt que des règles éparpillées, on décrit **un schéma zod**. Il génère à la fois le type TypeScript ET les règles de validation. On le branche via `zodResolver`.

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// schéma = SOURCE UNIQUE de vérité (types + règles + messages)
const familySchema = z.object({
  name: z.string().min(2, 'Nom : au moins 2 caractères').max(50, 'Nom trop long'),
  description: z.string().max(280, 'Description : 280 caractères max'),
  seats: z.coerce.number().int().min(1, 'Au moins 1 place').max(20, 'Maximum 20 places'),
});

// le type est INFÉRÉ du schéma — pas d'interface séparée à maintenir
type FamilyForm = z.infer<typeof familySchema>;

function CreateFamilyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FamilyForm>({
    resolver: zodResolver(familySchema),
    defaultValues: { name: '', description: '', seats: 4 },
  });
  // register/errors utilisent désormais les règles du schéma
}
```

Le message d'erreur zod devient directement `errors.<champ>.message`. Le point clé métier : **le même `familySchema` est importé côté backend** (route de création) pour re-valider la requête. Une seule définition, deux usages — plus de divergence front/back.

`z.coerce.number()` convertit la string de l'input en nombre à la validation ; alternative à `valueAsNumber` dans `register`. N'en mets qu'un seul des deux pour éviter la double conversion.

### 2.6 Controller — brancher un composant contrôlé

`register` marche avec les inputs natifs (ils acceptent une `ref`). Les composants UI tiers (React Select, un `DatePicker`, un `Slider` MUI, un toggle maison) exposent souvent `value`/`onChange` **sans ref** : ce sont des composants **contrôlés** (module 20). Pour ceux-là, on utilise `Controller`.

```tsx
import { useForm, Controller } from 'react-hook-form';

<Controller
  name="seats"
  control={control}            // control vient de useForm()
  render={({ field, fieldState }) => (
    <>
      {/* field = { value, onChange, onBlur, name, ref } */}
      <SeatStepper value={field.value} onChange={field.onChange} />
      {fieldState.error && <p className="error">{fieldState.error.message}</p>}
    </>
  )}
/>
```

`control` est récupéré de `useForm()`. `Controller` fait le pont : il transforme un composant contrôlé en champ RHF piloté par ref en interne. Règle de choix : **input natif → `register` ; composant contrôlé tiers → `Controller`.**

### 2.7 Perf — non-contrôlé par défaut

C'est l'argument phare de RHF face au `useState` du module 20.

| | `useState` contrôlé | React Hook Form |
|---|---|---|
| Où vit la valeur | State React | Ref DOM (non-contrôlé) |
| Re-render par frappe | Tout le composant | Aucun |
| Lignes par champ | state + onChange + errors | `{...register('x')}` |
| Validation | Manuelle | Schéma (zod) |
| Coût à 20+ champs | Lourd | Constant |

Comme la valeur vit dans le DOM, taper ne re-rend pas. Contrepartie : pour **observer** une valeur en direct (compteur de caractères, aperçu), il faut `watch('description')`, qui lui **provoque** un re-render ciblé. À n'utiliser que quand l'affichage en temps réel est nécessaire.

### 2.8 Modes de validation

Par défaut RHF valide à la soumission (`onSubmit`). `mode` change le déclencheur :

```tsx
useForm<FamilyForm>({
  resolver: zodResolver(familySchema),
  mode: 'onBlur',   // valide quand le champ perd le focus
  // 'onSubmit' (défaut) — seulement à la soumission
  // 'onChange'          — à chaque frappe (coûteux, re-rend)
  // 'onTouched'         — après le 1er blur, puis à chaque changement
  // 'all'               — onChange + onBlur
});
```

`onBlur` est un bon compromis UX : l'utilisateur n'est pas harcelé pendant qu'il tape, mais voit l'erreur en quittant le champ.

---

## 3. Worked examples

### Exemple 1 — Formulaire de création de famille (TribuZen)

Le cas concret, résolu complet avec zod. C'est la version que le lab te fera reconstruire.

```tsx
// ─── schema/family.ts — PARTAGÉ front/back ───────────────────────
import { z } from 'zod';

export const familySchema = z.object({
  name: z.string().min(2, 'Nom : au moins 2 caractères').max(50, 'Nom trop long'),
  description: z.string().max(280, 'Description : 280 caractères max'),
  seats: z.coerce.number().int().min(1, 'Au moins 1 place').max(20, 'Maximum 20 places'),
});

export type FamilyForm = z.infer<typeof familySchema>;

// ─── components/CreateFamilyForm.tsx ─────────────────────────────
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { familySchema, type FamilyForm } from '@/schema/family';

function CreateFamilyForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FamilyForm>({
    resolver: zodResolver(familySchema),
    mode: 'onBlur',
    defaultValues: { name: '', description: '', seats: 4 },
  });

  // data est typé FamilyForm ET déjà validé quand on arrive ici
  const onSubmit = async (data: FamilyForm) => {
    await createFamily(data); // POST /api/families — le backend re-valide avec familySchema
    reset();                  // vide le formulaire après succès
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="name">Nom de la famille</label>
        <input id="name" {...register('name')} />
        {/* message = celui du schéma zod */}
        {errors.name && <p className="error">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea id="description" rows={3} {...register('description')} />
        {errors.description && <p className="error">{errors.description.message}</p>}
      </div>

      <div>
        <label htmlFor="seats">Places</label>
        {/* z.coerce.number gère la conversion string → number */}
        <input id="seats" type="number" {...register('seats')} />
        {errors.seats && <p className="error">{errors.seats.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Création…' : 'Créer la famille'}
      </button>
    </form>
  );
}

export default CreateFamilyForm;
```

**Ce que ça apporte :**
- Une ligne par champ (`{...register('x')}`), zéro `useState`, zéro `onChange` manuel.
- Les messages d'erreur viennent du schéma — le même qui protège le backend.
- Le bouton se désactive pendant l'envoi via `isSubmitting`, sans état ajouté.

### Exemple 2 — Champ contrôlé avec Controller

La description finale du formulaire famille a un champ « membres » géré par un composant maison `MemberPicker` (contrôlé : `value` = tableau d'ids, `onChange`). Il n'accepte pas de `ref` → `Controller`.

```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Nom : au moins 2 caractères'),
  members: z.array(z.string()).min(1, 'Ajoute au moins un membre'),
});
type Form = z.infer<typeof schema>;

function CreateFamilyWithMembers() {
  const {
    register,
    control,              // requis par Controller
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', members: [] },
  });

  return (
    <form onSubmit={handleSubmit((data) => createFamily(data))} noValidate>
      {/* champ natif → register */}
      <input {...register('name')} placeholder="Nom" />
      {errors.name && <p className="error">{errors.name.message}</p>}

      {/* composant contrôlé tiers → Controller */}
      <Controller
        name="members"
        control={control}
        render={({ field, fieldState }) => (
          <>
            <MemberPicker value={field.value} onChange={field.onChange} />
            {fieldState.error && <p className="error">{fieldState.error.message}</p>}
          </>
        )}
      />

      <button type="submit" disabled={isSubmitting}>Créer</button>
    </form>
  );
}
```

**Points clés :** `MemberPicker` reste un composant contrôlé pur (module 20) — il ne connaît pas RHF. `Controller` lui fournit `field.value` / `field.onChange` et récupère l'erreur zod via `fieldState.error`. On mélange librement `register` (natif) et `Controller` (contrôlé) dans le même formulaire.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Oublier le spread de `register`

```tsx
// ❌ register passé comme valeur, pas spreadé — l'input n'est pas connecté
<input register={register('name')} />
<input value={register('name')} />

// ✅ toujours spreader l'objet retourné
<input {...register('name')} />
```

`register('name')` **retourne** un objet `{ name, onChange, onBlur, ref }`. Sans le `{...}`, aucune de ces props n'atteint l'input : le champ reste muet, `data.name` est `undefined`.

### PIÈGE #2 — Nombres non convertis

```tsx
// ❌ sans conversion : data.seats = "4" (string), pas 4
<input type="number" {...register('seats')} />
// avec un type number attendu, tu récupères une string → bugs de calcul

// ✅ option 1 : valueAsNumber dans register
<input type="number" {...register('seats', { valueAsNumber: true })} />

// ✅ option 2 : z.coerce.number() dans le schéma
seats: z.coerce.number().int().min(1),
```

Un `<input>` renvoie **toujours une string**, même en `type="number"`. Choisis **une** des deux conversions (pas les deux, pour éviter une double coercition surprenante).

### PIÈGE #3 — Utiliser `register` sur un composant contrôlé

```tsx
// ❌ un composant contrôlé sans ref ne reçoit pas register correctement
<DatePicker {...register('date')} />       // ref ignorée → champ non tracké
<ReactSelect {...register('members')} />   // idem

// ✅ passer par Controller
<Controller
  name="date"
  control={control}
  render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
/>
```

`register` s'appuie sur une `ref` DOM. Un composant contrôlé qui n'expose que `value`/`onChange` ne la propage pas → RHF ne voit jamais la valeur. Règle : **natif = `register`, contrôlé tiers = `Controller`.**

### PIÈGE #4 — Croire que `watch` est gratuit

```tsx
// ❌ watch sur tout, "au cas où" — re-rend le composant à chaque frappe
const values = watch(); // observe TOUS les champs → perte de la perf non-contrôlée

// ✅ watch ciblé, seulement si l'affichage temps réel est nécessaire
const description = watch('description');
<small>{description.length}/280</small>
```

Le non-contrôlé est rapide **parce qu'il ne re-rend pas**. `watch` réintroduit un re-render à chaque changement du champ observé. Ne l'utilise que pour un besoin d'affichage live (compteur, aperçu), et le plus ciblé possible.

### PIÈGE #5 — Deux schémas divergents front et back

```tsx
// ❌ règles dupliquées : le front dit min(2), le back dit min(3) → incohérence
// front
const front = z.object({ name: z.string().min(2) });
// back (autre fichier, autre valeur)
const back = z.object({ name: z.string().min(3) });

// ✅ un seul schéma exporté, importé des deux côtés
// schema/family.ts  → importé par le formulaire ET par la route API
export const familySchema = z.object({ name: z.string().min(2) });
```

L'intérêt principal de zod ici est le **partage**. Deux définitions finissent toujours par diverger. Une seule source = validation identique côté client (UX) et serveur (sécurité).

---

## 5. Ancrage TribuZen

Le formulaire de **création de famille** de l'admin TribuZen est le terrain d'application direct de ce module.

**Schéma partagé** (`src/schema/family.ts`) — `familySchema` en zod : `name` (2–50), `description` (≤ 280), `seats` (entier 1–20), `members` (≥ 1). Ce fichier est importé par :
- le formulaire React (`CreateFamilyForm`) via `zodResolver` pour l'UX ;
- la route backend de création (`POST /api/families`) pour re-valider la requête et refuser les payloads invalides.

Une seule définition, aucune divergence possible entre ce que l'admin voit et ce que le serveur accepte.

**Formulaire** (`src/features/family/CreateFamilyForm.tsx`) — `useForm` + `register` pour `name`, `description`, `seats` ; `Controller` pour le `MemberPicker` (composant contrôlé maison). `isSubmitting` désactive le bouton pendant le POST ; `errors.<champ>.message` affiche le message zod par champ, sous chaque input.

**Composant contrôlé** (`src/features/family/MemberPicker.tsx`) — sélecteur de membres contrôlé (`value` = ids, `onChange`), branché via `Controller`. Il reste ignorant de RHF, réutilisable ailleurs.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  schema/
    family.ts              # familySchema — importé front ET back
  features/
    family/
      CreateFamilyForm.tsx # useForm + register + Controller
      MemberPicker.tsx     # composant contrôlé (module 20)
```

---

## 6. Points clés

1. `useForm<T>()` est le point d'entrée ; il retourne `register`, `handleSubmit`, `control`, `reset` et `formState`.
2. `register('champ')` connecte un input natif via une **ref** (non-contrôlé) — il faut le **spreader** : `{...register('champ')}`.
3. `handleSubmit(onValid)` empêche le reload natif, valide, puis n'appelle `onValid` qu'avec des données valides et typées.
4. `formState.errors.<champ>.message` porte le message d'erreur ; `formState.isSubmitting` désactive le bouton pendant l'envoi.
5. `zodResolver(schema)` branche un schéma zod : type inféré via `z.infer` + validation + messages, en une source unique partageable front/back.
6. `Controller` connecte un composant **contrôlé** tiers (sans ref) ; `register` reste pour les inputs natifs.
7. RHF est non-contrôlé par défaut → aucun re-render à la frappe ; `watch` réintroduit un re-render et ne s'utilise que pour l'affichage temps réel.
8. `mode` (`onBlur`, `onChange`, `onTouched`, `all`) change le moment de validation ; `onBlur` est le compromis UX courant.

---

## 7. Seeds Anki

```
Que retourne register('email') en React Hook Form, et comment l'utilise-t-on ?|Un objet { name, onChange, onBlur, ref } à spreader sur l'input : <input {...register('email')} />. La valeur vit dans une ref DOM (non-contrôlé), d'où l'absence de re-render à la frappe.
À quoi sert handleSubmit(onSubmit) dans RHF ?|Il enrobe la soumission : empêche le reload natif, lance la validation, et n'appelle onSubmit (avec les données typées et validées) que si le formulaire est valide.
Comment brancher une validation zod sur un formulaire RHF ?|En passant resolver: zodResolver(schema) à useForm. Le type se dérive avec z.infer<typeof schema> et les messages zod deviennent errors.<champ>.message.
Pourquoi React Hook Form est-il plus performant qu'un formulaire useState contrôlé ?|Parce qu'il est non-contrôlé par défaut : la valeur vit dans une ref DOM, pas dans un state React, donc taper dans un champ ne re-rend pas le composant.
Quand utiliser Controller plutôt que register ?|Pour un composant contrôlé tiers (React Select, DatePicker, toggle maison) qui expose value/onChange sans ref. register ne marche qu'avec les inputs natifs qui acceptent une ref.
Quel est l'intérêt d'un schéma zod partagé front/back dans TribuZen ?|Une seule définition sert de source de vérité : le front valide pour l'UX, le back re-valide pour la sécurité. Plus de divergence entre les règles client et serveur.
Que fait watch() et quel est son coût ?|watch('champ') observe une valeur en temps réel (compteur, aperçu) mais provoque un re-render à chaque changement — il annule l'avantage non-contrôlé, donc à utiliser ciblé et seulement si nécessaire.
Comment récupérer un nombre (et non une string) depuis un input number en RHF ?|Soit register('seats', { valueAsNumber: true }), soit z.coerce.number() dans le schéma zod. Un input renvoie toujours une string ; on choisit une seule des deux conversions.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-21-react-hook-form/README.md`. Reconstruire de zéro le formulaire de création de famille TribuZen avec `useForm`, `register`, un schéma zod partagé, puis brancher un `MemberPicker` contrôlé via `Controller`.
