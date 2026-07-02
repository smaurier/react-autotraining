---
titre: Capacitor — fondamentaux
cours: 04-react
notions: [transformer une app web React en app native, architecture webview + bridge natif, setup npx cap init/add/sync, capacitor.config, workflow build web → cap copy → Xcode/Android Studio, PWA vs Capacitor vs React Native, live reload en dev]
outcomes: [empaqueter un build React dans une app native iOS/Android avec Capacitor, configurer capacitor.config et enchaîner le workflow build → sync → ouverture IDE natif, choisir entre PWA, Capacitor et React Native selon le contexte]
prerequis: [42-entretien-technique]
next: 44-capacitor-plugins-avances
libs: [{ name: react, version: "^19" }, { name: "@capacitor/core", version: "^6" }]
tribuzen: l'app mobile TribuZen que les familles utilisent = le build React empaqueté via Capacitor, setup initial iOS/Android
last-reviewed: 2026-07
---

# Capacitor — fondamentaux

> **Outcomes — tu sauras FAIRE :** empaqueter un build React dans une app native iOS/Android avec Capacitor, configurer `capacitor.config` et enchaîner le workflow `build → sync → ouverture IDE natif`, choisir entre PWA, Capacitor et React Native selon le contexte.
> **Difficulté :** :star::star::star:

## 1. Cas concret d'abord

TribuZen tourne déjà comme app web React (Vite + React 19). Les familles adorent, mais elles réclament **une vraie app** sur l'App Store et le Play Store : une icône sur l'écran d'accueil, des notifications, l'appareil photo pour les albums de famille. On te confie le portage mobile.

Deux réflexes possibles, un seul raisonnable ici :

- **Tout réécrire en React Native** — nouveau projet, nouveaux composants (`View`, `Text` au lieu de `div`, `span`), nouvelle navigation. Des semaines de travail, et deux bases de code à maintenir.
- **Réutiliser le code web tel quel** et l'empaqueter dans une coquille native. C'est exactement ce que fait **Capacitor** : ton `dist/` React devient le contenu d'une app iOS et d'une app Android, sans toucher une ligne de composant.

Concrètement, en partant du projet React existant, la mise en place tient en quelques commandes :

```bash
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init "TribuZen" app.tribuzen.mobile --web-dir dist
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android

npm run build   # génère dist/
npx cap sync    # copie dist/ dans les projets natifs
npx cap open ios     # ouvre Xcode → lance sur simulateur
```

En quelques minutes, la même app React s'affiche dans un simulateur iPhone. Ce module explique **ce qui se passe réellement** derrière ces commandes, comment configurer proprement, et quand ce choix est le bon.

---

## 2. Théorie complète, concise

### 2.1 Ce qu'est Capacitor

Capacitor est un **runtime natif** développé par l'équipe Ionic. Son rôle : prendre une application web (HTML/CSS/JS) et l'exécuter **dans une app native**, avec accès aux APIs du téléphone.

Une idée à retenir avant tout : **ton code React ne change pas**. Le même bundle qui tourne dans Chrome tourne dans l'app. Capacitor n'est pas un framework de composants — c'est une couche d'emballage + un pont vers le natif.

> **Actualité (vérifié Context7, juil. 2026)** : la version courante de Capacitor est la **7** (Node 20+ requis, souvent 22). Ce module pin `@capacitor/core` en `^6` dans le frontmatter par cohérence de parcours, mais **toute l'API de ce module (`init`, `add`, `sync`, `copy`, `open`, `run`, la forme de `capacitor.config`) est identique en v6 et v7** — le portage v6 → v7 est indolore pour ces fondamentaux. Vérifie simplement que ta version de Node correspond à celle exigée par la major installée.

### 2.2 Architecture : webview + bridge natif

Une app Capacitor est une app native (un projet Xcode, un projet Android Studio) dont l'écran principal est **une webview plein écran** qui charge ton `index.html`.

