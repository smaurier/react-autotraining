---
titre: Capacitor — plugins avancés et patterns natifs
cours: 04-react
notions: [plugins officiels Capacitor, permissions natives, détection de plateforme, fallback web, plugin custom (registerPlugin + WebPlugin), Push Notifications, Camera, Preferences, Haptics, Share, publication stores et signing en survol]
outcomes: [intégrer un plugin natif officiel avec gestion de permissions et fallback web, détecter la plateforme pour dégrader proprement sur le web, écrire et consommer un plugin Capacitor custom typé]
prerequis: [43-capacitor-fondamentaux]
next: fin-du-parcours
libs: [{ name: react, version: "^19" }, { name: "@capacitor/core", version: "^6" }]
tribuzen: couche native de l'app mobile TribuZen — Push (invitations), Camera (avatar famille), Preferences (session), détection plateforme + fallback web
last-reviewed: 2026-07
---

# Capacitor — plugins avancés et patterns natifs

> **Outcomes — tu sauras FAIRE :** intégrer un plugin natif officiel (permissions + fallback web), détecter la plateforme pour dégrader proprement, écrire et consommer un plugin Capacitor custom typé.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

TribuZen passe en application mobile. Le PO veut trois choses pour la v1 native :

1. **Inviter un proche** déclenche une **push notification** sur son téléphone.
2. Chaque famille peut **prendre une photo d'avatar** avec l'appareil photo.
3. La **session reste ouverte** entre deux lancements de l'app.

Un collègue a écrit ce composant. Il « marche » sur son iPhone, mais l'app **crashe en blanc** dès qu'on l'ouvre dans un navigateur pour la démo commerciale :

```tsx
// AvatarPicker.tsx — AVANT (casse sur le web)
import { Camera, CameraResultType } from '@capacitor/camera';

function AvatarPicker() {
  async function pick() {
    // ❌ 1. aucune demande de permission → refus silencieux sur device
    // ❌ 2. aucun fallback → sur le web, plante ou reste bloqué
    const photo = await Camera.getPhoto({ resultType: CameraResultType.Uri });
    console.log(photo.webPath);
  }
  return <button onClick={pick}>Photo</button>;
}
```

**Trois problèmes immédiats :**
1. Le code appelle un plugin natif **sans vérifier la permission** — sur un vrai device, la caméra peut être refusée et l'appel échoue.
2. **Aucune détection de plateforme** : sur le web, ce plugin n'a pas d'implémentation native, il faut un chemin alternatif (input file).
3. La **push notification** promise au PO n'existe pas encore — il faut un cycle permission → register → écoute des events.

Ce module te donne les patterns pour brancher un plugin natif proprement : permissions, détection de plateforme, fallback web, et — quand aucun plugin n'existe — écrire le tien.

---

## 2. Théorie complète, concise

> **Note version.** Les extraits sont vérifiés via Context7 sur la doc officielle Capacitor. Les plugins officiels sont aujourd'hui publiés pour **Capacitor 7** ; l'API utilisée ici (`getPhoto`, `Preferences`, `requestPermissions`, `registerPlugin`, `Capacitor.isNativePlatform`) est **identique en Capacitor 6** — ce cours reste calé sur `@capacitor/core@^6` (frontmatter). Aucune de ces signatures n'a changé entre 6 et 7.

### 2.1 L'écosystème des plugins officiels

Un plugin Capacitor est un pont typé entre ton TS et le code natif (Swift/Kotlin). Les plugins **officiels** (`@capacitor/*`) couvrent les besoins courants :

| Plugin | Paquet npm | Rôle |
|---|---|---|
| Camera | `@capacitor/camera` | Prendre / choisir une photo |
| Geolocation | `@capacitor/geolocation` | Position GPS |
| Push Notifications | `@capacitor/push-notifications` | Notifications distantes (FCM/APNs) |
| Filesystem | `@capacitor/filesystem` | Lire/écrire des fichiers |
| Preferences | `@capacitor/preferences` | Stockage clé-valeur persistant |
| Haptics | `@capacitor/haptics` | Vibrations / retour tactile |
| Share | `@capacitor/share` | Feuille de partage native |

