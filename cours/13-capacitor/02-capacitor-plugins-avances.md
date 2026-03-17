# Cours 45 — Capacitor : plugins avances et patterns natifs

> **Objectif** : Maîtriser les plugins Capacitor avances : deep linking, push notifications (Firebase), authentification biometrique, in-app browser, cycle de vie de l'application, stockage persistant, creation de plugins natifs custom, et test des applications Capacitor.

---

## Analogie

Si le cours precedent vous a appris a brancher les prises electriques de base (camera, GPS, fichiers), ce cours vous apprend a installer la domotique complete : alarme connectee (push notifications), serrure a empreinte digitale (biometrie), interphone video (in-app browser), et meme a creer vos propres appareils sur mesure (plugins custom).

---

## Theorie

### 1. Deep linking et Universal Links

Le deep linking permet d'ouvrir votre application directement sur une page specifique depuis un lien externe (email, QR code, autre app).

```
┌──────────────────────────────────────────────────────────────┐
│         TYPES DE DEEP LINKS                                   │
│                                                               │
│  1. Custom URL Scheme                                        │
│     myapp://products/42                                      │
│     + Simple a configurer                                    │
│     - Pas garanti unique (collision possible)                │
│     - Ne fonctionne pas dans les navigateurs                 │
│                                                               │
│  2. Universal Links (iOS) / App Links (Android)              │
│     https://myapp.com/products/42                            │
│     + URL standard qui fonctionne partout                    │
│     + Si l'app est installee → ouvre l'app                   │
│     + Si non installee → ouvre le site web                   │
│     - Configuration plus complexe (verification de domaine)  │
│                                                               │
│  Recommandation : Universal Links / App Links                 │
└──────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================================
// Configuration des deep links
// ============================================================

// npm install @capacitor/app
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function DeepLinkHandler() {
    const navigate = useNavigate();

    useEffect(() => {
        // Ecouter les deep links quand l'app est deja ouverte
        const listener = App.addListener(
            'appUrlOpen',
            (event: URLOpenListenerEvent) => {
                console.log('Deep link recu:', event.url);

                // Parser l'URL pour extraire la route
                const url = new URL(event.url);
                const path = url.pathname;

                // Naviguer vers la bonne page React
                if (path) {
                    navigate(path);
                }
            },
        );

        return () => {
            listener.then(l => l.remove());
        };
    }, [navigate]);

    return null; // Composant invisible, juste un listener
}

// Dans App.tsx :
// <BrowserRouter>
//   <DeepLinkHandler />
//   <Routes>...</Routes>
// </BrowserRouter>
```

```json
// Configuration iOS (ios/App/App/Info.plist)
// Ajouter dans le fichier :
// <key>CFBundleURLTypes</key>
// <array>
//   <dict>
//     <key>CFBundleURLSchemes</key>
//     <array>
//       <string>myapp</string>
//     </array>
//   </dict>
// </array>
```

> **Conseil** : pour les Universal Links, vous devez heberger un fichier `apple-app-site-association` sur votre domaine (`.well-known/apple-app-site-association`) et un `assetlinks.json` pour Android (`.well-known/assetlinks.json`). Ces fichiers prouvent que vous etes bien le proprietaire du domaine.

---

### 2. Push notifications avec Firebase