```
┌──────────────────────────────────────────────────────┐
│   App native (binaire iOS / Android sur les stores)  │
│                                                      │
│   ┌────────────────────────────────────────────┐    │
│   │   Webview plein écran                       │    │
│   │   (WKWebView sur iOS, WebView sur Android)  │    │
│   │                                            │    │
│   │      Ton app React (dist/)                 │    │
│   │      HTML + CSS + JS/TS — inchangés         │    │
│   └───────────────────┬────────────────────────┘    │
│                       │  Capacitor bridge            │
│                       │  (appels JS ↔ code natif)    │
│   ┌───────────────────▼────────────────────────┐    │
│   │   Couche native + plugins                   │    │
│   │   iOS (Swift)      │   Android (Kotlin)      │    │
│   │   Camera, GPS, Filesystem, Notifications... │    │
│   └────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

Deux briques :

1. **La webview** — un navigateur embarqué sans barre d'adresse. `WKWebView` sur iOS, `WebView` (Chromium) sur Android. Elle rend ton React exactement comme un navigateur classique.
2. **Le bridge** — un canal de messages entre le JS et le natif. Quand ton code appelle `Camera.getPhoto()`, le bridge sérialise l'appel, le transmet au code Swift/Kotlin qui ouvre l'appareil photo réel, puis renvoie le résultat en JavaScript sous forme de `Promise`.

> **Conséquence mentale importante :** ton UI est du web (donc rapide à écrire, mais rendue par une webview, pas par des composants natifs). Tes accès matériels (caméra, GPS, stockage) passent par des **plugins** qui traversent le bridge. Cette séparation UI-web / capacités-natives est le cœur du modèle Capacitor.

### 2.3 Setup : `init`, `add`, `sync`

Trois commandes structurantes, à ne pas confondre.

```bash
# 1. Installer le runtime (dépendance app) + la CLI (dépendance dev)
npm install @capacitor/core
npm install -D @capacitor/cli

# 2. init — crée capacitor.config et enregistre appName + appId + webDir
#    appId = identifiant reverse-DNS unique (immuable une fois publié !)
npx cap init "TribuZen" app.tribuzen.mobile --web-dir dist

# 3. add — génère les VRAIS projets natifs (dossiers ios/ et android/)
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

- `init` s'exécute **une seule fois** : il pose le fichier de config. `appId` est un identifiant reverse-DNS (`app.tribuzen.mobile`) — c'est l'identité de l'app sur les stores, **on ne le change plus** après publication.
- `add ios` / `add android` créent des dossiers `ios/` et `android/` qui sont de vrais projets natifs (fichiers Swift, Gradle, etc.). On les commite dans le repo.
- `sync` (section 2.5) est la commande du quotidien : elle **copie le build web** dans ces projets natifs **et** met à jour les plugins natifs installés.

### 2.4 `capacitor.config`

