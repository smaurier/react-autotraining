# Lab 43 — Capacitor : fondamentaux

> **Outcome :** à la fin, tu sais partir d'une app React 19 + Vite et la transformer en app native iOS/Android avec Capacitor : setup (`init`/`add`), `capacitor.config`, workflow `build → sync → open`, et bascule propre entre live reload dev et build de prod.
> **Vrai outil :** Capacitor CLI (`@capacitor/core` + `@capacitor/cli`) sur un vrai projet Vite React — pas de harnais simulé. Xcode / Android Studio pour le lancement natif (simulateur suffit).
> **Feedback :** le coach valide en session — app qui démarre dans un simulateur, config relue à la main. Pas de test-runner auto-correcteur.

---

## Énoncé

Tu portes **TribuZen mobile**. Le web React existe déjà ; ta mission est de l'empaqueter en app native et de mettre en place un flux de dev efficace.

Cahier des charges **exact** :

1. **Créer** (ou réutiliser) un projet React 19 + Vite qui build vers `dist/`.
2. **Installer et initialiser** Capacitor : `appName` = `TribuZen`, `appId` = `app.tribuzen.mobile`, `webDir` = `dist`.
3. **Ajouter** les deux plateformes natives (`ios` et `android`).
4. **Écrire** `capacitor.config.ts` qui n'injecte `server.url` **que** en mode dev (variable d'env), jamais en prod.
5. **Enchaîner** le workflow complet `build → sync → open` et voir l'app tourner dans un simulateur.
6. **Documenter** dans un `RELEASE.md` les commandes exactes de la release iOS et Android.

**Contraintes :**
- `appId` en reverse-DNS, `webDir` = dossier de **build** (`dist`), jamais `src`.
- `server.url` conditionné à `process.env.CAP_DEV === '1'` — impossible de l'oublier en prod.
- Aucune ligne de code Swift/Kotlin écrite à la main : on passe par la CLI + l'IDE pour lancer.
- **Pas de gap-fill** — tu tapes chaque commande et écris chaque fichier depuis le starter.

### Starter minimal

```bash
# Projet React si tu n'en as pas déjà un
npm create vite@latest tribuzen-mobile -- --template react-ts
cd tribuzen-mobile
npm install
npm run build   # vérifie que dist/ se crée
```

Fichiers à produire :
```
tribuzen-mobile/
  capacitor.config.ts   ← à écrire (dev/prod conditionnel)
  RELEASE.md            ← à écrire (commandes de release)
  ios/                  ← généré par `npx cap add ios`
  android/              ← généré par `npx cap add android`
```

---

## Étapes (en friction)

1. **Installe le runtime + la CLI** — `@capacitor/core` en dépendance, `@capacitor/cli` en dev. Ne pas confondre les deux.
2. **Initialise** avec `npx cap init` : trouve les 3 arguments/flags (appName, appId, `--web-dir`). Vérifie que `capacitor.config.ts` apparaît.
3. **Ajoute les plateformes** — installe `@capacitor/ios` + `@capacitor/android`, puis `cap add ios` et `cap add android`. Observe les dossiers `ios/`/`android/` créés.
4. **Réécris `capacitor.config.ts`** pour conditionner `server` à `process.env.CAP_DEV === '1'`. Sans variable → pas de `server`.
5. **Premier lancement empaqueté** : `npm run build` → `npx cap sync` → `npx cap open ios` → Run dans le simulateur. L'app React doit s'afficher.
6. **Teste le live reload** : lance `npx vite --host 0.0.0.0`, récupère ton IP locale, mets-la dans le `server.url`, puis `CAP_DEV=1 npx cap sync && CAP_DEV=1 npx cap run ios`. Change un texte dans `App.tsx` → il doit se recharger sur le simulateur sans rebuild.
7. **Écris `RELEASE.md`** — les commandes exactes pour un build de prod iOS et Android, en insistant sur l'absence de `server.url`.
8. **Vérifie les cas limites** : sans avoir buildé, `cap sync` doit se plaindre d'un `dist/` vide ; avec `CAP_DEV` non défini, relis le projet natif et confirme qu'aucun `server.url` n'y figure.

---

## Corrigé complet commenté

### 1. Installation + init + plateformes

```bash
# ── Runtime (dépendance app) + CLI (dépendance dev) ──────────────
npm install @capacitor/core
npm install -D @capacitor/cli

# ── init : appName "TribuZen", appId reverse-DNS, build vers dist ─
# S'exécute UNE seule fois — pose capacitor.config.ts
npx cap init "TribuZen" app.tribuzen.mobile --web-dir dist

# ── Ajouter les projets natifs réels (dossiers ios/ et android/) ─
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

### 2. `capacitor.config.ts` — dev/prod conditionnel

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

// CAP_DEV=1 seulement en session de dev mobile (live reload).
// En prod, la variable n'est jamais définie → server absent.
const isDevMobile = process.env.CAP_DEV === '1';

const config: CapacitorConfig = {
  // Identité de l'app sur les stores — reverse-DNS, IMMUABLE après publication
  appId: 'app.tribuzen.mobile',
  appName: 'TribuZen',
  // Dossier de BUILD web (sortie de `npm run build`), jamais src/
  webDir: 'dist',

  // Le bloc server n'existe QUE si CAP_DEV=1.
  // Spread conditionnel : { ...(false && {...}) } → n'ajoute rien.
  ...(isDevMobile && {
    server: {
      // IP LOCALE de la machine (pas localhost), même WiFi que le téléphone
      url: 'http://192.168.1.42:5173',
      cleartext: true, // autorise le HTTP en clair pour le dev local
    },
  }),
};

export default config;
```