Chaque plugin s'installe indépendamment, puis se synchronise dans le projet natif :

```bash
npm install @capacitor/camera @capacitor/preferences @capacitor/push-notifications
npx cap sync
```

> Règle de départ : **avant** d'écrire un plugin custom, cherche un plugin officiel, puis un plugin communautaire (`@capacitor-community/*`). On ne descend au natif que si rien n'existe.

### 2.2 Le cycle des permissions natives

Les plugins qui touchent le matériel ou la vie privée (caméra, GPS, notifications) exposent **deux méthodes standardisées** : `checkPermissions()` et `requestPermissions()`. Le statut est une union : `'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'`.

```typescript
import { Camera } from '@capacitor/camera';

// Pattern canonique : vérifier, puis demander SEULEMENT si 'prompt'
async function ensureCameraPermission(): Promise<boolean> {
  let status = await Camera.checkPermissions();

  if (status.camera === 'prompt') {
    // On ne demande pas si c'est déjà 'granted' ou 'denied' définitif
    status = await Camera.requestPermissions({ permissions: ['camera'] });
  }

  return status.camera === 'granted';
}
```

Deux règles :
- **Ne jamais** appeler l'action native sans avoir confirmé `granted` — sinon rejet silencieux ou exception.
- Si `denied`, on ne peut pas re-prompter : il faut renvoyer l'utilisateur vers les **réglages système** (message explicatif).

### 2.3 Détection de plateforme et fallback web

`Capacitor.isNativePlatform()` répond `true` sur iOS/Android, `false` sur le web/PWA. `Capacitor.getPlatform()` renvoie `'ios' | 'android' | 'web'`. C'est le levier pour **dégrader proprement**.

```typescript
import { Capacitor } from '@capacitor/core';

function canUseNativeCamera(): boolean {
  // On combine détection plateforme ET disponibilité du plugin
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Camera');
}
```

Le pattern « une action, deux chemins » : natif d'un côté, équivalent web de l'autre.

```typescript
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType } from '@capacitor/camera';

// Retourne une URL affichable dans un <img>, quelle que soit la plateforme
async function pickAvatar(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.Uri, // webPath prêt pour <img src>
    });
    return photo.webPath ?? null;
  }

  // Fallback web : input file classique, aucune dépendance native
  return pickAvatarFromFileInput();
}

function pickAvatarFromFileInput(): Promise<string | null> {
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
```

Le composant appelant ne sait pas quel chemin a servi — il reçoit une URL dans les deux cas. C'est ça, « dégrader proprement ».

### 2.4 Push Notifications — le flux complet

Les push suivent une séquence stricte : **permission → register → écoute des events**. `register()` déclenche l'obtention d'un token (FCM sur Android, APNs sur iOS) qu'on renvoie au backend pour cibler l'appareil.

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

async function initPush(): Promise<void> {
  // 1. Permission (même pattern que 2.2)
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return; // refus → on abandonne proprement

  // 2. Enregistrement auprès du service push OS
  await PushNotifications.register();
}

// 3. Écoute — à poser une seule fois au boot de l'app
async function registerPushListeners(): Promise<void> {
  // Token reçu → l'envoyer au backend TribuZen pour cibler ce device
  await PushNotifications.addListener('registration', (token) => {
    fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value }),
    });
  });

  await PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration error', err.error);
  });

  // Notification reçue app au premier plan (pas d'affichage système auto)
  await PushNotifications.addListener('pushNotificationReceived', (notif) => {
    console.log('Reçue (foreground):', notif.title);
  });

  // L'utilisateur a tapé la notification → naviguer vers la cible
  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data as { type?: string; id?: string };
    if (data.type === 'invitation') {
      // navigate(`/invitations/${data.id}`)
    }
  });
}
```

> **Piège plateforme** : les push **ne fonctionnent pas** sur le simulateur iOS — tester sur device physique. Sur le web, `@capacitor/push-notifications` n'est pas disponible → gardez ce code derrière `Capacitor.isNativePlatform()`.

### 2.5 Preferences — session persistante

`@capacitor/preferences` est un stockage clé-valeur **persistant** (survit au redémarrage), valeurs **strings uniquement**. Idéal pour tokens de session et petits réglages ; pas pour de gros volumes (SQLite pour ça).

```typescript
import { Preferences } from '@capacitor/preferences';

