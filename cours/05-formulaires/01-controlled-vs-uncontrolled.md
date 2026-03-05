# Cours 21 — Formulaires : controlled vs uncontrolled

> **Objectif** : Comprendre les deux approches de gestion des formulaires en React — controlled (avec `useState` + `onChange`) et uncontrolled (avec `useRef` + `defaultValue`). Maîtriser les patterns de soumission, le traitement de plusieurs inputs, et faire le parallèle avec `v-model` (Vue), `ngModel` et les Reactive Forms (Angular).

---

## Rappel du cours précédent

<details>
<summary>1. Comment protéger une route en React sans guards natifs ?</summary>

Avec un composant wrapper qui vérifie l'authentification : s'il y a un utilisateur connecté, il rend `<Outlet />` ; sinon, il rend `<Navigate to="/login" />` pour rediriger.
</details>

<details>
<summary>2. À quoi sert React.lazy et avec quel composant doit-il être combiné ?</summary>

`React.lazy(() => import('./MonComposant'))` permet le code splitting — le composant n'est chargé que quand il est affiché. Il doit être enveloppé dans un `<Suspense fallback={...}>` qui affiche un fallback pendant le chargement.
</details>

<details>
<summary>3. Quel est l'avantage du lazy loading par route ?</summary>

Il réduit la taille du bundle initial en découpant l'application en chunks par page. Seul le code de la page visitée est téléchargé, les autres pages sont chargées à la demande.
</details>

---

## Analogie

Imaginez deux types de pupitres dans une salle de classe. Le **pupitre connecté** (controlled) a un écran central : chaque lettre tapée par l'élève est immédiatement transmise au professeur qui la valide et la renvoie à l'écran. Le professeur sait à tout moment ce que contient le pupitre. Le **pupitre autonome** (uncontrolled) est un simple cahier : l'élève écrit librement, et le professeur ne lit le contenu que quand l'élève lève la main (soumission du formulaire).

---

## Théorie

### Controlled components — l'approche React

Un composant controlled a sa valeur gérée par React (via `useState`). Chaque frappe clavier passe par le state :

```tsx
import { useState } from 'react';

function ControlledInput() {
  const [name, setName] = useState('');

  return (
    <div>
      {/* ✅ Controlled : React est la "source de vérité" */}
      <input
        type="text"
        value={name}                         // La valeur vient du state
        onChange={(e) => setName(e.target.value)}  // Chaque frappe met à jour le state
      />
      <p>Bonjour, {name} !</p>
    </div>
  );
}
```

**Cycle complet** :
1. L'utilisateur tape « A »
2. `onChange` se déclenche avec `e.target.value = "A"`
3. `setName("A")` met à jour le state
4. React re-rend le composant avec `value="A"`

### Uncontrolled components — l'approche DOM

Un composant uncontrolled laisse le DOM gérer sa propre valeur. On lit la valeur via une ref :

```tsx
import { useRef, type FormEvent } from 'react';

function UncontrolledInput() {
  const nameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // ✅ On lit la valeur du DOM au moment de la soumission
    const name = nameRef.current?.value ?? '';
    console.log('Soumis :', name);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        ref={nameRef}           // Référence au noeud DOM
        defaultValue=""         // Valeur initiale (pas value !)
      />
      <button type="submit">Envoyer</button>
    </form>
  );
}
```

### Quand utiliser lequel ?

| Critère | Controlled | Uncontrolled |
|---------|------------|--------------|
| Validation en temps réel | ✅ À chaque frappe | ❌ Seulement à la soumission |
| Formatage dynamique | ✅ (masques, uppercase...) | ❌ |
| Valeur affichée ailleurs | ✅ Toujours synchronisée | ❌ Pas accessible sans ref |
| Performance | ❌ Re-render à chaque frappe | ✅ Pas de re-render |
| Formulaires simples | Surdimensionné | ✅ Plus simple |
| React Hook Form | Compatible | ✅ Utilisé en interne |
| Cas d'usage courant | La majorité des formulaires React | Uploads de fichier, intégrations tierces |

### Patterns de soumission

#### Pattern 1 : FormData (moderne et simple)

```tsx
function ContactForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
    };
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Nom" required />
      <input name="email" type="email" placeholder="Email" required />
      <textarea name="message" placeholder="Message" required />
      <button type="submit">Envoyer</button>
    </form>
  );
}
```

#### Pattern 2 : Object.fromEntries (encore plus concis)

```tsx
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget));
  console.log(data);  // { name: "Alice", email: "alice@mail.com", message: "..." }
};
```

#### Pattern 3 : Controlled avec un seul handler

```tsx
// ❌ Un handler par champ — verbeux
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');

<input value={name} onChange={(e) => setName(e.target.value)} />
<input value={email} onChange={(e) => setEmail(e.target.value)} />
<input value={phone} onChange={(e) => setPhone(e.target.value)} />
```

```tsx
// ✅ Un seul state objet + computed property name
interface FormData {
  name: string;
  email: string;
  phone: string;
}

function ContactForm() {
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
  });

  // ✅ Un seul handler pour tous les champs grâce à [name]
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" />
      <input name="email" value={form.email} onChange={handleChange} placeholder="Email" />
      <input name="phone" value={form.phone} onChange={handleChange} placeholder="Téléphone" />
      <button type="submit">Envoyer</button>
    </form>
  );
}
```

