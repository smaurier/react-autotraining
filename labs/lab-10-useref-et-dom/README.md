# Lab 10 — useRef et le DOM

> **Outcome :** à la fin, tu sais focaliser un champ au montage, scroller vers un élément et stocker un id de timer sans re-render, en React 19 + TypeScript.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis le formulaire d'invitation de l'admin TribuZen et son feed de posts. Cahier des charges **exact** :

1. **`InviteForm`** — un formulaire avec un champ email qui **reçoit le focus automatiquement** dès l'ouverture. À la soumission, si l'email n'a pas de `@`, on re-focalise le champ au lieu d'envoyer.
2. **`PostFeed`** — une liste de posts + un bouton « Aller au dernier post » qui **scrolle en douceur** vers le dernier post et le **surligne 2 secondes**. L'id du timer de surlignage est stocké dans une **ref mutable** (pas de state, pas de re-render pour lui).

**Données de départ (à copier dans `PostFeed.tsx`) :**

```tsx
export interface Post {
  id: string;
  author: string;
  body: string;
}

export const DEMO_POSTS: Post[] = [
  { id: 'p1', author: 'Alice', body: 'Qui vient au pique-nique dimanche ?' },
  { id: 'p2', author: 'Bruno', body: 'Moi ! Je ramène la salade.' },
  { id: 'p3', author: 'Chloé', body: 'Pensez à confirmer avant vendredi.' },
  { id: 'p4', author: 'Dan', body: 'Dernier post : rdv 12h au parc.' },
];
```

