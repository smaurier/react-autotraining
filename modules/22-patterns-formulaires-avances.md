---
titre: Patterns de formulaires avancés
cours: 04-react
notions: [champs dynamiques avec useFieldArray, formulaire multi-étapes (wizard), validation asynchrone d'unicité, dépendances entre champs avec watch, upload de fichier, composants de champ réutilisables]
outcomes: [construire un formulaire à champs dynamiques avec useFieldArray, orchestrer un wizard multi-étapes en agrégeant les données de chaque étape, valider un champ de façon asynchrone (unicité) et gérer les erreurs serveur]
prerequis: [21-react-hook-form]
next: 23-tanstack-query
libs: [{ name: react, version: "^19" }, { name: react-hook-form, version: "^7" }, { name: zod, version: "^3" }]
tribuzen: wizard admin de création de famille (infos, membres via useFieldArray, confirmation) avec validation d'email membre unique
last-reviewed: 2026-07
---

# Patterns de formulaires avancés

> **Outcomes — tu sauras FAIRE :** construire un formulaire à champs dynamiques avec `useFieldArray`, orchestrer un wizard multi-étapes en agrégeant les données de chaque étape, valider un champ de façon asynchrone (unicité) et remonter les erreurs serveur dans les champs.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, un opérateur crée une famille. Le premier jet ressemble à ça — un seul gros formulaire à plat :

```tsx
// CreateFamilyForm.tsx — AVANT
function CreateFamilyForm() {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register('familyName')} placeholder="Nom de la famille" />
      {/* ...et maintenant ? Combien de membres ? 2 ? 5 ? */}
      <input {...register('member1Name')} placeholder="Membre 1" />
      <input {...register('member2Name')} placeholder="Membre 2" />
      <button type="submit">Créer</button>
    </form>
  );
}
```

**Trois blocages immédiats :**
1. **Nombre de membres inconnu** — une famille peut avoir 2 ou 9 personnes. Hardcoder `member1`, `member2`… ne tient pas.
2. **Tout sur un écran** — nom de famille, N membres, adresse : l'opérateur se noie. Il faut découper en étapes.
3. **Email déjà pris** — deux membres ne peuvent pas partager le même email dans TribuZen, et l'email ne doit pas déjà exister côté serveur. Une validation synchrone Zod ne suffit pas : il faut interroger l'API.

Ce module donne les trois outils qui règlent ces blocages : `useFieldArray` (membres dynamiques), le wizard multi-étapes (découpage), et la validation asynchrone (unicité).

---

## 2. Théorie complète, concise

Rappel du prérequis (module 21) : `useForm` gère l'état du formulaire via des refs (uncontrolled), `register('champ')` connecte un input, `zodResolver(schema)` branche la validation Zod. On part de là.

### 2.1 Champs dynamiques avec `useFieldArray`

Quand une partie du formulaire est une **liste de longueur variable** (membres, lignes de facture, tags), `useFieldArray` gère l'ajout/suppression/réordonnancement sans que tu manipules un tableau à la main.

```tsx
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  familyName: z.string().min(2, 'Nom requis'),
  members: z
    .array(
      z.object({
        name: z.string().min(2, 'Nom requis'),
        email: z.string().email('Email invalide'),
      })
    )
    .min(1, 'Au moins un membre'),
});

type FamilyForm = z.infer<typeof schema>;

function MembersForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FamilyForm>({
    resolver: zodResolver(schema),
    defaultValues: { familyName: '', members: [{ name: '', email: '' }] },
  });

  // `control` fait le lien entre le field array et le form
  const { fields, append, remove } = useFieldArray({ control, name: 'members' });

  return (
    <form onSubmit={handleSubmit((d) => console.log(d))}>
      {fields.map((field, index) => (
        // field.id = clé STABLE fournie par RHF — jamais `index` comme key
        <div key={field.id}>
          <input {...register(`members.${index}.name`)} placeholder="Nom" />
          {errors.members?.[index]?.name && (
            <p>{errors.members[index]?.name?.message}</p>
          )}
          <input {...register(`members.${index}.email`)} placeholder="Email" />
          <button type="button" onClick={() => remove(index)} disabled={fields.length <= 1}>
            Retirer
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: '', email: '' })}>
        + Ajouter un membre
      </button>
      <button type="submit">Valider</button>
    </form>
  );
}
```

Points structurants :
- `fields` est un tableau d'objets, chacun avec un `id` unique et **stable** généré par RHF. La `key` du `.map` doit être `field.id`, **jamais** `index` (sinon React mélange les inputs à la suppression).
- `register(\`members.${index}.name\`)` : la notation pointée nomme un champ imbriqué. Les erreurs suivent le même chemin : `errors.members?.[index]?.name`.
- API principale : `append(valeur)`, `remove(index)`, `insert`, `move(from, to)`, `update(index, valeur)`, `replace(tableau)`.

### 2.2 Formulaire multi-étapes (wizard)

Un wizard découpe un formulaire long en étapes séquentielles. Deux stratégies :

| Stratégie | Idée | Quand |
|---|---|---|
| **Un `useForm` par étape** | Chaque étape a son form + son schéma. On agrège les données dans un state parent au passage à l'étape suivante. | Étapes hétérogènes, validation isolée par étape. |
| **Un `useForm` unique** | Un seul form couvre tout ; on valide champ par champ avec `trigger(['champs'])` avant d'avancer. | Champs interdépendants entre étapes, un seul submit final. |

Ici on retient la **première** (plus lisible, plus simple à typer). L'étape ne submit pas vers le serveur : son `handleSubmit` **valide puis fait avancer** l'index d'étape.

```tsx
import { useState } from 'react';

type Step = 0 | 1 | 2;

function useWizard() {
  const [step, setStep] = useState<Step>(0);
  const next = () => setStep((s) => Math.min(s + 1, 2) as Step);
  const back = () => setStep((s) => Math.max(s - 1, 0) as Step);
  return { step, next, back };
}
```

L'état partagé (les données déjà saisies) vit dans le composant parent. Chaque étape reçoit une valeur initiale (`defaultValues`) et un callback `onValidated(data)` qui fusionne dans le parent et appelle `next()`.

> Piège de wizard : par défaut RHF **désenregistre** les champs démontés. Si tu montes/démontes chaque étape, garde les données dans le state parent (pattern retenu ici) ou passe `shouldUnregister: false`. Avec un `useForm` par étape, le problème disparaît puisque chaque form est indépendant.

### 2.3 Validation asynchrone d'unicité

Zod valide de façon synchrone (format, longueur). Vérifier qu'un email n'existe **pas déjà côté serveur** demande un appel réseau : c'est de la validation **asynchrone**. Deux façons :

> **Encart — resolver et `register` ne se cumulent pas.** Dès que `useForm` a un `resolver` (ici `zodResolver`), les règles passées à `register` (`validate`, `required`, `min`, `pattern`…) **ne s'exécutent pas** : la doc RHF le dit explicitement (« Resolvers cannot be used with built-in validators »). **Toute** la validation passe alors par le schéma. L'option (a) ci-dessous n'est donc valable **que sans resolver** ; avec un schéma Zod, utilise l'option (b).

**a) `validate` async dans `register`** — ciblé sur un champ, **uniquement si `useForm` n'a PAS de `resolver`** :

