# Lab 05 — Composants et composition

> **Outcome :** à la fin, tu sais construire trois composants réutilisables (`Card`, `Avatar`, `Badge`) en React 19 + TypeScript, les assembler dans un container `MemberPanel`, et organiser les fichiers avec colocation.
> **Vrai outil :** React 19 + Vite dev server (HMR visible en direct dans le navigateur).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu construis les briques UI de l'admin TribuZen. Cahier des charges **exact** :

1. **`Card`** — enveloppe générique avec `children` et `onClick` optionnel.
2. **`Avatar`** — affiche une image avec fallback initiales + indicateur "En ligne" optionnel.
3. **`Badge`** — pastille colorée selon `variant` (`admin` | `mod` | `member`).
4. **`MemberPanel`** — container qui assemble les trois composants ci-dessus pour afficher la fiche d'un membre, avec un état `expanded` local qui révèle les détails (email + famille).

**Données de départ (à copier dans `MemberPanel.tsx`) :**

```tsx
export interface Member {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: 'admin' | 'mod' | 'member';
  isOnline: boolean;
  familyName: string;
}

const DEMO_MEMBER: Member = {
  id: 'm1',
  name: 'Alice Dupont',
  avatar: 'https://i.pravatar.cc/80?u=alice',
  email: 'alice@tribuzen.app',
  role: 'admin',
  isOnline: true,
  familyName: 'Les Dupont',
};
```

**Contraintes :**
- Aucun composant présentationnel ne fetche de données ni n'utilise `useEffect`.
- `Avatar` affiche les deux premières initiales du `name` si l'image ne charge pas (attribut `onerror` ou fallback `useState`).
- `Badge` utilise une union TypeScript stricte pour `variant` — pas de `string`.
- **Pas de gap-fill** — tu écris chaque composant complet depuis le starter.

### Starter minimal

Crée ces fichiers dans ton projet Vite (`pnpm create vite@latest tribuzen-lab --template react-ts`) :

```
src/
  components/
    ui/
      Card.tsx      ← à écrire
      Avatar.tsx    ← à écrire
      Badge.tsx     ← à écrire
  features/
    member/
      MemberPanel.tsx  ← à écrire, importe les trois ui/
  App.tsx           ← branche <MemberPanel member={DEMO_MEMBER} />
```

Lance `pnpm dev` et valide dans le navigateur au fur et à mesure.

---

## Étapes (en friction)

1. **Écris `Card.tsx`** — interface `CardProps` avec `children: React.ReactNode`, `className?: string`, `onClick?: () => void`. Gère le curseur `pointer` si `onClick` est fourni (style inline ou classe conditionnelle).
2. **Écris `Avatar.tsx`** — props `src`, `name`, `size?: 'sm' | 'md' | 'lg'`, `isOnline?: boolean`. Calcule les initiales (`name.split(' ').map(w => w[0]).join('')`). Affiche l'image ou les initiales selon `imgError` state.
3. **Écris `Badge.tsx`** — props `variant: 'admin' | 'mod' | 'member'`, `children: React.ReactNode`. Ajoute une `const COLORS` record pour les classes ou inline styles.
4. **Écris `MemberPanel.tsx`** — importe `Card`, `Avatar`, `Badge`. State `expanded` local. Quand `expanded`, affiche un bloc avec email + familyName.
5. **Branche dans `App.tsx`** — `<MemberPanel member={DEMO_MEMBER} />`. Vérifie dans le navigateur : avatar, badge "Admin", bouton Détails / Réduire fonctionnel.
6. **Vérifie les cas limites** : mettre `isOnline: false` → dot disparaît ; `role: 'mod'` → couleur badge change ; `avatar: ''` → initiales s'affichent.

---

## Corrigé complet commenté

