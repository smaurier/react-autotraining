# Cours 6 — Composants et composition

> **Objectif** : Savoir découper une interface en composants focalisés, communiquer entre composants via props et callbacks, organiser ses fichiers, et transposer les patterns Vue/Angular (emit, output) vers React.

---

## Rappel du cours précédent

<details>
<summary>1. Quel type TypeScript utilise-t-on pour la prop `children` ?</summary>

`ReactNode` — c'est le type le plus large, il accepte du JSX, des strings, des nombres, `null`, `undefined`, des tableaux et des fragments.
</details>

<details>
<summary>2. Comment transmettre toutes les props HTML natives d'un `<button>` à un composant wrapper ?</summary>

On étend `ComponentPropsWithoutRef<"button">`, on destructure les props personnalisées et on spread le `...rest` sur le `<button>` natif.
</details>

<details>
<summary>3. Pourquoi `defaultProps` ne doit plus être utilisé en React 19 ?</summary>

`defaultProps` est supprimé pour les composants fonction en React 19. On utilise les valeurs par défaut dans le destructuring : `{ size = "md" }`.
</details>

---

## Analogie

Pensez à des **briques LEGO**. Chaque brique a une forme et une taille précises (son interface de props). Vous assemblez des petites briques pour former des structures plus grandes. En React, la composition remplace l'héritage : on **imbrique** des composants plutôt que de créer des hiérarchies de classes. C'est exactement comme en Vue avec les composants SFC ou en Angular avec les composants standalone — sauf que React pousse cette philosophie encore plus loin.

---

## Théorie

### 1. Composants fonction uniquement

En React 19 avec TypeScript, on utilise **exclusivement** des composants fonction. Les class components sont un vestige du passé.

```tsx
// ✅ Composant fonction — la seule façon de faire en 2025
function Greeting({ name }: { name: string }) {
  return <h1>Bonjour, {name}</h1>;
}

// ✅ Arrow function (même résultat, question de style)
const Greeting = ({ name }: { name: string }) => {
  return <h1>Bonjour, {name}</h1>;
};

// ❌ Class component — ne plus utiliser
class Greeting extends React.Component<{ name: string }> {
  render() {
    return <h1>Bonjour, {this.props.name}</h1>;
  }
}
```

> **Convention** : PascalCase pour les composants (`UserCard`, pas `userCard`). Le nom du fichier correspond au nom du composant.

### 2. Composition : petits composants focalisés

Le principe : **un composant fait une seule chose bien**.

```tsx
// ❌ Composant monolithique — difficile à maintenir et tester
function UserPage({ user }: { user: User }) {
  return (
    <div>
      <div className="avatar-section">
        <img src={user.avatar} alt={user.name} />
        <h2>{user.name}</h2>
        <span className="badge">{user.role}</span>
      </div>
      <div className="info-section">
        <p>Email: {user.email}</p>
        <p>Inscrit le: {user.createdAt.toLocaleDateString()}</p>
      </div>
      <ul className="skills-list">
        {user.skills.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </div>
  );
}

// ✅ Composé de petits composants réutilisables
function UserPage({ user }: { user: User }) {
  return (
    <div>
      <UserHeader name={user.name} avatar={user.avatar} role={user.role} />
      <UserInfo email={user.email} createdAt={user.createdAt} />
      <SkillList skills={user.skills} />
    </div>
  );
}
```

### 3. Lifting state up (remonter l'état)

Quand deux composants frères ont besoin de la même donnée, on remonte l'état dans leur **parent commun**.

```tsx
// ✅ L'état vit dans le parent, les enfants reçoivent et modifient via props
function TemperatureConverter() {
  const [celsius, setCelsius] = useState(0);

  const fahrenheit = celsius * 9 / 5 + 32;

  return (
    <div>
      <TemperatureInput
        label="Celsius"
        value={celsius}
        onChange={setCelsius}
      />
      <TemperatureInput
        label="Fahrenheit"
        value={fahrenheit}
        onChange={(f) => setCelsius((f - 32) * 5 / 9)}
      />
    </div>
  );
}

interface TemperatureInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function TemperatureInput({ label, value, onChange }: TemperatureInputProps) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
```

> **En Vue**, on utiliserait `v-model` avec `defineModel()`. **En Angular**, un service partagé ou un signal. **En React**, le state vit dans le parent et descend via props.

### 4. Props callback : communication enfant → parent

C'est le seul mécanisme natif React pour remonter une information :

```tsx
// Parent
function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);

  const handleAddTodo = (text: string) => {
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
  };

  const handleToggle = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  return (
    <>
      <AddTodoForm onAdd={handleAddTodo} />
      <TodoList todos={todos} onToggle={handleToggle} />
    </>
  );
}

// Enfant — appelle la callback du parent
interface AddTodoFormProps {
  onAdd: (text: string) => void;
}

function AddTodoForm({ onAdd }: AddTodoFormProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim());
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button type="submit">Ajouter</button>
    </form>
  );
}
```