```tsx
// Valable seulement sans resolver (sinon ce validate est ignoré).
<input
  {...register('email', {
    validate: async (value) => {
      const taken = await isEmailTaken(value); // fetch API
      return taken ? 'Cet email est déjà utilisé' : true;
    },
  })}
/>
```

La fonction `validate` retourne `true` si valide, sinon la chaîne d'erreur. RHF gère le fait qu'elle soit `async`.

**b) `.refine()` async dans Zod** — quand la règle vit dans le schéma :

```tsx
const emailSchema = z
  .string()
  .email('Email invalide')
  .refine(async (email) => !(await isEmailTaken(email)), {
    message: 'Email déjà utilisé',
  });
```

`zodResolver` sait exécuter les refinements async (il appelle `parseAsync`). Attention : chaque validation déclenche un appel réseau — **débounce** ou valide en `mode: 'onBlur'` plutôt qu'à chaque frappe.

**Erreurs serveur au submit** — l'unicité peut aussi échouer au moment du submit (race condition). On mappe alors la réponse serveur vers les champs avec `setError` :

```tsx
const onSubmit = async (data: FamilyForm) => {
  const res = await fetch('/api/families', { method: 'POST', body: JSON.stringify(data) });
  if (!res.ok) {
    const errs = await res.json(); // { 'members.1.email': 'déjà pris' }
    Object.entries(errs).forEach(([field, message]) => {
      setError(field as keyof FamilyForm, { type: 'server', message: message as string });
    });
    return;
  }
};
```