Le fichier de config central. En projet TypeScript, on l'écrit en `.ts` pour l'autocomplétion et le typage.

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Identité de l'app sur les stores — reverse-DNS, immuable après publication
  appId: 'app.tribuzen.mobile',
  appName: 'TribuZen',
  // Dossier de BUILD web (pas src !). Vite → 'dist', CRA → 'build'
  webDir: 'dist',
  plugins: {
    // Config des plugins natifs installés
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
```

Les trois champs qui comptent en fondamentaux :

| Champ | Rôle | Erreur classique |
|---|---|---|
| `appId` | Identité reverse-DNS sur les stores | Le changer après publication = nouvelle app |
| `appName` | Nom affiché sous l'icône | — |
| `webDir` | Dossier du **build** web à empaqueter | Pointer `src/` au lieu de `dist/` |

Un quatrième champ, `server`, sert uniquement en développement pour le live reload (section 2.7) — il doit être **absent en production**.

### 2.5 Workflow : `build → sync → IDE natif`

Le cycle mental à mémoriser : **on ne "code" jamais dans le projet natif**. On code en React, on build, on synchronise, on ouvre l'IDE seulement pour lancer/signer.

```bash
# 1. Build web — React → dist/
npm run build

# 2. Synchroniser — copie dist/ dans ios/ et android/ + met à jour les plugins
npx cap sync

# 3. Ouvrir l'IDE natif pour lancer / archiver / signer
npx cap open ios       # → Xcode
npx cap open android   # → Android Studio
```

Différence à connaître entre les deux commandes de transfert :

- **`npx cap copy`** — copie **seulement** le build web (`dist/`) dans les projets natifs. Rapide.
- **`npx cap sync`** — fait `copy` **+** met à jour les plugins natifs (dépendances Pod/Gradle). À lancer après **tout** `npm install` d'un plugin Capacitor.

> **Règle du pouce :** tu as juste changé du code React → `copy` suffit (mais `sync` ne coûte presque rien). Tu as installé un nouveau plugin → `sync` obligatoire.

`npx cap open` ouvre le projet dans Xcode / Android Studio ; de là tu lances sur simulateur/appareil, ou tu archives pour le store. Alternative en ligne de commande : `npx cap run ios` / `npx cap run android` (build + lancement direct).

### 2.6 PWA vs Capacitor vs React Native

La question qu'on te posera en entretien. La discrimination tient en une phrase : **qui rend l'UI, et comment on distribue.**

| Critère | PWA | Capacitor | React Native |
|---|---|---|---|
| Rendu de l'UI | Navigateur | **Webview** (ton HTML/CSS) | **Composants natifs** |
| Base de code | Web | Web (100 % réutilisé) | JS, mais UI spécifique (~70 % partagé) |
| Sur les stores | Non (install via URL) | **Oui** (binaire natif) | **Oui** (binaire natif) |
| Accès natif (caméra, GPS…) | Limité (API web) | Complet (plugins/bridge) | Complet (natif) |
| Perf UI | Bonne | Bonne (webview) | Excellente (natif) |
| Coût / courbe | Minimal | Faible (c'est du web) | Élevée (APIs natives) |

Grille de décision :

- **PWA** — tu n'as pas besoin des stores ni d'accès matériel poussé ; distribution par URL, budget minimal.
- **Capacitor** — tu as **déjà** une app web React et tu veux être sur les stores + accéder au natif, sans réécrire. C'est le cas TribuZen.
- **React Native** — app mobile-first, animations lourdes, UX haut de gamme native, équipe mobile dédiée, pas de web existant à réutiliser.

> **Formulation d'entretien :** « Capacitor rend l'UI dans une webview et réutilise 100 % du code web ; React Native rend des composants natifs et réécrit l'UI. On choisit Capacitor quand on part d'un existant web et qu'on veut les stores à moindre coût ; React Native quand la performance/fluidité native prime. »

### 2.7 Live reload en développement

Sans live reload, chaque changement de code impose un rebuild complet + resync (30-60 s). Avec, l'app sur le téléphone recharge instantanément, comme le HMR du navigateur.

Le principe : au lieu de charger le `dist/` empaqueté, la webview charge **ton serveur Vite** via le réseau local. On l'active avec le champ `server.url` :

```ts
// capacitor.config.ts — MODE DEV UNIQUEMENT
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.tribuzen.mobile',
  appName: 'TribuZen',
  webDir: 'dist',
  server: {
    // TON IP locale, pas localhost — le téléphone doit joindre ta machine
    url: 'http://192.168.1.42:5173',
    cleartext: true, // autorise le HTTP en clair (pas de HTTPS en local)
  },
};

export default config;
```

```bash
# Lancer Vite en exposant sur le réseau local (pas seulement localhost)
npx vite --host 0.0.0.0

# Synchroniser puis lancer sur l'appareil (même WiFi que la machine)
npx cap sync
npx cap run ios   # ou android → l'app charge depuis ton Vite en direct
```

Deux exigences : le téléphone et la machine sur **le même réseau WiFi**, et `server.url` pointant sur **l'IP locale** de la machine (pas `localhost`, qui désignerait le téléphone lui-même).

> **Piège critique :** `server.url` doit être **retiré avant tout build de production**. Sinon l'app publiée tente de joindre ton PC de dev (introuvable pour l'utilisateur) → écran blanc. Voir Piège #1.

---

## 3. Worked examples

### Exemple 1 — Porter TribuZen web en app iOS/Android (de zéro)

Point de départ : un projet React 19 + Vite fonctionnel (`tribuzen-web`). Objectif : le voir tourner dans un simulateur, empaqueté.

```bash
# ── 1. Installer runtime + CLI ───────────────────────────────────
npm install @capacitor/core
npm install -D @capacitor/cli