interface Session {
  token: string;
  familyId: string;
}

// On sérialise en JSON car Preferences ne stocke que des strings
async function saveSession(session: Session): Promise<void> {
  await Preferences.set({ key: 'session', value: JSON.stringify(session) });
}

async function loadSession(): Promise<Session | null> {
  const { value } = await Preferences.get({ key: 'session' });
  return value ? (JSON.parse(value) as Session) : null;
}

async function clearSession(): Promise<void> {
  await Preferences.remove({ key: 'session' });
}
```

Bonus : `Preferences` a une implémentation web (basée sur le storage du navigateur), donc **pas besoin de fallback** — il marche sur le web tel quel.

### 2.6 Haptics et Share — plugins « one-shot »

Deux plugins simples, sans permission, utiles pour l'UX native :

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';

// Retour tactile au tap d'un bouton important
async function tapFeedback(): Promise<void> {
  await Haptics.impact({ style: ImpactStyle.Medium });
}

// Feuille de partage native (SMS, mail, réseaux…)
async function shareInvite(url: string): Promise<void> {
  await Share.share({
    title: 'Rejoins ma tribu sur TribuZen',
    text: 'Une invitation t’attend',
    url,
  });
}
```

`Haptics` dégrade tout seul (no-op) sur les plateformes sans moteur ; `Share` a un fallback web via l'API Web Share quand elle existe.

### 2.7 Écrire un plugin custom (registerPlugin + WebPlugin)

Quand aucun plugin n'existe, tu crées le pont. Côté JS, tout part de `registerPlugin` : une **interface TS** (le contrat) + une **implémentation web optionnelle** (le fallback), puis les implémentations natives Swift/Kotlin.

```typescript
// ─── src/plugins/family-scanner/definitions.ts ──────────────────
// Le CONTRAT — ce que le natif ET le web doivent respecter
export interface FamilyScannerPlugin {
  scanQrCode(): Promise<{ familyId: string }>;
}

// ─── src/plugins/family-scanner/web.ts ──────────────────────────
import { WebPlugin } from '@capacitor/core';
import type { FamilyScannerPlugin } from './definitions';

// Implémentation WEB — sert de fallback quand pas de natif
export class FamilyScannerWeb extends WebPlugin implements FamilyScannerPlugin {
  async scanQrCode(): Promise<{ familyId: string }> {
    // Sur le web : pas de scanner natif → on lance une saisie manuelle
    const familyId = window.prompt('Code famille ?') ?? '';
    return { familyId };
  }
}

// ─── src/plugins/family-scanner/index.ts ────────────────────────
import { registerPlugin } from '@capacitor/core';
import type { FamilyScannerPlugin } from './definitions';

export const FamilyScanner = registerPlugin<FamilyScannerPlugin>('FamilyScanner', {
  // Chargé dynamiquement UNIQUEMENT sur le web (tree-shaking natif)
  web: () => import('./web').then((m) => new m.FamilyScannerWeb()),
});
```

Consommation, identique à un plugin officiel :

```typescript
import { FamilyScanner } from '@/plugins/family-scanner';

async function joinFamily(): Promise<void> {
  const { familyId } = await FamilyScanner.scanQrCode();
  console.log('Rejoint la famille', familyId);
}
```

Côté natif (survol — le détail Swift/Kotlin dépasse ce module) : une classe annotée `@objc(FamilyScanner)` / `@CapacitorPlugin`, avec des méthodes exposées, enregistrée dans `MainActivity` (Android). Le **nom** passé à `registerPlugin('FamilyScanner')` doit correspondre exactement à l'annotation native.

### 2.8 Publication (stores + signing) — en survol

Passer du build au store, l'essentiel :