`setError` avec `type: 'server'` affiche l'erreur sans que Zod la connaisse. Elle disparaît quand l'utilisateur re-modifie le champ.

### 2.4 Dépendances entre champs avec `watch`

`watch` **observe** la valeur d'un ou plusieurs champs et **re-rend** le composant à chaque changement. Il sert à faire dépendre un champ (ou son affichage) d'un autre.

```tsx
const eventType = watch('eventType'); // 're-render' à chaque changement

return (
  <>
    <select {...register('eventType')}>
      <option value="online">En ligne</option>
      <option value="in-person">Présentiel</option>
    </select>

    {/* Champ conditionnel : n'apparaît que pour le présentiel */}
    {eventType === 'in-person' && (
      <input {...register('location')} placeholder="Lieu" />
    )}
  </>
);
```

Nuances importantes :
- `watch('champ')` re-rend à chaque frappe → pratique mais coûteux. Pour un usage isolé dans un sous-composant, préférer `useWatch({ control, name })` qui limite le re-render à ce sous-composant.
- Pour **calculer** un champ à partir d'autres (ex. `total = prix * quantité`), combine `watch` + `setValue` dans un `useEffect`, en gardant les valeurs observées comme dépendances.
- `watch` sert à réagir/afficher ; il ne remplace pas la validation croisée, qui reste dans le schéma Zod (`.refine` avec `path`).

### 2.5 Upload de fichier

Un `<input type="file">` produit un `FileList`. Avec `register`, RHF stocke ce `FileList` comme valeur du champ. On le valide avec Zod (`z.instanceof(FileList)`), et on l'envoie via `FormData`.

```tsx
const MAX = 2 * 1024 * 1024; // 2 Mo
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const avatarSchema = z.object({
  avatar: z
    .instanceof(FileList)
    .refine((f) => f.length > 0, 'Fichier requis')
    .refine((f) => f[0]?.size <= MAX, 'Max 2 Mo')
    .refine((f) => TYPES.includes(f[0]?.type), 'JPEG, PNG ou WebP'),
});

function AvatarForm() {
  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<z.infer<typeof avatarSchema>>({ resolver: zodResolver(avatarSchema) });

  const selected = watch('avatar');

  const onSubmit = async (data: z.infer<typeof avatarSchema>) => {
    const body = new FormData();
    body.append('avatar', data.avatar[0]); // le FileList réel
    // PAS de header Content-Type : le navigateur pose le boundary multipart
    await fetch('/api/avatar', { method: 'POST', body });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="file" {...register('avatar')} accept=".jpg,.png,.webp" />
      {errors.avatar && <p>{errors.avatar.message}</p>}
      {selected?.[0] && <p>{selected[0].name} ({(selected[0].size / 1024).toFixed(0)} Ko)</p>}
      <button type="submit">Envoyer</button>
    </form>
  );
}
```

Règle d'or : pour `FormData`, **ne pose pas** `Content-Type` toi-même — le navigateur ajoute le bon `multipart/form-data; boundary=…`.

### 2.6 Composants de champ réutilisables

Répéter `<input> + {errors.x && <p>…}` pour chaque champ est fastidieux et incohérent. On extrait un composant `TextField` qui reçoit le `register` et l'erreur.

```tsx
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

interface TextFieldProps {
  label: string;
  error?: FieldError;
  // le retour de register('champ') — { name, onChange, onBlur, ref }
  registration: UseFormRegisterReturn;
  type?: string;
}

function TextField({ label, error, registration, type = 'text' }: TextFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} aria-invalid={!!error} {...registration} />
      {error && <p role="alert" className="field__error">{error.message}</p>}
    </label>
  );
}

// Usage — on passe register('email') et l'erreur du champ
<TextField label="Email" registration={register('email')} error={errors.email} />
```

