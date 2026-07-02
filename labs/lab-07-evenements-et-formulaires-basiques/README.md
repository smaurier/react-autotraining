# Lab 07 — Événements et formulaires basiques

> **Outcome :** à la fin, tu sais câbler un formulaire React 19 + TypeScript en non-contrôlé (`onSubmit` + `preventDefault` + `FormData`), typer tes handlers, et maîtriser la propagation d'un bouton d'action — le tout **sans `useState`**.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis le formulaire d'invitation de l'admin TribuZen et une ligne de membre actionnable. Cahier des charges **exact** :

1. **`InviteForm`** — un `<form>` avec un champ email (non-contrôlé) et un bouton « Inviter ». Au submit : bloquer le rechargement, lire l'email via `FormData`, ignorer si vide, logger l'invitation, puis vider le formulaire.
2. **`MemberRow`** — une ligne cliquable (logge « ouvrir profil ») contenant un bouton « Supprimer » qui logge « supprimer » **sans** déclencher l'ouverture du profil.
3. **`App`** — affiche l'`InviteForm` puis deux/trois `MemberRow`.

**Contraintes :**
- **Aucun `useState`** dans ce lab — la source de vérité des champs est le DOM (`FormData` / `useRef`).
- Le champ email a un attribut `name="email"` et un `<label htmlFor>` relié à son `id`.
- Le handler de submit est typé `React.FormEvent<HTMLFormElement>` ; le handler du bouton Supprimer est typé `React.MouseEvent<HTMLButtonElement>`.
- **Pas de gap-fill** — tu écris chaque composant complet depuis le starter.

### Starter minimal

Crée un projet Vite et ces fichiers :

```
pnpm create vite@latest tribuzen-lab07 --template react-ts
```

```
src/
  features/
    members/
      InviteForm.tsx   ← à écrire
      MemberRow.tsx     ← à écrire
  App.tsx               ← branche <InviteForm /> + quelques <MemberRow />
```

Lance `pnpm dev`, ouvre la console du navigateur et valide au fur et à mesure.

---

## Étapes (en friction)

1. **Écris `InviteForm.tsx`** — un `<form onSubmit={handleSubmit}>`. Dans `handleSubmit(e: React.FormEvent<HTMLFormElement>)` : appelle `e.preventDefault()` **en premier**, construis `new FormData(e.currentTarget)`, récupère `data.get('email')`, `trim()`, sors si vide, sinon `console.log`. Termine par `e.currentTarget.reset()`.
2. **Vérifie le reload** — retire temporairement `e.preventDefault()`, soumets : la page recharge et l'URL se remplit de `?email=...`. Remets-le. Tu viens de voir *pourquoi* il est là.
3. **Teste la touche Entrée** — clique dans le champ, tape un email, appuie sur Entrée (sans cliquer le bouton). Le submit doit partir : c'est l'intérêt de `onSubmit` sur le `<form>`.
4. **Écris `MemberRow.tsx`** — props `name`, `id`. La `<div>` racine a `onClick` qui logge « ouvrir profil ». Le bouton « Supprimer » a un `onClick` typé qui appelle `e.stopPropagation()` avant de logger « supprimer ».
5. **Casse la propagation exprès** — retire `e.stopPropagation()`, clique « Supprimer » : tu vois « supprimer » **puis** « ouvrir profil » (bubbling). Remets-le : un seul log.
6. **Branche `App.tsx`** — affiche l'`InviteForm` et 2-3 `MemberRow`. Vérifie chaque interaction dans la console.

---

## Corrigé complet commenté