```tsx
// ─── src/components/ui/Card.tsx ─────────────────────────────────
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

// Composant présentationnel pur — pas d'état, pas de fetch
// onClick optionnel : on adapte le curseur seulement si fourni
function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={['card', className].filter(Boolean).join(' ')}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      {children}
    </div>
  );
}

export default Card;

// ─── src/components/ui/Avatar.tsx ───────────────────────────────
import { useState } from 'react';

interface AvatarProps {
  src: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
}

// Tailles en pixels pour le rendu inline
const SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

function Avatar({ src, name, size = 'md', isOnline = false }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const px = SIZE_PX[size];

  // Initiales : "Alice Dupont" → "AD"
  const initials = name
    .split(' ')
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        width: px,
        height: px,
      }}
    >
      {src && !imgError ? (
        // Image principale — setImgError si l'URL est cassée
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: px, height: px, borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        // Fallback initiales — même taille que l'image
        <div
          aria-label={name}
          style={{
            width: px,
            height: px,
            borderRadius: '50%',
            background: '#6366f1',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: px * 0.35,
          }}
        >
          {initials}
        </div>
      )}

      {/* Indicateur "En ligne" — positionné en bas à droite */}
      {isOnline && (
        <span
          aria-label="En ligne"
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: px * 0.25,
            height: px * 0.25,
            borderRadius: '50%',
            background: '#22c55e',
            border: '2px solid #fff',
          }}
        />
      )}
    </div>
  );
}

export default Avatar;

// ─── src/components/ui/Badge.tsx ────────────────────────────────
import React from 'react';

interface BadgeProps {
  variant: 'admin' | 'mod' | 'member';
  children: React.ReactNode;
}

// Record strict — TypeScript garantit que toutes les variantes sont couvertes
const BG: Record<BadgeProps['variant'], string> = {
  admin: '#ef4444',   // rouge
  mod: '#f59e0b',    // orange
  member: '#6b7280', // gris
};

function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.5rem',
        borderRadius: 4,
        background: BG[variant],
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;

// ─── src/features/member/MemberPanel.tsx ────────────────────────
import { useState } from 'react';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: 'admin' | 'mod' | 'member';
  isOnline: boolean;
  familyName: string;
}

interface MemberPanelProps {
  member: Member;
}

// Container : seul responsable de l'état expanded
// Les trois composants ui/ ne connaissent pas Member — ils reçoivent des primitives
function MemberPanel({ member }: MemberPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={{ padding: '1rem', maxWidth: 320 }}>
      {/* En-tête : avatar + nom + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Avatar
          src={member.avatar}
          name={member.name}
          isOnline={member.isOnline}
          size="md"
        />
        <div>
          <strong>{member.name}</strong>
          <div style={{ marginTop: 4 }}>
            <Badge variant={member.role}>{member.role}</Badge>
          </div>
        </div>
      </div>

      {/* Détails — visibles seulement si expanded */}
      {expanded && (
        <dl style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
          <dt style={{ fontWeight: 600 }}>Email</dt>
          <dd style={{ margin: '0 0 0.4rem' }}>{member.email}</dd>
          <dt style={{ fontWeight: 600 }}>Famille</dt>
          <dd style={{ margin: 0 }}>{member.familyName}</dd>
        </dl>
      )}

      {/* Toggle — expresion inline suffisante pour une simple inversion */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{ marginTop: '0.75rem' }}
      >
        {expanded ? 'Réduire' : 'Détails'}
      </button>
    </Card>
  );
}

export default MemberPanel;

// ─── src/App.tsx ─────────────────────────────────────────────────
import MemberPanel from './features/member/MemberPanel';
import type { Member } from './features/member/MemberPanel';

const DEMO_MEMBER: Member = {
  id: 'm1',
  name: 'Alice Dupont',
  avatar: 'https://i.pravatar.cc/80?u=alice',
  email: 'alice@tribuzen.app',
  role: 'admin',
  isOnline: true,
  familyName: 'Les Dupont',
};

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>TribuZen Admin — Lab 05</h1>
      <MemberPanel member={DEMO_MEMBER} />
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- `Card`, `Avatar`, `Badge` n'ont aucune connaissance de `Member` — ils restent génériques et réutilisables hors du contexte membre.
- `Avatar` gère son propre `imgError` local : c'est de l'état UI pur (pas d'état métier), donc il est légitime dans le présentationnel.
- `MemberPanel` ne passe à `Avatar` et `Badge` que les scalaires nécessaires (`src`, `name`, `variant`) — pas l'objet `Member` complet.
- Le `Record<variant, string>` dans `Badge` garantit à la compilation que toutes les variantes ont un style — TypeScript signale une erreur si on ajoute une variante sans l'ajouter au Record.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes :**

1. Ajoute un composant `CardGrid` qui accepte `children: React.ReactNode` et affiche ses enfants dans une grille CSS (`display: grid`, `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`).
2. Dans `App.tsx`, affiche **trois** `MemberPanel` dans un `CardGrid`, avec des membres ayant des rôles différents (`admin`, `mod`, `member`).
3. Ajoute une prop `onSelect?: (id: string) => void` à `MemberPanel` — si fournie, la `Card` entière devient cliquable et appelle `onSelect(member.id)`.
4. **Sans ouvrir ce corrigé** ni le module 05.

**Critère de réussite :** les trois panels s'affichent en grille responsive, chacun avec le bon badge et la bonne couleur, le clic sur la card logge l'id dans la console.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces composants vivent ici :

```
tribuzen/src/
  components/
    ui/
      Card/
        Card.tsx
        index.ts          ← export { default } from './Card'
      Avatar/
        Avatar.tsx
        index.ts
      Badge/
        Badge.tsx
        index.ts
    features/
      member/
        MemberPanel.tsx
        MemberDetail.tsx  ← extrait en sous-composant (voir module)
        index.ts
```

**Différences par rapport au lab :**
- Les styles inline seront remplacés par des classes du design system TribuZen (variables CSS, tokens) — la logique de props reste identique.
- `Member` sera importé depuis `src/types/member.ts` (partagé entre composants) — dans le lab, on le définit dans `MemberPanel.tsx`.
- `MemberPanel` recevra éventuellement `onSelect` pour ouvrir un panneau latéral (pattern du container parent `MemberListPage`).

**Commit cible :**
```
feat(ui): Card, Avatar, Badge — composants réutilisables admin TribuZen
feat(member): MemberPanel — composition Avatar + Badge + MemberDetail
```