`UseFormRegisterReturn` est le type exact du retour de `register` : plus besoin de spreader manuellement `name/onChange/onBlur/ref`. Pour des cas plus poussés (composants contrôlés type combobox), on utilise `Controller` (survolé en module 21), mais pour un input natif, passer `registration` suffit et reste léger.

---

## 3. Worked examples

### Exemple 1 — Wizard de création de famille (TribuZen)

Trois étapes : **infos** → **membres** (`useFieldArray` + email unique) → **confirmation**. Chaque étape a son `useForm`. Le parent agrège.

```tsx
// ─── types & schémas ─────────────────────────────────────────────
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const infoSchema = z.object({
  familyName: z.string().min(2, 'Nom de famille requis'),
  city: z.string().min(2, 'Ville requise'),
});

// email membre unique DANS le formulaire ET côté serveur
const membersSchema = z
  .object({
    members: z
      .array(
        z.object({
          name: z.string().min(2, 'Nom requis'),
          // unicité SERVEUR : refine async dans le schéma (zodResolver → parseAsync).
          // Un `validate` dans register serait ignoré à cause du resolver (voir encart).
          email: z
            .string()
            .email('Email invalide')
            .refine(async (e) => !(await isEmailTaken(e)), 'Email déjà pris'),
        })
      )
      .min(1, 'Au moins un membre'),
  })
  // unicité intra-formulaire : pas deux fois le même email
  .refine(
    (d) => new Set(d.members.map((m) => m.email)).size === d.members.length,
    { message: 'Emails en double', path: ['members'] }
  );

type InfoData = z.infer<typeof infoSchema>;
type MembersData = z.infer<typeof membersSchema>;
type FamilyData = InfoData & MembersData;

// stub API — unicité serveur
async function isEmailTaken(email: string): Promise<boolean> {
  const res = await fetch(`/api/members/exists?email=${encodeURIComponent(email)}`);
  const { exists } = await res.json();
  return exists;
}

// ─── Étape 1 : infos ─────────────────────────────────────────────
function StepInfo({ initial, onNext }: { initial: InfoData; onNext: (d: InfoData) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<InfoData>({
    resolver: zodResolver(infoSchema),
    defaultValues: initial,
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <input {...register('familyName')} placeholder="Nom de la famille" />
      {errors.familyName && <p>{errors.familyName.message}</p>}
      <input {...register('city')} placeholder="Ville" />
      {errors.city && <p>{errors.city.message}</p>}
      <button type="submit">Suivant</button>
    </form>
  );
}

// ─── Étape 2 : membres dynamiques + email unique async ───────────
function StepMembers({
  initial,
  onNext,
  onBack,
}: {
  initial: MembersData;
  onNext: (d: MembersData) => void;
  onBack: () => void;
}) {
  const { register, control, handleSubmit, formState: { errors, isValidating } } =
    useForm<MembersData>({
      resolver: zodResolver(membersSchema),
      defaultValues: initial,
      mode: 'onBlur', // valide l'unicité au blur, pas à chaque frappe
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'members' });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      {fields.map((field, i) => (
        <div key={field.id}>
          <input {...register(`members.${i}.name`)} placeholder="Nom" />
          {errors.members?.[i]?.name && <p>{errors.members[i]?.name?.message}</p>}

          <input
            placeholder="Email"
            // Pas de `validate` ici : le resolver Zod court-circuite les
            // validators de register. L'unicité serveur est dans le schéma
            // (.refine async sur email), exécutée via parseAsync au blur.
            {...register(`members.${i}.email`)}
          />
          {errors.members?.[i]?.email && <p>{errors.members[i]?.email?.message}</p>}

          <button type="button" onClick={() => remove(i)} disabled={fields.length <= 1}>
            Retirer
          </button>
        </div>
      ))}

      {/* erreur de niveau tableau : doublon / min */}
      {errors.members?.root && <p>{errors.members.root.message}</p>}
      {typeof errors.members?.message === 'string' && <p>{errors.members.message}</p>}

      <button type="button" onClick={() => append({ name: '', email: '' })}>
        + Ajouter un membre
      </button>

      <button type="button" onClick={onBack}>Précédent</button>
      <button type="submit" disabled={isValidating}>
        {isValidating ? 'Vérification…' : 'Suivant'}
      </button>
    </form>
  );
}

// ─── Étape 3 : confirmation ──────────────────────────────────────
function StepConfirm({
  data,
  onBack,
  onSubmitAll,
  submitting,
}: {
  data: FamilyData;
  onBack: () => void;
  onSubmitAll: () => void;
  submitting: boolean;
}) {
  return (
    <div>
      <h3>Confirmer</h3>
      <p>Famille {data.familyName} — {data.city}</p>
      <ul>
        {data.members.map((m) => (
          <li key={m.email}>{m.name} · {m.email}</li>
        ))}
      </ul>
      <button type="button" onClick={onBack}>Précédent</button>
      <button type="button" onClick={onSubmitAll} disabled={submitting}>
        {submitting ? 'Création…' : 'Créer la famille'}
      </button>
    </div>
  );
}

// ─── Parent : orchestre les 3 étapes ─────────────────────────────
export function CreateFamilyWizard() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<FamilyData>({
    familyName: '',
    city: '',
    members: [{ name: '', email: '' }],
  });

  const submitAll = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p>Étape {step + 1}/3</p>

      {step === 0 && (
        <StepInfo
          initial={{ familyName: data.familyName, city: data.city }}
          onNext={(d) => {
            setData((prev) => ({ ...prev, ...d }));
            setStep(1);
          }}
        />
      )}

      {step === 1 && (
        <StepMembers
          initial={{ members: data.members }}
          onBack={() => setStep(0)}
          onNext={(d) => {
            setData((prev) => ({ ...prev, ...d }));
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <StepConfirm
          data={data}
          submitting={submitting}
          onBack={() => setStep(1)}
          onSubmitAll={submitAll}
        />
      )}
    </div>
  );
}
```

