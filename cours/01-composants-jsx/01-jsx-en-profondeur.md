# Cours 4 — JSX en profondeur

> **Objectif** : Comprendre que JSX n'est pas un langage de templates mais du JavaScript déguisé, maîtriser les expressions, le rendu conditionnel, les listes, et savoir transposer ses réflexes Vue/Angular vers JSX.

---

## Rappel du cours précédent

<details>
<summary>1. Quelle commande crée un projet React + TypeScript avec Vite ?</summary>

```bash
npm create vite@latest mon-app -- --template react-ts
```
</details>

<details>
<summary>2. Quel est le point d'entrée d'une application React ?</summary>

Le fichier `main.tsx` appelle `ReactDOM.createRoot(document.getElementById('root')!).render(<App />)` pour monter le composant racine dans le DOM.
</details>

<details>
<summary>3. Quelle est la différence fondamentale entre le modèle mental de React et celui de Vue/Angular ?</summary>

React adopte un flux **unidirectionnel** : `UI = f(state)`. Chaque changement d'état provoque un nouveau rendu. Vue et Angular utilisent un système de réactivité bidirectionnelle (data-binding) et de détection de changements.
</details>

---

## Analogie

Imaginez un **moteur de rendu de mail-merge** : vous écrivez un modèle de lettre avec des `{champs}` et le moteur remplace chaque champ par sa valeur. JSX fonctionne de la même manière — c'est du JavaScript avec des `{}` qui injectent des valeurs. La différence avec un template Vue/Angular ? Ici, **tout ce qui est entre `{}` est une expression JavaScript valide**, pas un mini-langage spécifique.

---

## Théorie

### 1. JSX = expressions JavaScript

JSX est transformé par le compilateur en appels `React.createElement()` (ou en `_jsx()` avec le nouveau transform). Ce n'est **pas** du HTML.

```tsx
// Ce que vous écrivez :
const element = <h1 className="title">Bonjour</h1>;

// Ce que le compilateur produit :
const element = _jsx("h1", { className: "title", children: "Bonjour" });
```

> **Règle d'or** : entre `{}`, vous pouvez mettre **toute expression** JavaScript — mais pas de *statement* (`if`, `for`, `while`, `switch`).

### 2. Expressions vs statements

```tsx
// ✅ Expression — fonctionne dans JSX
<p>{user.age >= 18 ? "Majeur" : "Mineur"}</p>

// ❌ Statement — ne compile PAS
<p>{if (user.age >= 18) { return "Majeur" }}</p>
```

| Concept    | Exemple                     | Utilisable dans JSX ? |
|------------|-----------------------------|-----------------------|
| Ternaire   | `a ? b : c`                | ✅                    |
| `&&`       | `isOk && <Tag />`          | ✅                    |
| `if/else`  | `if (x) { ... }`           | ❌ (statement)        |
| `.map()`   | `arr.map(fn)`              | ✅ (retourne un array)|
| `for`      | `for (let i …)`            | ❌ (statement)        |

### 3. Attributs HTML → props JSX

| HTML            | JSX              | Pourquoi ?                              |
|-----------------|------------------|-----------------------------------------|
| `class`         | `className`      | `class` est un mot réservé en JS        |
| `for`           | `htmlFor`        | `for` est un mot réservé en JS          |
| `style="..."`   | `style={{}}`     | Objet JS, pas chaîne CSS               |
| `tabindex`      | `tabIndex`       | camelCase systématique                  |

```tsx
// ✅ Style en objet JavaScript
<div style={{ backgroundColor: "#f0f0f0", padding: "1rem" }}>
  Contenu
</div>

// ❌ Style en chaîne (ne fonctionne PAS comme en HTML)
<div style="background-color: #f0f0f0">Contenu</div>
```

### 4. Fragments `<> </>`

Un composant doit retourner **un seul élément racine**. Les fragments évitent de polluer le DOM :

```tsx
// ✅ Fragment court
function UserInfo() {
  return (
    <>
      <h2>Jean Dupont</h2>
      <p>Développeur</p>
    </>
  );
}

// ✅ Fragment avec key (nécessaire dans les listes)
import { Fragment } from "react";

items.map((item) => (
  <Fragment key={item.id}>
    <dt>{item.label}</dt>
    <dd>{item.value}</dd>
  </Fragment>
));
```

