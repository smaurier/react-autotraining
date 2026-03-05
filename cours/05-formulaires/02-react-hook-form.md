# Cours 22 — React Hook Form : formulaires performants

> **Objectif** : Maîtriser React Hook Form (RHF), la librairie de formulaires la plus populaire en React, connue pour ses performances (minimal re-renders) et sa DX. Apprendre `useForm`, `register`, `handleSubmit`, la validation avec Zod, et les fonctionnalités `watch` et `control`. Comparer avec VeeValidate (Vue) et les Angular Reactive Forms. Sujet incontournable en entretien technique React.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle est la différence entre un composant controlled et uncontrolled ?</summary>

Un composant **controlled** a sa valeur gérée par React via `useState` (`value` + `onChange`). Un composant **uncontrolled** laisse le DOM gérer la valeur et on la lit via `useRef` au moment de la soumission.
</details>

<details>
<summary>2. Comment gérer plusieurs champs avec un seul handler onChange ?</summary>

En utilisant un state objet et le pattern computed property name : `setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))`. Chaque input doit avoir un attribut `name` correspondant à la clé du state.
</details>

<details>
<summary>3. Pourquoi React n'a-t-il pas d'équivalent de v-model ?</summary>

Par choix de design : React privilégie l'explicite. Le binding bidirectionnel est toujours visible (`value` + `onChange`) au lieu d'être masqué par une directive. Cela rend le flux de données plus clair mais plus verbeux.
</details>

---

## Analogie

Imaginez un **formulaire papier intelligent**. Au lieu d'avoir un professeur (React state) qui surveille chaque lettre que vous écrivez et la recopie (re-render à chaque frappe), React Hook Form vous donne un stylo spécial (register) qui **enregistre** tout discrètement. Le professeur ne regarde le formulaire que quand vous le déposez sur son bureau (soumission). Résultat : vous écrivez librement sans interruption (performances optimales), et la vérification se fait au bon moment.

---

## Théorie

### Pourquoi React Hook Form ?

| Critère | useState classique | React Hook Form |
|---------|-------------------|-----------------|
| Re-renders | À chaque frappe (chaque champ) | Quasi aucun (isolé par champ) |
| Boilerplate | Élevé (state + handler + errors) | Minimal |
| Validation | Manuelle | Intégrée (Zod, Yup, etc.) |
| Performance | ❌ Problématique avec 50+ champs | ✅ Optimisé nativement |
| DX TypeScript | Bonne | ✅ Excellente (inférence) |
| Taille | 0 Ko (natif) | ~9 Ko gzippé |

### Installation

```bash
npm install react-hook-form
# Validation avec Zod (recommandé)
npm install zod @hookform/resolvers
```

### Premier formulaire avec useForm

```tsx
import { useForm } from 'react-hook-form';

interface LoginForm {
  email: string;
  password: string;
}

function LoginPage() {
  const {
    register,      // Connecte un input au formulaire
    handleSubmit,  // Gère la soumission avec validation
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    // data est typé et validé
    console.log(data);  // { email: "...", password: "..." }
    await loginAPI(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('email', {
            required: 'L\'email est requis',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Email invalide',
            },
          })}
          placeholder="Email"
        />
        {errors.email && <span style={{ color: 'red' }}>{errors.email.message}</span>}
      </div>

      <div>
        <input
          type="password"
          {...register('password', {
            required: 'Le mot de passe est requis',
            minLength: { value: 8, message: 'Minimum 8 caractères' },
          })}
          placeholder="Mot de passe"
        />
        {errors.password && <span style={{ color: 'red' }}>{errors.password.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
}
```

### Comment fonctionne `register` ?

```tsx
// register('email') retourne un objet qui se spread sur l'input :
const emailProps = register('email');
// emailProps = { name: 'email', onChange: fn, onBlur: fn, ref: fn }

// C'est pour cela qu'on utilise le spread :
<input {...register('email')} />

// Équivalent à :
<input name="email" onChange={...} onBlur={...} ref={...} />
```

> **Point clé** : RHF utilise des refs en interne (uncontrolled), c'est pourquoi il n'y a quasiment pas de re-render. Seul le champ qui change est mis à jour dans le DOM.

### Validation avec Zod — le standard moderne