Ce que l'exemple démontre :
- Chaque étape = un `useForm` indépendant → validation isolée, pas de désenregistrement à gérer.
- Les données saisies survivent aux allers-retours car elles vivent dans le state parent (`data`), pas dans les forms démontés.
- `useFieldArray` gère les membres ; `field.id` sert de `key`.
- Unicité en deux couches, toutes deux dans le schéma Zod : intra-formulaire (`.refine` sur l'objet) + serveur (`.refine` async sur l'email). Avec un `resolver`, un `validate` de `register` ne s'exécuterait pas.

### Exemple 2 — Champ dépendant via `watch`

Sur l'étape membres, un membre peut être marqué "responsable légal", ce qui débloque un champ téléphone obligatoire pour lui.

```tsx
function MemberRow({ index, register, watch, errors }: MemberRowProps) {
  // observe le rôle de CE membre uniquement
  const isGuardian = watch(`members.${index}.isGuardian`);

  return (
    <div>
      <input {...register(`members.${index}.name`)} placeholder="Nom" />

      <label>
        <input type="checkbox" {...register(`members.${index}.isGuardian`)} />
        Responsable légal
      </label>

      {/* champ conditionnel : n'apparaît que si responsable */}
      {isGuardian && (
        <>
          <input {...register(`members.${index}.phone`)} placeholder="Téléphone" />
          {errors.members?.[index]?.phone && (
            <p>{errors.members[index]?.phone?.message}</p>
          )}
        </>
      )}
    </div>
  );
}
```

La règle "téléphone requis si responsable" reste dans Zod (validation), `watch` ne fait que **piloter l'affichage** :

```tsx
const memberItem = z
  .object({
    name: z.string().min(2),
    isGuardian: z.boolean(),
    phone: z.string().optional(),
  })
  .refine((m) => !m.isGuardian || (m.phone && m.phone.length >= 10), {
    message: 'Téléphone requis pour un responsable légal',
    path: ['phone'],
  });
```

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Utiliser `index` comme `key` dans un field array