| Étape | iOS | Android |
|---|---|---|
| Build natif | Xcode (`npx cap open ios`) | Android Studio (`npx cap open android`) |
| Signing | Certificat + provisioning profile Apple | Keystore (`.jks`) → signe l'`.aab` |
| Artefact | `.ipa` | `.aab` (Android App Bundle) |
| Store | App Store Connect (revue Apple) | Google Play Console |

Le **signing** garantit l'authenticité de l'app : chaque mise à jour doit être signée avec la **même clé** que la version publiée — perdre le keystore Android bloque les mises à jour. Ne jamais committer un keystore ni un certificat dans le repo. `npx cap sync` doit être lancé **avant** chaque build pour propager le JS et les plugins dans les projets natifs.

---

## 3. Worked examples

### Exemple 1 — AvatarPicker robuste (permission + détection + fallback)

On reprend le cas concret et on le corrige entièrement.

```tsx
// ─── src/features/family/AvatarPicker.tsx ───────────────────────
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType } from '@capacitor/camera';

// Permission caméra : vérifie puis demande seulement si 'prompt'
async function ensureCameraPermission(): Promise<boolean> {
  let status = await Camera.checkPermissions();
  if (status.camera === 'prompt') {
    status = await Camera.requestPermissions({ permissions: ['camera'] });
  }
  return status.camera === 'granted';
}

// Fallback web : input file → object URL
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

function AvatarPicker({ onPicked }: { onPicked: (url: string) => void }) {
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    setError(null);

    // Chemin web : pas de plugin natif, on dégrade
    if (!Capacitor.isNativePlatform()) {
      const url = await pickFromFileInput();
      if (url) onPicked(url);
      return;
    }

    // Chemin natif : permission d'abord, action ensuite
    const allowed = await ensureCameraPermission();
    if (!allowed) {
      setError('Autorise la caméra dans les réglages pour changer l’avatar.');
      return;
    }

    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.Uri,
    });
    if (photo.webPath) onPicked(photo.webPath);
  }

  return (
    <div>
      <button onClick={handlePick}>Changer l’avatar</button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default AvatarPicker;
```

**Ce que ce correctif apporte :**
- Sur le **web**, jamais d'appel natif → plus de crash blanc en démo.
- Sur **device**, la permission est demandée puis contrôlée avant `getPhoto`.
- Le refus est **géré** (message vers les réglages), pas silencieux.
- Le parent reçoit toujours une URL affichable, quelle que soit la plateforme.

### Exemple 2 — Bootstrap natif : session + push au démarrage

Un hook qui, au montage de l'app, restaure la session et branche les push — le tout garde le web fonctionnel.

```tsx
// ─── src/app/useNativeBootstrap.ts ──────────────────────────────
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';

interface Session {
  token: string;
  familyId: string;
}

async function loadSession(): Promise<Session | null> {
  const { value } = await Preferences.get({ key: 'session' });
  return value ? (JSON.parse(value) as Session) : null;
}

async function initPush(): Promise<void> {
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return;

  await PushNotifications.addListener('registration', (token) => {
    fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value }),
    });
  });

  await PushNotifications.register();
}

export function useNativeBootstrap() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Preferences marche sur web ET natif → pas de garde nécessaire
      setSession(await loadSession());

      // Push : natif uniquement, sinon le plugin n'existe pas
      if (Capacitor.isNativePlatform()) {
        await initPush();
      }

      setReady(true);
    })();
  }, []);

  return { session, ready };
}
```

**Pourquoi c'est correct :**
- `Preferences` n'est **pas** gardé par `isNativePlatform()` : il a une implémentation web, on veut la session partout.
- `initPush` **est** gardé : le plugin push n'existe pas sur le web, l'appeler planterait.
- Toute l'orchestration asynchrone est dans un seul `useEffect` au boot, `ready` évite un flash d'UI non initialisée.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Appeler l'action native sans vérifier la permission

```typescript
// ❌ On suppose que la caméra est autorisée
const photo = await Camera.getPhoto({ resultType: CameraResultType.Uri });

// ✅ Permission d'abord, action ensuite
if (await ensureCameraPermission()) {
  const photo = await Camera.getPhoto({ resultType: CameraResultType.Uri });
}
```

