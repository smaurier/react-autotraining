# Cours 44 — Capacitor : transformer une app React en app mobile native

> **Objectif** : Comprendre ce qu'est Capacitor, comment il fait le pont entre une application web React et les plateformes natives (iOS/Android). Installer et configurer Capacitor, utiliser les APIs natives (Camera, Geolocation, Filesystem), et deployer sur les stores. Comparer avec React Native et les PWAs.

---

## Analogie

Imaginez que votre application React est un appartement bien amenage. Capacitor, c'est un **adaptateur universel** qui permet de brancher cet appartement sur les reseaux electriques de differents pays (iOS, Android, Web) sans recabler toute l'installation. Votre code React reste le meme — Capacitor ajoute simplement les prises qui manquent pour acceder aux fonctionnalites natives.

React Native, en comparaison, c'est comme reconstruire l'appartement a chaque fois avec les materiaux locaux du pays. Le resultat peut etre plus "natif", mais le cout de construction est bien plus eleve.

---

## Theorie

### 1. Qu'est-ce que Capacitor ?

Capacitor est un **runtime natif** developpe par Ionic qui encapsule une application web dans un **WebView natif** sur iOS et Android. Il fournit un pont JavaScript vers les APIs natives du telephone.

```
┌──────────────────────────────────────────────────────────────┐
│         ARCHITECTURE CAPACITOR                                │
│                                                               │
│  ┌─────────────────────────────────┐                         │
│  │        Votre app React           │                         │
│  │  (HTML + CSS + JS/TS standard)   │                         │
│  └────────────────┬────────────────┘                         │
│                   │                                           │
│  ┌────────────────▼────────────────┐                         │
│  │       Capacitor Bridge           │                         │
│  │  (pont JS ↔ Native)              │                         │
│  └────────┬───────────────┬────────┘                         │
│           │               │                                   │
│  ┌────────▼──────┐ ┌─────▼────────┐                         │
│  │  iOS (Swift)   │ │ Android       │                         │
│  │  WKWebView     │ │ (Kotlin)      │                         │
│  │  + APIs natives │ │ WebView       │                         │
│  │                │ │ + APIs natives │                         │
│  └───────────────┘ └──────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

> **Concept cle** : votre application React tourne dans un **WebView** (un navigateur embarque). Capacitor expose les APIs natives via des plugins JavaScript. Quand vous appelez `Camera.getPhoto()`, Capacitor transmet l'appel au code natif (Swift ou Kotlin), qui ouvre la camera du telephone, puis renvoie le resultat a votre code JavaScript.

### 2. Capacitor vs React Native vs PWA

| Critere | Capacitor | React Native | PWA |
|---------|-----------|-------------|-----|
| Rendu | WebView (HTML/CSS) | Composants natifs | Navigateur |
| Code partage web/mobile | ✅ 100% | ⚠️ ~70% (UI differente) | ✅ 100% |
| Performance UI | Bonne (WebView optimise) | Excellente (natif) | Bonne |
| Acces APIs natives | ✅ Via plugins | ✅ Natif | ⚠️ Limite |
| Stores (App Store / Play Store) | ✅ Oui | ✅ Oui | ⚠️ Limite |
| Temps de dev initial | ⚡ Rapide | 🐢 Plus lent | ⚡ Tres rapide |
| Courbe d'apprentissage | Faible (c'est du web) | Elevee (APIs specifiques) | Faible |
| Hot reload natif | ✅ Live reload | ✅ Fast refresh | ✅ Standard |
| Animations complexes | ⚠️ Limitees | ✅ Excellentes | ⚠️ Limitees |
| Offline | ✅ Via Service Worker | ✅ Natif | ✅ Via Service Worker |
| Taille de l'app | ~5-15 MB | ~20-50 MB | 0 (pas d'install) |

```
┌──────────────────────────────────────────────────────────────┐
│         QUAND CHOISIR QUOI ?                                  │
│                                                               │
│  Capacitor :                                                 │
│  ✓ Vous avez deja une app web React a porter sur mobile      │
│  ✓ Prototypage rapide d'une app mobile                       │
│  ✓ Budget et equipe limites (pas de devs natifs)             │
│  ✓ Les performances WebView sont acceptables pour votre UX   │
│                                                               │
│  React Native :                                              │
│  ✓ App mobile-first avec UX haut de gamme                    │
│  ✓ Animations complexes et performances critiques            │
│  ✓ Equipe avec des devs mobile disponibles                   │
│  ✓ Pas de version web existante a reutiliser                 │
│                                                               │
│  PWA :                                                       │
│  ✓ Pas besoin d'etre sur les stores                          │
│  ✓ APIs natives non requises (pas de camera, etc.)           │
│  ✓ Distribution via URL (pas d'installation)                 │
│  ✓ Budget minimal                                            │
└──────────────────────────────────────────────────────────────┘
```

### 3. Setup d'un projet React + Capacitor

```bash
# ============================================================
# Partir d'un projet React existant (Vite)
# ============================================================

# Si vous n'avez pas encore de projet React
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install

# ============================================================
# Ajouter Capacitor
# ============================================================
npm install @capacitor/core
npm install -D @capacitor/cli

# Initialiser Capacitor
npx cap init "My App" com.example.myapp

# Ajouter les plateformes
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

### 4. Configuration : `capacitor.config.ts`

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.example.myapp',
    appName: 'My App',
    // Dossier de build de votre app React (Vite = dist)
    webDir: 'dist',
    server: {
        // En developpement : live reload depuis le serveur Vite
        // Commenter en production !
        url: 'http://192.168.1.42:5173',
        cleartext: true,
    },
    plugins: {
        // Configuration des plugins natifs
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#ffffff',
        },
        StatusBar: {
            style: 'dark',
        },
    },
};

