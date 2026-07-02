# Lab 44 — Capacitor : plugins avancés et patterns natifs

> **Outcome :** à la fin, tu sais intégrer un plugin natif Capacitor (Camera) avec gestion de permission, détection de plateforme et fallback web, et persister une session avec `@capacitor/preferences` — le tout dans une app React 19 + TypeScript qui reste fonctionnelle sur le web.
> **Vrai outil :** projet Vite React-TS + `@capacitor/core`, `@capacitor/camera`, `@capacitor/preferences` (dev server web ; device optionnel).
> **Feedback :** le coach valide visuellement en session — pas de test-runner auto-correcteur.

---

## Énoncé

Tu prépares la couche native de l'app mobile TribuZen. Deux briques à écrire, en gardant le **web fonctionnel** (démo commerciale sans device) :

1. **`AvatarPicker`** — un bouton « Changer l’avatar » qui :
   - sur **device natif** : demande la permission caméra (si nécessaire), puis prend une photo ;
   - sur **web** : ouvre un `input file` classique ;
   - remonte dans les deux cas une **URL affichable** au parent via `onPicked(url)`.
2. **`sessionStore`** — un petit service basé sur `@capacitor/preferences` qui `save`, `load` et `clear` une session (`{ token, familyId }`), persistante entre deux lancements.

Puis une page `App.tsx` qui affiche l'avatar choisi et un bouton « Se souvenir de moi » écrivant une session de démo.

**Contraintes :**
- **Aucun** appel de plugin natif sans passer par `Capacitor.isNativePlatform()` quand le plugin n'a pas de web.
- La permission caméra suit le pattern **check → (prompt si besoin) → granted** avant `getPhoto`.
- `Preferences` n'est **pas** gardé par `isNativePlatform()` (il marche sur web).
- **Pas de gap-fill** : tu écris chaque fichier complet depuis le starter.

### Starter minimal

```bash
pnpm create vite@latest tribuzen-native --template react-ts
cd tribuzen-native
pnpm add @capacitor/core @capacitor/camera @capacitor/preferences
pnpm dev   # on valide d'abord le chemin WEB dans le navigateur
```

> Le device natif est optionnel pour ce lab : tout le comportement web (fallback input file + Preferences) se valide dans le navigateur. L'ajout des plateformes natives (`pnpm add -D @capacitor/cli && npx cap init && npx cap add ios/android && npx cap sync`) est décrit dans « Application TribuZen ».

Arborescence cible :
```
src/
  platform/
    session.ts        ← sessionStore (Preferences)
  features/
    avatar/
      AvatarPicker.tsx  ← Camera + détection + fallback web
  App.tsx             ← branche AvatarPicker + session démo
```

---

## Étapes (en friction)

1. **Écris `src/platform/session.ts`** — interface `Session { token: string; familyId: string }`, plus `saveSession`, `loadSession` (→ `Session | null`), `clearSession`, en sérialisant via `JSON.stringify` / `JSON.parse` autour de `Preferences`.
2. **Écris `ensureCameraPermission()`** dans `AvatarPicker.tsx` — `Camera.checkPermissions()`, si `camera === 'prompt'` alors `requestPermissions({ permissions: ['camera'] })`, retourne `status.camera === 'granted'`.
3. **Écris `pickFromFileInput()`** — crée un `<input type="file" accept="image/*">`, résout une `URL.createObjectURL(file)` ou `null`.
4. **Écris le composant `AvatarPicker`** — `handlePick` : si `!isNativePlatform()` → fallback file ; sinon permission puis `Camera.getPhoto({ resultType: CameraResultType.Uri })`, remonte `photo.webPath`. Gère le refus par un message `role="alert"`.
5. **Branche `App.tsx`** — state `avatarUrl`, affiche l'`<img>` si présent, un `<AvatarPicker onPicked={setAvatarUrl} />`, et un bouton « Se souvenir » qui appelle `saveSession` + relit avec `loadSession`.
6. **Valide dans le navigateur** : le bouton avatar ouvre le sélecteur de fichier, l'image s'affiche ; « Se souvenir » persiste (recharge la page → `loadSession` retrouve la session).

---

## Corrigé complet commenté

