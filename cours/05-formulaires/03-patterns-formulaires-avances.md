# Cours 23 — Patterns de formulaires avancés

> **Objectif** : Maîtriser les patterns avancés de formulaires en React : wizard multi-étapes, champs dynamiques avec `useFieldArray`, validation cross-field avec Zod, validation côté serveur, auto-save avec debounce, upload de fichiers, et gestion des états de soumission. Ces patterns reviennent constamment dans les projets d'entreprise.

---

## Rappel du cours précédent

<details>
<summary>1. Pourquoi React Hook Form est-il plus performant que useState pour les formulaires ?</summary>

RHF utilise des refs en interne (approche uncontrolled) au lieu de state. Il n'y a pas de re-render à chaque frappe : seul le champ qui change est mis à jour dans le DOM. Avec useState, chaque modification re-rend tout le composant.
</details>

<details>
<summary>2. Que retourne register('email') et pourquoi utilise-t-on le spread ?</summary>

`register('email')` retourne un objet `{ name, onChange, onBlur, ref }`. On le spread sur l'input (`{...register('email')}`) pour connecter automatiquement le champ au formulaire RHF.
</details>

<details>
<summary>3. Comment utiliser Zod avec React Hook Form ?</summary>

En installant `@hookform/resolvers` et en passant `resolver: zodResolver(mySchema)` dans les options de `useForm`. Le type peut être inféré avec `z.infer<typeof mySchema>`.
</details>

---

## Analogie

Imaginez un **dossier administratif complexe** pour une demande de permis de construire. Il y a **plusieurs pages** (wizard multi-étapes), certaines sections permettent d'ajouter des éléments (« ajouter un co-propriétaire » = champs dynamiques), des règles liées entre elles (« si le terrain fait plus de 500m, un architecte est obligatoire » = validation cross-field), une vérification en mairie avant dépôt (validation serveur), et un système de brouillon automatique (auto-save). Ce cours couvre chacun de ces patterns.

---

## Théorie

### Pattern 1 : Wizard multi-étapes

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ✅ Un schéma par étape
const step1Schema = z.object({
  firstName: z.string().min(2, 'Minimum 2 caractères'),
  lastName: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
});

const step2Schema = z.object({
  address: z.string().min(5, 'Adresse trop courte'),
  city: z.string().min(2, 'Ville requise'),
  postalCode: z.string().regex(/^\d{5}$/, 'Code postal invalide'),
});

const step3Schema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, '16 chiffres requis'),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, 'Format MM/AA'),
  cvv: z.string().regex(/^\d{3}$/, '3 chiffres requis'),
});

// Schéma complet pour le type final
const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
type WizardData = z.infer<typeof fullSchema>;

const schemas = [step1Schema, step2Schema, step3Schema] as const;
const stepTitles = ['Informations personnelles', 'Adresse', 'Paiement'];