### 5. Comparaison : emit/output vs callback props

| Aspect                    | Vue 3                          | Angular 19+                    | React                        |
|---------------------------|--------------------------------|--------------------------------|------------------------------|
| Enfant → parent           | `emit("update", value)`        | `output<string>()`             | `onUpdate(value)` (callback) |
| Déclarer l'émission       | `defineEmits<{...}>()`         | `update = output<string>()`    | `onUpdate: (v: string) => void` |
| Écouter depuis le parent  | `@update="handler"`            | `(update)="handler($event)"`  | `onUpdate={handler}`          |
| Validation                | Runtime + optionnel            | Implicite via le type          | TypeScript strict             |

```tsx
// Vue 3
const emit = defineEmits<{ update: [value: string] }>();
emit("update", "nouvelle valeur");

// Angular 19
update = output<string>();
this.update.emit("nouvelle valeur");

// React — pas de système d'événements, juste une fonction
interface ChildProps {
  onUpdate: (value: string) => void;
}
function Child({ onUpdate }: ChildProps) {
  onUpdate("nouvelle valeur");
}
```

> **Avantage React** : les callbacks sont typées statiquement. Pas de chaîne magique pour le nom de l'événement.

### 6. Organisation des fichiers

```
src/
├── components/
│   ├── ui/                    # Composants génériques réutilisables
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── index.ts       # export { default } from "./Button"
│   │   └── index.ts           # Barrel export
│   ├── features/              # Composants métier
│   │   └── Todo/
│   │       ├── TodoApp.tsx
│   │       ├── TodoList.tsx
│   │       ├── TodoItem.tsx
│   │       ├── AddTodoForm.tsx
│   │       └── index.ts
│   └── layout/                # Header, Footer, Sidebar…
├── hooks/                     # Custom hooks
├── types/                     # Types partagés
└── utils/                     # Fonctions utilitaires
```

> **Co-location** : gardez les fichiers liés ensemble. Le style, les tests et le composant dans le même dossier.

```tsx
// components/ui/index.ts — barrel export
export { default as Button } from "./Button";
export { default as Card } from "./Card";
export { default as Input } from "./Input";

// Utilisation propre
import { Button, Card, Input } from "@/components/ui";
```

---

## Pratique

### Exercice : liste de contacts avec ajout

Créez une mini-application avec trois composants :

1. **`ContactApp`** : gère la liste de contacts dans son state
2. **`ContactForm`** : formulaire pour ajouter un contact (nom + email), communique via callback
3. **`ContactList`** : affiche les contacts, chaque contact a un bouton "Supprimer" qui remonte l'id au parent

<details>
<summary>Voir la solution</summary>

```tsx
// types.ts
interface Contact {
  id: string;
  name: string;
  email: string;
}

// ContactApp.tsx
import { useState } from "react";
import ContactForm from "./ContactForm";
import ContactList from "./ContactList";

function ContactApp() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  const handleAdd = (name: string, email: string) => {
    setContacts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, email },
    ]);
  };

  const handleDelete = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div>
      <h1>Contacts ({contacts.length})</h1>
      <ContactForm onAdd={handleAdd} />
      <ContactList contacts={contacts} onDelete={handleDelete} />
    </div>
  );
}

export default ContactApp;

// ContactForm.tsx
import { useState } from "react";

interface ContactFormProps {
  onAdd: (name: string, email: string) => void;
}

function ContactForm({ onAdd }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      onAdd(name.trim(), email.trim());
      setName("");
      setEmail("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit">Ajouter</button>
    </form>
  );
}

export default ContactForm;

// ContactList.tsx
interface ContactListProps {
  contacts: Contact[];
  onDelete: (id: string) => void;
}

function ContactList({ contacts, onDelete }: ContactListProps) {
  if (contacts.length === 0) return <p>Aucun contact</p>;

  return (
    <ul>
      {contacts.map((contact) => (
        <li key={contact.id}>
          {contact.name} — {contact.email}
          <button onClick={() => onDelete(contact.id)}>Supprimer</button>
        </li>
      ))}
    </ul>
  );
}

export default ContactList;
```
</details>

---

## Résumé

| Concept                 | Ce qu'il faut retenir                                        |
|-------------------------|--------------------------------------------------------------|
| Composants fonction     | Seule forme utilisée — PascalCase, un fichier `.tsx` chacun  |
| Composition > héritage  | Imbriquer des composants, pas étendre des classes            |
| Lifting state up        | L'état vit dans le plus proche parent commun                 |
| Callback props          | `onAction: (data) => void` pour enfant → parent              |
| Organisation fichiers   | Co-location, barrel exports, séparation ui/features/layout   |

> **Prochain cours** : [Cours 7 — Rendu conditionnel et listes](./04-rendu-conditionnel-et-listes.md)