```tsx
// ❌ key = index → à la suppression, React réassocie mal les inputs
{fields.map((field, index) => (
  <div key={index}>
    <input {...register(`members.${index}.email`)} />
  </div>
))}

// ✅ key = field.id (stable, fourni par RHF)
{fields.map((field, index) => (
  <div key={field.id}>
    <input {...register(`members.${index}.email`)} />
  </div>
))}
```

Avec `index` comme `key`, supprimer le 1er élément fait "remonter" les valeurs : l'utilisateur voit un champ vidé au mauvais endroit. `field.id` reste attaché à la bonne ligne.

### PIÈGE #2 — Valider l'unicité async à chaque frappe

```tsx
// ❌ mode par défaut 'onSubmit' + validate async → aucun feedback avant submit
// ❌ mode 'onChange' → un fetch réseau à CHAQUE lettre tapée
useForm({ mode: 'onChange' });

// ✅ valider au blur : un seul appel quand le champ perd le focus
useForm({ mode: 'onBlur' });
```

La validation d'unicité coûte un aller-retour réseau. `onChange` déclenche une requête par caractère → surcharge serveur et flicker d'erreurs. `onBlur` (ou un debounce) est le bon compromis.

### PIÈGE #3 — Poser `Content-Type` manuellement avec `FormData`

```tsx
// ❌ écrase le boundary multipart → le serveur ne parse rien
await fetch('/api/avatar', {
  method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data' },
  body: formData,
});

// ✅ laisser le navigateur gérer le header
await fetch('/api/avatar', { method: 'POST', body: formData });
```

`multipart/form-data` a besoin d'un `boundary` unique que seul le navigateur connaît. Poser le header à la main casse l'upload silencieusement.

### PIÈGE #4 — Croire que `watch` remplace la validation croisée

```tsx
// ❌ watch cache le champ mais NE valide rien : un state stale peut passer
const type = watch('eventType');
{type === 'in-person' && <input {...register('location')} />}
// si l'utilisateur remplit location puis repasse en 'online', location reste dans les data

// ✅ la règle métier vit dans Zod (source de vérité de la validation)
schema.refine((d) => d.eventType !== 'in-person' || !!d.location, {
  message: 'Lieu requis en présentiel', path: ['location'],
});
```

`watch` pilote l'UI ; il ne garantit aucune cohérence des données. La validation conditionnelle appartient au schéma.

### PIÈGE #5 — Perdre les données entre étapes du wizard

```tsx
// ❌ chaque étape a son useForm mais rien n'agrège → étape 1 perdue au retour
{step === 0 && <StepInfo />}
{step === 1 && <StepMembers />}
// revenir à l'étape 0 remonte un form vide

// ✅ agréger dans un state parent, réinjecter via defaultValues
onNext={(d) => { setData((p) => ({ ...p, ...d })); setStep(1); }}
// ... <StepInfo initial={{ familyName: data.familyName, city: data.city }} />
```

RHF désenregistre les champs démontés. Sans agrégation parent (ou `shouldUnregister: false`), les allers-retours effacent la saisie.

---

## 5. Ancrage TribuZen

Le wizard de création de famille est une vue réelle de l'admin TribuZen : `src/features/family/CreateFamilyWizard.tsx`.

- **Étape infos** (`StepInfo`) — nom de famille + ville. Schéma `infoSchema`, un `useForm` dédié.
- **Étape membres** (`StepMembers`) — cœur du module : `useFieldArray` sur `members`, ajout/retrait dynamique, validation d'**email membre unique** en deux couches (Zod `.refine` intra-formulaire + `validate` async contre `/api/members/exists`). Le composant `TextField` réutilisable (section 2.6) sert ici pour chaque champ nom/email.
- **Étape confirmation** (`StepConfirm`) — récap en lecture seule + submit final vers `/api/families`, avec `setError` si le serveur détecte un conflit d'unicité de dernière minute.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  features/family/
    CreateFamilyWizard.tsx     # parent, orchestre les 3 étapes + state agrégé
    StepInfo.tsx
    StepMembers.tsx            # useFieldArray + email unique async
    StepConfirm.tsx
    family.schema.ts           # infoSchema, membersSchema, familySchema
  components/form/
    TextField.tsx              # champ réutilisable (registration + error)
  api/
    members.ts                 # isEmailTaken(email)