function WizardForm() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<WizardData>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schemas[step]),
    defaultValues: formData,
  });

  const onNext = (data: Record<string, unknown>) => {
    const updated = { ...formData, ...data };
    setFormData(updated);

    if (step < schemas.length - 1) {
      setStep(step + 1);
    } else {
      // Dernière étape : soumettre
      console.log('Soumission finale :', updated);
    }
  };

  return (
    <div>
      <h2>Étape {step + 1}/{schemas.length} — {stepTitles[step]}</h2>

      {/* Barre de progression */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {stepTitles.map((title, i) => (
          <div
            key={title}
            style={{
              flex: 1,
              height: 4,
              background: i <= step ? '#007bff' : '#ddd',
              borderRadius: 2,
            }}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit(onNext)}>
        {step === 0 && (
          <>
            <input {...register('firstName')} placeholder="Prénom" />
            {errors.firstName && <p style={{ color: 'red' }}>{errors.firstName.message}</p>}

            <input {...register('lastName')} placeholder="Nom" />
            {errors.lastName && <p style={{ color: 'red' }}>{errors.lastName.message}</p>}

            <input {...register('email')} placeholder="Email" />
            {errors.email && <p style={{ color: 'red' }}>{errors.email.message}</p>}
          </>
        )}

        {step === 1 && (
          <>
            <input {...register('address')} placeholder="Adresse" />
            {errors.address && <p style={{ color: 'red' }}>{errors.address.message}</p>}

            <input {...register('city')} placeholder="Ville" />
            {errors.city && <p style={{ color: 'red' }}>{errors.city.message}</p>}

            <input {...register('postalCode')} placeholder="Code postal" />
            {errors.postalCode && <p style={{ color: 'red' }}>{errors.postalCode.message}</p>}
          </>
        )}

        {step === 2 && (
          <>
            <input {...register('cardNumber')} placeholder="Numéro de carte" />
            {errors.cardNumber && <p style={{ color: 'red' }}>{errors.cardNumber.message}</p>}

            <input {...register('expiry')} placeholder="MM/AA" />
            {errors.expiry && <p style={{ color: 'red' }}>{errors.expiry.message}</p>}

            <input {...register('cvv')} placeholder="CVV" />
            {errors.cvv && <p style={{ color: 'red' }}>{errors.cvv.message}</p>}
          </>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)}>
              Précédent
            </button>
          )}
          <button type="submit">
            {step < schemas.length - 1 ? 'Suivant' : 'Payer'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Pattern 2 : Champs dynamiques avec useFieldArray

`useFieldArray` permet d'ajouter, supprimer et réordonner des champs dynamiquement :

```tsx
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const teamSchema = z.object({
  teamName: z.string().min(2, 'Nom requis'),
  members: z.array(
    z.object({
      name: z.string().min(2, 'Nom requis'),
      email: z.string().email('Email invalide'),
      role: z.enum(['developer', 'designer', 'manager']),
    })
  ).min(1, 'Au moins un membre').max(10, 'Maximum 10 membres'),
});

type TeamData = z.infer<typeof teamSchema>;

function TeamForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      teamName: '',
      members: [{ name: '', email: '', role: 'developer' }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'members',
  });

  const onSubmit = (data: TeamData) => {
    console.log('Équipe :', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('teamName')} placeholder="Nom de l'équipe" />
      {errors.teamName && <p style={{ color: 'red' }}>{errors.teamName.message}</p>}

      <h3>Membres</h3>
      {fields.map((field, index) => (
        <div key={field.id} style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '0.5rem' }}>
          <input
            {...register(`members.${index}.name`)}
            placeholder="Nom"
          />
          {errors.members?.[index]?.name && (
            <p style={{ color: 'red' }}>{errors.members[index].name?.message}</p>
          )}

          <input
            {...register(`members.${index}.email`)}
            placeholder="Email"
          />
          {errors.members?.[index]?.email && (
            <p style={{ color: 'red' }}>{errors.members[index].email?.message}</p>
          )}

          <select {...register(`members.${index}.role`)}>
            <option value="developer">Développeur</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
          </select>

          <button type="button" onClick={() => remove(index)} disabled={fields.length <= 1}>
            Supprimer
          </button>
          {index > 0 && (
            <button type="button" onClick={() => move(index, index - 1)}>
              Monter
            </button>
          )}
        </div>
      ))}

      {errors.members?.root && (
        <p style={{ color: 'red' }}>{errors.members.root.message}</p>
      )}

      <button
        type="button"
        onClick={() => append({ name: '', email: '', role: 'developer' })}
        disabled={fields.length >= 10}
      >
        + Ajouter un membre
      </button>

      <button type="submit">Créer l'équipe</button>
    </form>
  );
}
```

### Pattern 3 : Validation cross-field avec Zod

```tsx
const passwordSchema = z.object({
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],  // L'erreur s'affiche sur ce champ
});

// ✅ Validation conditionnelle
const eventSchema = z.object({
  eventType: z.enum(['online', 'in-person']),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
}).refine(
  (data) => {
    if (data.eventType === 'in-person') return !!data.location;
    return true;
  },
  { message: 'Le lieu est requis pour un événement en présentiel', path: ['location'] }
).refine(
  (data) => {
    if (data.eventType === 'online') return !!data.meetingUrl;
    return true;
  },
  { message: 'L\'URL est requise pour un événement en ligne', path: ['meetingUrl'] }
);

// ✅ Validation avec discriminated union
const notificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    emailAddress: z.string().email(),
  }),
  z.object({
    type: z.literal('sms'),
    phoneNumber: z.string().regex(/^(\+33|0)[1-9]\d{8}$/, 'Numéro invalide'),
  }),
  z.object({
    type: z.literal('push'),
    deviceToken: z.string().min(1),
  }),
]);
```

### Pattern 4 : Validation côté serveur

```tsx
import { useForm } from 'react-hook-form';

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    setError,       // ✅ Permet d'ajouter des erreurs manuellement
    formState: { errors, isSubmitting },
  } = useForm<{ username: string; email: string }>();

  const onSubmit = async (data: { username: string; email: string }) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const serverErrors = await response.json();

        // ✅ Mapper les erreurs du serveur vers les champs
        if (serverErrors.username) {
          setError('username', {
            type: 'server',
            message: serverErrors.username,
          });
        }
        if (serverErrors.email) {
          setError('email', {
            type: 'server',
            message: serverErrors.email,
          });
        }
        // Erreur globale
        if (serverErrors.global) {
          setError('root', {
            type: 'server',
            message: serverErrors.global,
          });
        }
        return;
      }

      console.log('Inscription réussie');
    } catch {
      setError('root', { type: 'server', message: 'Erreur réseau' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {errors.root && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>{errors.root.message}</div>
      )}
      <input {...register('username')} placeholder="Nom d'utilisateur" />
      {errors.username && <p style={{ color: 'red' }}>{errors.username.message}</p>}

      <input {...register('email')} placeholder="Email" />
      {errors.email && <p style={{ color: 'red' }}>{errors.email.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Vérification...' : 'S\'inscrire'}
      </button>
    </form>
  );
}
```

### Pattern 5 : Auto-save avec debounce

```tsx
import { useForm } from 'react-hook-form';
import { useEffect, useRef, useCallback } from 'react';

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

function AutoSaveForm() {
  const { register, watch, formState: { isDirty } } = useForm({
    defaultValues: { title: '', content: '' },
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // ✅ Fonction de sauvegarde debounced
  const saveToServer = useCallback(
    debounce(async (data: { title: string; content: string }) => {
      setSaveStatus('saving');
      await fetch('/api/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000),
    []
  );

  // ✅ Observer tous les champs et auto-sauvegarder
  useEffect(() => {
    const subscription = watch((data) => {
      if (isDirty) {
        saveToServer(data as { title: string; content: string });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, isDirty, saveToServer]);

  return (
    <form>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Brouillon</h2>
        <span>
          {saveStatus === 'saving' && 'Sauvegarde...'}
          {saveStatus === 'saved' && 'Sauvegardé'}
        </span>
      </div>
      <input {...register('title')} placeholder="Titre" />
      <textarea {...register('content')} placeholder="Contenu..." rows={10} />
    </form>
  );
}
```

### Pattern 6 : Upload de fichiers

```tsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const uploadSchema = z.object({
  title: z.string().min(2),
  file: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, 'Fichier requis')
    .refine((files) => files[0]?.size <= MAX_FILE_SIZE, 'Taille maximum : 5 Mo')
    .refine(
      (files) => ACCEPTED_TYPES.includes(files[0]?.type),
      'Formats acceptés : JPEG, PNG, WebP, PDF'
    ),
});

type UploadData = z.infer<typeof uploadSchema>;

function UploadForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<UploadData>({
    resolver: zodResolver(uploadSchema),
  });

  const selectedFile = watch('file');

  const onSubmit = async (data: UploadData) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('file', data.file[0]);

    await fetch('/api/upload', {
      method: 'POST',
      body: formData,  // Pas de Content-Type header — le navigateur le gère
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} placeholder="Titre du document" />
      {errors.title && <p style={{ color: 'red' }}>{errors.title.message}</p>}

      <input type="file" {...register('file')} accept=".jpg,.png,.webp,.pdf" />
      {errors.file && <p style={{ color: 'red' }}>{errors.file.message}</p>}
      {selectedFile?.[0] && (
        <p>Fichier sélectionné : {selectedFile[0].name} ({(selectedFile[0].size / 1024).toFixed(0)} Ko)</p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Upload...' : 'Envoyer'}
      </button>
    </form>
  );
}
```

### Pattern 7 : États de soumission complets

```tsx
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

function RobustForm() {
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [serverMessage, setServerMessage] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setStatus('submitting');
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erreur serveur');
      setStatus('success');
      setServerMessage('Formulaire envoyé avec succès !');
      reset();
    } catch (err) {
      setStatus('error');
      setServerMessage((err as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Bannière de statut */}
      {status === 'success' && (
        <div style={{ background: '#d4edda', padding: '1rem', borderRadius: 4, marginBottom: '1rem' }}>
          {serverMessage}
        </div>
      )}
      {status === 'error' && (
        <div style={{ background: '#f8d7da', padding: '1rem', borderRadius: 4, marginBottom: '1rem' }}>
          {serverMessage}
          <button type="button" onClick={() => setStatus('idle')}>Réessayer</button>
        </div>
      )}

      {/* Champs du formulaire... */}
      <input {...register('name')} placeholder="Nom" />

      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? (
          <span>Envoi en cours...</span>
        ) : (
          'Envoyer'
        )}
      </button>
    </form>
  );
}
```

---

## Pratique

Créez un formulaire de création de projet avec les patterns suivants :

1. **Wizard 2 étapes** : Etape 1 (nom du projet, description), Etape 2 (membres de l'équipe)
2. **Champs dynamiques** pour les membres (nom + rôle) avec `useFieldArray`
3. **Validation Zod** : nom >= 3 caractères, au moins 1 membre, rôle requis
4. Affichage d'un **récapitulatif** avant soumission
5. Gestion des **états de soumission** (loading/success/error)

<details>
<summary>Solution</summary>

```tsx
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schémas
const step1Schema = z.object({
  projectName: z.string().min(3, 'Minimum 3 caractères'),
  description: z.string().min(10, 'Minimum 10 caractères'),
});

const step2Schema = z.object({
  members: z.array(
    z.object({
      name: z.string().min(2, 'Nom requis'),
      role: z.enum(['dev', 'design', 'pm'], {
        errorMap: () => ({ message: 'Rôle requis' }),
      }),
    })
  ).min(1, 'Au moins un membre'),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type ProjectData = Step1 & Step2;
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

function ProjectWizard() {
  const [step, setStep] = useState(0);
  const [projectInfo, setProjectInfo] = useState<Step1 | null>(null);
  const [status, setStatus] = useState<SubmitStatus>('idle');

  // Étape 1
  const step1Form = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: { projectName: '', description: '' },
  });

  // Étape 2
  const step2Form = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { members: [{ name: '', role: 'dev' }] },
  });

  const { fields, append, remove } = useFieldArray({
    control: step2Form.control,
    name: 'members',
  });

  const handleStep1 = step1Form.handleSubmit((data) => {
    setProjectInfo(data);
    setStep(1);
  });

  const handleStep2 = step2Form.handleSubmit(async (data) => {
    if (!projectInfo) return;
    setStatus('submitting');

    try {
      await new Promise((r) => setTimeout(r, 1000));
      const fullData: ProjectData = { ...projectInfo, ...data };
      console.log('Projet créé :', fullData);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  });

  if (status === 'success') {
    return (
      <div style={{ background: '#d4edda', padding: '2rem', borderRadius: 8 }}>
        <h2>Projet créé avec succès !</h2>
        <p>Nom : {projectInfo?.projectName}</p>
        <p>Membres : {fields.length}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Étape {step + 1}/2</h2>

      {step === 0 && (
        <form onSubmit={handleStep1}>
          <input {...step1Form.register('projectName')} placeholder="Nom du projet" />
          {step1Form.formState.errors.projectName && (
            <p style={{ color: 'red' }}>{step1Form.formState.errors.projectName.message}</p>
          )}

          <textarea {...step1Form.register('description')} placeholder="Description" rows={4} />
          {step1Form.formState.errors.description && (
            <p style={{ color: 'red' }}>{step1Form.formState.errors.description.message}</p>
          )}

          <button type="submit">Suivant</button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={handleStep2}>
          <h3>Membres de l'équipe</h3>
          {fields.map((field, index) => (
            <div key={field.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input {...step2Form.register(`members.${index}.name`)} placeholder="Nom" />
              <select {...step2Form.register(`members.${index}.role`)}>
                <option value="dev">Dev</option>
                <option value="design">Design</option>
                <option value="pm">PM</option>
              </select>
              <button type="button" onClick={() => remove(index)} disabled={fields.length <= 1}>
                X
              </button>
            </div>
          ))}

          <button type="button" onClick={() => append({ name: '', role: 'dev' })}>
            + Ajouter un membre
          </button>

          <div style={{ marginTop: '1rem' }}>
            <button type="button" onClick={() => setStep(0)}>Précédent</button>
            <button type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Création...' : 'Créer le projet'}
            </button>
          </div>

          {status === 'error' && <p style={{ color: 'red' }}>Erreur lors de la création</p>}
        </form>
      )}
    </div>
  );
}
```
</details>

---

## Résumé

| Pattern | Outil | Quand l'utiliser |
|---------|-------|------------------|
| Wizard multi-étapes | `useState` pour l'étape + `useForm` par étape | Inscription, checkout, onboarding |
| Champs dynamiques | `useFieldArray` | Listes éditables (membres, produits, lignes) |
| Validation cross-field | Zod `.refine()` / `.superRefine()` | Confirmation de mot de passe, champs conditionnels |
| Validation serveur | `setError('field', { message })` | Vérification d'unicité (email, username) |
| Auto-save debounced | `watch` + `debounce` | Brouillons, notes, éditeurs |
| Upload de fichiers | `register` + `FileList` + validation Zod | Documents, images, pièces jointes |
| États de soumission | `status` state machine | Tout formulaire avec appel API |

---

> **Prochain cours** : [Cours 24 — Tests unitaires avec Vitest](../06-nextjs/01-intro-nextjs.md)