Zod est une librairie de validation de schémas TypeScript-first. C'est le standard de facto en 2025 :

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ✅ Schéma Zod = source unique de vérité pour types ET validation
const registrationSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  confirmPassword: z.string(),
  age: z.coerce.number().min(18, 'Vous devez avoir au moins 18 ans'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

// ✅ Le type est INFÉRÉ du schéma — pas besoin d'interface séparée
type RegistrationData = z.infer<typeof registrationSchema>;

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: 18,
    },
  });

  const onSubmit = async (data: RegistrationData) => {
    console.log('Données validées :', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input {...register('name')} placeholder="Nom" />
        {errors.name && <p style={{ color: 'red' }}>{errors.name.message}</p>}
      </div>

      <div>
        <input {...register('email')} placeholder="Email" />
        {errors.email && <p style={{ color: 'red' }}>{errors.email.message}</p>}
      </div>

      <div>
        <input type="password" {...register('password')} placeholder="Mot de passe" />
        {errors.password && <p style={{ color: 'red' }}>{errors.password.message}</p>}
      </div>

      <div>
        <input type="password" {...register('confirmPassword')} placeholder="Confirmer" />
        {errors.confirmPassword && (
          <p style={{ color: 'red' }}>{errors.confirmPassword.message}</p>
        )}
      </div>

      <div>
        <input type="number" {...register('age')} placeholder="Âge" />
        {errors.age && <p style={{ color: 'red' }}>{errors.age.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>S'inscrire</button>
    </form>
  );
}
```

### Afficher les erreurs — composant réutilisable

```tsx
// ✅ Composant d'erreur réutilisable
import type { FieldError } from 'react-hook-form';

function FieldErrorMessage({ error }: { error?: FieldError }) {
  if (!error) return null;
  return <p style={{ color: 'red', fontSize: '0.85rem', marginTop: '0.25rem' }}>{error.message}</p>;
}

// Utilisation
<FieldErrorMessage error={errors.email} />
```

### watch — observer des valeurs en temps réel

```tsx
function PasswordForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<{
    password: string;
    confirmPassword: string;
  }>();

  // ✅ watch observe une valeur en temps réel (provoque un re-render)
  const password = watch('password', '');

  // Indicateur de force du mot de passe
  const strength = password.length < 8 ? 'Faible' : password.length < 12 ? 'Moyen' : 'Fort';

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input type="password" {...register('password')} />
      <p>Force : {strength}</p>

      <input type="password" {...register('confirmPassword')} />
      <button type="submit">Valider</button>
    </form>
  );
}
```

> **Attention** : `watch` provoque un re-render à chaque changement du champ observé. Ne l'utilisez que quand vous avez besoin d'afficher une valeur en temps réel.

### Controller — pour les composants UI tiers

Quand un composant UI (Material UI, Radix, etc.) ne supporte pas `ref`, utilisez `Controller` :

```tsx
import { useForm, Controller } from 'react-hook-form';

function MyForm() {
  const { control, handleSubmit } = useForm<{ rating: number }>();

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <Controller
        name="rating"
        control={control}
        defaultValue={0}
        rules={{ min: { value: 1, message: 'Veuillez noter' } }}
        render={({ field, fieldState: { error } }) => (
          <div>
            {/* field contient : value, onChange, onBlur, name, ref */}
            <StarRating value={field.value} onChange={field.onChange} />
            {error && <p style={{ color: 'red' }}>{error.message}</p>}
          </div>
        )}
      />
      <button type="submit">Envoyer</button>
    </form>
  );
}
```

### Modes de validation

```tsx
const { register, handleSubmit } = useForm<FormData>({
  mode: 'onBlur',       // Valide quand le champ perd le focus (défaut : onSubmit)
  // Autres modes :
  // mode: 'onSubmit'   — valide seulement à la soumission
  // mode: 'onChange'   — valide à chaque frappe (attention aux performances)
  // mode: 'onTouched'  — valide quand le champ a été touché puis modifié
  // mode: 'all'        — valide à chaque changement ET au blur
});
```

### Comparaison avec VeeValidate (Vue) et Angular Reactive Forms

| Concept | React Hook Form | VeeValidate (Vue) | Angular Reactive Forms |
|---------|-----------------|--------------------|-----------------------|
| Setup | `useForm()` | `useForm()` | `FormBuilder.group()` |
| Binding | `{...register('name')}` | `defineField('name')` | `formControlName="name"` |
| Validation | `zodResolver(schema)` | `toTypedSchema(schema)` | `Validators.required` |
| Erreurs | `errors.name?.message` | `errors.name` | `form.get('name')?.errors` |
| Re-renders | Minimal (refs) | Minimal (réactif Vue) | Aucun (Observable) |
| Schéma | Zod, Yup | Zod, Yup, Valibot | Validators intégrés |
| Sujet d'entretien | ✅ Question classique | Moins fréquent | ✅ Question classique |

```vue
<!-- VeeValidate (Vue 3) — très similaire à RHF -->
<script setup>
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const schema = toTypedSchema(z.object({
  email: z.string().email(),
  password: z.string().min(8),
}))

