# Lab 08 — useState

> **Outcome :** à la fin, tu sais gérer l'état local d'un formulaire contrôlé et d'une liste avec `useState` en React 19 + TypeScript, en respectant l'immuabilité et l'updater fonctionnel.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis le `InvitePanel` de l'admin TribuZen : un panneau où l'admin invite des membres via un formulaire contrôlé, puis les voit apparaître dans une liste qu'il peut modifier.

Cahier des charges **exact** :

1. **Formulaire contrôlé** — trois champs (`name`, `email`, `role`) stockés dans **un seul** objet d'état `useState<InviteForm>`. Chaque champ est contrôlé (`value` + `onChange`).
2. **Ajout immuable** — au submit, ajouter un membre à la liste `members` **sans muter** le tableau, puis réinitialiser le formulaire.
3. **Toggle** — un bouton "Masquer / Afficher la liste" piloté par un `useState<boolean>` avec updater fonctionnel.
4. **Compteur d'invitations** — afficher combien de membres ont été invités depuis le chargement (dérivé de `members.length`, pas un state séparé).
5. **Modif immuable** — chaque membre de la liste a un bouton pour promouvoir son rôle (`member` → `mod` → `admin`) via `map`.
6. **Suppression immuable** — chaque membre a un bouton "Retirer" via `filter`.

**Types de départ (à copier dans `InvitePanel.tsx`) :**

```tsx
export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'mod' | 'member';
}

export interface InviteForm {
  name: string;
  email: string;
  role: Member['role'];
}
```

**Contraintes :**
- **Zéro mutation** : jamais de `push`, `splice`, `sort` sur le state, ni d'affectation directe sur un champ de `form`.
- Toute mise à jour dont la valeur dépend de l'ancienne utilise l'**updater fonctionnel** `setX(prev => ...)`.
- Le compteur d'invitations est **dérivé** (`members.length`), pas un `useState` à part.
- **Pas de gap-fill** — tu écris chaque morceau depuis le starter.

### Starter minimal

Crée un projet Vite et le fichier du panneau :

```
pnpm create vite@latest tribuzen-lab --template react-ts

src/
  features/
    member/
      InvitePanel.tsx   ← à écrire
  App.tsx               ← branche <InvitePanel />
```

Lance `pnpm dev` et valide dans le navigateur au fur et à mesure.

---

## Étapes (en friction)

1. **Déclare les états** — `const [form, setForm] = useState<InviteForm>(EMPTY_FORM)`, `const [members, setMembers] = useState<Member[]>([])`, `const [visible, setVisible] = useState(true)`. Définis `EMPTY_FORM` comme constante hors du composant.
2. **Écris `updateField`** — helper générique `<K extends keyof InviteForm>(key: K, value: InviteForm[K])` qui fait `setForm(prev => ({ ...prev, [key]: value }))`. Branche les trois champs dessus.
3. **Écris `handleSubmit`** — `e.preventDefault()`, garde si `email` vide, crée le `Member` (id via `crypto.randomUUID()`), ajoute par `setMembers(prev => [...prev, newMember])`, reset par `setForm(EMPTY_FORM)`.
4. **Écris le toggle** — bouton qui fait `setVisible(prev => !prev)` ; la liste ne s'affiche que si `visible`.
5. **Écris `promote`** — mappe la liste : le membre ciblé passe au rôle suivant (`member` → `mod` → `admin`, `admin` reste `admin`), les autres inchangés.
6. **Écris `remove`** — `setMembers(prev => prev.filter(m => m.id !== id))`.
7. **Vérifie dans le navigateur** — invite 2-3 membres, promeus, retire, masque/affiche la liste. Vérifie que le compteur suit et que le formulaire se vide après chaque envoi.

---

## Corrigé complet commenté

