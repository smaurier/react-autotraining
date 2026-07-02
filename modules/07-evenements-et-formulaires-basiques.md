---
titre: Événements et formulaires basiques
cours: 04-react
notions: [événements JSX en camelCase, handler comme référence de fonction, SyntheticEvent, types d'événements typés TypeScript, preventDefault et stopPropagation, propagation et bubbling, onSubmit sur un formulaire, onChange sur un input, formulaires non-contrôlés avec useRef et FormData, teaser input contrôlé vers useState]
outcomes: [attacher des gestionnaires d'événements typés en JSX, empêcher le rechargement d'un formulaire avec preventDefault, lire les valeurs d'un formulaire non-contrôlé via FormData ou useRef]
prerequis: [06-rendu-conditionnel-et-listes]
next: 08-usestate
libs: [{ name: react, version: "^19" }]
tribuzen: mini-formulaire d'invitation (email) de l'admin TribuZen — onSubmit + onChange sans état, terrain préparé pour useState
last-reviewed: 2026-07
---

# Événements et formulaires basiques

> **Outcomes — tu sauras FAIRE :** attacher des gestionnaires d'événements typés en JSX, empêcher le rechargement d'un formulaire avec `preventDefault`, lire les valeurs d'un formulaire non-contrôlé via `FormData` ou `useRef`.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, tu dois ajouter un petit formulaire pour inviter un membre par email. Un collègue a bricolé ça :

```tsx
// InviteForm.tsx — AVANT (trois bugs)
function InviteForm() {
  return (
    <form onSubmit={sendInvite()}>
      <input type="email" name="email" />
      <button onClick="submit">Inviter</button>
    </form>
  );
}
```

**Trois problèmes immédiats :**
1. `onSubmit={sendInvite()}` **appelle** `sendInvite` pendant le rendu au lieu de passer la fonction — l'invitation part toute seule, avant même le clic.
2. `onClick="submit"` passe une **chaîne** — en JSX un handler doit être une **fonction**, pas du texte comme en HTML.
3. Rien n'appelle `preventDefault()` : au submit, le navigateur **recharge la page** et la SPA React se réinitialise.

Ce module te donne les outils pour attacher correctement des événements et lire un formulaire — sans encore toucher à `useState` (c'est le module suivant).

---

## 2. Théorie complète, concise

### 2.1 Un événement JSX = camelCase + une fonction

En JSX, les événements DOM sont nommés en **camelCase** (`onClick`, `onChange`, `onSubmit`) et reçoivent une **référence de fonction**, jamais une chaîne ni un appel.

```tsx
// ✅ On passe la fonction (référence) — React l'appellera au clic
<button onClick={handleClick}>Cliquer</button>

// ❌ Appel immédiat : s'exécute PENDANT le rendu, pas au clic
<button onClick={handleClick()}>Cliquer</button>

// ❌ Chaîne (réflexe HTML) : ne fait rien d'utile en JSX
<button onClick="handleClick">Cliquer</button>

// ✅ Besoin de passer un argument → on enveloppe dans une arrow function
<button onClick={() => handleDelete(item.id)}>Supprimer</button>
```

**Comparaison inter-frameworks :**

| Framework | Syntaxe |
|-----------|---------|
| Vue 3 | `@click="handleClick"` |
| Angular | `(click)="handleClick()"` |
| React | `onClick={handleClick}` |

### 2.2 Le SyntheticEvent

React n'expose pas directement l'événement natif du navigateur : il l'enveloppe dans un **SyntheticEvent**. C'est une couche cross-browser qui présente **la même API** partout (`preventDefault`, `stopPropagation`, `target`, `currentTarget`), ce qui gomme les différences entre moteurs.

```tsx
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();   // annule le comportement par défaut du navigateur
  e.stopPropagation();  // stoppe la remontée vers les parents
  console.log(e.clientX, e.clientY);

  // Si besoin de l'événement natif brut :
  const native = e.nativeEvent;
};
```

> Avant React 17, les SyntheticEvent étaient « recyclés » (pooling) : lire `e.target` de façon asynchrone renvoyait `null`. Ce pooling a été **supprimé** depuis React 17 — en React 19, tu peux garder une référence à l'événement sans surprise.

### 2.3 Typer les événements avec TypeScript

À chaque catégorie d'événement correspond un type générique React, paramétré par l'élément DOM concerné :

```tsx
function EventTypes() {
  // Clic / souris — le générique = l'élément qui porte le handler
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {};

  // Saisie dans un champ — input, select, textarea
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  // Soumission de formulaire
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  // Clavier
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') console.log('Entrée');
  };

  // Focus / blur
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log('quitté', e.target.value);
  };

  return (
    <form onSubmit={onSubmit}>
      <input onChange={onChange} onKeyDown={onKeyDown} onBlur={onBlur} />
      <button onClick={onClick}>Envoyer</button>
    </form>
  );
}
```

> **Astuce d'inférence :** écris d'abord le handler *inline* (`onChange={(e) => {}}`), survole `e` dans l'IDE, TypeScript t'affiche le type exact (`React.ChangeEvent<HTMLInputElement>`). Tu peux ensuite l'extraire en fonction nommée avec ce type.

### 2.4 `target` vs `currentTarget`

Deux propriétés proches, à ne pas confondre :

- `e.currentTarget` = l'élément **qui porte le handler** (typé précisément par le générique).
- `e.target` = l'élément **d'origine** du clic, potentiellement un enfant.

```tsx
<div onClick={(e) => {
  // currentTarget = toujours le <div>
  // target = ce qui a réellement été cliqué (peut être le <button> interne)
  console.log(e.currentTarget === e.target);
}}>
  <button>enfant</button>
</div>
```

### 2.5 Propagation (bubbling) et `stopPropagation`

Comme dans le DOM, un événement **remonte** de l'enfant vers les parents (phase de *bubbling*). Un clic sur un bouton interne déclenche aussi le `onClick` du conteneur.

```tsx
<div onClick={() => console.log('parent')}>
  <button onClick={(e) => {
    e.stopPropagation();      // sans ça, 'parent' se logge aussi
    console.log('bouton seul');
  }}>
    Cliquer
  </button>
</div>
```

`stopPropagation()` empêche la remontée. À distinguer de `preventDefault()` qui, lui, annule l'**action par défaut du navigateur** (recharger la page sur submit, suivre un lien, cocher une case…). Les deux sont indépendants.

### 2.6 `onSubmit` et `preventDefault` : le réflexe formulaire

Un `<form>` natif, quand on le soumet (bouton `type="submit"` **ou** touche Entrée dans un champ), **recharge la page** par défaut. Dans une SPA React, c'est fatal : tout l'état est perdu. On intercepte donc toujours avec `preventDefault()`.

```tsx
function BasicForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();            // ← sans ça, rechargement complet
    console.log('soumis sans reload');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" />
      <button type="submit">Envoyer</button>
    </form>
  );
}
```

> Mets le handler sur `<form onSubmit>`, **pas** sur `<button onClick>`. Ainsi la soumission au clavier (Entrée) fonctionne aussi, et l'accessibilité est respectée.

### 2.7 Lire un formulaire SANS état : `FormData`

Tant qu'on n'a pas besoin de réagir à **chaque frappe**, inutile de stocker la valeur : on la lit **au moment du submit**. L'API web `FormData` lit tous les champs nommés d'un coup — c'est l'approche la plus simple, zéro `useState`.

```tsx
function InviteForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget); // le <form>
    const email = data.get('email');            // clé = attribut name=""
    console.log('inviter', email);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* le name="" est indispensable pour que FormData voie le champ */}
      <input name="email" type="email" required />
      <button type="submit">Inviter</button>
    </form>
  );
}
```

Points clés : chaque champ a un attribut **`name`**, `FormData` se construit depuis `e.currentTarget`, `data.get('name')` renvoie la valeur (typée `FormDataEntryValue | null`).

### 2.8 Lire un champ ciblé : `useRef` (non-contrôlé)

Pour accéder à **un** champ précis sans passer par l'état, on garde une référence directe au nœud DOM avec `useRef`. Le champ reste **non-contrôlé** : c'est le DOM qui détient la valeur.

```tsx
import { useRef } from 'react';

function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = inputRef.current?.value ?? '';
    console.log('recherche', query);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* defaultValue (pas value) pour un champ non-contrôlé */}
      <input ref={inputRef} type="search" defaultValue="" placeholder="Rechercher…" />
      <button type="submit">Chercher</button>
    </form>
  );
}
```

> **`defaultValue`, pas `value`** : sur un champ non-contrôlé, `value={...}` figerait la saisie (input en lecture seule). `defaultValue` donne juste la valeur *initiale*, puis laisse le DOM libre.

### 2.9 Teaser : le champ contrôlé (module 08)

L'autre approche — piloter la valeur du champ par un état React à **chaque frappe** — s'appelle le **champ contrôlé**. Elle exige `useState`, donc c'est le sujet du prochain module. Aperçu pour reconnaître le pattern :

```tsx
// ⚠️ Nécessite useState → détaillé au module 08-usestate
const [email, setEmail] = useState('');

<input
  value={email}                              // valeur pilotée par l'état
  onChange={(e) => setEmail(e.target.value)} // état mis à jour à chaque frappe
/>
```

Repère mental pour ce module-ci :

| | Non-contrôlé (ce module) | Contrôlé (module 08) |
|---|---|---|
| Source de vérité | le DOM | l'état React |
| Lecture | au submit (`FormData` / `ref`) | à chaque frappe (`onChange`) |
| Besoin de `useState` | non | oui |
| Bon pour | formulaire simple, submit ponctuel | validation live, champs interdépendants |

---

## 3. Worked examples

### Exemple 1 — Corriger le formulaire d'invitation TribuZen

On repart du cas concret et on corrige les trois bugs, en version non-contrôlée `FormData`.

```tsx
// InviteForm.tsx — APRÈS
function InviteForm() {
  // Bug 3 corrigé : on intercepte le submit et on bloque le reload
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Lecture de tous les champs nommés, sans aucun état
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '').trim();

    if (!email) return;            // garde simple : champ vide → on sort
    console.log('Invitation envoyée à', email);
    e.currentTarget.reset();       // vide le formulaire après envoi
  };

  return (
    // Bug 1 corrigé : on PASSE la fonction, sans parenthèses
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email du membre</label>
      <input id="email" name="email" type="email" required />

      {/* Bug 2 corrigé : type="submit", pas de onClick="..." en chaîne */}
      <button type="submit">Inviter</button>
    </form>
  );
}

export default InviteForm;
```

**Pourquoi ce corrigé est correct :**
- `onSubmit={handleSubmit}` passe la **référence** — React appelle la fonction au bon moment.
- `e.preventDefault()` empêche le rechargement : la SPA reste vivante.
- `FormData(e.currentTarget)` + `data.get('email')` lit la valeur **sans `useState`** — la source de vérité reste le DOM.
- Le champ a un `name="email"` (sinon `FormData` ne le voit pas) et un `id` relié au `<label htmlFor>` pour l'accessibilité.

### Exemple 2 — Bouton « stop » dans une ligne cliquable

Cas de propagation fréquent dans l'admin : une ligne de membre entière est cliquable (ouvre le profil), mais elle contient un bouton « Supprimer » qui ne doit **pas** ouvrir le profil.

```tsx
interface MemberRowProps {
  id: string;
  name: string;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}

function MemberRow({ id, name, onOpen, onRemove }: MemberRowProps) {
  return (
    <div
      onClick={() => onOpen(id)}                 // clic sur la ligne → profil
      style={{ display: 'flex', cursor: 'pointer' }}
    >
      <span>{name}</span>

      <button
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();  // ← sans ça, onOpen(id) partirait aussi
          onRemove(id);
        }}
      >
        Supprimer
      </button>
    </div>
  );
}
```

**Ce que ça montre :** `stopPropagation()` isole l'action du bouton de celle du conteneur. Sans lui, cliquer « Supprimer » déclencherait `onRemove` **puis** `onOpen` (bubbling). `preventDefault()` serait ici inutile : aucun comportement navigateur par défaut n'est en jeu, seulement de la propagation.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Appeler le handler au lieu de le passer

```tsx
// ❌ handleSubmit() s'exécute pendant le rendu — l'action part sans clic,
//    et souvent en boucle si elle déclenche un re-render.
<form onSubmit={handleSubmit()}>

// ✅ On passe la référence ; React l'appelle à la soumission
<form onSubmit={handleSubmit}>

// ✅ Argument nécessaire ? On enveloppe dans une arrow
<button onClick={() => handleDelete(id)}>Supprimer</button>
```

**Règle :** un handler s'écrit sans `()`. Les `()` = « exécute maintenant ».

### PIÈGE #2 — Oublier `preventDefault` sur `onSubmit`

```tsx
// ❌ La page se recharge, l'état React est perdu, le console.log « clignote »
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  console.log('soumis');
};

// ✅ Bloquer le comportement par défaut EN PREMIER
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  console.log('soumis');
};
```

**Symptôme typique :** « mon formulaire recharge la page / l'URL se remplit de `?email=...` ». C'est un `preventDefault` manquant.

### PIÈGE #3 — Confondre `preventDefault` et `stopPropagation`

```tsx
// preventDefault → annule l'action NAVIGATEUR (reload, suivre un lien…)
// stopPropagation → stoppe la REMONTÉE vers les parents
// Ce sont deux choses indépendantes ; l'un ne remplace pas l'autre.
```

Sur un `<form>`, tu veux `preventDefault` (pas de reload). Sur un bouton interne à une zone cliquable, tu veux `stopPropagation` (pas d'action parent). Parfois les deux.

### PIÈGE #4 — `FormData` sur un champ sans `name`

```tsx
// ❌ Pas de name → FormData ne voit rien, data.get('email') = null
<input id="email" type="email" />

// ✅ name="" est la clé lue par FormData.get()
<input id="email" name="email" type="email" />
```

L'attribut `id` sert au `<label htmlFor>` ; c'est **`name`** (pas `id`) que `FormData` utilise comme clé.

### PIÈGE #5 — `value` sans `onChange` sur un champ

```tsx
// ❌ value fige le champ (contrôlé sans moyen de changer l'état) → saisie bloquée
//    + warning React « provide onChange or use defaultValue »
<input value="" />

// ✅ Non-contrôlé : defaultValue laisse le DOM gérer la frappe
<input defaultValue="" />

// ✅ Contrôlé : value + onChange ensemble (→ module 08, nécessite useState)
```

Tant que `useState` n'est pas vu, reste en non-contrôlé : `defaultValue`, jamais `value` seul.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, ce module couvre tous les **formulaires simples à soumission ponctuelle**, avant l'arrivée de l'état local.

**`InviteForm`** (`src/features/members/InviteForm.tsx`) — le mini-formulaire d'invitation par email, cœur du cas concret. Un seul champ, lu en `FormData` au submit, `preventDefault` obligatoire. Aucun `useState` : tant qu'on ne fait pas de validation live, le DOM suffit comme source de vérité.

**`MemberRow`** (`src/features/members/MemberRow.tsx`) — les lignes de la liste de membres : ligne cliquable (ouvre le panneau profil) contenant des boutons d'action (`Supprimer`, `Promouvoir`). C'est le cas d'école du `stopPropagation` de l'Exemple 2.

**Barres de recherche / filtres** (`src/features/members/MemberSearchBar.tsx`) — champ `useRef` non-contrôlé, lu au submit. On branchera plus tard un filtrage temps réel (contrôlé) quand `useState` sera acquis.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  features/
    members/
      InviteForm.tsx        # onSubmit + FormData, sans état
      MemberRow.tsx         # stopPropagation sur bouton interne
      MemberSearchBar.tsx   # useRef non-contrôlé
```

> **Étape suivante (module 08) :** `InviteForm` évoluera vers un champ **contrôlé** (`value` + `onChange` + `useState`) pour valider l'email en direct et désactiver le bouton tant qu'il est invalide. Le squelette événementiel écrit ici ne bougera pas — seul l'état s'ajoutera par-dessus.

---

## 6. Points clés

1. Un événement JSX se nomme en camelCase (`onClick`, `onSubmit`) et reçoit une **référence de fonction** — jamais un appel `handler()` ni une chaîne.
2. React enveloppe l'événement natif dans un **SyntheticEvent** cross-browser ; le pooling a disparu depuis React 17.
3. On type les handlers avec les génériques React : `React.MouseEvent<T>`, `React.ChangeEvent<T>`, `React.FormEvent<T>`, `T` = l'élément qui porte le handler.
4. `preventDefault()` annule l'action par défaut du navigateur (reload au submit) ; `stopPropagation()` stoppe la remontée vers les parents — deux choses **indépendantes**.
5. Sur un `<form>`, on met `onSubmit` + `preventDefault` (pas `onClick` sur le bouton) pour gérer aussi la touche Entrée.
6. Sans besoin de réagir à chaque frappe, on lit le formulaire au submit : `new FormData(e.currentTarget)` (champs avec `name`) ou `useRef` pour un champ ciblé — **zéro `useState`**.
7. Champ non-contrôlé = `defaultValue` (le DOM détient la valeur) ; champ contrôlé = `value` + `onChange` + `useState`, réservé au module 08.

---

## 7. Seeds Anki

```
En JSX, que passe-t-on à un attribut d'événement comme onClick ?|Une référence de fonction (onClick={handleClick}), jamais un appel (handleClick()) ni une chaîne. Pour passer un argument, on enveloppe dans une arrow : onClick={() => f(id)}.
Qu'est-ce qu'un SyntheticEvent en React ?|Un wrapper cross-browser autour de l'événement natif, offrant la même API partout (preventDefault, stopPropagation, target, currentTarget). Le pooling qui recyclait l'objet a été supprimé depuis React 17.
Quelle est la différence entre preventDefault() et stopPropagation() ?|preventDefault() annule le comportement par défaut du navigateur (recharger la page au submit, suivre un lien). stopPropagation() stoppe la remontée (bubbling) de l'événement vers les éléments parents. Indépendants.
Comment typer le handler d'un onChange d'input en TypeScript ?|Avec React.ChangeEvent<HTMLInputElement>. Plus généralement les génériques React.MouseEvent<T>, React.FormEvent<T>, où T est l'élément DOM qui porte le handler.
Comment lire les valeurs d'un formulaire sans useState ?|Dans onSubmit, après e.preventDefault() : new FormData(e.currentTarget) puis data.get('nomDuChamp'). Chaque champ doit avoir un attribut name. Alternative pour un champ ciblé : useRef + inputRef.current.value.
Pourquoi met-on onSubmit sur le <form> et non onClick sur le bouton ?|Pour que la soumission au clavier (touche Entrée dans un champ) fonctionne aussi, et pour respecter l'accessibilité. Le bouton porte juste type="submit".
Différence entre value et defaultValue sur un input ?|value rend le champ contrôlé (piloté par l'état React) et exige onChange, sinon la saisie est figée. defaultValue donne seulement la valeur initiale d'un champ non-contrôlé, dont le DOM garde la maîtrise.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-07-evenements-et-formulaires-basiques/README.md`. Construire le `InviteForm` de l'admin TribuZen en non-contrôlé (`onSubmit` + `FormData` + `preventDefault`), puis gérer la propagation d'un bouton d'action — sans `useState`.