```typescript
// ============================================================
// Push notifications via Firebase Cloud Messaging (FCM)
// ============================================================

// npm install @capacitor/push-notifications
// + Configurer Firebase : ajouter google-services.json (Android)
//   et GoogleService-Info.plist (iOS)

import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';

// ────────────────────────────────────────────────────────────
// Initialiser les push notifications
// ────────────────────────────────────────────────────────────
async function initPushNotifications(): Promise<void> {
    // Demander la permission
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
        console.warn('Push notifications refusees par l\'utilisateur');
        return;
    }

    // S'enregistrer aupres de FCM
    await PushNotifications.register();
}

// ────────────────────────────────────────────────────────────
// Ecouter les evenements
// ────────────────────────────────────────────────────────────

// Token FCM recu — l'envoyer a votre backend
PushNotifications.addListener('registration', (token: Token) => {
    console.log('Token FCM:', token.value);
    // POST /api/devices { token: token.value, platform: 'ios' }
    fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.value }),
    });
});

// Erreur d'enregistrement
PushNotifications.addListener('registrationError', (error) => {
    console.error('Erreur push:', error);
});

// Notification recue quand l'app est au premier plan
PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
        console.log('Notification (foreground):', notification);
        // Afficher un toast ou une banniere custom
        // (la notification systeme ne s'affiche PAS en foreground par defaut)
    },
);

// L'utilisateur a clique sur une notification
PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action) => {
        console.log('Notification cliquee:', action.notification.data);
        // Naviguer vers la page appropriee
        const { type, id } = action.notification.data;
        if (type === 'order') {
            // navigate(`/orders/${id}`);
        }
    },
);
```

```typescript
// ────────────────────────────────────────────────────────────
// Cote backend : envoyer une notification via Firebase Admin
// ────────────────────────────────────────────────────────────

// npm install firebase-admin
import admin from 'firebase-admin';

admin.initializeApp({
    credential: admin.credential.cert('./service-account.json'),
});

async function sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
): Promise<void> {
    await admin.messaging().send({
        token,
        notification: { title, body },
        data: data ?? {},
        // Configuration specifique par plateforme
        apns: {
            payload: {
                aps: { sound: 'default', badge: 1 },
            },
        },
        android: {
            priority: 'high',
            notification: { sound: 'default' },
        },
    });
}

// Utilisation
await sendPushNotification(
    'fcm_token_du_device...',
    'Commande expediee',
    'Votre commande #1234 est en route !',
    { type: 'order', id: '1234' },
);
```

> **Piege classique** : sur iOS, les push notifications ne fonctionnent **pas** sur le simulateur. Vous devez tester sur un device physique. Sur Android, l'emulateur fonctionne si les Google Play Services sont installes.

---

### 3. Authentification biometrique

```typescript
// ============================================================
// Face ID / Touch ID / Empreinte digitale
// ============================================================

// Plugin communautaire : npm install @aparajita/capacitor-biometric-auth
// (ou capacitor-native-biometric selon vos preferences)

// Exemple avec le pattern courant :
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

async function checkBiometrics(): Promise<{
    available: boolean;
    type: string;
}> {
    try {
        const result = await BiometricAuth.checkBiometry();
        return {
            available: result.isAvailable,
            type: result.biometryType === BiometryType.faceAuthentication
                ? 'Face ID'
                : result.biometryType === BiometryType.fingerprintAuthentication
                    ? 'Empreinte digitale'
                    : 'Aucun',
        };
    } catch {
        return { available: false, type: 'Aucun' };
    }
}

async function authenticateWithBiometrics(): Promise<boolean> {
    try {
        await BiometricAuth.authenticate({
            reason: 'Veuillez vous authentifier pour acceder a vos donnees',
            cancelTitle: 'Annuler',
            allowDeviceCredential: true, // Fallback vers PIN/password
        });
        return true;
    } catch {
        return false;
    }
}

// ────────────────────────────────────────────────────────────
// Composant React avec biometrie
// ────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';

function BiometricLogin() {
    const [biometryType, setBiometryType] = useState<string>('');
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        checkBiometrics().then(({ type }) => setBiometryType(type));
    }, []);

    async function handleBiometricLogin() {
        const success = await authenticateWithBiometrics();
        if (success) {
            setAuthenticated(true);
            // Recuperer le token stocke de maniere securisee
            // et continuer le flux d'authentification
        }
    }

    if (authenticated) {
        return <p>Authentifie avec succes !</p>;
    }

    return (
        <div>
            {biometryType && biometryType !== 'Aucun' ? (
                <button onClick={handleBiometricLogin}>
                    Se connecter avec {biometryType}
                </button>
            ) : (
                <p>Biometrie non disponible sur cet appareil</p>
            )}
        </div>
    );
}
```