**Pourquoi c'est faux :** sur un vrai device, l'utilisateur peut refuser. Sans contrôle, l'appel rejette ou reste bloqué — bug non reproductible sur ta machine de dev où tu as déjà accordé la permission.

### PIÈGE #2 — Oublier le fallback web

```typescript
// ❌ Le web n'a pas d'implémentation native de ce plugin → écran blanc
async function pick() {
  return Camera.getPhoto({ resultType: CameraResultType.Uri });
}

// ✅ On branche selon la plateforme
async function pick() {
  return Capacitor.isNativePlatform()
    ? Camera.getPhoto({ resultType: CameraResultType.Uri })
    : pickFromFileInput();
}
```

**Discrimination fine :** tous les plugins ne se valent pas. `Preferences`, `Share`, `Haptics` ont un comportement web (ou no-op). `Camera` a un web partiel, mais `PushNotifications` **n'a aucun web** — c'est celui-là qu'il faut impérativement garder derrière `isNativePlatform()`.

### PIÈGE #3 — Confondre `Preferences` et un vrai stockage sécurisé

```typescript
// ❌ Stocker un token sensible en clair en pensant que c'est "sécurisé"
await Preferences.set({ key: 'session', value: token });
```

**Pourquoi c'est trompeur :** `Preferences` est **persistant**, pas **chiffré**. Pour un secret fort (clé de paiement, token long terme), il faut un plugin de secure storage (Keychain iOS / Keystore Android). Pour une session applicative classique, `Preferences` suffit — mais ne le vends pas comme du coffre-fort.

### PIÈGE #4 — Nom de plugin custom désaligné

```typescript
// definitions/index.ts
export const Scanner = registerPlugin<ScannerPlugin>('FamilyScanner', { /* ... */ });
```
```swift
// natif iOS — nom DIFFÉRENT
@objc(QrScanner)  // ❌ ne correspond pas à 'FamilyScanner'
public class QrScanner: CAPPlugin { }
```

**Pourquoi ça casse :** Capacitor relie JS et natif **par le nom**. `registerPlugin('FamilyScanner')` doit matcher exactement l'annotation native (`@objc(FamilyScanner)` / `@CapacitorPlugin(name: "FamilyScanner")`). Sinon l'appel JS ne trouve jamais l'implémentation native et retombe (au mieux) sur le web, ou échoue.

### PIÈGE #5 — Oublier `npx cap sync` avant le build

Installer un plugin (`npm install`) **ne suffit pas** : le natif ne le connaît qu'après `npx cap sync`, qui copie le web et met à jour les dépendances natives. Symptôme classique : « le plugin marche en `npm run dev` mais est introuvable sur le device ». Réflexe : `cap sync` après chaque install de plugin et avant chaque build store.

---

## 5. Ancrage TribuZen

L'app mobile TribuZen (build Capacitor du front React) s'appuie sur quatre plugins, chacun avec sa stratégie de plateforme.

**Push Notifications — invitations** (`src/app/useNativeBootstrap.ts`). Quand un membre invite un proche, le backend cible le device via le token FCM/APNs collecté au `register()`. Le tap sur la notif (`pushNotificationActionPerformed`) route vers `/invitations/:id`. Gardé derrière `isNativePlatform()` : sur la démo web, les invitations arrivent par email, pas par push.

**Camera — avatar famille** (`src/features/family/AvatarPicker.tsx`). Le cas concret du module : permission → `getPhoto` sur device, `input file` sur le web. Même composant, deux chemins, une seule URL en sortie.

**Preferences — session** (`src/app/useNativeBootstrap.ts`). Token + `familyId` sérialisés en JSON, restaurés au boot. Marche web **et** natif sans garde — c'est ce qui permet de rester connecté entre deux ouvertures de l'app.