### Types d'inputs spéciaux

#### Checkbox

```tsx
const [accepted, setAccepted] = useState(false);

<input
  type="checkbox"
  checked={accepted}            // ✅ checked, pas value
  onChange={(e) => setAccepted(e.target.checked)}  // ✅ e.target.checked
/>
```

#### Select

```tsx
const [country, setCountry] = useState('fr');

<select value={country} onChange={(e) => setCountry(e.target.value)}>
  <option value="fr">France</option>
  <option value="be">Belgique</option>
  <option value="ch">Suisse</option>
</select>
```

#### Textarea

```tsx
const [bio, setBio] = useState('');

// ✅ En React, textarea utilise value (pas de contenu entre les balises)
<textarea value={bio} onChange={(e) => setBio(e.target.value)} />

// ❌ Pas comme en HTML classique
<textarea>contenu ici</textarea>
```

### Validation basique côté client

```tsx
function RegistrationForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.email.includes('@')) {
      newErrors.email = 'Email invalide';
    }
    if (form.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log('Formulaire valide :', form);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Effacer l'erreur quand l'utilisateur corrige
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" />
        {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
      </div>
      <div>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Mot de passe"
        />
        {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
      </div>
      <button type="submit">S'inscrire</button>
    </form>
  );
}
```

### Comparaison avec Vue 3 et Angular

| Concept | React | Vue 3 | Angular |
|---------|-------|-------|---------|
| Binding bidirectionnel | `value` + `onChange` (manuel) | `v-model` (magique) | `[(ngModel)]` ou `formControl` |
| State du formulaire | `useState` | `ref()` / `reactive()` | `FormGroup` / `FormControl` |
| Ref DOM | `useRef` | `ref` template | `@ViewChild` |
| Validation | Manuelle ou librairie (Zod) | Manuelle ou VeeValidate | Validators intégrés |
| Soumission | `onSubmit` + `e.preventDefault()` | `@submit.prevent` | `(ngSubmit)` |
| Checkbox | `checked` + `onChange` | `v-model` (auto) | `[(ngModel)]` ou `formControl` |

```vue
<!-- Vue 3 — v-model fait TOUT automatiquement -->
<script setup>
import { ref } from 'vue'
const name = ref('')
const email = ref('')
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="name" placeholder="Nom" />
    <input v-model="email" placeholder="Email" />
    <button type="submit">Envoyer</button>
  </form>
</template>
```

```typescript
// Angular — Reactive Forms
@Component({
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="name" />
      <input formControlName="email" />
      <button type="submit">Envoyer</button>
    </form>
  `,
})
export class ContactFormComponent {
  form = inject(FormBuilder).group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });
}
```

> **Point clé** : React n'a pas de `v-model`. Le binding bidirectionnel est **toujours explicite** (`value` + `onChange`). C'est plus verbeux mais plus explicite — vous voyez exactement ce qui se passe.

---

## Pratique

Créez un formulaire d'inscription avec :

1. Champs : nom, email, mot de passe, confirmation du mot de passe, acceptation des CGU (checkbox)
2. Un seul state objet et un seul handler `handleChange`
3. Validation : email valide, mot de passe >= 8 caractères, mots de passe identiques, CGU acceptées
4. Affichage des erreurs sous chaque champ
5. Bouton désactivé tant que des erreurs existent

<details>
<summary>Solution</summary>

```tsx
import { useState } from 'react';

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptCGU: boolean;
}

function RegistrationForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptCGU: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = 'Le nom est requis';
    if (!form.email.includes('@')) e.email = 'Email invalide';
    if (form.password.length < 8) e.password = 'Minimum 8 caractères';
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    if (!form.acceptCGU) e.acceptCGU = 'Vous devez accepter les CGU';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setSubmitted(true);
      console.log('Inscription :', form);
    }
  };

  if (submitted) return <p>Inscription réussie !</p>;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Nom" />
        {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
      </div>
      <div>
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" />
        {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
      </div>
      <div>
        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Mot de passe" />
        {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
      </div>
      <div>
        <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Confirmer" />
        {errors.confirmPassword && <span style={{ color: 'red' }}>{errors.confirmPassword}</span>}
      </div>
      <div>
        <label>
          <input name="acceptCGU" type="checkbox" checked={form.acceptCGU} onChange={handleChange} />
          J'accepte les CGU
        </label>
        {errors.acceptCGU && <span style={{ color: 'red' }}>{errors.acceptCGU}</span>}
      </div>
      <button type="submit">S'inscrire</button>
    </form>
  );
}
```
</details>

---

## Résumé

| Point clé | À retenir |
|-----------|-----------|
| Controlled | `value` + `onChange` — React contrôle la valeur à chaque instant |
| Uncontrolled | `ref` + `defaultValue` — le DOM gère la valeur |
| `FormData` | API native pour lire les valeurs au moment de la soumission |
| Handler unique | `[name]: value` (computed property name) pour tous les champs |
| Checkbox | `checked` + `e.target.checked` (pas `value`) |
| Textarea/Select | Même pattern controlled que `input` |
| Pas de v-model | React est explicite : le binding bidirectionnel est toujours manuel |
| Validation | Manuelle en React natif, ou avec Zod / React Hook Form |

---

> **Prochain cours** : [Cours 22 — React Hook Form : formulaires performants](./02-react-hook-form.md)
