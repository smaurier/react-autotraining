---
titre: useEffect et la synchronisation avec l'extérieur
cours: 04-react
notions: [modèle mental de synchronisation, tableau de dépendances, fonction de cleanup, les 3 formes d'effet, éviter les effets inutiles et dériver, race conditions sur fetch, flag ignore et AbortController, double-invocation en StrictMode dev]
outcomes: [synchroniser un composant avec un système externe via useEffect, écrire une fonction de cleanup correcte, reconnaître et supprimer un effet inutile au profit d'une valeur dérivée, sécuriser un fetch contre les race conditions]
prerequis: [08-usestate]
next: 10-useref-et-dom
libs: [{ name: react, version: "^19" }]
tribuzen: effets de l'admin TribuZen — sync titre de document, fetch de la liste des familles avec annulation, valeur dérivée sans effet
last-reviewed: 2026-07
---

# useEffect et la synchronisation avec l'extérieur

> **Outcomes — tu sauras FAIRE :** synchroniser un composant avec un système externe via `useEffect`, écrire une fonction de cleanup correcte, supprimer un effet inutile au profit d'une valeur dérivée, sécuriser un fetch contre les race conditions.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

Tu reprends une page de l'admin TribuZen : la liste des familles d'un espace. Un collègue a écrit ce composant, et le support remonte deux bugs.

```tsx
// FamilyListPage.tsx — AVANT, deux bugs cachés
function FamilyListPage({ spaceId }: { spaceId: string }) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [count, setCount] = useState(0);

  // Bug A : effet inutile pour un simple compteur
  useEffect(() => {
    setCount(families.length);
  }, [families]);

  // Bug B : fetch sans annulation — race condition au changement de spaceId
  useEffect(() => {
    fetch(`/api/spaces/${spaceId}/families`)
      .then((r) => r.json())
      .then((data) => setFamilies(data));
  }, [spaceId]);

  return (
    <div>
      <h1>{count} familles</h1>
      <ul>{families.map((f) => <li key={f.id}>{f.name}</li>)}</ul>
    </div>
  );
}
```

**Ce qui cloche :**
1. **Bug A** — `count` est entièrement dérivable de `families`. L'effet + le state en plus provoquent un rendu supplémentaire à chaque changement, et peuvent afficher une valeur en retard d'un rendu.
2. **Bug B** — quand l'admin change vite de `spaceId` (A puis B), deux fetchs partent. Si la réponse de A arrive **après** celle de B, la liste de A écrase celle de B : on affiche les familles du mauvais espace.
3. Aucun `cleanup` : rien n'annule la requête obsolète.

Ce module te donne les trois outils pour corriger ça : dériver au lieu d'un effet, le tableau de dépendances, et la fonction de cleanup contre les race conditions.

---

## 2. Théorie complète, concise

### 2.1 Le modèle mental : synchroniser, pas « réagir »

`useEffect` ne sert **pas** à « réagir à un changement d'état ». Il sert à **synchroniser** ton composant avec un système *extérieur* à React : réseau, DOM hors-React, timers, WebSocket, `localStorage`, `document.title`, un abonnement.

Un effet s'exécute **après** que React a commité le rendu à l'écran. Il regarde le monde extérieur et le met en accord avec le state actuel.

```tsx
// ✅ Synchroniser un système externe (le titre de l'onglet) avec le state
useEffect(() => {
  document.title = `${unread} messages`;
}, [unread]);
```

Si tu n'es pas en train de toucher un système extérieur, il y a de fortes chances que tu **n'aies pas besoin d'un effet** (voir 2.5).

### 2.2 Le tableau de dépendances

Le second argument déclare **de quoi dépend l'effet**. React compare chaque valeur du tableau au rendu précédent (comparaison `Object.is`, superficielle) et ne ré-exécute l'effet que si au moins une a changé.

```tsx
useEffect(() => {
  // corps de l'effet
}, [spaceId, token]); // ré-exécuté quand spaceId OU token change
```

**Règle des dépendances exhaustives :** toute valeur réactive lue dans le corps de l'effet (props, state, variables dérivées) **doit** figurer dans le tableau. Le lint `react-hooks/exhaustive-deps` le vérifie.

```tsx
// ❌ spaceId lu mais absent des deps — l'effet ne se relance pas au changement
useEffect(() => {
  fetchFamilies(spaceId).then(setFamilies);
}, []); // warning: missing dependency 'spaceId'

// ✅ dépendance déclarée
useEffect(() => {
  fetchFamilies(spaceId).then(setFamilies);
}, [spaceId]);
```

> **Ne triche jamais** avec `// eslint-disable-next-line`. Un warning de deps signale presque toujours un effet mal structuré, pas un faux positif.

### 2.3 Les 3 formes

```tsx
// Forme 1 — pas de tableau : APRÈS CHAQUE rendu (rare, souvent une erreur)
useEffect(() => {
  console.log('rendu commité');
});

// Forme 2 — tableau vide [] : au MONTAGE, cleanup au DÉMONTAGE
useEffect(() => {
  const socket = openSocket();
  return () => socket.close();
}, []);

// Forme 3 — [deps] : au montage PUIS quand une dep change
useEffect(() => {
  fetchFamilies(spaceId).then(setFamilies);
}, [spaceId]);
```

| Forme | Quand ça s'exécute | Cas d'usage |
|---|---|---|
| `useEffect(fn)` | après chaque rendu | mesure DOM ponctuelle, debug |
| `useEffect(fn, [])` | au montage seulement | ouvrir un socket, un listener global |
| `useEffect(fn, [deps])` | montage + à chaque changement de dep | fetch, sync avec une prop/URL |

### 2.4 La fonction de cleanup

L'effet peut **retourner une fonction**. React l'appelle :
- **avant** de ré-exécuter l'effet (quand une dep a changé),
- **au démontage** du composant.

C'est le mécanisme qui empêche les fuites : chaque abonnement/effet doit défaire ce qu'il a mis en place.

```tsx
// Timer : le cleanup libère l'interval avant chaque relance et au démontage
useEffect(() => {
  const id = setInterval(() => setSeconds((s) => s + 1), 1000);
  return () => clearInterval(id);
}, []);

// Listener global : on retire exactement ce qu'on a ajouté
useEffect(() => {
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);
```

Modèle mental : **set up → clean up**. Si tu ouvres quelque chose (timer, socket, listener, requête), le cleanup le referme.

### 2.5 Éviter les effets inutiles : dériver plutôt qu'un effet

C'est l'erreur la plus fréquente, surtout en venant de Vue/Angular où l'on « watch » tout. La doc React a une page dédiée : *You Might Not Need an Effect*.

**Règle :** si une valeur se calcule à partir des props/state existants, calcule-la **pendant le rendu**. Pas de state en plus, pas d'effet.

```tsx
// ❌ Effet + state pour une valeur dérivée : rendu en plus, valeur en retard
function FamilyList({ families }: { families: Family[] }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(families.length);
  }, [families]);
  return <h1>{count} familles</h1>;
}

// ✅ Simple variable calculée au rendu
function FamilyList({ families }: { families: Family[] }) {
  const count = families.length;
  return <h1>{count} familles</h1>;
}

// ✅ Si le calcul est réellement coûteux : useMemo, PAS useEffect
const sorted = useMemo(
  () => [...families].sort((a, b) => a.name.localeCompare(b.name)),
  [families],
);
```

Autres cas où tu **n'as pas** besoin d'un effet :
- **Transformer des données pour le rendu** → calcul direct / `useMemo`.
- **Réagir à un événement utilisateur** (clic, submit) → mets la logique dans le **handler**, pas dans un effet.
- **Réinitialiser un state quand une prop change** → souvent une `key` sur le composant suffit.

### 2.6 Race conditions sur fetch : le flag `ignore`

Quand une dep change vite, plusieurs fetchs se chevauchent. L'ordre des réponses n'est pas garanti : une réponse ancienne peut arriver en dernier et écraser la récente. Le pattern officiel React utilise un **flag `ignore`** posé par le cleanup.

```tsx
useEffect(() => {
  let ignore = false; // vrai « verrou » de fraîcheur

  fetchFamilies(spaceId).then((data) => {
    if (!ignore) setFamilies(data); // on ignore les réponses obsolètes
  });

  return () => {
    ignore = true; // le cleanup invalide l'effet précédent
  };
}, [spaceId]);
```

Chaque exécution de l'effet a **sa propre** variable `ignore` (closure). Quand `spaceId` change, le cleanup de l'effet précédent met **son** `ignore` à `true` : sa réponse tardive sera ignorée. Seule la dernière exécution, non nettoyée, applique son résultat.

**Variante `AbortController`** — quand tu veux en plus *annuler* la requête réseau (économiser la bande passante) :

```tsx
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/spaces/${spaceId}/families`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setFamilies)
    .catch((err) => {
      if (err.name !== 'AbortError') setError(err.message); // abort = normal
    });

  return () => controller.abort();
}, [spaceId]);
```

| Approche | Ce que ça fait | Quand |
|---|---|---|
| flag `ignore` | ignore la réponse obsolète côté composant | par défaut, le plus simple |
| `AbortController` | annule aussi la requête réseau | requêtes lourdes, économie réseau |

> En prod, la plupart des équipes délèguent ça à **TanStack Query / React Query** qui gère cache, dédoublonnage et annulation. Savoir écrire le pattern à la main reste indispensable pour lire du code et comprendre ce que la lib fait pour toi.

### 2.7 Pas d'`async` directe sur l'effet

Le callback de `useEffect` ne peut **pas** être `async` : une fonction `async` retourne une Promise, or React attend soit `undefined`, soit une **fonction de cleanup**.

```tsx
// ❌ retourne une Promise à la place du cleanup
useEffect(async () => {
  const data = await fetchFamilies(spaceId);
  setFamilies(data);
}, [spaceId]);