```tsx
// ─── src/features/member/InvitePanel.tsx ────────────────────────
import { useState } from 'react';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'mod' | 'member';
}

export interface InviteForm {
  name: string;
  email: string;
  role: Member['role'];
}

// Constante hors composant : référence stable, réutilisée pour le reset
const EMPTY_FORM: InviteForm = { name: '', email: '', role: 'member' };

// Ordre de promotion des rôles
const NEXT_ROLE: Record<Member['role'], Member['role']> = {
  member: 'mod',
  mod: 'admin',
  admin: 'admin', // déjà au sommet
};

function InvitePanel() {
  // Un seul objet : les 3 champs du formulaire changent et voyagent ensemble
  const [form, setForm] = useState<InviteForm>(EMPTY_FORM);
  // Liste de membres invités — état local avant tout branchement API
  const [members, setMembers] = useState<Member[]>([]);
  // État UI pur : visibilité de la liste
  const [visible, setVisible] = useState(true);

  // Compteur DÉRIVÉ — pas de useState séparé à maintenir synchronisé
  const inviteCount = members.length;

  // Helper générique : K borne la clé aux champs réels, value est typée en conséquence
  const updateField = <K extends keyof InviteForm>(key: K, value: InviteForm[K]) => {
    // Spread immuable : nouvel objet, React voit une nouvelle référence
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return; // garde minimale

    const newMember: Member = {
      id: crypto.randomUUID(),
      name: form.name,
      email: form.email,
      role: form.role,
    };

    // Ajout immuable : nouveau tableau, jamais push
    setMembers(prev => [...prev, newMember]);
    // Reset du formulaire contrôlé
    setForm(EMPTY_FORM);
  };

  // Promotion immuable : map remplace uniquement le membre ciblé
  const promote = (id: string) => {
    setMembers(prev =>
      prev.map(m => (m.id === id ? { ...m, role: NEXT_ROLE[m.role] } : m))
    );
  };

  // Suppression immuable : filter retourne un nouveau tableau
  const remove = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  return (
    <section>
      <h2>Inviter un membre ({inviteCount} invité{inviteCount > 1 ? 's' : ''})</h2>

      <form onSubmit={handleSubmit}>
        {/* Champs contrôlés : value vient du state, onChange le met à jour */}
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
      </form>

      {/* Toggle : updater car la nouvelle valeur dépend de l'ancienne */}
      <button type="button" onClick={() => setVisible(prev => !prev)}>
        {visible ? 'Masquer la liste' : 'Afficher la liste'}
      </button>

      {visible && (
        <ul>
          {members.map(m => (
            <li key={m.id}>
              {m.name || m.email} — <strong>{m.role}</strong>
              <button type="button" onClick={() => promote(m.id)}>Promouvoir</button>
              <button type="button" onClick={() => remove(m.id)}>Retirer</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default InvitePanel;

// ─── src/App.tsx ─────────────────────────────────────────────────
import InvitePanel from './features/member/InvitePanel';

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>TribuZen Admin — Lab 08</h1>
      <InvitePanel />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- Le formulaire est **entièrement contrôlé** : `form` est la seule source de vérité, chaque champ lit sa valeur depuis `form` et la réécrit par spread immuable.
- `updateField` est typé génériquement : écrire `updateField('rôle', ...)` (clé inexistante) ou une valeur du mauvais type est refusé à la compilation.
- Les trois mutations de liste (ajout, promotion, suppression) produisent toujours un **nouveau** tableau → React détecte le changement de référence et re-rend.
- `inviteCount` est **dérivé** de `members.length` : impossible qu'il se désynchronise, contrairement à un `useState` parallèle.
- Le toggle et l'ajout utilisent l'**updater fonctionnel** car leur valeur dépend de l'ancienne.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 25 minutes :**

1. Ajoute une **validation d'email** : le bouton "Inviter" est désactivé (`disabled`) tant que `form.email` ne contient pas `@`. Calcule ce booléen en dérivé, pas en state.
2. Empêche les **doublons** : au submit, si un membre avec le même email existe déjà, ne l'ajoute pas (utilise `prev.some(...)` dans l'updater).
3. Ajoute un bouton "**Tout retirer**" qui vide la liste (`setMembers([])`) — et un `useState` de confirmation : premier clic affiche "Confirmer ?", second clic vide réellement.
4. Ajoute un tri d'affichage **sans muter** le state : affiche `[...members].sort((a, b) => a.name.localeCompare(b.name))` au rendu, en gardant `members` dans l'ordre d'insertion.
5. **Sans rouvrir ce corrigé** ni le module 08.

**Critère de réussite :** le bouton reste désactivé sur email invalide, aucun doublon n'entre, "Tout retirer" demande confirmation, et la liste s'affiche triée alphabétiquement sans que l'ordre interne ne soit muté.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ce panneau vit ici :

```
tribuzen/src/
  features/
    member/
      InvitePanel.tsx    # formulaire contrôlé + liste (ce lab)
      MemberPanel.tsx    # toggle expanded (module 05 / cas concret 08)
      MemberList.tsx     # liste extraite si InvitePanel grossit
```

**Différences par rapport au lab :**
- Les styles inline seront remplacés par les composants du design system TribuZen (`Card`, `Badge`, `Avatar` du lab 05) — la logique `useState` reste identique.
- `Member` sera importé depuis `src/types/member.ts` (partagé), pas redéfini dans le fichier.
- Au submit, l'ajout local par `useState` sera remplacé par une **mutation React Query** (`useMutation`) qui appelle l'API d'invitation ; le formulaire contrôlé, lui, reste piloté par `useState` exactement comme ici.

**Commit cible :**
```
feat(member): InvitePanel — formulaire d'invitation contrôlé (useState)
feat(member): liste de membres avec add/promote/remove immuables
```