**Contraintes :**
- `InviteForm` : focus au montage via `useRef<HTMLInputElement>` + `useEffect(…, [])`. **Interdit** d'utiliser `document.querySelector` ou l'attribut HTML `autofocus`.
- `PostFeed` : le scroll passe par `scrollIntoView` sur une ref DOM ; l'id de timer vit dans un `useRef`, **pas** dans un `useState`.
- La couleur de surlignage, elle, est un `useState` (elle s'affiche).
- TypeScript strict : chaque ref DOM est typée avec son interface `HTMLXxxElement`.
- **Pas de gap-fill** — tu écris chaque composant complet depuis le starter.

### Starter minimal

Crée ces fichiers dans ton projet Vite (`pnpm create vite@latest tribuzen-lab --template react-ts`) :

```
src/
  features/
    invite/
      InviteForm.tsx   ← à écrire
    feed/
      PostFeed.tsx     ← à écrire
  App.tsx              ← branche <InviteForm /> puis <PostFeed posts={DEMO_POSTS} />
```

Lance `pnpm dev` et valide dans le navigateur au fur et à mesure.

---

## Étapes (en friction)

1. **Écris `InviteForm.tsx`** — state `email`, ref `emailRef` typée `HTMLInputElement`. Dans un `useEffect(…, [])`, appelle `emailRef.current?.focus()`. Branche `ref={emailRef}` sur l'`<input>`.
2. **Ajoute la validation** — `handleSubmit` : `e.preventDefault()`, puis si `!email.includes('@')`, re-focalise via `emailRef.current?.focus()` et `return` sans envoyer.
3. **Vérifie le focus** — recharge la page : le curseur doit déjà clignoter dans le champ email, sans clic.
4. **Écris `PostFeed.tsx`** — copie `Post` + `DEMO_POSTS`. Crée `targetRef` (`HTMLDivElement`), `highlightTimer` (`useRef<ReturnType<typeof setTimeout> | null>`), et `highlightedId` (`useState<string | null>`).
5. **Écris `goToLatest`** — `scrollIntoView({ behavior: 'smooth', block: 'center' })` sur `targetRef`, annule le timer précédent (`clearTimeout`), passe `highlightedId` au dernier id, stocke le nouveau `setTimeout(…, 2000)` dans `highlightTimer.current`.
6. **Rends la liste** — `posts.map`, avec `ref={isLast ? targetRef : undefined}` sur le dernier, et un fond jaune conditionné par `post.id === highlightedId`.
7. **Vérifie** : clic sur le bouton → scroll fluide vers le dernier post → surlignage jaune 2 s → retour transparent. Reclique vite plusieurs fois : pas de clignotement anarchique (le timer précédent est bien annulé).

---

## Corrigé complet commenté

```tsx
// ─── src/features/invite/InviteForm.tsx ─────────────────────────
import { useRef, useEffect, useState } from 'react';

function InviteForm() {
  const [email, setEmail] = useState('');
  // Ref DOM typée sur l'input, initialisée à null (rien avant le montage)
  const emailRef = useRef<HTMLInputElement>(null);

  // useEffect(…, []) : s'exécute UNE fois, après le montage.
  // À cet instant l'input existe → emailRef.current est le vrai <input>.
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation minimale : on re-focalise si l'email est invalide
    if (!email.includes('@')) {
      emailRef.current?.focus();
      return;
    }
    // ... ici, appel API d'envoi de l'invitation
    alert(`Invitation envoyée à ${email}`);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <label style={{ display: 'block' }}>
        Email de l'invité
        <input
          ref={emailRef}         // React remplit emailRef.current au montage
          name="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ display: 'block', marginTop: 4 }}
        />
      </label>
      <button type="submit" style={{ marginTop: 8 }}>
        Envoyer l'invitation
      </button>
    </form>
  );
}

export default InviteForm;

// ─── src/features/feed/PostFeed.tsx ─────────────────────────────
import { useRef, useState } from 'react';

export interface Post {
  id: string;
  author: string;
  body: string;
}

export const DEMO_POSTS: Post[] = [
  { id: 'p1', author: 'Alice', body: 'Qui vient au pique-nique dimanche ?' },
  { id: 'p2', author: 'Bruno', body: 'Moi ! Je ramène la salade.' },
  { id: 'p3', author: 'Chloé', body: 'Pensez à confirmer avant vendredi.' },
  { id: 'p4', author: 'Dan', body: 'Dernier post : rdv 12h au parc.' },
];

function PostFeed({ posts }: { posts: Post[] }) {
  // Ref DOM : le dernier post, cible du scroll
  const targetRef = useRef<HTMLDivElement>(null);
  // Ref MUTABLE : id du timer de surlignage — jamais affiché → useRef, pas useState
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // State : l'id surligné S'AFFICHE (couleur de fond) → useState
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const goToLatest = () => {
    // 1. Scroll DOM impératif vers le dernier post
    targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 2. On annule un éventuel surlignage en cours (mutation silencieuse de la ref)
    if (highlightTimer.current) clearTimeout(highlightTimer.current);

    // 3. On surligne le dernier post (ce setState re-render : la couleur change)
    const latestId = posts[posts.length - 1]?.id ?? null;
    setHighlightedId(latestId);

    // 4. On stocke le nouvel id de timer dans la ref (aucun re-render pour lui)
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
              marginTop: '0.5rem',
              borderRadius: 6,
              background: post.id === highlightedId ? '#fef08a' : '#f5f5f5',
              transition: 'background 0.4s',
            }}
          >
            <strong>{post.author}</strong>
            <p style={{ margin: '4px 0 0' }}>{post.body}</p>
          </div>
        );
      })}
    </div>
  );
}

export default PostFeed;

// ─── src/App.tsx ────────────────────────────────────────────────
import InviteForm from './features/invite/InviteForm';
import PostFeed, { DEMO_POSTS } from './features/feed/PostFeed';

function App() {
  return (
    <div style={{ padding: '2rem', maxWidth: 480 }}>
      <h1>TribuZen Admin — Lab 10</h1>
      <InviteForm />
      <PostFeed posts={DEMO_POSTS} />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- `emailRef.current?.focus()` est dans `useEffect(…, [])` : il s'exécute après le montage, quand l'`<input>` existe réellement dans le DOM. Un appel dans le corps du composant échouerait (`current` encore `null`).
- La ref cible précisément CET input — pas de `querySelector` global, donc pas de conflit si un autre formulaire est monté.
- Dans `PostFeed`, la discrimination state/ref est nette : `highlightedId` s'affiche (couleur) → `useState` ; `highlightTimer.current` est en coulisses (id technique) → `useRef`. Mettre l'id de timer en state provoquerait un re-render inutile à chaque clic.
- `clearTimeout(highlightTimer.current)` avant de relancer empêche l'empilement de timers si l'admin reclique vite — le surlignage reste propre.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes :**

1. Extrait le champ email dans un composant enfant `EmailInput` qui reçoit la ref via la **prop `ref` standard de React 19** (`ref?: React.Ref<HTMLInputElement>`) — **sans** `forwardRef`. `InviteForm` garde la ref et déclenche le focus.
2. Dans `PostFeed`, ajoute un nettoyage du timer au démontage : `useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); }, [])`.
3. Ajoute un bouton « Aller au 1er post » qui scrolle vers le premier post (nouvelle ref `firstRef`).
4. **Sans ouvrir ce corrigé** ni le module 10.

**Critère de réussite :** le focus auto fonctionne toujours en passant par l'enfant `EmailInput` sans `forwardRef` ; les deux boutons scrollent vers leur cible ; aucun warning de timer fantôme au démontage.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces composants vivent ici :

```
tribuzen/src/
  features/
    invite/
      InviteForm.tsx     // focus auto email (useRef DOM + useEffect)
    feed/
      PostFeed.tsx       // scrollIntoView + timer de surlignage en ref
  hooks/
    usePolling.ts        // id d'interval stocké en useRef (pas de re-render)
```

**Différences par rapport au lab :**
- Les styles inline seront remplacés par les classes du design system TribuZen (tokens, variables CSS) — la logique de refs reste identique.
- `Post` sera importé depuis `src/types/post.ts` (partagé) — dans le lab on le définit dans `PostFeed.tsx`.
- Le champ email passera par le composant `TextField` du design system, qui accepte déjà `ref` en prop standard React 19.
- L'annulation du timer sera doublée d'un cleanup au démontage dans un `useEffect` (voir variante J+30).

**Commit cible :**
```
feat(invite): focus auto du champ email au montage (useRef + useEffect)
feat(feed): scroll vers un post + surlignage temporisé (ref DOM + ref timer)
```
