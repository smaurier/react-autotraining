---
titre: useState
cours: 04-react
notions: [état local avec useState, syntaxe destructurée, typage TS de l'état, updater fonctionnel, batching automatique, état immuable des objets, état immuable des tableaux, lazy initial state, piège de la closure obsolète, plusieurs states vs objet unique]
outcomes: [déclarer et typer un état local avec useState en TS, mettre à jour l'état sans le muter avec l'updater fonctionnel, éviter le piège de l'état obsolète et initialiser paresseusement]
prerequis: [07-evenements-et-formulaires-basiques]
next: 09-useeffect
libs: [{ name: react, version: "^19" }]
tribuzen: état local de l'admin TribuZen — toggle d'un panneau membre, formulaire d'invitation contrôlé, liste de membres mise à jour immuablement
last-reviewed: 2026-07
---

# useState

> **Outcomes — tu sauras FAIRE :** déclarer et typer un état local avec `useState` en TypeScript, le mettre à jour sans le muter via l'updater fonctionnel, et éviter le piège de l'état obsolète.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Dans l'admin TribuZen, tu ajoutes un bouton "Détails" sur le panneau d'un membre. Un collègue a écrit ce compteur d'ouvertures pour tracer combien de fois l'admin déplie la fiche — et il ne marche pas.

```tsx
// MemberPanel.tsx — le compteur reste bloqué
function MemberPanel({ member }: { member: Member }) {
  const [expanded, setExpanded] = useState(false);
  const [openCount, setOpenCount] = useState(0);

  const openDetails = () => {
    setExpanded(true);
    // On veut incrémenter DEUX fois pour une raison métier (log + analytics)
    setOpenCount(openCount + 1);
    setOpenCount(openCount + 1); // ❌ openCount vaut encore 0 ici → +1 seulement
  };

  return (
    <div className="panel">
      <button onClick={openDetails}>Détails ({openCount})</button>
      {expanded && <p>{member.email}</p>}
    </div>
  );
}
```

**Le bug :** après un clic, le compteur affiche `1`, pas `2`. Les deux `setOpenCount(openCount + 1)` lisent la **même** valeur figée de `openCount` (0), calculent tous les deux `0 + 1`, et React ne garde que le dernier. Une variable `let` incrémentée deux fois donnerait 2 ; `useState` non — parce que `openCount` est une **valeur figée pour tout ce rendu**, pas une case mémoire mutable.

Ce module explique pourquoi, et te donne l'outil qui corrige ça : l'updater fonctionnel `setOpenCount(prev => prev + 1)`.

---

## 2. Théorie complète, concise

### 2.1 Ce qu'est un état local

Un composant a besoin de **mémoriser** des valeurs entre deux rendus : le texte tapé dans un champ, un panneau ouvert ou fermé, une liste chargée. Une variable ordinaire ne suffit pas — elle est réinitialisée à chaque appel de la fonction composant. `useState` donne à React une case mémoire persistante **et** déclenche un nouveau rendu quand on la modifie.

```tsx
import { useState } from 'react';

function Counter() {
  // [valeur figée pour ce rendu, fonction de mise à jour]
  const [count, setCount] = useState(0);
  //     ^ état          ^ setter        ^ valeur initiale (1er rendu seulement)

  return <button onClick={() => setCount(count + 1)}>Vu {count} fois</button>;
}
```

Deux choses à retenir dès maintenant :
1. `count` est une **constante** pour la durée d'un rendu. Elle ne change jamais en place ; c'est le rendu **suivant** qui reçoit une nouvelle valeur.
2. Appeler `setCount` ne modifie pas `count` immédiatement — il **planifie** un nouveau rendu avec la nouvelle valeur.

### 2.2 Typage TypeScript de l'état

TypeScript infère souvent le type depuis la valeur initiale. On ne l'annote explicitement que quand l'inférence est trop large ou fausse.

```tsx
const [count, setCount] = useState(0);        // inféré: number
const [name, setName] = useState('');         // inféré: string
const [open, setOpen] = useState(false);      // inféré: boolean

// ❌ inféré à `null` seul → setUser(realUser) refusé par TS
const [user, setUser] = useState(null);

// ✅ type explicite quand l'initial ne représente pas tous les cas
const [user, setUser] = useState<Member | null>(null);
const [members, setMembers] = useState<Member[]>([]);
const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
```

Règle : dès que l'état pourra prendre un type que la valeur initiale ne révèle pas (`null` au départ, tableau vide, union), annote `useState<T>()`.

### 2.3 L'updater fonctionnel : `setX(prev => ...)`

C'est le cœur du module. Il existe deux façons d'appeler un setter :

```tsx
setCount(count + 1);          // forme "valeur" — utilise la variable figée du rendu
setCount(prev => prev + 1);   // forme "updater" — React fournit la dernière valeur à jour
```

La forme updater reçoit en argument l'état **le plus récent connu de React**, pas la variable capturée par la closure du rendu courant. Elle est obligatoire dès que la nouvelle valeur **dépend de l'ancienne**.

```tsx
// ❌ trois lectures de la même valeur figée → +1 au total
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);

// ✅ chaque updater reçoit le résultat du précédent → +3
setCount(prev => prev + 1); // 0 → 1
setCount(prev => prev + 1); // 1 → 2
setCount(prev => prev + 1); // 2 → 3
```

> Règle simple : si la nouvelle valeur se calcule à partir de l'ancienne (`+1`, toggle, ajout à un tableau), utilise **toujours** l'updater. Sinon (valeur totalement nouvelle, ex. `setName(inputValue)`), la forme valeur suffit.

### 2.4 Batching automatique

React **regroupe** plusieurs appels de setters d'un même gestionnaire en un seul re-rendu. C'est le *batching*.

```tsx
function handleClick() {
  setExpanded(true);   // pas de rendu ici
  setOpenCount(c => c + 1); // pas de rendu ici
  setStatus('idle');   // pas de rendu ici
  // → UN seul re-rendu à la fin, avec les trois nouvelles valeurs
}
```

Deux conséquences :
- C'est pourquoi `count` ne change pas "au milieu" du gestionnaire : les setters ne sont pas appliqués ligne par ligne, ils sont accumulés puis appliqués ensemble.
- Depuis React 18 (et donc React 19), le batching est **automatique partout** : gestionnaires d'événements, mais aussi `setTimeout`, promesses, callbacks natifs. Avant React 18, seuls les gestionnaires d'événements étaient batchés.

### 2.5 État immuable : objets

React compare l'ancien et le nouvel état **par référence** (`Object.is`, proche de `===`). Muter un objet en place garde la même référence → React ne voit aucun changement → pas de re-rendu.

```tsx
interface Invite {
  email: string;
  role: 'admin' | 'mod' | 'member';
}

const [invite, setInvite] = useState<Invite>({ email: '', role: 'member' });

// ❌ mutation en place — même référence, React ne re-rend pas
invite.email = 'a@tribuzen.app';
setInvite(invite);

// ✅ nouvel objet via spread
setInvite(prev => ({ ...prev, email: 'a@tribuzen.app' }));
```

Pour un objet imbriqué, il faut recopier **chaque niveau** qu'on modifie :

```tsx
setInvite(prev => ({
  ...prev,
  meta: { ...prev.meta, invitedAt: Date.now() },
}));
```

### 2.6 État immuable : tableaux

Même principe : ne jamais muter le tableau en place (`push`, `splice`, `sort`, `reverse`). On produit toujours un **nouveau** tableau.

```tsx
const [members, setMembers] = useState<Member[]>([]);

// Ajouter
setMembers(prev => [...prev, newMember]);

// Supprimer
setMembers(prev => prev.filter(m => m.id !== idToRemove));

// Modifier un élément
setMembers(prev =>
  prev.map(m => (m.id === id ? { ...m, role: 'mod' } : m))
);

// Trier — copier AVANT car sort() mute en place
setMembers(prev => [...prev].sort((a, b) => a.name.localeCompare(b.name)));

// ❌ sort() sur prev mute le state existant
setMembers(prev => prev.sort((a, b) => a.name.localeCompare(b.name)));
```

Mémo des méthodes : `map` / `filter` / `slice` / spread **retournent** un nouveau tableau (sûres) ; `push` / `pop` / `splice` / `sort` / `reverse` **mutent** (à éviter sur le state directement).

### 2.7 Lazy initial state

La valeur initiale n'est utilisée qu'au **premier** rendu. Mais si tu passes le **résultat** d'un calcul coûteux, ce calcul s'exécute à **chaque** rendu (même s'il est ignoré ensuite).

```tsx
// ❌ parseInvites(raw) s'exécute à chaque rendu, résultat jeté sauf au 1er
const [invites, setInvites] = useState(parseInvites(raw));

// ✅ initialiseur paresseux : la fonction n'est appelée qu'au 1er rendu
const [invites, setInvites] = useState(() => parseInvites(raw));
```

À utiliser pour : lecture `localStorage`, parsing JSON, calcul lourd. On passe une **fonction** (`() => ...`), pas son résultat.

```tsx
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  const saved = localStorage.getItem('theme');
  return saved === 'dark' ? 'dark' : 'light';
});
```

### 2.8 Le piège de la closure obsolète

Chaque rendu crée ses propres variables et fonctions, qui **capturent** l'état de ce rendu. Une fonction différée (dans `setTimeout`, une promesse) voit la valeur du rendu **où elle a été créée**, pas la valeur actuelle.

```tsx
function LiveCounter() {
  const [count, setCount] = useState(0);

  const alertLater = () => {
    setTimeout(() => {
      // capture le `count` du rendu où le clic a eu lieu
      alert(count); // affiche l'ancienne valeur si count a changé entre-temps
    }, 3000);
  };
  // ...
}
```

La parade est la même que pour les incréments : passer par l'updater `setCount(prev => ...)` quand tu as besoin de la valeur **à jour** dans un callback différé, plutôt que de lire la variable capturée.

### 2.9 Plusieurs states vs objet unique

```tsx
// ✅ séparés — valeurs indépendantes
const [name, setName] = useState('');
const [email, setEmail] = useState('');

// ✅ groupés — valeurs qui changent ensemble et voyagent ensemble
const [invite, setInvite] = useState({ email: '', role: 'member' as const });
```

Règle de pouce : sépare ce qui change indépendamment, groupe ce qui change ensemble. Au-delà de ~4-5 `useState` liés, ou avec des transitions d'état complexes, `useReducer` (module ultérieur) devient plus lisible.

> **Repère cross-framework (rappel) :** Vue `ref(0)` se lit `x.value` et se mute directement (`x.value++`), réactivité par proxy. Angular `signal(0)` se lit `x()` et se met à jour via `x.set()` / `x.update()`. React `useState` se lit `x` (figé pour le rendu) et se met à jour via `setX`, ce qui **re-rend tout le composant**.

---

## 3. Worked examples

### Exemple 1 — Corriger le compteur du cas concret (toggle + updater)

Reprise du panneau membre. On veut un toggle propre et un compteur fiable.

```tsx
import { useState } from 'react';

interface Member {
  id: string;
  name: string;
  email: string;
}

function MemberPanel({ member }: { member: Member }) {
  const [expanded, setExpanded] = useState(false);
  const [openCount, setOpenCount] = useState(0);

  const toggle = () => {
    // toggle = nouvelle valeur dépend de l'ancienne → updater
    setExpanded(prev => !prev);
    // incrément fiable même appelé plusieurs fois → updater
    setOpenCount(prev => prev + 1);
    setOpenCount(prev => prev + 1); // ceci ajoute réellement 2 au total
  };

  return (
    <div className="panel">
      <button onClick={toggle}>
        {expanded ? 'Réduire' : 'Détails'} (ouvert {openCount}x)
      </button>
      {expanded && <p>{member.email}</p>}
    </div>
  );
}

export default MemberPanel;
```

**Pourquoi c'est correct :**
- `setExpanded(prev => !prev)` inverse toujours la vraie valeur courante, même si le bouton est cliqué vite plusieurs fois.
- Les deux `setOpenCount(prev => prev + 1)` s'enchaînent : le second reçoit le résultat du premier → `+2`. Le bug du cas concret disparaît.
- Un seul re-rendu final grâce au batching, malgré trois appels de setters.

### Exemple 2 — Formulaire d'invitation contrôlé + liste immuable (TribuZen)

L'admin invite un membre : un formulaire contrôlé par `useState`, puis on ajoute l'invité à la liste **immuablement**.

```tsx
import { useState } from 'react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'mod' | 'member';
}

interface InviteForm {
  name: string;
  email: string;
  role: Member['role'];
}

const EMPTY_FORM: InviteForm = { name: '', email: '', role: 'member' };

function InvitePanel() {
  // Un objet unique : les 3 champs voyagent ensemble
  const [form, setForm] = useState<InviteForm>(EMPTY_FORM);
  const [members, setMembers] = useState<Member[]>([]);

  // Mise à jour générique d'un champ — spread pour garder l'immuabilité
  const updateField = <K extends keyof InviteForm>(key: K, value: InviteForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return;

    const newMember: Member = {
      id: crypto.randomUUID(),
      name: form.name,
      email: form.email,
      role: form.role,
    };

    // Ajout immuable : nouveau tableau, pas de push
    setMembers(prev => [...prev, newMember]);
    // Reset du formulaire contrôlé
    setForm(EMPTY_FORM);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={form.name}
        onChange={e => updateField('name', e.target.value)}
        placeholder="Nom"
      />
      <input
        value={form.email}
        onChange={e => updateField('email', e.target.value)}
        placeholder="Email"
      />
      <select
        value={form.role}
        onChange={e => updateField('role', e.target.value as Member['role'])}
      >
        <option value="member">Membre</option>
        <option value="mod">Modo</option>
        <option value="admin">Admin</option>
      </select>

      <button type="submit">Inviter</button>

      <ul>
        {members.map(m => (
          <li key={m.id}>
            {m.name || m.email} — {m.role}
            {/* Suppression immuable : filter retourne un nouveau tableau */}
            <button type="button" onClick={() => setMembers(prev => prev.filter(x => x.id !== m.id))}>
              Retirer
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
}

export default InvitePanel;
```

**Points clés de cet exemple :**
- Chaque `<input>`/`<select>` est **contrôlé** : sa valeur vient de `form`, et `onChange` met à jour `form` via un spread immuable.
- `updateField` est typé génériquement (`K extends keyof InviteForm`) : impossible d'écrire un champ inexistant, et la valeur doit correspondre au type du champ.
- La liste `members` n'est jamais mutée : ajout par `[...prev, x]`, suppression par `filter`. React voit une nouvelle référence à chaque fois → re-rendu garanti.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Croire que le setter change l'état tout de suite

```tsx
const [count, setCount] = useState(0);

function handleClick() {
  setCount(count + 1);
  console.log(count); // ❌ affiche encore 0, pas 1
}
```

`count` est figé pour ce rendu. Le setter **planifie** un rendu futur ; il ne réassigne pas la variable locale. La nouvelle valeur n'existe qu'au prochain rendu. Pour agir sur la valeur à venir, calcule-la localement ou utilise l'updater.

### PIÈGE #2 — Utiliser la forme valeur pour des incréments consécutifs

```tsx
// ❌ +1 au total
setCount(count + 1);
setCount(count + 1);

// ✅ +2
setCount(prev => prev + 1);
setCount(prev => prev + 1);
```

Les deux lignes de la version fautive lisent la même variable figée. C'est exactement le bug du cas concret. Dès que la valeur dépend de la précédente → updater.

### PIÈGE #3 — Muter l'objet ou le tableau en place

```tsx
// ❌ mutation — même référence, pas de re-rendu
members.push(newMember);
setMembers(members);

// ❌ mutation d'un champ
form.email = 'x@y.z';
setForm(form);

// ✅ nouvelle référence
setMembers(prev => [...prev, newMember]);
setForm(prev => ({ ...prev, email: 'x@y.z' }));
```

React compare par référence. Muter conserve la référence → l'UI ne se met pas à jour, ou se met à jour de façon imprévisible. Toujours produire un nouvel objet/tableau.

### PIÈGE #4 — Passer le résultat au lieu de la fonction pour l'init paresseux

```tsx
// ❌ readInitial() s'exécute à CHAQUE rendu
const [x, setX] = useState(readInitial());

// ✅ readInitial n'est appelée qu'au 1er rendu
const [x, setX] = useState(readInitial);       // référence de fonction
const [x, setX] = useState(() => readInitial()); // ou wrapper
```

`useState(readInitial())` appelle la fonction immédiatement à chaque rendu et jette le résultat après le premier. `useState(() => ...)` diffère l'appel au montage uniquement.

### PIÈGE #5 — Lire un état capturé dans un callback différé (closure obsolète)

```tsx
// ❌ alerte l'ancienne valeur : count capturé au moment du clic
setTimeout(() => alert(count), 3000);

// ✅ obtenir la valeur à jour via l'updater (sans réellement changer l'état, on lit)
setCount(prev => {
  console.log('valeur à jour :', prev);
  return prev; // on ne modifie pas, on lit
});
```

Une fonction créée dans un rendu voit les variables de **ce** rendu. Si l'état change avant que le callback ne s'exécute, la variable capturée est périmée. L'updater donne accès à la valeur la plus récente. (La solution robuste pour du long terme est `useRef`/`useEffect`, vus au module suivant.)

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, `useState` porte tout l'état local d'interaction avant qu'un état serveur (React Query, module ultérieur) n'entre en jeu.

**Toggle du panneau membre** (`src/components/features/member/MemberPanel.tsx`) — `const [expanded, setExpanded] = useState(false)` avec `setExpanded(prev => !prev)`. Exactement le cas concret et l'Exemple 1.

**Formulaire d'invitation contrôlé** (`src/components/features/member/InvitePanel.tsx`) — un objet `InviteForm` (`name`, `email`, `role`) piloté par `useState`, chaque champ contrôlé, mise à jour par spread via `updateField`. C'est l'Exemple 2.

**Liste de membres mutée immuablement** (`src/components/features/member/MemberList.tsx`) — `const [members, setMembers] = useState<Member[]>([])`. Ajout d'un invité par `[...prev, m]`, retrait par `filter`, changement de rôle par `map`. Tant que la liste vient d'un état local (avant branchement API), ce sont ces trois opérations qui l'alimentent.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  components/
    features/
      member/
        MemberPanel.tsx    # état expanded (toggle)
        InvitePanel.tsx    # formulaire contrôlé (objet InviteForm)
        MemberList.tsx     # liste immuable (add/remove/update)
```

---

## 6. Points clés

1. `useState(init)` retourne `[valeur figée pour ce rendu, setter]` ; le setter planifie un re-rendu, il ne réassigne pas la variable locale.
2. Type explicite `useState<T>()` dès que l'initial ne révèle pas tous les cas (`null`, tableau vide, union).
3. Updater fonctionnel `setX(prev => ...)` obligatoire quand la nouvelle valeur dépend de l'ancienne — c'est la parade au bug des mises à jour consécutives.
4. React batch automatiquement plusieurs setters en un seul re-rendu, partout depuis React 18/19.
5. État immuable : objets via `{ ...prev }`, tableaux via `map`/`filter`/spread — jamais `push`/`sort`/mutation en place, car React compare par référence.
6. Lazy initial state `useState(() => calcul())` pour ne payer un calcul coûteux qu'au premier rendu.
7. Piège de la closure obsolète : un callback différé voit l'état capturé à sa création ; l'updater donne accès à la valeur à jour.

---

## 7. Seeds Anki

```
Que retourne useState et que représente chaque élément ?|Un tuple [valeur, setter]. La valeur est figée pour la durée du rendu courant ; le setter planifie un nouveau rendu avec la nouvelle valeur (il ne réassigne pas la variable locale).
Quand faut-il utiliser l'updater fonctionnel setX(prev => ...) plutôt que setX(valeur) ?|Chaque fois que la nouvelle valeur dépend de l'ancienne (incrément, toggle, ajout à un tableau). L'updater reçoit la dernière valeur connue de React, pas la variable figée par la closure du rendu.
Pourquoi setCount(count + 1) appelé deux fois de suite n'incrémente-t-il que de 1 ?|Les deux appels lisent la même valeur figée de count pour ce rendu (ex. 0) et calculent tous deux 0 + 1. React ne conserve que le dernier. setCount(prev => prev + 1) deux fois donne bien +2.
Pourquoi muter un objet d'état puis appeler le setter ne déclenche pas de re-rendu ?|React compare l'ancien et le nouvel état par référence (Object.is). Muter en place garde la même référence → aucun changement détecté. Il faut créer un nouvel objet/tableau : { ...prev } ou [...prev].
Comment mettre à jour immuablement un tableau d'état (ajout, suppression, modif) ?|Ajout : [...prev, x]. Suppression : prev.filter(...). Modif : prev.map(el => el.id === id ? { ...el, ... } : el). Éviter push/splice/sort qui mutent (copier avant sort : [...prev].sort()).
Qu'est-ce que le lazy initial state et quand l'utiliser ?|Passer une fonction useState(() => calcul()) au lieu du résultat useState(calcul()). La fonction n'est appelée qu'au premier rendu. Utile pour lecture localStorage, parsing, calcul coûteux.
Qu'est-ce que le piège de la closure obsolète avec useState ?|Un callback différé (setTimeout, promesse) capture la valeur d'état du rendu où il a été créé, pas la valeur actuelle. Si l'état change entre-temps, la variable capturée est périmée. L'updater setX(prev => ...) donne accès à la valeur à jour.
Qu'est-ce que le batching automatique dans React 18/19 ?|React regroupe plusieurs appels de setters (même hors gestionnaires d'événements : setTimeout, promesses) en un seul re-rendu, avec toutes les nouvelles valeurs appliquées ensemble.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-08-usestate/README.md`. Construire le `InvitePanel` de l'admin TribuZen — formulaire d'invitation contrôlé + liste de membres mise à jour immuablement — avec React 19, Vite et TypeScript strict.
