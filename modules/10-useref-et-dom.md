---
titre: useRef et le DOM
cours: 04-react
notions: [ref mutable sans re-render, ref DOM, focus programmatique, scroll programmatique, mesure d'élément, ref comme prop standard React 19, callback refs, quand ne PAS utiliser une ref]
outcomes: [stocker une valeur mutable persistante sans déclencher de re-render, accéder à un élément DOM pour focus/scroll/mesure, transmettre une ref à un composant enfant via la prop ref React 19]
prerequis: [09-useeffect]
next: 11-usecallback-usememo
libs: [{ name: react, version: "^19" }]
tribuzen: focus auto du champ email dans le formulaire d'invitation de l'admin TribuZen, scroll vers un post, stockage d'un id de timer sans re-render
last-reviewed: 2026-07
---

# useRef et le DOM

> **Outcomes — tu sauras FAIRE :** stocker une valeur mutable persistante sans re-render, accéder à un élément DOM pour le focus / le scroll / la mesure, transmettre une ref à un composant enfant via la prop `ref` de React 19.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu intègres l'admin TribuZen. Sur la page "Inviter un membre", le designer veut que, **dès l'ouverture du formulaire, le curseur soit déjà dans le champ email** — l'admin tape l'adresse sans cliquer. Un collègue a tenté ça :

```tsx
// InviteForm.tsx — tentative KO
function InviteForm() {
  const [email, setEmail] = useState('');

  // ❌ document.querySelector : on sort de React, fragile, casse en SSR / multi-instances
  document.querySelector('input[name="email"]')?.focus();

  return (
    <form>
      <input name="email" value={email} onChange={e => setEmail(e.target.value)} />
      <button type="submit">Envoyer l'invitation</button>
    </form>
  );
}
```

**Trois problèmes immédiats :**
1. `document.querySelector` s'exécute **pendant le rendu**, alors que l'input n'existe pas encore dans le DOM — `focus()` ne fait rien.
2. Le sélecteur global attrape n'importe quel `input[name="email"]` de la page — si deux formulaires coexistent, mauvaise cible.
3. On contourne React au lieu de lui demander l'élément proprement.

La bonne réponse tient en un hook : `useRef`. Ce module te donne les deux usages de `useRef` (valeur mutable **et** accès DOM) et te montre comment faire ce focus correctement.

---

## 2. Théorie complète, concise

### 2.1 Deux usages, un seul hook

`useRef(valeurInitiale)` renvoie un objet stable `{ current: valeurInitiale }`. Cet objet a **deux propriétés fondamentales** :

1. **Il persiste entre les rendus** — le même objet est renvoyé à chaque rendu (comme `useState`, mais…).
2. **Le modifier ne déclenche AUCUN re-render** — écrire `ref.current = x` est silencieux.

De ces deux propriétés découlent les deux usages :

| Usage | Ce qu'on met dans `.current` |
|---|---|
| **Valeur mutable persistante** | un id de timer, un `AbortController`, la valeur précédente, un compteur de rendus |
| **Accès au DOM** | un élément DOM (`<input>`, `<div>`…) que React remplit pour toi |

> **Analogie :** `useRef` est un **tiroir** de ton bureau. Tu y ranges ce que tu veux et le consultes quand tu veux. Ouvrir/fermer le tiroir (`ref.current = ...`) ne déclenche aucune photo (aucun re-render). `useState`, lui, est un **tableau blanc affiché au mur** : chaque modification est repeinte devant tout le monde (re-render).

### 2.2 useRef comme valeur mutable (sans re-render)

Cas typique : stocker l'identifiant d'un `setInterval` pour pouvoir l'annuler plus tard. Cet id ne s'affiche jamais dans le JSX → il n'a rien à faire dans un `useState`.

```tsx
import { useRef, useState, useEffect } from 'react';

function StopWatch() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  // id de timer : mutable, jamais affiché → useRef, pas useState
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (isRunning) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null; // écriture silencieuse : pas de re-render
    }
    setIsRunning(false);
  };

  // Filet de sécurité : on nettoie le timer au démontage
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div>
      <p>{seconds}s</p>
      <button onClick={start} disabled={isRunning}>Démarrer</button>
      <button onClick={stop} disabled={!isRunning}>Arrêter</button>
    </div>
  );
}
```

> **Pourquoi pas `useState` pour l'id du timer ?** Parce que le remplacer par un `setState` déclencherait un re-render **inutile** (l'id ne change rien à l'affichage). `useRef` stocke la valeur sans coût de rendu.

### 2.3 useRef pour accéder au DOM

Tu passes l'objet ref à l'attribut `ref` d'un élément JSX. Après le montage, React écrit l'élément DOM réel dans `ref.current`.

```tsx
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Au montage, le DOM existe : inputRef.current est le <input> réel
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} placeholder="Focalisé au montage" />;
}
```

Chronologie à retenir :
1. Premier rendu → `inputRef.current` vaut encore `null`.
2. React monte le `<input>` dans le DOM et écrit l'élément dans `inputRef.current`.
3. `useEffect` s'exécute **après** le montage → `inputRef.current` est prêt → `focus()` fonctionne.

C'est exactement pourquoi le `querySelector` du cas concret échouait : il lisait le DOM **avant** que l'input existe. La ref, elle, est renseignée par React au bon moment.

### 2.4 Les trois gestes DOM courants : focus, scroll, mesure

```tsx
function DomGestes() {
  const inputRef = useRef<HTMLInputElement>(null);
  const postRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // 1. FOCUS — donner le curseur à un champ
  const focusInput = () => inputRef.current?.focus();

  // 2. SCROLL — amener un élément dans le viewport
  const scrollToPost = () =>
    postRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 3. MESURE — lire les dimensions/position réelles
  const measureBox = () => {
    const rect = boxRef.current?.getBoundingClientRect();
    console.log('largeur:', rect?.width, 'hauteur:', rect?.height);
  };

  return (
    <>
      <input ref={inputRef} />
      <button onClick={focusInput}>Focus</button>
      <div ref={postRef}>Post ciblé</div>
      <button onClick={scrollToPost}>Aller au post</button>
      <div ref={boxRef}>Bloc à mesurer</div>
      <button onClick={measureBox}>Mesurer</button>
    </>
  );
}
```

Ces trois opérations (`focus`, `scrollIntoView`, `getBoundingClientRect`) sont **impératives** : il n'existe pas d'équivalent déclaratif propre en React, la ref est la voie légitime.

### 2.5 Typage des refs DOM (TypeScript)

Le paramètre générique de `useRef` détermine le type de `.current`. Pour une ref DOM, on type avec l'interface `HTMLXxxElement` et on initialise à `null`.

| Élément HTML | Type TypeScript |
|---|---|
| `<input>` | `HTMLInputElement` |
| `<button>` | `HTMLButtonElement` |
| `<div>` | `HTMLDivElement` |
| `<form>` | `HTMLFormElement` |
| `<a>` | `HTMLAnchorElement` |
| `<textarea>` | `HTMLTextAreaElement` |

```tsx
// ✅ Type explicite → inputRef.current est HTMLInputElement | null
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus(); // autocomplétion + sécurité

// ❌ Sans type → current est `null`, TS ne connaît pas focus()
const badRef = useRef(null);
badRef.current?.focus(); // erreur TS : 'focus' n'existe pas sur 'never'
```

Le `?.` (optional chaining) est quasi systématique : `.current` est typé `T | null` puisqu'il vaut `null` avant le montage et après le démontage.

### 2.6 React 19 : `ref` est une prop standard (fin de `forwardRef`)

Historiquement, un composant fonction **ne pouvait pas** recevoir de `ref` : il fallait l'envelopper dans `forwardRef`. **Depuis React 19, `ref` est une prop comme les autres** — tu la déclares dans les props et tu la transmets à l'élément interne. Plus besoin de `forwardRef`.

```tsx
// ✅ React 19 — ref reçue comme prop normale
interface TextFieldProps {
  label: string;
  ref?: React.Ref<HTMLInputElement>;
}

function TextField({ label, ref }: TextFieldProps) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}

// Le parent passe une ref exactement comme sur un <input> natif
function Form() {
  const emailRef = useRef<HTMLInputElement>(null);
  return (
    <form>
      <TextField label="Email" ref={emailRef} />
      <button type="button" onClick={() => emailRef.current?.focus()}>
        Focus email
      </button>
    </form>
  );
}
```

> **⚠️ Changement React 19 à connaître (question d'entretien).** L'ancien pattern `forwardRef` reste **fonctionnel mais déprécié** ; il disparaîtra dans une version future. Tu le croiseras encore dans les codebases et les librairies. À reconnaître en lecture :
>
> ```tsx
> // ❌ Ancien pattern (React ≤ 18) — encore lisible, mais à ne plus écrire en React 19
> import { forwardRef } from 'react';
>
> const TextField = forwardRef<HTMLInputElement, { label: string }>(
>   ({ label }, ref) => (
>     <label>{label}<input ref={ref} /></label>
>   )
> );
> TextField.displayName = 'TextField';
> ```
>
> En React 19, tu supprimes `forwardRef`, tu ajoutes `ref?: React.Ref<...>` aux props, et tu utilises `ref` directement. Un codemod officiel (`npx codemod react/19/replace-reactdom-render` et le codemod `forward-ref`) fait la migration.

### 2.7 Callback refs

Au lieu d'un objet ref, tu peux passer une **fonction** à l'attribut `ref`. React l'appelle avec l'élément au montage, et avec `null` au démontage. Utile quand tu veux réagir au moment précis où l'élément apparaît/disparaît, ou gérer une **liste** d'éléments.

```tsx
function MeasureOnMount() {
  const [height, setHeight] = useState(0);

  // Callback ref : appelée avec le node au montage, null au démontage
  const measuredRef = (node: HTMLDivElement | null) => {
    if (node) setHeight(node.getBoundingClientRect().height);
  };

  return (
    <div ref={measuredRef}>
      Hauteur mesurée : {height}px
    </div>
  );
}
```

> **Nouveauté React 19 :** une callback ref peut désormais **retourner une fonction de nettoyage** (comme un `useEffect`), appelée au démontage à la place de l'appel avec `null` :
>
> ```tsx
> <div ref={(node) => {
>   const obs = new ResizeObserver(() => {/* ... */});
>   if (node) obs.observe(node);
>   return () => obs.disconnect(); // cleanup au démontage (React 19)
> }} />
> ```

### 2.8 Quand ne PAS utiliser une ref

`useRef` est un outil d'exception. La règle par défaut reste : **tout ce qui est affiché doit vivre dans un state ou des props.**

- ❌ **Stocker une valeur affichée** dans une ref → l'écran ne se met pas à jour (pas de re-render). Utilise `useState`.
- ❌ **Lire ou écrire `ref.current` pendant le rendu** → le rendu doit être pur ; touche `.current` seulement dans les handlers d'événements ou dans `useEffect`.
- ❌ **Remplacer le flux de données** (props/state) par des refs pour « aller plus vite » → tu casses le modèle déclaratif de React.

| Besoin | `useState` | `useRef` |
|---|---|---|
| Afficher la valeur dans le JSX | ✅ | ❌ |
| Re-render à chaque modification | ✅ | ❌ |
| Persister entre les rendus | ✅ | ✅ |
| Stocker un id de timer / `AbortController` | ❌ (re-render inutile) | ✅ |
| Accéder à un élément DOM | ❌ | ✅ |

**Question test :** « Si je change cette valeur, l'écran doit-il changer ? » Oui → `useState`. Non → `useRef`.

---

## 3. Worked examples

### Exemple 1 — Focus auto du champ email (le cas concret, résolu)

On reprend le formulaire d'invitation du début et on le corrige avec une ref DOM.

```tsx
// InviteForm.tsx — version correcte
import { useRef, useEffect, useState } from 'react';

function InviteForm() {
  const [email, setEmail] = useState('');
  // 1. Ref typée sur l'input email, initialisée à null
  const emailRef = useRef<HTMLInputElement>(null);

  // 2. Après le montage, le <input> existe dans le DOM → on le focus
  useEffect(() => {
    emailRef.current?.focus();
  }, []); // [] = une seule fois, à l'ouverture du formulaire

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 3. On peut réutiliser la ref pour refocus après erreur, par ex.
    if (!email.includes('@')) {
      emailRef.current?.focus();
      return;
    }
    // ... envoi de l'invitation
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email de l'invité
        <input
          ref={emailRef}          // 4. React remplit emailRef.current au montage
          name="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </label>
      <button type="submit">Envoyer l'invitation</button>
    </form>
  );
}

export default InviteForm;
```

**Pourquoi cette version est correcte :**
- La ref **cible précisément CE `<input>`** (pas de sélecteur global) — deux formulaires coexistent sans conflit.
- Le `focus()` est dans un `useEffect(…, [])` : il s'exécute **après** le montage, quand l'élément existe réellement.
- La même ref sert à re-focaliser en cas d'email invalide — la logique impérative reste centralisée et lisible.

### Exemple 2 — Scroll vers un post + valeur mutable (id de timer)

Dans l'admin TribuZen, quand un admin clique sur une notification « nouveau post », on veut **scroller en douceur vers ce post** puis le **surligner 2 secondes**. On combine une ref DOM (scroll) et une ref mutable (id du timer de surlignage).

```tsx
import { useRef, useState } from 'react';

interface Post {
  id: string;
  author: string;
  body: string;
}

function PostFeed({ posts }: { posts: Post[] }) {
  const targetRef = useRef<HTMLDivElement>(null);
  // Ref mutable : id du timer de surlignage — jamais affiché → useRef
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const goToLatest = () => {
    // 1. Scroll DOM impératif vers le post ciblé
    targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 2. Surlignage : on annule un éventuel timer précédent (mutation silencieuse)
    if (highlightTimer.current) clearTimeout(highlightTimer.current);

    const latestId = posts[posts.length - 1]?.id ?? null;
    setHighlightedId(latestId); // celui-là re-render : la couleur change à l'écran

    // 3. On stocke le nouvel id de timer dans la ref (pas de re-render)
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 2000);
  };

  return (
    <div>
      <button onClick={goToLatest}>Aller au dernier post</button>
      {posts.map((post, i) => {
        const isLast = i === posts.length - 1;
        return (
          <div
            key={post.id}
            ref={isLast ? targetRef : undefined} // ref seulement sur la cible
            style={{
              padding: '1rem',
              background: post.id === highlightedId ? '#fef08a' : 'transparent',
              transition: 'background 0.4s',
            }}
          >
            <strong>{post.author}</strong>
            <p>{post.body}</p>
          </div>
        );
      })}
    </div>
  );
}

export default PostFeed;
```

**Discrimination clé de cet exemple :**
- `highlightedId` est dans un `useState` **parce qu'il change l'affichage** (la couleur de fond). Il DOIT re-render.
- `highlightTimer.current` est dans un `useRef` **parce que l'id du timer ne s'affiche jamais**. Le stocker en state provoquerait un re-render inutile à chaque scroll.
- La même méthode gère les deux : la ref DOM pour scroller, la ref mutable pour ne pas empiler les timers.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Lire `ref.current` pendant le rendu

```tsx
// ❌ inputRef.current vaut null au premier rendu → crash ou no-op
function Bad() {
  const inputRef = useRef<HTMLInputElement>(null);
  inputRef.current.focus(); // 💥 'null' au premier rendu
  return <input ref={inputRef} />;
}

// ✅ On accède au DOM après le montage, dans un effect ou un handler
function Good() {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return <input ref={inputRef} />;
}
```

**Pourquoi :** React remplit `ref.current` **après** avoir rendu et monté le composant. Pendant le rendu, la valeur est encore l'initiale (`null`). Le rendu doit rester pur — on touche le DOM dans `useEffect` ou dans les event handlers, jamais dans le corps du composant.

### PIÈGE #2 — Mettre dans une ref une valeur qui doit s'afficher

```tsx
// ❌ Le compteur change mais l'écran ne bouge JAMAIS (pas de re-render)
function BrokenCounter() {
  const count = useRef(0);
  return <button onClick={() => { count.current += 1; }}>
    {count.current} {/* figé à 0 à l'écran */}
  </button>;
}

// ✅ Une valeur affichée vit dans un state
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Pourquoi :** modifier `ref.current` est silencieux. Si la valeur apparaît dans le JSX, elle doit déclencher un re-render → c'est le rôle de `useState`. Règle : *affiché ⇒ state ; coulisses ⇒ ref*.

### PIÈGE #3 — Oublier le type générique de la ref DOM

```tsx
// ❌ Sans type, current est `null` et TS bloque tout accès
const ref = useRef(null);
ref.current?.scrollIntoView(); // erreur TS : propriété inconnue sur 'never'

// ✅ Type explicite → current est HTMLDivElement | null
const ref2 = useRef<HTMLDivElement>(null);
ref2.current?.scrollIntoView();
```

**Pourquoi :** sans paramètre générique, TypeScript infère `null` et refuse tout appel de méthode DOM. On type toujours avec l'interface `HTMLXxxElement` correspondant à l'élément ciblé.

### PIÈGE #4 — Écrire encore `forwardRef` en React 19

```tsx
// ❌ En React 19, forwardRef est déprécié (encore fonctionnel, mais à éviter)
const Field = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
));