export default config;
```

> **Piege classique** : `webDir` doit pointer vers le dossier de **build** (pas `src`). Pour Vite c'est `dist`, pour CRA c'est `build`. Si ce dossier est vide ou inexistant, `npx cap sync` echouera silencieusement.

### 5. Workflow de developpement

```bash
# ============================================================
# Workflow quotidien
# ============================================================

# 1. Developper normalement avec Vite (hot reload dans le navigateur)
npm run dev

# 2. Pour tester sur mobile avec live reload :
#    a. S'assurer que server.url pointe vers votre IP locale
#    b. Synchroniser les fichiers natifs
npx cap sync

#    c. Ouvrir dans l'IDE natif
npx cap open ios       # Ouvre Xcode
npx cap open android   # Ouvre Android Studio

#    d. Lancer l'app depuis l'IDE (ou depuis la CLI)
npx cap run ios        # Build + lance sur simulateur/device
npx cap run android

# 3. Pour un build de production :
npm run build          # Build React (genere dist/)
npx cap sync           # Copie dist/ dans les projets natifs
npx cap open ios       # Build depuis Xcode pour l'App Store
```

```
┌──────────────────────────────────────────────────────────────┐
│         COMMANDES CAPACITOR ESSENTIELLES                      │
│                                                               │
│  npx cap init        Initialiser Capacitor dans le projet    │
│  npx cap add ios     Ajouter la plateforme iOS               │
│  npx cap add android Ajouter la plateforme Android           │
│  npx cap sync        Copier le build web + synchro plugins   │
│  npx cap copy        Copier le build web uniquement          │
│  npx cap open ios    Ouvrir le projet dans Xcode             │
│  npx cap open android Ouvrir dans Android Studio             │
│  npx cap run ios     Build + lance sur device/simulateur     │
│  npx cap run android Build + lance sur device/emulateur      │
└──────────────────────────────────────────────────────────────┘
```

### 6. APIs natives : Camera

```tsx
// ============================================================
// Utiliser la camera du telephone
// ============================================================

// npm install @capacitor/camera
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useState } from 'react';