// ✅ fonction async interne, appelée dans l'effet
useEffect(() => {
  let ignore = false;
  (async () => {
    const data = await fetchFamilies(spaceId);
    if (!ignore) setFamilies(data);
  })();
  return () => { ignore = true; };
}, [spaceId]);
```

### 2.8 StrictMode : double-invocation en dev

En développement, avec `<StrictMode>`, React **monte → démonte → remonte** chaque composant une fois. Ton effet s'exécute donc **deux fois** au montage (setup → cleanup → setup), uniquement en dev.

```tsx
// Console en dev sous StrictMode :
// 'setup'
// 'cleanup'   ← démontage volontaire de StrictMode
// 'setup'     ← remontage
useEffect(() => {
  console.log('setup');
  return () => console.log('cleanup');
}, []);
```

**Ce n'est pas un bug** : c'est un test que ton cleanup est correct. Si le double-montage casse quelque chose (double socket, double insert, requête en double non ignorée), c'est **ton effet** qui manque de cleanup ou d'idempotence — pas React. En production, l'effet ne s'exécute qu'une fois.

### 2.9 Repère : Vue / Angular vs React

| Aspect | Vue `watch` / `watchEffect` | Angular `effect()` | React `useEffect` |
|---|---|---|---|
| Dépendances | explicites / auto-trackées | auto-trackées (signals) | **explicites** (tableau) |
| Cleanup | `onCleanup(fn)` | `onCleanup(fn)` | `return () => {}` |
| Exécution initiale | non (sauf `immediate`) / oui | oui | oui (après 1er rendu) |
| Valeur dérivée | `computed` | `computed` | variable / `useMemo` |

Le réflexe à désapprendre : en Vue/Angular on « watch » beaucoup ; en React, la plupart de ces cas sont des **valeurs dérivées** ou des **handlers**, pas des effets.

---

## 3. Worked examples

### Exemple 1 — Corriger FamilyListPage (les deux bugs du cas concret)

On supprime l'effet inutile (Bug A) et on sécurise le fetch avec le flag `ignore` (Bug B).

```tsx
import { useState, useEffect } from 'react';