# ── 2. Initialiser (une seule fois) ──────────────────────────────
# "TribuZen" = appName ; app.tribuzen.mobile = appId reverse-DNS
# --web-dir dist car Vite build vers dist/
npx cap init "TribuZen" app.tribuzen.mobile --web-dir dist
```

```ts
// ── 3. Vérifier capacitor.config.ts (généré par init) ────────────
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.tribuzen.mobile',
  appName: 'TribuZen',
  webDir: 'dist',           // ← doit correspondre à la sortie de `npm run build`
};

export default config;
```

```bash
# ── 4. Ajouter les plateformes natives ───────────────────────────
npm install @capacitor/ios @capacitor/android
npx cap add ios       # crée ios/
npx cap add android   # crée android/

# ── 5. Build + sync + lancement ──────────────────────────────────
npm run build         # React → dist/
npx cap sync          # copie dist/ dans ios/ et android/, installe plugins natifs
npx cap open ios      # ouvre Xcode → bouton Run → simulateur iPhone
```

**Ce qui se passe, étape par étape :**
- `init` pose `capacitor.config.ts` et enregistre l'identité de l'app.
- `add ios/android` génère deux projets natifs réels (commit-és dans le repo).
- `build` produit le `dist/` que Capacitor va empaqueter.
- `sync` copie ce `dist/` dans les projets natifs — **c'est l'étape qu'on oublie** quand l'app affiche une vieille version.
- `open ios` délègue à Xcode le lancement/la signature ; on ne code rien côté Swift.

**Résultat :** la même app React, pixel pour pixel, dans un iPhone simulé — zéro composant réécrit.

### Exemple 2 — Activer puis désactiver le live reload proprement

Objectif : itérer vite sur mobile en dev, puis produire un build de prod sain.

```ts
// capacitor.config.ts — on distingue les deux modes via une variable d'env
import type { CapacitorConfig } from '@capacitor/cli';

// process.env.CAP_DEV positionné à '1' seulement en session de dev mobile
const isDevMobile = process.env.CAP_DEV === '1';

const config: CapacitorConfig = {
  appId: 'app.tribuzen.mobile',
  appName: 'TribuZen',
  webDir: 'dist',
  // server présent SEULEMENT en dev → jamais dans le bundle de prod
  ...(isDevMobile && {
    server: {
      url: 'http://192.168.1.42:5173',
      cleartext: true,
    },
  }),
};

export default config;
```

```bash
# ── Session DEV mobile (live reload) ─────────────────────────────
npx vite --host 0.0.0.0          # Vite exposé sur le LAN
CAP_DEV=1 npx cap sync           # injecte server.url dans le projet natif
CAP_DEV=1 npx cap run ios        # l'app charge depuis Vite → HMR sur le tel

# ── Build de PRODUCTION (sans server.url) ────────────────────────
npm run build                    # dist/ figé
npx cap sync                     # CAP_DEV absent → aucun server.url injecté
npx cap open ios                 # Xcode → Archive → App Store Connect
```

**Pourquoi ce montage est correct :**
- Le champ `server` n'existe **que** si `CAP_DEV=1` — impossible de l'oublier dans le bundle de prod, le build de prod ne définit jamais cette variable.
- On lance `cap sync` à chaque bascule de mode : c'est lui qui écrit (ou non) `server.url` dans le projet natif.
- En prod, l'app charge le `dist/` local empaqueté → aucune dépendance réseau au démarrage.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — Laisser `server.url` dans le build de production

```ts
// ❌ Config de prod avec un server.url de dev oublié
const config: CapacitorConfig = {
  appId: 'app.tribuzen.mobile',
  webDir: 'dist',
  server: { url: 'http://192.168.1.42:5173', cleartext: true }, // 💥 écran blanc en prod
};