```tsx
// ─── src/features/members/InviteForm.tsx ────────────────────────
function InviteForm() {
  // Handler typé : e est un SyntheticEvent de formulaire
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // 1) EN PREMIER : sans ça le navigateur recharge la page (SPA perdue)
    e.preventDefault();

    // 2) Lecture non-contrôlée : on lit tous les champs nommés au submit
    //    e.currentTarget = le <form> (typé HTMLFormElement)
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '').trim(); // clé = name="email"

    // 3) Garde simple sans état : champ vide → on sort
    if (!email) return;

    console.log('Invitation envoyée à', email);

    // 4) Vide le formulaire après envoi (API DOM native, pas d'état React)
    e.currentTarget.reset();
  };

  return (
    // On PASSE la fonction (référence), pas handleSubmit()
    <form onSubmit={handleSubmit}>
      {/* label relié via htmlFor ↔ id pour l'accessibilité */}
      <label htmlFor="email">Email du membre</label>
      <input
        id="email"       // cible du label
        name="email"     // clé lue par FormData.get('email')
        type="email"     // validation navigateur + clavier adapté
        required
        defaultValue=""  // non-contrôlé : defaultValue, PAS value
      />

      {/* type="submit" : déclenche onSubmit au clic ET à la touche Entrée */}
      <button type="submit">Inviter</button>
    </form>
  );
}

export default InviteForm;

// ─── src/features/members/MemberRow.tsx ─────────────────────────
interface MemberRowProps {
  id: string;
  name: string;
}

function MemberRow({ id, name }: MemberRowProps) {
  return (
    <div
      // Clic sur la ligne entière → ouvrir le profil
      onClick={() => console.log('ouvrir profil', id)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.5rem 0.75rem',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        cursor: 'pointer',
        marginTop: '0.5rem',
      }}
    >
      <span>{name}</span>

      <button
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          // Sans stopPropagation, le onClick du <div> partirait AUSSI (bubbling)
          e.stopPropagation();
          console.log('supprimer', id);
        }}
      >
        Supprimer
      </button>
    </div>
  );
}

export default MemberRow;

// ─── src/App.tsx ────────────────────────────────────────────────
import InviteForm from './features/members/InviteForm';
import MemberRow from './features/members/MemberRow';

function App() {
  return (
    <div style={{ padding: '2rem', maxWidth: 480 }}>
      <h1>TribuZen Admin — Lab 07</h1>

      <section>
        <h2>Inviter un membre</h2>
        <InviteForm />
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Membres</h2>
        <MemberRow id="m1" name="Alice Dupont" />
        <MemberRow id="m2" name="Bruno Martin" />
        <MemberRow id="m3" name="Carla Nguyen" />
      </section>
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- `onSubmit={handleSubmit}` passe la **référence** ; `e.preventDefault()` en tête bloque le rechargement et garde la SPA vivante.
- La lecture se fait via `FormData(e.currentTarget)` + `data.get('email')` — **aucun `useState`** : le DOM est la source de vérité, ce qui prépare le terrain pour la version contrôlée du module 08.
- Le champ a un `name` (clé `FormData`), un `id` (cible du `<label htmlFor>`), et `defaultValue` (non-contrôlé) — pas `value` seul qui figerait la saisie.
- `MemberRow` illustre la propagation : `e.stopPropagation()` isole l'action « Supprimer » de l'ouverture du profil portée par le conteneur.
- Handlers typés partout (`React.FormEvent<HTMLFormElement>`, `React.MouseEvent<HTMLButtonElement>`), sans `any`.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes, sans rouvrir ce corrigé ni le module :**

1. Ajoute un champ **rôle** au `InviteForm` : un `<select name="role">` avec `admin | mod | member` (non-contrôlé, `defaultValue="member"`). Au submit, logge `{ email, role }` lus tous les deux via le **même** `FormData`.
2. Remplace la lecture champ par champ par `Object.fromEntries(data.entries())` pour obtenir un objet d'un coup ; type le résultat avec une interface `InvitePayload`.
3. Ajoute à `MemberRow` un second bouton « Promouvoir » qui logge « promouvoir » — lui aussi doit couper la propagation.
4. Bonus lecture ciblée : ajoute une `MemberSearchBar` avec `useRef<HTMLInputElement>` qui logge la requête au submit (au lieu de `FormData`).

**Critère de réussite :** submit logge l'objet `{ email, role }`, la touche Entrée fonctionne, les deux boutons d'action n'ouvrent jamais le profil, la barre de recherche lit sa valeur via `ref`.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces composants vivent ici :

```
tribuzen/src/
  features/
    members/
      InviteForm.tsx        # onSubmit + FormData, sans état
      MemberRow.tsx         # stopPropagation sur boutons d'action
      MemberSearchBar.tsx   # useRef non-contrôlé (variante J+30)
```

**Différences par rapport au lab :**
- Les styles inline seront remplacés par les classes/tokens du design system TribuZen — la logique événementielle reste identique.
- `InviteForm` appellera une vraie mutation (`POST /api/invitations`) au lieu d'un `console.log` — le `preventDefault` + la lecture `FormData` ne changent pas.
- Au module 08, `InviteForm` passera en **contrôlé** (`value` + `onChange` + `useState`) pour valider l'email en direct et désactiver le bouton tant qu'il est invalide. Le squelette écrit ici sert de base.

**Commit cible :**
```
feat(members): InviteForm — formulaire d'invitation non-contrôlé (onSubmit + FormData)
feat(members): MemberRow — ligne actionnable avec stopPropagation
```