function PhotoCapture() {
    const [photo, setPhoto] = useState<string | null>(null);

    async function takePhoto() {
        try {
            const image = await Camera.getPhoto({
                // Base64 pour afficher directement dans une <img>
                resultType: CameraResultType.Base64,
                // Demander a l'utilisateur : camera ou galerie
                source: CameraSource.Prompt,
                quality: 80,
                width: 800,
                // Sauvegarder dans la galerie du telephone
                saveToGallery: true,
            });

            setPhoto(`data:image/${image.format};base64,${image.base64String}`);
        } catch (error) {
            // L'utilisateur a annule ou permission refusee
            console.error('Erreur camera:', error);
        }
    }

    return (
        <div>
            <button onClick={takePhoto}>Prendre une photo</button>
            {photo && (
                <img
                    src={photo}
                    alt="Capture"
                    style={{ maxWidth: '100%', borderRadius: 8 }}
                />
            )}
        </div>
    );
}
```

> **Conseil** : sur le web, `Camera.getPhoto()` ouvre un input file classique. Sur mobile, il ouvre la camera native. Votre code reste identique — Capacitor gere la difference.

### 7. APIs natives : Geolocation

```tsx
// ============================================================
// Obtenir la position GPS
// ============================================================

// npm install @capacitor/geolocation
import { Geolocation } from '@capacitor/geolocation';
import { useState, useEffect } from 'react';

interface Position {
    latitude: number;
    longitude: number;
    accuracy: number;
}

function LocationTracker() {
    const [position, setPosition] = useState<Position | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function getCurrentPosition() {
        try {
            // Verifier et demander les permissions
            const permission = await Geolocation.checkPermissions();
            if (permission.location !== 'granted') {
                await Geolocation.requestPermissions();
            }

            const pos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
            });

            setPosition({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
            });
        } catch (err) {
            setError((err as Error).message);
        }
    }

    // Suivi en temps reel
    useEffect(() => {
        let watchId: string | undefined;

        async function startWatching() {
            watchId = await Geolocation.watchPosition(
                { enableHighAccuracy: true },
                (pos, err) => {
                    if (err) {
                        setError(err.message);
                        return;
                    }
                    if (pos) {
                        setPosition({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            accuracy: pos.coords.accuracy,
                        });
                    }
                },
            );
        }

        startWatching();

        return () => {
            if (watchId) {
                Geolocation.clearWatch({ id: watchId });
            }
        };
    }, []);

    return (
        <div>
            <button onClick={getCurrentPosition}>Ma position</button>
            {position && (
                <p>
                    Lat: {position.latitude.toFixed(6)},
                    Lon: {position.longitude.toFixed(6)}
                    (precision: {position.accuracy.toFixed(0)}m)
                </p>
            )}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}
```

### 8. APIs natives : Filesystem

```tsx
// ============================================================
// Lire et ecrire des fichiers sur le telephone
// ============================================================