> **Comparaison** : Vue a `<template>` (pas de nœud DOM), Angular a `<ng-container>`. En React, `<> </>` joue le même rôle.

### 5. Rendu conditionnel

```tsx
// Pattern 1 : ternaire (deux branches)
{isLoggedIn ? <Dashboard /> : <Login />}

// Pattern 2 : && (une seule branche)
{hasNotifications && <Badge count={notifications.length} />}

// ⚠️ Piège classique avec && et les nombres
{count && <p>Résultats : {count}</p>}
// Si count === 0 → affiche "0" dans le DOM !

// ✅ Correction
{count > 0 && <p>Résultats : {count}</p>}

// Pattern 3 : early return (garde)
function ProtectedPage({ user }: { user: User | null }) {
  if (!user) return <p>Accès refusé</p>;

  return <Dashboard user={user} />;
}
```

### 6. Listes avec `.map()` et `key`

```tsx
interface Task {
  id: string;
  title: string;
  done: boolean;
}

function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          {task.done ? "✓" : "○"} {task.title}
        </li>
      ))}
    </ul>
  );
}
```

> **Pourquoi `key` ?** React utilise la `key` pour identifier quel élément a changé, a été ajouté ou supprimé. Sans `key` stable, React recrée tous les nœuds DOM à chaque rendu.

```tsx
// ❌ Index comme key — à éviter si la liste peut changer d'ordre
{tasks.map((task, index) => <li key={index}>{task.title}</li>)}

// ✅ Identifiant unique et stable
{tasks.map((task) => <li key={task.id}>{task.title}</li>)}
```

### 7. Comparaison : templates Vue/Angular vs JSX

| Fonctionnalité     | Vue 3                 | Angular 19+             | React (JSX)                |
|--------------------|-----------------------|-------------------------|----------------------------|
| Affichage variable | `{{ value }}`         | `{{ value }}`           | `{value}`                  |
| Condition          | `v-if` / `v-else`     | `@if { } @else { }`    | Ternaire / `&&` / early return |
| Boucle             | `v-for="item in list"`| `@for (item of list)`   | `list.map(item => ...)`   |
| Attribut dynamique | `:class="..."`        | `[class]="..."`         | `className={...}`          |
| Fragment           | `<template>`          | `<ng-container>`        | `<> </>`                   |

**L'avantage JSX** : pas de DSL à apprendre. Si vous connaissez JavaScript, vous connaissez JSX.

**L'inconvénient** : la logique de rendu est mélangée avec le markup — d'où l'importance de découper en petits composants.

---

## Pratique

### Exercice : carte de profil dynamique

Créez un composant `ProfileCard` qui affiche :
- Le nom et le rôle de l'utilisateur
- Un badge "Admin" uniquement si `isAdmin` est `true`
- La liste de ses compétences (tableau de strings)
- Un message "Aucune compétence" si le tableau est vide

```tsx
interface ProfileCardProps {
  name: string;
  role: string;
  isAdmin: boolean;
  skills: string[];
}
```

<details>
<summary>Voir la solution</summary>

```tsx
interface ProfileCardProps {
  name: string;
  role: string;
  isAdmin: boolean;
  skills: string[];
}

function ProfileCard({ name, role, isAdmin, skills }: ProfileCardProps) {
  if (!name) return <p>Profil introuvable</p>;

  return (
    <div className="profile-card" style={{ padding: "1rem", border: "1px solid #ccc" }}>
      <h2>
        {name} {isAdmin && <span className="badge">Admin</span>}
      </h2>
      <p>{role}</p>

      <h3>Compétences</h3>
      {skills.length > 0 ? (
        <ul>
          {skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      ) : (
        <p>Aucune compétence renseignée</p>
      )}
    </div>
  );
}

export default ProfileCard;
```
</details>

---

## Résumé

| Concept                | Ce qu'il faut retenir                                      |
|------------------------|------------------------------------------------------------|
| JSX                    | Du JavaScript, pas un template — `{}` pour les expressions |
| `className` / `htmlFor`| Noms JS, pas HTML                                         |
| `style={{}}`           | Objet JS avec camelCase                                    |
| Fragments `<> </>`     | Évitent un wrapper DOM inutile                             |
| Rendu conditionnel     | Ternaire, `&&` (attention au `0`), early return            |
| Listes                 | `.map()` + `key` stable et unique                          |

> **Prochain cours** : [Cours 5 — Props et children](./02-props-et-children.md)
