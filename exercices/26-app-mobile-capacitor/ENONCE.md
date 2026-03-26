# Exercice 26 — App mobile avec Capacitor

**Module** : 13-Capacitor · **Difficulté** : ★★★
**Durée estimée** : 2 heures
**Cours** : `cours/13-capacitor/01-capacitor-fondamentaux.md`, `cours/13-capacitor/02-capacitor-plugins-avances.md`

---

## Objectif

Packager l'application React `taskflow` (construite avec Vite) en application mobile native pour Android (et optionnellement iOS) en utilisant Capacitor. L'exercice couvre l'initialisation, la configuration, l'accès à la caméra et les ajustements UI mobile.

---

## Consignes

### Partie 1 — Initialisation Capacitor

1. Installer les dépendances Capacitor :
   ```bash
   npm install @capacitor/core @capacitor/cli
   npm install @capacitor/android
   ```

2. Initialiser Capacitor dans le projet :
   ```bash
   npx cap init taskflow com.monentreprise.taskflow --web-dir=dist
   ```

3. Vérifier que `capacitor.config.ts` est créé à la racine avec les bonnes valeurs `appId`, `appName`, et `webDir: 'dist'`.

4. Builder le projet React : `npm run build`.

5. Ajouter la plateforme Android : `npx cap add android`.

6. Synchroniser : `npx cap sync`.

### Partie 2 — Plugin caméra

7. Installer le plugin caméra :
   ```bash
   npm install @capacitor/camera
   ```

8. Créer le composant `src/components/TaskPhotoCapture.tsx` qui :
   - Affiche un bouton `Prendre une photo` (visible uniquement sur mobile natif).
   - Au clic, appelle `Camera.getPhoto({ resultType: CameraResultType.Uri, source: CameraSource.Camera })`.
   - Affiche l'image capturée dans un `<img>` en dessous du bouton.
   - Gère les erreurs (permission refusée, annulation) avec un message utilisateur.

9. Utiliser `Capacitor.isNativePlatform()` pour masquer le bouton sur le web.

### Partie 3 — Ajustements UI mobile

10. Installer `@capacitor/status-bar` et configurer la couleur de la status bar dans `App.tsx` au lancement.

11. Ajouter le CSS pour les safe areas (encoche iPhone / barre Android) :
    ```css
    .app-container {
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    }
    ```

12. Vérifier que le viewport meta tag dans `index.html` inclut `viewport-fit=cover`.

### Partie 4 — Build et test

13. Synchroniser les modifications : `npx cap sync`.

14. Ouvrir Android Studio : `npx cap open android`.

15. Builder et lancer sur un émulateur ou appareil physique.

---

## Contraintes

- `capacitor.config.ts` doit utiliser la syntaxe TypeScript (pas JSON).
- Le plugin caméra doit gérer les permissions correctement (déclaration dans `AndroidManifest.xml`).
- L'app doit fonctionner aussi en mode navigateur (tests sur desktop).

---

## Bonus

- Configurer `@capacitor/splash-screen` et `@capacitor/app-icon` avec le logo TaskFlow.
- Ajouter `@capacitor/local-notifications` pour rappeler les tâches en retard.
- Configurer un build de production signé pour le Google Play Store.