// ✅ En prod : pas de server du tout — l'app charge le dist/ empaqueté
const config: CapacitorConfig = {
  appId: 'app.tribuzen.mobile',
  webDir: 'dist',
};
```

**Pourquoi c'est faux :** l'app publiée essaierait de joindre ton IP de dev (`192.168.1.42`), inaccessible chez l'utilisateur → écran blanc au lancement. Symptôme n°1 des débutants Capacitor. Solution : conditionner `server` à une variable d'env (Exemple 2).

### PIÈGE #2 — `webDir` qui pointe sur `src/` au lieu du build

```ts
// ❌ webDir sur les sources — Capacitor empaquette du JSX/TS non compilé
const config: CapacitorConfig = { appId: '...', webDir: 'src' };

// ✅ webDir sur le dossier de BUILD généré par `npm run build`
const config: CapacitorConfig = { appId: '...', webDir: 'dist' }; // Vite
// (CRA → 'build', Next static export → 'out')
```

**Pourquoi c'est faux :** `src/` contient du TSX non transpilé, pas un `index.html` exécutable. La webview ne saurait pas le charger. `webDir` doit toujours désigner la sortie de build (`dist` pour Vite). Corollaire : **il faut avoir buildé au moins une fois** avant `cap sync`, sinon le dossier est vide.

### PIÈGE #3 — Oublier `cap sync`/`copy` après un changement de code

```bash
# ❌ On rebuild le web mais on relance l'app sans resync → vieille version
npm run build
npx cap open ios      # Xcode montre encore l'ancien dist/

