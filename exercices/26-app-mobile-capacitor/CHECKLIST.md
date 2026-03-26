# Checklist — Exercice 26 : App mobile avec Capacitor

Coche chaque élément une fois validé :

- [ ] `capacitor.config.ts` créé à la racine avec `appId`, `appName` et `webDir: 'dist'`
- [ ] `npm run build` produit le dossier `dist/` sans erreur
- [ ] `npx cap add android` a créé le dossier `android/`
- [ ] `npx cap sync` se termine sans erreur
- [ ] `TaskPhotoCapture.tsx` existe dans `src/components/`
- [ ] Le bouton photo n'est affiché que sur plateforme native (`Capacitor.isNativePlatform()`)
- [ ] `Camera.getPhoto` est appelé avec `CameraResultType.Uri` et `CameraSource.Camera`
- [ ] La photo capturée s'affiche dans un `<img>` avec un `alt` descriptif
- [ ] Les erreurs (permission refusée, annulation) sont gérées et affichées à l'utilisateur
- [ ] `StatusBar.setStyle` est appelé au lancement de l'app (uniquement sur natif)
- [ ] Le CSS safe areas utilise `env(safe-area-inset-*)` pour les 4 côtés
- [ ] Le meta viewport inclut `viewport-fit=cover`
- [ ] Les permissions caméra sont déclarées dans `AndroidManifest.xml`
- [ ] L'app se lance correctement sur un émulateur ou appareil Android
- [ ] L'app fonctionne également en mode navigateur desktop (dégradation gracieuse)