---

### 4. In-App Browser

```typescript
// ============================================================
// Ouvrir des pages web dans l'app (OAuth, CGV, etc.)
// ============================================================

// npm install @capacitor/browser
import { Browser } from '@capacitor/browser';

// Ouvrir une URL dans le navigateur in-app
async function openInAppBrowser(url: string): Promise<void> {
    await Browser.open({
        url,
        // iOS : presentation en modal (pas de navigation hors de l'app)
        presentationStyle: 'popover',
    });
}

// Ecouter la fermeture du navigateur
Browser.addListener('browserFinished', () => {
    console.log('Navigateur in-app ferme');
    // Utile pour reprendre un flux OAuth
});

// Cas d'usage : OAuth avec un provider externe
async function loginWithGoogle(): Promise<void> {
    // 1. Ouvrir la page d'auth Google dans le browser in-app
    await Browser.open({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?...',
    });
    // 2. Google redirige vers myapp://callback?code=...
    // 3. Le deep link handler (section 1) capture le code
    // 4. Echanger le code contre un token
}
```

---

### 5. Cycle de vie de l'application

```typescript
// ============================================================
// Detecter quand l'app passe en arriere-plan / premier plan
// ============================================================

import { App, AppState } from '@capacitor/app';
import { useEffect, useRef } from 'react';

function useAppLifecycle() {
    const lastActiveTime = useRef<number>(Date.now());

    useEffect(() => {
        const listener = App.addListener(
            'appStateChange',
            (state: AppState) => {
                if (state.isActive) {
                    // L'app revient au premier plan
                    const inactiveSeconds = (Date.now() - lastActiveTime.current) / 1000;
                    console.log(`App active (inactive pendant ${inactiveSeconds.toFixed(0)}s)`);

                    if (inactiveSeconds > 300) {
                        // 5 minutes d'inactivite → re-authentifier
                        // navigate('/login');
                    }

                    // Rafraichir les donnees
                    // queryClient.invalidateQueries();
                } else {
                    // L'app passe en arriere-plan
                    lastActiveTime.current = Date.now();
                    console.log('App en arriere-plan');

                    // Sauvegarder l'etat si necessaire
                    // saveAppState();
                }
            },
        );

        // Bouton "back" Android
        const backListener = App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
                window.history.back();
            } else {
                // Sur la page d'accueil → fermer l'app
                App.exitApp();
            }
        });

        return () => {
            listener.then(l => l.remove());
            backListener.then(l => l.remove());
        };
    }, []);
}
```

> **Piege classique** : sur Android, le bouton "Back" physique/gestuel ne declenche **pas** `window.history.back()` automatiquement dans un WebView. Vous devez ecouter l'evenement `backButton` de Capacitor et gerer la navigation manuellement.

---

### 6. Stockage : Preferences vs SQLite

```
┌──────────────────────────────────────────────────────────────┐
│         COMPARAISON DES OPTIONS DE STOCKAGE                   │
│                                                               │
│  @capacitor/preferences (cle-valeur)                         │
│  + Tres simple (get/set/remove)                              │
│  + Ideal pour les settings, tokens, flags                    │
│  - Pas de requetes complexes                                 │
│  - Pas adapte aux gros volumes                               │
│  - Valeurs = strings uniquement                              │
│                                                               │
│  @capacitor-community/sqlite                                 │
│  + SQL complet (SELECT, JOIN, etc.)                          │
│  + Ideal pour des donnees structurees offline                │
│  + Gros volumes (des milliers d'enregistrements)             │
│  - Plus complexe a configurer                                │
│  - Necessite des migrations de schema                        │
│                                                               │
│  Recommandation :                                            │
│  Settings/tokens → Preferences                               │
│  Donnees metier offline → SQLite                             │
└──────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================================
// @capacitor/preferences — stockage cle-valeur
// ============================================================

// npm install @capacitor/preferences
import { Preferences } from '@capacitor/preferences';

// Sauvegarder
async function saveToken(token: string): Promise<void> {
    await Preferences.set({ key: 'auth_token', value: token });
}

// Recuperer
async function getToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: 'auth_token' });
    return value;
}

// Stocker un objet (serialiser en JSON)
interface UserPrefs {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
}

async function saveUserPrefs(prefs: UserPrefs): Promise<void> {
    await Preferences.set({
        key: 'user_prefs',
        value: JSON.stringify(prefs),
    });
}

async function getUserPrefs(): Promise<UserPrefs | null> {
    const { value } = await Preferences.get({ key: 'user_prefs' });
    return value ? JSON.parse(value) : null;
}

// Supprimer
async function logout(): Promise<void> {
    await Preferences.remove({ key: 'auth_token' });
    await Preferences.clear(); // Tout supprimer
}
```