```tsx
// ─── src/platform/session.ts ────────────────────────────────────
import { Preferences } from '@capacitor/preferences';

export interface Session {
  token: string;
  familyId: string;
}

const KEY = 'session';

// Preferences ne stocke que des strings → on sérialise l'objet
export async function saveSession(session: Session): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(session) });
}

// Retourne null si aucune session (première ouverture ou après clear)
export async function loadSession(): Promise<Session | null> {
  const { value } = await Preferences.get({ key: KEY });
  return value ? (JSON.parse(value) as Session) : null;
}

export async function clearSession(): Promise<void> {
  await Preferences.remove({ key: KEY });
}

// ─── src/features/avatar/AvatarPicker.tsx ───────────────────────
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType } from '@capacitor/camera';

// Permission caméra : check d'abord, prompt seulement si 'prompt'
async function ensureCameraPermission(): Promise<boolean> {
  let status = await Camera.checkPermissions();
  if (status.camera === 'prompt') {
    status = await Camera.requestPermissions({ permissions: ['camera'] });
  }
  return status.camera === 'granted';
}

// Fallback web : input file → object URL affichable dans <img>
function pickFromFileInput(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? URL.createObjectURL(file) : null);
    };
    input.click();
  });
}

interface AvatarPickerProps {
  onPicked: (url: string) => void;
}

function AvatarPicker({ onPicked }: AvatarPickerProps) {
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    setError(null);

    // Chemin WEB : Camera n'a pas d'implémentation fiable ici → on dégrade
    if (!Capacitor.isNativePlatform()) {
      const url = await pickFromFileInput();
      if (url) onPicked(url);
      return;
    }

    // Chemin NATIF : permission d'abord, action ensuite
    const allowed = await ensureCameraPermission();
    if (!allowed) {
      setError('Autorise la caméra dans les réglages pour changer l’avatar.');
      return;
    }

    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.Uri, // webPath prêt pour <img src>
    });
    if (photo.webPath) onPicked(photo.webPath);
  }

  return (
    <div>
      <button onClick={handlePick}>Changer l’avatar</button>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    </div>
  );
}

export default AvatarPicker;

// ─── src/App.tsx ────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import AvatarPicker from './features/avatar/AvatarPicker';
import { saveSession, loadSession, clearSession, type Session } from './platform/session';

function App() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Au boot : restaurer la session persistée (marche sur web ET natif)
  useEffect(() => {
    loadSession().then(setSession);
  }, []);

  async function remember() {
    const demo: Session = { token: 'demo-token-123', familyId: 'fam-42' };
    await saveSession(demo);
    setSession(await loadSession()); // relit pour prouver la persistance
  }

  async function forget() {
    await clearSession();
    setSession(null);
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>TribuZen Native — Lab 44</h1>

      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar famille"
          style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: 96, height: 96, borderRadius: '50%',
            background: '#e5e7eb', display: 'grid', placeItems: 'center',
          }}
        >
          ?
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <AvatarPicker onPicked={setAvatarUrl} />
      </div>

      <hr style={{ margin: '1.5rem 0' }} />

      <p>
        Session : {session ? `${session.familyId} (token ${session.token})` : 'aucune'}
      </p>
      <button onClick={remember}>Se souvenir de moi</button>{' '}
      <button onClick={forget}>Oublier</button>
    </div>
  );
}

export default App;
```

**Pourquoi ce corrigé est correct :**
- `AvatarPicker` ne connaît qu'`onPicked(url)` — il masque totalement la différence natif/web au parent.
- Le chemin natif respecte **check → prompt (si besoin) → granted** avant `getPhoto` ; le refus est géré par un message `role="alert"`, pas un rejet silencieux.
- `session.ts` n'est **pas** gardé par `isNativePlatform()` : `Preferences` a une implémentation web, donc « Se souvenir » persiste dans le navigateur (recharge → la session revient).
- On sérialise en JSON parce que `Preferences` ne stocke que des strings — `loadSession` reparse et type le résultat.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes, sans rouvrir ce corrigé ni le module 44 :**

1. Ajoute un **plugin custom** `FamilyScanner` (`src/plugins/family-scanner/`) avec `scanQrCode(): Promise<{ familyId: string }>`, une implémentation `web.ts` (étend `WebPlugin`) qui fait un `window.prompt('Code famille ?')`, et un `index.ts` via `registerPlugin<FamilyScannerPlugin>('FamilyScanner', { web: () => import('./web')... })`.
2. Dans `App.tsx`, ajoute un bouton « Rejoindre une famille » qui appelle `FamilyScanner.scanQrCode()` et écrit le `familyId` retourné dans la session via `saveSession`.
3. Fais en sorte que l'avatar et la session soient **effacés** ensemble par « Oublier » (revoke aussi l'object URL avec `URL.revokeObjectURL`).

**Critère de réussite :** sur le web, « Rejoindre » ouvre un prompt, le code saisi apparaît dans la session persistée ; « Oublier » vide session + avatar sans fuite d'object URL.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ces briques vivent ici :

```
tribuzen/src/
  app/
    useNativeBootstrap.ts       # loadSession + initPush au boot
  platform/
    session.ts                  # ce lab (Preferences)
  features/
    family/
      AvatarPicker.tsx          # ce lab (Camera + fallback web)
  plugins/
    family-scanner/             # variante J+30 (scan QR interne)
```

**Passage au natif réel :**
```bash
pnpm add -D @capacitor/cli
npx cap init tribuzen app.tribuzen.mobile
pnpm add @capacitor/ios @capacitor/android
npx cap add ios && npx cap add android
pnpm build && npx cap sync   # OBLIGATOIRE après chaque install de plugin
npx cap open ios             # test caméra + permission sur device physique
```

**Différences par rapport au lab :**
- Le token de session viendra du vrai flux d'auth (pas `demo-token-123`) ; envisager un secure storage pour un token long terme (Preferences reste OK pour la session applicative).
- `useNativeBootstrap` ajoutera l'init **Push Notifications** (gardée par `isNativePlatform()`) en plus de la session — voir module 44 §2.4.
- Les push nécessitent la config FCM/APNs et un **device physique** (le simulateur iOS ne reçoit pas de push).

**Commit cible :**
```
feat(platform): sessionStore sur @capacitor/preferences
feat(family): AvatarPicker — Camera native + fallback web
```