interface Family {
  id: string;
  name: string;
}

interface FamilyListPageProps {
  spaceId: string;
}

function FamilyListPage({ spaceId }: FamilyListPageProps) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  // ✅ Bug A corrigé : count est dérivé au rendu, aucun effet, aucun state en plus
  const count = families.length;

  // ✅ Bug B corrigé : flag ignore → la réponse obsolète est jetée
  useEffect(() => {
    let ignore = false;
    setStatus('loading');

    fetch(`/api/spaces/${spaceId}/families`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Family[]) => {
        if (!ignore) {
          setFamilies(data);
          setStatus('ok');
        }
      })
      .catch(() => {
        if (!ignore) setStatus('error');
      });

    return () => {
      ignore = true; // invalide CETTE exécution quand spaceId change / au démontage
    };
  }, [spaceId]);

  if (status === 'loading') return <p>Chargement…</p>;
  if (status === 'error') return <p>Erreur de chargement.</p>;

  return (
    <div>
      <h1>{count} familles</h1>
      <ul>
        {families.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default FamilyListPage;
```

**Ce qui est réglé :**
- `count` n'est plus un state : impossible qu'il soit en retard d'un rendu.
- Changer vite de `spaceId` ne peut plus afficher les familles du mauvais espace : chaque `ignore` verrouille sa propre exécution.
- Un `abort` réseau (si on passait à `AbortController`) serait traité comme normal, pas comme une erreur.

### Exemple 2 — Synchroniser le titre du document (system externe pur)

Cas d'école du **bon** `useEffect` : on met en accord un système hors-React (`document.title`) avec le state. Il n'y a pas de valeur dérivée à calculer côté rendu — on touche l'extérieur.

```tsx
import { useState, useEffect } from 'react';

function DocumentEditor({ initialTitle }: { initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);

  // ✅ Effet légitime : on synchronise l'onglet du navigateur avec le state
  useEffect(() => {
    const previous = document.title;
    document.title = `TribuZen — ${title || 'Sans titre'}`;

    // Cleanup : restaurer le titre quand on quitte l'éditeur
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <label>
      Titre du document
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
    </label>
  );
}

export default DocumentEditor;
```

**Pourquoi c'est un vrai effet ici :**
- `document.title` est **extérieur** à l'arbre React — impossible à « calculer au rendu ».
- Le cleanup restaure l'état précédent quand l'utilisateur quitte l'éditeur : set up → clean up.
- Dépendance `[title]` exhaustive : le titre se resynchronise à chaque frappe.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Un effet pour une valeur dérivée

```tsx
// ❌ state + effet pour ce qui est un simple calcul
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${first} ${last}`);
}, [first, last]);

// ✅ calcul au rendu
const fullName = `${first} ${last}`;
```

**Pourquoi c'est faux :** l'effet s'exécute *après* le rendu, donc `fullName` affiche l'ancienne valeur pendant un rendu, puis déclenche un second rendu. Un calcul direct est synchrone, sans rendu superflu.

### PIÈGE #2 — Logique d'événement mise dans un effet

```tsx
// ❌ envoyer une requête « quand submitted passe à true »
const [submitted, setSubmitted] = useState(false);
useEffect(() => {
  if (submitted) postForm(data);
}, [submitted]);

// ✅ dans le handler, là où l'événement se produit
function handleSubmit() {
  postForm(data);
}
```

**Pourquoi c'est faux :** un `POST` est une conséquence d'une **action utilisateur**, pas d'une synchronisation. Le mettre dans un effet le rend rejouable au montage (StrictMode → double POST) et éparpille la logique.

### PIÈGE #3 — Fetch sans cleanup (race condition)

```tsx
// ❌ la réponse lente d'un ancien spaceId peut écraser la récente
useEffect(() => {
  fetch(`/api/spaces/${spaceId}/families`).then((r) => r.json()).then(setFamilies);
}, [spaceId]);

// ✅ flag ignore posé par le cleanup
useEffect(() => {
  let ignore = false;
  fetchFamilies(spaceId).then((d) => { if (!ignore) setFamilies(d); });
  return () => { ignore = true; };
}, [spaceId]);
```

**Pourquoi c'est faux :** l'ordre d'arrivée des réponses réseau n'est pas garanti. Sans flag, la dernière réponse *arrivée* gagne, pas la dernière *demandée*.

### PIÈGE #4 — « StrictMode a un bug, mon effet tourne deux fois »

```tsx
// ❌ interprétation fausse : désactiver StrictMode pour masquer le double-run
// ✅ bonne lecture : le double-run révèle un cleanup manquant / non-idempotence
useEffect(() => {
  const conn = connect();
  return () => conn.disconnect(); // avec ce cleanup, le double-run est inoffensif
}, []);
```

**Pourquoi c'est faux :** le double-montage dev est un **test**. Si ça casse, c'est l'effet qui n'est pas propre. Retirer StrictMode masque le problème, qui réapparaîtra en prod (navigation, remount).

### PIÈGE #5 — Callback `async` directement sur useEffect

```tsx
// ❌ retourne une Promise, pas une fonction de cleanup
useEffect(async () => { await load(); }, []);

// ✅ fonction async interne
useEffect(() => {
  let ignore = false;
  (async () => { const d = await load(); if (!ignore) setData(d); })();
  return () => { ignore = true; };
}, []);
```

**Pourquoi c'est faux :** React interprète la valeur retournée par l'effet comme le cleanup. Une Promise n'est pas une fonction : le cleanup ne s'exécute jamais, et TS avertit.

---

## 5. Ancrage TribuZen

Dans l'admin TribuZen, `useEffect` apparaît à trois endroits typiques — un de chaque catégorie.

**Sync d'un système externe — `DocumentEditor`** (`src/features/docs/DocumentEditor.tsx`) : quand un admin édite le titre d'un document partagé, on synchronise `document.title` de l'onglet avec le state, et on le restaure au démontage (Exemple 2). C'est un effet **légitime** : `document.title` est hors de React.

**Fetch avec annulation — `FamilyListPage`** (`src/features/family/FamilyListPage.tsx`) : la liste des familles d'un espace se recharge quand l'admin change de `spaceId`. Le flag `ignore` (ou `AbortController`) empêche l'affichage des familles du mauvais espace lors d'un changement rapide (Exemple 1). En prod TribuZen, ce fetch passera à **TanStack Query**, mais le comportement anti-race reste le même.

**Effet à supprimer — compteur dérivé** : partout où un composant TribuZen affiche « N familles », « N membres en ligne », « N documents » — ces compteurs sont **dérivés** des listes, jamais un `useState` + `useEffect`. C'est le premier réflexe d'audit sur une PR : un `setX` dans un effet dont la source est déjà dans les props → transformer en valeur dérivée.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  features/
    docs/
      DocumentEditor.tsx     # useEffect → document.title, cleanup restaure
    family/
      FamilyListPage.tsx     # useEffect fetch + flag ignore
      useFamilies.ts         # (plus tard) custom hook, puis TanStack Query
```

---

## 6. Points clés

1. `useEffect` synchronise le composant avec un **système externe** (réseau, DOM, timers) — il ne sert pas à « réagir » à un state.
2. Le **tableau de dépendances** doit être exhaustif : toute valeur réactive lue dans l'effet y figure ; ne jamais désactiver le lint.
3. Trois formes : sans tableau (chaque rendu), `[]` (montage), `[deps]` (montage + changement de dep).
4. La **fonction de cleanup** (le `return`) s'exécute avant chaque relance et au démontage : set up → clean up.
5. Une valeur **dérivable** des props/state se calcule au rendu (ou `useMemo`) — pas un effet ; une logique d'**événement** va dans le handler.
6. Un fetch qui dépend d'une valeur changeante doit se protéger des **race conditions** via le flag `ignore` (ou `AbortController` pour annuler aussi le réseau).
7. Le callback de l'effet ne peut pas être `async` : utiliser une fonction async **interne**.
8. En **StrictMode** dev, l'effet tourne deux fois (setup/cleanup/setup) : c'est un test du cleanup, pas un bug.

---

## 7. Seeds Anki

```
À quoi sert vraiment useEffect (modèle mental) ?|À synchroniser le composant avec un système EXTERNE à React (réseau, DOM, timers, abonnements), après le commit du rendu. Pas à « réagir » à un changement de state — ça, c'est souvent une valeur dérivée ou un handler.
Que fait le tableau de dépendances de useEffect ?|Il déclare les valeurs réactives dont dépend l'effet. React compare chacune (Object.is) au rendu précédent et ne ré-exécute l'effet que si au moins une a changé. Il doit être exhaustif (lint react-hooks/exhaustive-deps).
Quand la fonction de cleanup d'un useEffect s'exécute-t-elle ?|Juste avant chaque ré-exécution de l'effet (dep changée) et au démontage du composant. Elle défait ce que l'effet a mis en place : clearInterval, removeEventListener, close, ignore = true.
Comment éviter une race condition sur un fetch dans useEffect ?|Poser un flag local `let ignore = false;`, ne faire setState que `if (!ignore)`, et mettre `ignore = true` dans le cleanup. Chaque exécution a sa propre closure, donc les réponses obsolètes sont ignorées. AbortController en plus si on veut annuler le réseau.
Pourquoi ne PAS utiliser useEffect pour une valeur dérivée comme count = list.length ?|Parce qu'elle se calcule au rendu directement. L'effet + un state en plus provoquent un rendu supplémentaire et une valeur en retard d'un rendu. On calcule au rendu (ou useMemo si coûteux).
Pourquoi un effet s'exécute-t-il deux fois au montage en dev ?|À cause de StrictMode : React monte, démonte (cleanup), remonte pour vérifier que le cleanup est correct. Ce n'est pas un bug ; en production l'effet ne tourne qu'une fois. Si le double-run casse, c'est le cleanup qui manque.
Pourquoi le callback de useEffect ne peut-il pas être async ?|Une fonction async retourne une Promise, or React attend soit undefined soit une fonction de cleanup. Solution : déclarer une fonction async INTERNE et l'appeler dans l'effet.
Où mettre la logique déclenchée par un clic ou un submit, effet ou handler ?|Dans le handler d'événement, pas dans un effet. L'action est une conséquence d'un événement utilisateur, pas d'une synchronisation. Un effet la rendrait rejouable au montage (double POST en StrictMode).
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-09-useeffect/README.md`. Construire `FamilyListPage` de zéro avec fetch sécurisé (flag `ignore`), un compteur dérivé sans effet, et un `DocumentEditor` qui synchronise `document.title` avec cleanup.