// npm install @capacitor/filesystem
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// Ecrire un fichier JSON
async function saveData(filename: string, data: unknown): Promise<void> {
    await Filesystem.writeFile({
        path: filename,
        data: JSON.stringify(data, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
    });
}

// Lire un fichier JSON
async function loadData<T>(filename: string): Promise<T | null> {
    try {
        const result = await Filesystem.readFile({
            path: filename,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
        return JSON.parse(result.data as string) as T;
    } catch {
        return null; // Fichier non trouve
    }
}

// Lister les fichiers d'un repertoire
async function listFiles(path: string = ''): Promise<string[]> {
    const result = await Filesystem.readdir({
        path,
        directory: Directory.Documents,
    });
    return result.files.map(f => f.name);
}

// Supprimer un fichier
async function deleteFile(filename: string): Promise<void> {
    await Filesystem.deleteFile({
        path: filename,
        directory: Directory.Documents,
    });
}
```

### 9. APIs natives : LocalNotifications et StatusBar

```tsx
// ============================================================
// Notifications locales
// ============================================================

// npm install @capacitor/local-notifications
import { LocalNotifications } from '@capacitor/local-notifications';

async function scheduleReminder(title: string, body: string, minutes: number) {
    // Demander la permission
    await LocalNotifications.requestPermissions();

    await LocalNotifications.schedule({
        notifications: [
            {
                id: Date.now(),
                title,
                body,
                schedule: {
                    at: new Date(Date.now() + minutes * 60 * 1000),
                },
                extra: { type: 'reminder' },
            },
        ],
    });
}

// Ecouter les clics sur les notifications
LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    console.log('Notification cliquee:', action.notification.extra);
    // Naviguer vers la bonne page...
});

// ============================================================
// StatusBar
// ============================================================

// npm install @capacitor/status-bar
import { StatusBar, Style } from '@capacitor/status-bar';

// Changer le style de la barre de statut
async function setDarkStatusBar() {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
}

// Masquer la barre de statut (plein ecran)
async function hideStatusBar() {
    await StatusBar.hide();
}
```

### 10. Building et deploiement

```bash
# ============================================================
# Build de production
# ============================================================

# 1. Build React
npm run build

# 2. Synchroniser avec les projets natifs
npx cap sync

# ============================================================
# iOS — App Store
# ============================================================

# Ouvrir Xcode
npx cap open ios

# Dans Xcode :
# 1. Selectionner "Any iOS Device (arm64)" comme target
# 2. Product → Archive
# 3. Window → Organizer → Distribute App
# 4. Choisir "App Store Connect" → Upload

# ============================================================
# Android — Play Store
# ============================================================

# Ouvrir Android Studio
npx cap open android

# Dans Android Studio :
# 1. Build → Generate Signed Bundle / APK
# 2. Choisir "Android App Bundle" (.aab)
# 3. Creer ou selectionner une signing key
# 4. Build type: release
# 5. Uploader le .aab sur Google Play Console
```

> **Piege classique** : n'oubliez pas de **supprimer** `server.url` dans `capacitor.config.ts` avant un build de production. Sinon, l'app essaiera de se connecter a votre serveur de dev local et affichera un ecran blanc.

### 11. Live Reload en developpement

```typescript
// capacitor.config.ts — mode developpement
const config: CapacitorConfig = {
    appId: 'com.example.myapp',
    appName: 'My App',
    webDir: 'dist',
    server: {
        // Votre IP locale (pas localhost !)
        // Le telephone doit etre sur le meme reseau WiFi
        url: 'http://192.168.1.42:5173',
        cleartext: true, // Necessaire pour HTTP (pas HTTPS)
    },
};
```

```bash
# Trouver votre IP locale
# macOS / Linux :
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows :
ipconfig | findstr IPv4

# Lancer Vite avec l'IP locale
npx vite --host 0.0.0.0

# Synchroniser et lancer sur le device
npx cap sync
npx cap run ios  # ou android
# → L'app charge depuis votre serveur Vite
# → Les changements de code apparaissent en temps reel
```

> **Conseil** : le live reload est crucial pour la productivite. Sans lui, chaque changement necessite un rebuild complet (30-60 secondes). Avec le live reload, les changements sont instantanes, comme dans le navigateur.

---

### 12. Ecosysteme de plugins

Capacitor dispose d'un ecosysteme riche de plugins officiels et communautaires.

```
┌──────────────────────────────────────────────────────────────┐
│         PLUGINS OFFICIELS (@capacitor/*)                      │
│                                                               │
│  @capacitor/camera          Camera et galerie photo          │
│  @capacitor/geolocation     Position GPS                     │
│  @capacitor/filesystem      Lecture/ecriture de fichiers     │
│  @capacitor/local-notifications  Notifications locales       │
│  @capacitor/push-notifications   Push via FCM/APNs           │
│  @capacitor/status-bar      Style de la barre de statut      │
│  @capacitor/splash-screen   Ecran de demarrage               │
│  @capacitor/keyboard        Evenements clavier               │
│  @capacitor/haptics         Retour haptique (vibrations)     │
│  @capacitor/share           Partage natif                    │
│  @capacitor/clipboard       Copier/coller                    │
│  @capacitor/browser         Navigateur in-app                │
│  @capacitor/app             Cycle de vie, deep links         │
│  @capacitor/preferences     Stockage cle-valeur              │
│  @capacitor/network         Etat de la connexion reseau      │
│  @capacitor/device          Infos sur l'appareil             │
│  @capacitor/dialog          Alertes et confirmations natives │
│  @capacitor/toast           Toasts natifs                    │
│  @capacitor/action-sheet    Menu d'actions natif             │
└──────────────────────────────────────────────────────────────┘
```

| Plugin communautaire | Usage |
|---------------------|-------|
| `@capacitor-community/sqlite` | Base SQLite locale |
| `@capacitor-community/barcode-scanner` | Scan de QR codes / codes-barres |
| `@capacitor-community/firebase-analytics` | Analytics Firebase |
| `@capacitor-community/media` | Acces a la galerie media |
| `@aparajita/capacitor-biometric-auth` | Face ID / empreinte digitale |
| `@capgo/capacitor-updater` | Mises a jour OTA (sans passer par les stores) |

### 13. Hook custom : useCapacitorPlugin

```tsx
// ============================================================
// Hook reutilisable pour les plugins Capacitor
// ============================================================

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface UseNativeApiResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    execute: () => Promise<void>;
}

function useNativeApi<T>(
    apiCall: () => Promise<T>,
    webFallback?: () => Promise<T>,
): UseNativeApiResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (Capacitor.isNativePlatform()) {
                setData(await apiCall());
            } else if (webFallback) {
                setData(await webFallback());
            } else {
                setError('Non disponible sur le web');
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [apiCall, webFallback]);

    return { data, loading, error, execute };
}

// Utilisation
import { Geolocation } from '@capacitor/geolocation';

function LocationButton() {
    const { data, loading, error, execute } = useNativeApi(
        async () => {
            const pos = await Geolocation.getCurrentPosition();
            return {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
            };
        },
        // Fallback web : utiliser l'API du navigateur
        async () => {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (err) => reject(err),
                );
            });
        },
    );

    return (
        <div>
            <button onClick={execute} disabled={loading}>
                {loading ? 'Chargement...' : 'Ma position'}
            </button>
            {data && <p>Lat: {data.lat}, Lng: {data.lng}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}
```

### 14. Gestion du reseau et mode offline

```tsx
// ============================================================
// Detecter l'etat du reseau
// ============================================================

// npm install @capacitor/network
import { Network, ConnectionStatus } from '@capacitor/network';
import { useState, useEffect } from 'react';

function useNetwork(): { connected: boolean; type: string } {
    const [status, setStatus] = useState<ConnectionStatus>({
        connected: true,
        connectionType: 'wifi',
    });

    useEffect(() => {
        // Etat initial
        Network.getStatus().then(setStatus);

        // Ecouter les changements
        const listener = Network.addListener('networkStatusChange', setStatus);

        return () => {
            listener.then(l => l.remove());
        };
    }, []);

    return {
        connected: status.connected,
        type: status.connectionType,
    };
}

// Utilisation dans un composant
function OfflineBanner() {
    const { connected, type } = useNetwork();

    if (connected) return null;

    return (
        <div style={{
            backgroundColor: '#ff4444',
            color: 'white',
            padding: '8px 16px',
            textAlign: 'center',
        }}>
            Vous etes hors ligne. Certaines fonctionnalites sont limitees.
        </div>
    );
}
```

---

## Resume

| Concept | Ce qu'il faut retenir |
|---------|----------------------|
| Capacitor | Runtime natif qui encapsule une app web dans un WebView |
| WebView | Navigateur embarque qui execute votre React |
| Plugins | Pont entre JavaScript et les APIs natives (Camera, GPS, etc.) |
| `npx cap sync` | Commande la plus importante — synchronise le build web avec les projets natifs |
| `capacitor.config.ts` | Configuration centrale (appId, webDir, server, plugins) |
| Live reload | `server.url` vers votre Vite local pour le dev |
| vs React Native | Capacitor = WebView (rapide a dev), RN = composants natifs (meilleure UX) |
| vs PWA | Capacitor = stores + APIs natives, PWA = URL + APIs limitees |

> **Prochain cours** : [Cours 45 — Capacitor : plugins avances](./02-capacitor-plugins-avances.md)

---

<!-- parcours-recommande -->

::: tip Parcours recommande
Ce module n'a pas encore de lab ni de quiz associe. Revenez bientot !
:::