```typescript
// ============================================================
// @capacitor-community/sqlite — base SQLite locale
// ============================================================

// npm install @capacitor-community/sqlite
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);

async function initDatabase(): Promise<SQLiteDBConnection> {
    const db = await sqlite.createConnection(
        'myapp',      // nom de la base
        false,        // encrypted
        'no-encryption', // mode
        1,            // version
        false,        // readonly
    );

    await db.open();

    // Creer les tables
    await db.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );
    `);

    return db;
}

// CRUD operations
async function addTask(db: SQLiteDBConnection, title: string): Promise<void> {
    await db.run(
        'INSERT INTO tasks (title) VALUES (?)',
        [title],
    );
}

interface Task {
    id: number;
    title: string;
    completed: number;
    created_at: string;
}

async function getTasks(db: SQLiteDBConnection): Promise<Task[]> {
    const result = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
    return (result.values ?? []) as Task[];
}

async function toggleTask(db: SQLiteDBConnection, id: number): Promise<void> {
    await db.run(
        'UPDATE tasks SET completed = NOT completed WHERE id = ?',
        [id],
    );
}
```

---

### 7. Plugins natifs custom

Quand aucun plugin existant ne repond a votre besoin, vous pouvez creer le votre. Le plugin sert de **pont** entre votre code TypeScript et le code natif (Swift/Kotlin).

```
┌──────────────────────────────────────────────────────────────┐
│         ARCHITECTURE D'UN PLUGIN CAPACITOR CUSTOM             │
│                                                               │
│  TypeScript (votre app)                                      │
│       │                                                       │
│       │ MyPlugin.doSomething({ value: 'hello' })             │
│       ▼                                                       │
│  Plugin Definition (TypeScript)                              │
│       │ registerPlugin('MyPlugin', { ... })                  │
│       ▼                                                       │
│  ┌──────────┐    ┌──────────────┐                            │
│  │ iOS       │    │ Android       │                            │
│  │ Swift     │    │ Kotlin        │                            │
│  │ @objc func│    │ @PluginMethod │                            │
│  │ doSometh..│    │ fun doSometh..│                            │
│  └──────────┘    └──────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================================
// 1. Definition TypeScript du plugin
// ============================================================

// src/plugins/my-plugin/definitions.ts
export interface MyPluginPlugin {
    getDeviceInfo(): Promise<{ model: string; osVersion: string }>;
    vibrate(options: { duration: number }): Promise<void>;
}

// src/plugins/my-plugin/index.ts
import { registerPlugin } from '@capacitor/core';
import type { MyPluginPlugin } from './definitions';

const MyPlugin = registerPlugin<MyPluginPlugin>('MyPlugin', {
    // Fallback web (optionnel)
    web: () => import('./web').then(m => new m.MyPluginWeb()),
});

export { MyPlugin };
export type { MyPluginPlugin };
```

```swift
// ============================================================
// 2. Implementation iOS (Swift)
// ============================================================

// ios/App/App/Plugins/MyPlugin.swift
import Capacitor
import UIKit