```

Le upload de fichier (section 2.5) se branchera sur l'avatar de famille dans une itération suivante (`StepInfo` → champ `avatar`).

---

## 6. Points clés

1. `useFieldArray({ control, name })` gère une liste de champs de longueur variable ; `append`/`remove`/`move` mutent la liste, `field.id` sert de `key` stable.
2. Un wizard multi-étapes = un `useForm` par étape + un state parent qui agrège les données au fil des `handleSubmit` ; chaque étape valide puis fait avancer l'index.
3. La validation d'unicité est **asynchrone** : `validate` async dans `register`, ou `.refine()` async dans Zod ; on valide en `onBlur` (pas `onChange`) pour limiter les appels réseau.
4. Les erreurs serveur se remontent dans les champs avec `setError(field, { type: 'server', message })`.
5. `watch` (ou `useWatch`) observe des champs pour piloter l'affichage conditionnel ou un champ calculé — mais la validation croisée reste dans le schéma Zod.
6. Un `<input type="file">` produit un `FileList` ; on le valide via `z.instanceof(FileList)` et on l'envoie en `FormData` **sans** poser `Content-Type` soi-même.
7. Un composant de champ réutilisable (`TextField`) prend `registration: UseFormRegisterReturn` + `error: FieldError` et supprime la répétition input/erreur.

---

## 7. Seeds Anki

```
À quoi sert useFieldArray et quelle key utiliser dans le .map ?|Il gère une liste de champs de longueur variable (append/remove/move/insert/update). La key du .map doit être field.id (identifiant stable fourni par RHF), jamais l'index — sinon React réassocie mal les inputs à la suppression.
Comment structure-t-on un wizard multi-étapes avec React Hook Form ?|Un useForm (et un schéma Zod) par étape ; chaque handleSubmit valide puis fait avancer l'index d'étape. Les données saisies sont agrégées dans un state parent et réinjectées via defaultValues pour survivre aux allers-retours (RHF désenregistre les champs démontés).
Comment valider l'unicité d'un email de façon asynchrone avec RHF ?|Soit validate async dans register (retourne true ou un message après un fetch), soit un .refine() async dans le schéma Zod (zodResolver appelle parseAsync). On valide en mode 'onBlur' plutôt que 'onChange' pour éviter un appel réseau par frappe.
Comment afficher une erreur venue du serveur sur un champ précis ?|Avec setError(nomDuChamp, { type: 'server', message }). L'erreur s'affiche comme les autres et disparaît quand l'utilisateur re-modifie le champ.
À quoi sert watch et que ne fait-il PAS ?|watch observe la valeur d'un ou plusieurs champs et re-rend à chaque changement, pour piloter un affichage conditionnel ou un champ calculé. Il ne valide rien : la validation croisée/conditionnelle reste dans le schéma Zod (.refine avec path).
Comment gérer un upload de fichier avec RHF et l'envoyer au serveur ?|register sur un <input type="file"> stocke un FileList ; on le valide avec z.instanceof(FileList).refine(...) (taille, type). On envoie via FormData sans poser le header Content-Type, pour que le navigateur ajoute le bon boundary multipart.
Comment factoriser un champ de formulaire réutilisable avec RHF ?|Un composant (ex. TextField) qui reçoit registration: UseFormRegisterReturn (le retour de register) et error: FieldError, puis spread {...registration} sur l'input. Cela supprime la répétition input + affichage d'erreur.
Pourquoi valider l'unicité async en 'onBlur' plutôt qu'en 'onChange' ?|Chaque validation d'unicité déclenche un aller-retour réseau. En 'onChange', une requête part à chaque caractère (surcharge serveur, flicker d'erreurs). 'onBlur' (ou un debounce) ne valide qu'une fois le champ quitté.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-22-patterns-formulaires-avances/README.md`. Construire le wizard de création de famille TribuZen (infos → membres dynamiques avec email unique → confirmation) de zéro, avec `useFieldArray`, validation async et agrégation d'état entre étapes.