# ✅ Toujours resync entre le build web et le lancement natif
npm run build
npx cap sync          # (ou cap copy) copie le nouveau dist/ dans le natif
npx cap open ios
```

**Pourquoi c'est faux :** le projet natif contient une **copie** de `dist/`, prise au dernier `sync`/`copy`. Sans resynchroniser, tu lances l'ancienne version et tu crois à un bug. Réflexe : `build` → `sync` → `open/run`, dans cet ordre, toujours.

### PIÈGE #4 — Croire que Capacitor = React Native (composants natifs)

**Misconception :** « avec Capacitor, mes `<div>` deviennent des composants natifs ». **Faux.** Ton UI reste rendue par une **webview** — c'est du HTML/CSS, pas des `UIView`/`android.view`. Capacitor n'affecte pas le rendu, il fournit une coquille native + un pont vers les APIs matérielles.

**Discrimination fine :**
- **React Native** : `<View>`/`<Text>` → vrais widgets natifs, pas de webview, pas de DOM.
- **Capacitor** : `<div>`/`<span>` → DOM dans une webview ; le natif n'intervient que pour l'emballage et les plugins (caméra, GPS…).

Conséquence pratique : les optimisations de perf UI sous Capacitor sont des optimisations **web** (taille du bundle, reflows, images), pas des astuces natives.

---

## 5. Ancrage TribuZen

TribuZen a un principe produit : **les familles utilisent le mobile** (l'admin reste web). Cette app mobile n'est pas un second projet — c'est **le build React de TribuZen empaqueté via Capacitor**.

Concrètement, dans le repo `smaurier/tribuzen` :

- Le même `src/` React 19 sert le web (déployé en PWA/site) **et** le mobile (empaqueté Capacitor). Une seule base de code UI.
- `capacitor.config.ts` vit à la racine, `webDir: 'dist'`, `appId: 'app.tribuzen.mobile'`.
- Les dossiers `ios/` et `android/` (générés par `cap add`) sont commit-és — ils contiennent la coquille native + la config des stores.

```
tribuzen/
├── src/                      # UI React 19 — partagée web + mobile
├── dist/                     # build (gitignore) — ce que Capacitor empaquette
├── capacitor.config.ts       # appId, appName, webDir: 'dist'
├── ios/                      # projet Xcode (commit-é)
└── android/                  # projet Android Studio (commit-é)
```

Ce module couvre le **setup initial** : rendre TribuZen installable sur un iPhone/Android de test. Le module suivant (`44-capacitor-plugins-avances`) branche les capacités natives dont les familles ont besoin — appareil photo pour les albums, notifications locales pour les rappels d'événements, stockage hors-ligne.

Workflow de release TribuZen mobile :
```bash
npm run build && npx cap sync   # web figé → projets natifs
npx cap open ios                # Xcode → Archive → App Store Connect
npx cap open android            # Android Studio → Signed App Bundle → Play Console
```

---

## 6. Points clés

1. Capacitor empaquette une app **web** (ton `dist/` React inchangé) dans une app **native** iOS/Android, avec accès aux APIs du téléphone.
2. L'architecture = une **webview** plein écran qui rend ton HTML/CSS + un **bridge** JS↔natif pour les capacités matérielles.
3. Setup : `cap init` (une fois, pose la config + `appId`), `cap add ios/android` (crée les projets natifs), puis le cycle `sync`.
4. `capacitor.config` : `appId` (reverse-DNS immuable), `appName`, `webDir` (dossier de **build**, `dist` pour Vite) ; `server` seulement en dev.
5. Workflow : `npm run build → npx cap sync → npx cap open/run` — on ne code jamais dans le projet natif. `copy` = web seul ; `sync` = web + plugins.
6. PWA (navigateur, pas de store) vs Capacitor (webview, store, réutilise 100 % du web) vs React Native (composants natifs, UI réécrite).
7. Live reload : `server.url` → IP locale de la machine + `cleartext`, même WiFi ; **à retirer impérativement en prod** (sinon écran blanc).

---

## 7. Seeds Anki

```
Que fait Capacitor à une app React ?|Il empaquette le build web (dist/) inchangé dans une app native iOS/Android : une webview plein écran rend ton HTML/CSS, et un bridge JS↔natif donne accès aux APIs du téléphone. Ton code React ne change pas.
Décris l'architecture d'une app Capacitor.|Une app native (projet Xcode/Android Studio) dont l'écran est une webview (WKWebView / WebView) qui charge index.html. Un bridge sérialise les appels JS vers le code natif Swift/Kotlin (plugins) et renvoie des Promises.
Quel est le rôle de cap init vs cap add vs cap sync ?|init (une fois) crée capacitor.config et enregistre appName/appId/webDir. add ios|android génère les projets natifs. sync copie le build web dans ces projets ET met à jour les plugins natifs.
Sur quoi doit pointer webDir dans capacitor.config ?|Sur le dossier de BUILD web, pas src. Vite → dist, CRA → build. Il faut avoir buildé au moins une fois avant cap sync, sinon le dossier est vide.
Quelle est la différence entre npx cap copy et npx cap sync ?|copy copie seulement le build web dans les projets natifs (rapide). sync fait copy + met à jour les plugins natifs (Pods/Gradle). sync est obligatoire après avoir installé un nouveau plugin.
Quel est le workflow de développement Capacitor ?|npm run build (React → dist/) → npx cap sync (copie dans natif) → npx cap open ios/android (Xcode/Android Studio pour lancer/signer) ou npx cap run. On ne code jamais dans le projet natif.
PWA vs Capacitor vs React Native : la distinction clé ?|PWA : rendu navigateur, pas de store, APIs limitées. Capacitor : rendu webview, sur les stores, réutilise 100% du code web. React Native : composants natifs (UI réécrite), sur les stores, meilleure perf UI.
Pourquoi une app Capacitor peut-elle afficher un écran blanc en production ?|Parce que server.url (utilisé pour le live reload dev, pointant l'IP locale) a été laissé dans capacitor.config. L'app publiée tente de joindre le PC de dev, injoignable → écran blanc. Il faut retirer server en prod.
Comment activer le live reload sur un vrai téléphone ?|Mettre server.url = IP locale de la machine (pas localhost) + cleartext: true, lancer Vite avec --host 0.0.0.0, téléphone et machine sur le même WiFi, puis cap sync + cap run. La webview charge le serveur Vite → HMR.
```

---

## Pont vers le lab

> Lab associé : `04-react/labs/lab-43-capacitor-fondamentaux/README.md`. Porter une app React 19 + Vite en app native via Capacitor : setup complet, `capacitor.config`, workflow build → sync → IDE, et bascule live reload / prod. Corrigé commenté + variante J+30.