const { handleSubmit, defineField, errors } = useForm({ validationSchema: schema })
const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')

const onSubmit = handleSubmit((values) => console.log(values))
</script>
```

```typescript
// Angular Reactive Forms — équivalent
@Component({
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="email" />
      @if (form.get('email')?.hasError('email')) {
        <span>Email invalide</span>
      }
    </form>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
}
```

### Questions d'entretien fréquentes sur les formulaires React

1. **Controlled vs Uncontrolled** : quelle différence et quand utiliser lequel ?
2. **Pourquoi React Hook Form est-il plus performant que useState ?** (Réponse : il utilise des refs, pas du state)
3. **Comment valider un formulaire avec Zod ?** (Réponse : `zodResolver`)
4. **Qu'est-ce que `register` retourne ?** (Réponse : `{ name, onChange, onBlur, ref }`)
5. **Quand utiliser `Controller` ?** (Réponse : pour les composants qui n'acceptent pas de `ref`)

---

## Pratique

Créez un formulaire de contact avec React Hook Form et Zod :

1. Champs : nom, email, sujet (select), message (textarea), newsletter (checkbox)
2. Validation Zod : nom >= 2 caractères, email valide, sujet requis, message >= 10 caractères
3. Affichage des erreurs avec un composant `FieldError` réutilisable
4. État de soumission (loading/success)
5. Mode de validation `onBlur`

<details>
<summary>Solution</summary>

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FieldError } from 'react-hook-form';

// Schéma
const contactSchema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  subject: z.enum(['support', 'commercial', 'autre'], {
    errorMap: () => ({ message: 'Veuillez choisir un sujet' }),
  }),
  message: z.string().min(10, 'Minimum 10 caractères'),
  newsletter: z.boolean(),
});

type ContactData = z.infer<typeof contactSchema>;

// Composant d'erreur
function FieldErrorMessage({ error }: { error?: FieldError }) {
  if (!error) return null;
  return <p style={{ color: 'red', fontSize: '0.85rem' }}>{error.message}</p>;
}

function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    reset,
  } = useForm<ContactData>({
    resolver: zodResolver(contactSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      subject: undefined,
      message: '',
      newsletter: false,
    },
  });

  const onSubmit = async (data: ContactData) => {
    await new Promise((r) => setTimeout(r, 1000));  // Simule l'envoi
    console.log('Envoyé :', data);
    reset();
  };

  if (isSubmitSuccessful) {
    return <p>Message envoyé avec succès !</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input {...register('name')} placeholder="Nom" />
        <FieldErrorMessage error={errors.name} />
      </div>

      <div>
        <input {...register('email')} placeholder="Email" />
        <FieldErrorMessage error={errors.email} />
      </div>

      <div>
        <select {...register('subject')}>
          <option value="">-- Choisir un sujet --</option>
          <option value="support">Support</option>
          <option value="commercial">Commercial</option>
          <option value="autre">Autre</option>
        </select>
        <FieldErrorMessage error={errors.subject} />
      </div>

      <div>
        <textarea {...register('message')} placeholder="Votre message" rows={5} />
        <FieldErrorMessage error={errors.message} />
      </div>

      <div>
        <label>
          <input type="checkbox" {...register('newsletter')} />
          Recevoir la newsletter
        </label>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Envoi...' : 'Envoyer'}
      </button>
    </form>
  );
}
```
</details>

---

## Résumé

| Point clé | À retenir |
|-----------|-----------|
| `useForm()` | Point d'entrée — retourne register, handleSubmit, formState |
| `register('name')` | Connecte un input (retourne name, onChange, onBlur, ref) |
| `handleSubmit(fn)` | Valide puis appelle fn avec les données typées |
| `zodResolver` | Connecte un schéma Zod pour la validation |
| `z.infer<typeof schema>` | Infère le type TypeScript depuis le schéma Zod |
| `watch` | Observe une valeur en temps réel (provoque un re-render) |
| `Controller` | Pour les composants UI qui n'acceptent pas ref |
| Performances | Quasi aucun re-render grâce aux refs internes |
| Entretien | Sujet incontournable : controlled vs uncontrolled, pourquoi RHF |

---

> **Prochain cours** : [Cours 23 — Patterns de formulaires avancés](./03-patterns-formulaires-avances.md)