### 3. Workflow de lancement empaqueté

```bash
# ── Build web → sync → IDE natif ─────────────────────────────────
npm run build         # React → dist/ (à faire AVANT sync)
npx cap sync          # copie dist/ dans ios/ + android/, installe les plugins
npx cap open ios      # ouvre Xcode → bouton Run → simulateur iPhone
# (équivalent CLI direct : npx cap run ios)
```

### 4. Live reload en dev

```bash
# ── Terminal 1 : Vite exposé sur le réseau local ─────────────────
npx vite --host 0.0.0.0

# ── Récupérer l'IP locale à mettre dans server.url ───────────────
# Windows :
ipconfig | findstr IPv4
# macOS / Linux :
ipconfig getifaddr en0        # macOS
# → reporter l'IP dans capacitor.config.ts (server.url)

# ── Terminal 2 : sync + run en mode dev ──────────────────────────
# CAP_DEV=1 injecte server.url dans le projet natif
CAP_DEV=1 npx cap sync
CAP_DEV=1 npx cap run ios     # l'app charge depuis Vite → HMR sur le simulateur
# Change un texte dans App.tsx → rechargement instantané, sans rebuild
```

> Sous PowerShell, `CAP_DEV=1 npx ...` ne marche pas : fais `$env:CAP_DEV = '1'; npx cap sync; npx cap run ios` (puis `Remove-Item Env:CAP_DEV` pour repasser en prod).

### 5. `RELEASE.md`

```md
# Release TribuZen mobile

## Pré-requis
- `server.url` ABSENT (CAP_DEV non défini) — sinon écran blanc en prod.
- `npm run build` exécuté (dist/ à jour).

## iOS — App Store
npm run build
npx cap sync
npx cap open ios
# Xcode : target "Any iOS Device (arm64)" → Product > Archive
#         → Organizer > Distribute App > App Store Connect

## Android — Play Store
npm run build
npx cap sync
npx cap open android
# Android Studio : Build > Generate Signed Bundle / APK
#         → Android App Bundle (.aab) → release → upload Play Console
```

**Pourquoi ce corrigé est correct :**
- `@capacitor/core` est en dépendance d'app, `@capacitor/cli` en dev — la CLI ne part pas dans le bundle.
- `appId` reverse-DNS et `webDir: 'dist'` respectent les contraintes ; on a buildé avant `sync`, donc `dist/` n'est pas vide.
- Le **spread conditionnel** `...(isDevMobile && { server: {...} })` garantit qu'en prod (variable absente) le champ `server` n'existe simplement pas — impossible de l'oublier.
- Le workflow suit l'ordre non négociable `build → sync → open/run` : le projet natif contient une copie de `dist/`, resynchronisée à chaque changement.
- Aucune ligne native écrite : Xcode/Android Studio ne servent qu'à lancer/signer.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire en 30 minutes, sans rouvrir ce corrigé ni le module :**

1. Repars d'un nouveau projet Vite React vierge et refais tout le setup jusqu'à voir l'app dans un simulateur.
2. Ajoute un **script npm** `"cap:dev"` dans `package.json` qui enchaîne, en une commande, le sync + run iOS en mode dev (avec `CAP_DEV=1`) — sers-toi de `cross-env` pour que ça marche sur Windows et macOS.
3. Ajoute un script `"cap:release:ios"` qui fait `build` + `sync` + `open ios` **sans** `CAP_DEV`.
4. Provoque volontairement le **piège de l'écran blanc** : laisse `server.url` non conditionné, build, lance → observe l'écran blanc. Puis corrige avec le spread conditionnel et confirme que l'écran redevient normal.

**Critère de réussite :** `npm run cap:dev` lance l'app avec HMR sur le simulateur ; `npm run cap:release:ios` ouvre Xcode sur un bundle sans `server.url` ; tu sais expliquer à voix haute pourquoi l'écran blanc survenait.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ce lab correspond au **setup mobile initial** du produit réel :

```
tribuzen/
├── src/                    # UI React 19 partagée web + mobile (inchangée)
├── capacitor.config.ts     # appId: app.tribuzen.mobile, webDir: dist, server conditionnel
├── RELEASE.md              # procédure de release stores
├── ios/                    # projet Xcode (commit-é)
└── android/                # projet Android Studio (commit-é)
```

**Différences par rapport au lab :**
- L'IP de `server.url` sera lue depuis un `.env.local` (non commité) plutôt qu'en dur, pour ne pas imposer l'IP d'un poste aux autres devs.
- La signature iOS/Android utilisera les vrais certificats de l'équipe (App Store Connect + keystore Android), pas un profil de dev jetable.
- Le prochain incrément (`44-capacitor-plugins-avances`) ajoute les plugins natifs dont les familles ont besoin : appareil photo (albums), notifications locales (rappels d'événements), stockage hors-ligne.

**Commits cibles :**
```
chore(mobile): setup Capacitor — init, plateformes iOS/Android, config
feat(mobile): live reload conditionnel + procédure de release stores
```
