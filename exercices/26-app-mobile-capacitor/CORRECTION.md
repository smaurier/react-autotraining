# Correction — Exercice 26 : App mobile avec Capacitor

---

## capacitor.config.ts

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.monentreprise.taskflow',
  appName: 'TaskFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
```

---

## index.html — viewport meta tag

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
/>
```

---

## src/components/TaskPhotoCapture.tsx

```tsx
import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export function TaskPhotoCapture() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Masquer sur le web — uniquement disponible en natif
  if (!Capacitor.isNativePlatform()) return null;

  const takePhoto = async () => {
    try {
      setError(null);
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 90,
      });
      setPhotoUri(photo.webPath ?? null);
    } catch (err) {
      // L'utilisateur a annulé ou refusé la permission
      if (err instanceof Error && err.message !== 'User cancelled photos app') {
        setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      }
    }
  };

  return (
    <div className="photo-capture">
      <button type="button" onClick={takePhoto}>
        Prendre une photo
      </button>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      {photoUri && (
        <img
          src={photoUri}
          alt="Photo de la tâche"
          className="task-photo"
        />
      )}
    </div>
  );
}
```

---

## App.tsx — Status bar

```tsx
import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#1a1a2e' });
    }
  }, []);

  return (
    <div className="app-container">
      {/* ... */}
    </div>
  );
}
```

---

## CSS — Safe areas

```css
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}
```

---

## AndroidManifest.xml — Permissions caméra

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

---

## Commandes résumées

```bash
# 1. Installer Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/camera @capacitor/status-bar

# 2. Initialiser (si pas encore fait)
npx cap init taskflow com.monentreprise.taskflow --web-dir=dist

# 3. Builder le projet
npm run build

# 4. Ajouter Android
npx cap add android

# 5. Synchroniser après chaque modification
npx cap sync

# 6. Ouvrir Android Studio
npx cap open android
```