**Détection plateforme — transverse.** `Capacitor.isNativePlatform()` est le point de décision unique : il isole ce qui exige un device de ce qui tourne partout, pour que la même base React serve l'app store **et** la démo commerciale web.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/src/
  app/
    useNativeBootstrap.ts       # session (Preferences) + push au boot
  features/
    family/
      AvatarPicker.tsx          # Camera + fallback web
  plugins/
    family-scanner/             # plugin custom (si scan QR interne)
      definitions.ts
      web.ts
      index.ts
```

---

## 6. Points clés

1. Chercher un plugin **officiel** puis **communautaire** avant d'écrire du natif ; installer + `npx cap sync`.
2. Les plugins sensibles exposent `checkPermissions()` / `requestPermissions()` — vérifier `granted` **avant** l'action.
3. `Capacitor.isNativePlatform()` (et `isPluginAvailable`) sont le point de décision pour dégrader proprement.
4. Prévoir un **fallback web** pour les plugins sans implémentation navigateur ; `PushNotifications` n'en a aucune, `Preferences`/`Share`/`Haptics` si.
5. Push = séquence stricte **permission → register → écoute des events** ; tester sur device physique (pas le simulateur iOS).
6. `Preferences` est persistant mais **non chiffré** — session oui, secret fort non (secure storage dédié).
7. Un plugin custom = interface TS + `registerPlugin` (avec `web:` optionnel via `WebPlugin`) + natif ; le **nom** doit matcher exactement des deux côtés.
8. Publication : `cap sync` avant build, signing avec une clé constante (ne jamais perdre/committer le keystore), `.ipa`/`.aab` vers les stores.

---

## 7. Seeds Anki

```
Dans quel ordre appelle-t-on les méthodes de permission d'un plugin Capacitor ?|checkPermissions() d'abord ; on n'appelle requestPermissions() que si le statut est 'prompt'. On exécute l'action native seulement si le statut final est 'granted'.
Comment détecter en JS qu'on tourne sur un device natif plutôt que sur le web ?|Capacitor.isNativePlatform() renvoie true sur iOS/Android, false sur web/PWA. Capacitor.getPlatform() renvoie 'ios' | 'android' | 'web'. isPluginAvailable(name) vérifie qu'un plugin précis est présent.
Quels plugins Capacitor exigent impérativement une garde isNativePlatform() et lesquels marchent sur le web ?|PushNotifications n'a aucune implémentation web → garde obligatoire. Preferences, Share, Haptics ont un comportement web (ou no-op) → utilisables sans garde. Camera a un web partiel mais on prévoit un fallback input file.
Quelle est la séquence complète pour recevoir des push notifications ?|1) checkPermissions/requestPermissions jusqu'à 'granted' ; 2) addListener('registration'|'registrationError'|'pushNotificationReceived'|'pushNotificationActionPerformed') ; 3) register() qui déclenche l'obtention du token à envoyer au backend.
Preferences stocke-t-il des données chiffrées ? Que stocker dedans ?|Non : Preferences est persistant mais NON chiffré, et ne stocke que des strings (JSON.stringify pour un objet). OK pour session/réglages ; pour un secret fort utiliser un secure storage (Keychain/Keystore).
Comment crée-t-on un plugin Capacitor custom côté JS avec fallback web ?|registerPlugin<Interface>('Nom', { web: () => import('./web').then(m => new m.NomWeb()) }). La classe web étend WebPlugin et implémente l'interface ; le nom passé doit matcher exactement l'annotation native.
Pourquoi un plugin fraîchement installé est-il introuvable sur le device ?|npm install ne propage pas le plugin au projet natif. Il faut lancer npx cap sync (copie le web + met à jour les dépendances natives) après chaque install et avant chaque build.
Que garantit le signing lors de la publication, et quel risque en cas de perte du keystore Android ?|Le signing prouve l'authenticité de l'app ; chaque mise à jour doit être signée avec la même clé que la version publiée. Perdre le keystore Android empêche définitivement de publier des mises à jour de l'app existante.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-44-capacitor-plugins-avances/README.md`. Construire un `AvatarPicker` robuste (permission Camera + détection plateforme + fallback web) et un service `session` sur `Preferences`, avec corrigé complet, variante J+30 et portage TribuZen. **Dernier module du parcours React.**