// ✅ React 19 : ref est une prop standard
function Field({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

**Pourquoi :** React 19 a promu `ref` au rang de prop normale. `forwardRef` sera retiré dans une version future ; l'écrire dans du code neuf ajoute du bruit et un `displayName` à gérer. On le lit encore dans l'existant, on ne l'écrit plus.

---

## 5. Ancrage TribuZen

Les trois usages de `useRef` de ce module correspondent à des besoins réels de l'admin TribuZen.

**Focus auto — formulaire d'invitation** (`src/features/invite/InviteForm.tsx`) — à l'ouverture du panneau « Inviter un membre », le champ email reçoit le focus via `useRef<HTMLInputElement>` + `useEffect(…, [])`. L'admin enchaîne les invitations au clavier sans jamais toucher la souris. C'est le cas concret du module, résolu en Exemple 1.

**Scroll vers un post** (`src/features/feed/PostFeed.tsx`) — depuis une notification « nouveau message dans une famille », l'admin est amené au post concerné par `scrollIntoView({ behavior: 'smooth' })` sur une ref DOM, puis le post est surligné 2 s. C'est l'Exemple 2.

**Valeur mutable sans re-render** (`src/features/feed/PostFeed.tsx`, `src/hooks/usePolling.ts`) — les id de `setTimeout`/`setInterval` (surlignage, polling des notifications, auto-refresh du dashboard) sont stockés dans des `useRef` pour être annulés proprement sans déclencher de rendu. Idem pour les `AbortController` des requêtes annulables.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  features/
    invite/
      InviteForm.tsx      // focus auto email (useRef DOM)
    feed/
      PostFeed.tsx        // scrollIntoView + timer de surlignage
  hooks/
    usePolling.ts         // id d'interval en useRef (pas de re-render)
```

---

## 6. Points clés

1. `useRef(init)` renvoie un objet stable `{ current }` qui **persiste entre les rendus** et dont la **mutation ne déclenche aucun re-render**.
2. Usage 1 — **valeur mutable** : id de timer, `AbortController`, valeur précédente, compteur de rendus (tout ce qui ne s'affiche pas).
3. Usage 2 — **accès DOM** : `ref={maRef}` sur un élément ; React écrit l'élément dans `.current` **après** le montage.
4. Les trois gestes DOM impératifs légitimes : `focus()`, `scrollIntoView()`, `getBoundingClientRect()`.
5. On type une ref DOM avec l'interface `HTMLXxxElement` et on l'initialise à `null` ; `.current` est donc `T | null` → optional chaining `?.`.
6. **React 19** : `ref` est une prop standard — `forwardRef` n'est plus nécessaire et devient déprécié (encore lisible dans l'existant).
7. Les callback refs (`ref={node => …}`) permettent de réagir au montage/démontage ; en React 19 elles peuvent retourner une fonction de nettoyage.
8. Ne JAMAIS mettre une valeur affichée dans une ref, ni lire/écrire `.current` pendant le rendu : *affiché ⇒ state, coulisses ⇒ ref*.

---

## 7. Seeds Anki

```
Quelles sont les deux propriétés fondamentales de l'objet renvoyé par useRef ?|1) Il persiste entre les rendus (même objet à chaque rendu). 2) Modifier son .current ne déclenche AUCUN re-render (mutation silencieuse).
Quand utiliser useRef plutôt que useState ?|Quand la valeur ne s'affiche pas dans le JSX et ne doit pas déclencher de re-render : id de timer, AbortController, valeur précédente, référence DOM. Test : "si je change ça, l'écran doit-il changer ?" Non → useRef.
Pourquoi inputRef.current est-il null au premier rendu ?|Parce que React remplit .current APRÈS avoir rendu et monté le composant. Pendant le rendu, la valeur est encore l'initiale (null). On accède donc au DOM dans un useEffect ou un handler, pas dans le corps du composant.
Comment focaliser un input au montage avec useRef ?|const ref = useRef<HTMLInputElement>(null); puis useEffect(() => ref.current?.focus(), []); et <input ref={ref} />. Le focus s'exécute après le montage, quand l'élément existe.
Qu'est-ce qui change pour les refs en React 19 par rapport à forwardRef ?|ref devient une prop standard : on la déclare dans les props (ref?: React.Ref<...>) et on la transmet directement. forwardRef n'est plus nécessaire et devient déprécié (encore présent dans les codebases existantes).
Quels sont les trois gestes DOM impératifs courants faits via une ref ?|focus() (donner le curseur), scrollIntoView() (amener dans le viewport), getBoundingClientRect() (mesurer dimensions/position).
Qu'est-ce qu'une callback ref et quelle est sa nouveauté en React 19 ?|Une fonction passée à ref, appelée avec l'élément au montage et null au démontage. Nouveauté React 19 : elle peut retourner une fonction de nettoyage (comme useEffect), appelée au démontage.
Pourquoi ne faut-il pas stocker une valeur affichée dans une ref ?|Parce que muter ref.current ne déclenche pas de re-render : l'écran resterait figé sur l'ancienne valeur. Toute valeur affichée doit vivre dans un state pour provoquer le rendu.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-10-useref-et-dom/README.md`. Construire le formulaire d'invitation TribuZen avec focus auto du champ email, puis ajouter le scroll vers un post et un id de timer stocké en ref — corrigé complet inclus.