@objc(MyPlugin)
public class MyPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MyPlugin"
    public let jsName = "MyPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getDeviceInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vibrate", returnType: CAPPluginReturnPromise),
    ]

    @objc func getDeviceInfo(_ call: CAPPluginCall) {
        let device = UIDevice.current
        call.resolve([
            "model": device.model,
            "osVersion": device.systemVersion,
        ])
    }

    @objc func vibrate(_ call: CAPPluginCall) {
        let duration = call.getInt("duration") ?? 100
        // Vibrer le telephone
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.impactOccurred()
        call.resolve()
    }
}
```

> **Conseil** : avant de creer un plugin custom, verifiez le [Capacitor Community Plugins](https://github.com/capacitor-community) et les [Awesome Capacitor](https://github.com/riderx/awesome-capacitor). Il existe des centaines de plugins communautaires pour la plupart des besoins.

---

### 8. Tester des applications Capacitor

| Type de test | Outil | Ce qu'il teste |
|-------------|-------|----------------|
| Unitaire | Vitest | Logique metier, hooks, utils |
| Composant | React Testing Library | Composants (mocke les plugins) |
| E2E Web | Playwright / Cypress | L'app dans le navigateur |
| E2E Mobile | Appium / Detox | L'app sur simulateur/device |

```typescript
// ============================================================
// Mocker les plugins Capacitor dans les tests
// ============================================================

// __mocks__/@capacitor/camera.ts
export const Camera = {
    getPhoto: vi.fn().mockResolvedValue({
        base64String: 'fake-base64-image-data',
        format: 'jpeg',
    }),
    checkPermissions: vi.fn().mockResolvedValue({ camera: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ camera: 'granted' }),
};

// __mocks__/@capacitor/geolocation.ts
export const Geolocation = {
    getCurrentPosition: vi.fn().mockResolvedValue({
        coords: {
            latitude: 48.8566,
            longitude: 2.3522,
            accuracy: 10,
        },
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
    checkPermissions: vi.fn().mockResolvedValue({ location: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ location: 'granted' }),
};

// Dans vos tests :
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoCapture } from '../components/PhotoCapture';

// Vitest charge automatiquement les mocks depuis __mocks__/
describe('PhotoCapture', () => {
    it('affiche la photo apres la capture', async () => {
        render(<PhotoCapture />);

        fireEvent.click(screen.getByText('Prendre une photo'));

        await waitFor(() => {
            const img = screen.getByAltText('Capture');
            expect(img).toBeInTheDocument();
            expect(img.getAttribute('src')).toContain('base64');
        });
    });
});
```

```typescript
// ============================================================
// Helper pour detecter la plateforme dans les tests
// ============================================================

import { Capacitor } from '@capacitor/core';

// Utilite : adapter le comportement selon la plateforme
export function isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
}

export function getPlatform(): 'ios' | 'android' | 'web' {
    return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

// Dans un composant :
function PlatformSpecificFeature() {
    if (!isNativePlatform()) {
        return <p>Cette fonctionnalite n'est disponible que sur mobile.</p>;
    }

    return <button onClick={takePhoto}>Scanner un document</button>;
}
```

---

## Resume

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| Deep links | `@capacitor/app` + `appUrlOpen` event pour naviguer depuis des liens externes |
| Push notifications | Firebase (FCM) + `@capacitor/push-notifications` |
| Biometrie | Face ID / empreinte via plugin communautaire |
| In-app browser | `@capacitor/browser` pour OAuth et liens externes |
| App lifecycle | `appStateChange` pour detecter background/foreground |
| Preferences | Stockage cle-valeur simple (tokens, settings) |
| SQLite | Base relationnelle locale pour donnees offline |
| Plugins custom | TypeScript definition + implementation Swift/Kotlin |
| Tests | Mocker les plugins Capacitor avec `vi.fn()` |

> **Cours precedent** : [Cours 44 — Capacitor fondamentaux](./01-capacitor-fondamentaux.md)

---

<!-- parcours-recommande -->

::: tip Parcours recommande
Ce module n'a pas encore de lab ni de quiz associe. Revenez bientot !
:::
