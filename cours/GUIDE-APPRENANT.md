# Guide de l'apprenant -- React

> **Ce guide est ta boussole.** Il t'aide a savoir ou tu en es, par ou passer,
> et quoi faire quand tu bloques. Lis-le avant de commencer, et reviens-y regulierement.
>
> **Temps estime** : ~130-170h (3-5 mois a 8-10h/semaine)
>
> **Philosophie** : React n'est pas un framework magique. C'est une bibliotheque
> pour construire des interfaces a partir de composants. Sa force, c'est sa simplicite
> -- mais cette simplicite est trompeuse. Maitriser React, c'est comprendre pourquoi
> les re-renders existent, pas comment les eviter a tout prix.

---

## Avant de commencer -- Auto-diagnostic

Reponds honnetement. Ce n'est pas un examen -- c'est un GPS.

### JavaScript/TypeScript -- le socle

Coche ce que tu sais faire SANS chercher sur Google :
- [ ] Ecrire une fonction flechee et utiliser le destructuring
- [ ] Utiliser `map`, `filter`, `spread` sur des tableaux et objets
- [ ] Comprendre les closures (une fonction qui "capture" une variable)
- [ ] Utiliser `async`/`await` avec `fetch`
- [ ] Ecrire du TypeScript basique (interfaces, generics simples)
- [ ] Utiliser les modules ES (`import`/`export`)

**6/6** -> Tu es pret. Attaque directement le module 00.
**4-5/6** -> Revise les points manquants (~2-3h), puis lance-toi.
**< 4/6** -> Fais d'abord le cours TypeScript (01). React sans TypeScript solide, c'est du code fragile.

### React -- ou en es-tu deja ?

- [ ] Tu as deja utilise `useState` et `useEffect`
- [ ] Tu as deja cree un composant React avec des props
- [ ] Tu sais ce qu'est le virtual DOM (meme vaguement)
- [ ] Tu as deja utilise un router (React Router ou autre)
- [ ] Tu as deja utilise un state manager (Context, Redux, Zustand...)

**5/5** -> Tu peux probablement sauter a la Phase 3 (module 06). Fais le checkpoint Phase 2 d'abord.
**2-4/5** -> Commence par la Phase 1, tu consolideras tes bases.
**0-1/5** -> Parfait, tu es exactement le public vise. Si tu viens de Vue, le module 00 fait le pont.

### Le test decisif

On te demande d'afficher une liste d'utilisateurs filtrable avec un champ de recherche.
Comment structures-tu le code ?

- Si tu penses : un composant parent avec le state du filtre, un composant liste, un composant input, et le filtrage dans un `useMemo` -> tu connais les patterns React. Verifie la Phase 2.
- Si tu penses a un seul gros composant avec tout dedans -> la Phase 1 va t'apprendre la composition.
- Si tu ne sais pas par ou commencer -> pas de panique, c'est exactement ce qu'on va apprendre.

---

## Les 5 phases de ta progression

### Phase 1 -- Bases React (modules 00-02) ~20-25h

> **Objectif** : Comprendre le modele mental de React. Composants, JSX, props,
> et les hooks fondamentaux.
>
> **Analogie** : C'est comme apprendre les accords de base a la guitare. Pas de solo encore, mais tu peux jouer.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 00 | De Vue/Angular a React | 2h | Le pont pour ceux qui viennent d'un autre framework |
| 01 | Composants et JSX | 3h | **Cours cle** -- le modele mental de React |
| 02 | Hooks fondamentaux | 4h | **Cours cle** -- `useState`, `useEffect`, `useRef`, `useMemo` |

**Exercices Phase 1** : Cree des composants simples. Un compteur, une todo-list,
un formulaire de recherche. Le but est de sentir le flux de donnees.

**Checkpoint Phase 1** :
- [ ] Tu sais creer un composant fonctionnel avec des props typees
- [ ] Tu sais utiliser `useState` pour gerer un etat local
- [ ] Tu sais utiliser `useEffect` avec un tableau de dependances correct
- [ ] Tu comprends le flux de donnees unidirectionnel (parent -> enfant via props)
- [ ] Tu sais quand utiliser `useRef` vs `useState`

> **Test** : Ton `useEffect` se declenche en boucle infinie. Pourquoi ?
> Si tu reponds "parce qu'une dependance change a chaque render (objet ou tableau recree)", c'est bon.

---

### Phase 2 -- State & Routing (modules 03-05) ~25-30h

> **Objectif** : Gerer le state a l'echelle d'une application, maitriser le routing,
> et les formulaires.
>
> **Analogie** : Tu sais jouer les accords. Maintenant tu enchaines des morceaux complets.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 03 | State management | 4h | **Cours cle** -- Context, Zustand, quand utiliser quoi |
| 04 | Routing | 3h | React Router, routes imbriquees, parametres |
| 05 | Formulaires | 3h | Controlled components, validation, React Hook Form |

**Conseil** : Le state management (module 03) est le sujet ou les devs React se perdent le plus.
Ne tombe pas dans le piege du "tout dans le state global". La plupart du state est local.

**Checkpoint Phase 2** :
- [ ] Tu sais choisir entre state local, Context, et un store externe selon le cas
- [ ] Tu sais configurer React Router avec des routes imbriquees et des parametres
- [ ] Tu sais creer un formulaire controle avec validation
- [ ] Tu sais quand lifter le state et quand le garder local
- [ ] Tu sais utiliser `useContext` sans provoquer de re-renders inutiles

> **Test** : Un collegue met TOUT le state dans un Context global. Que lui dis-tu ?
> Si tu expliques que ca provoque des re-renders sur toute l'app et que tu proposes
> du state local + Context segmente ou Zustand, c'est bon.

---

### Phase 3 -- Next.js (module 06) ~15-20h

> **Objectif** : Passer de React SPA a Next.js. SSR, SSG, ISR,
> et le modele App Router.
>
> **Analogie** : Tu sais jouer en solo. Maintenant tu joues avec un orchestre (le serveur).

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 06 | Next.js | 6h | **Cours cle** -- App Router, Server Components, SSR, ISR |

**Conseil** : Next.js change le modele mental. Les Server Components ne sont PAS
des composants classiques. Prends le temps de comprendre la frontiere client/serveur.

**Checkpoint Phase 3** :
- [ ] Tu sais la difference entre Server Components et Client Components
- [ ] Tu sais quand utiliser `'use client'` et pourquoi le minimiser
- [ ] Tu sais choisir entre SSR, SSG et ISR pour un cas donne
- [ ] Tu sais utiliser les routes API de Next.js
- [ ] Tu sais deployer une app Next.js (Vercel, Docker, ou autre)

> **Test** : Quand faut-il ajouter `'use client'` a un composant ?
> Si tu reponds "uniquement quand il a besoin de hooks, d'events, ou de browser APIs", c'est bon.

---

### Phase 4 -- Expert (modules 07-12) ~40-50h

> **Objectif** : Tests, performance, accessibilite, styling, securite, CI/CD,
> et patterns avances pour des applications React de production.
>
> **Analogie** : Tu joues en concert. Chaque detail compte pour le public.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 07 | Tests | 4h | Testing Library, tests de composants, MSW |
| 08 | Performance patterns | 4h | **Cours cle** -- `memo`, `useMemo`, `useCallback`, React Profiler |
| 09 | Accessibilite et Styling | 4h | ARIA, semantique, CSS-in-JS, Tailwind |
| 10 | Auth et securite | 3h | NextAuth, CSRF, XSS, tokens |
| 11 | CI/CD et deploiement | 3h | GitHub Actions, Docker, preview deployments |
| 12 | Recettes ESN | 4h | Patterns concrets pour les projets en entreprise |

**Attention** : Le module 08 (performance) est souvent mal compris. La regle numero 1 :
ne pas optimiser avant de mesurer. React est rapide par defaut.
`useMemo` et `useCallback` ne sont PAS toujours une bonne idee.

**Checkpoint Phase 4** :
- [ ] Tu sais tester un composant avec Testing Library (render, queries, assertions)
- [ ] Tu sais utiliser le React Profiler pour identifier les re-renders inutiles
- [ ] Tu sais rendre une application accessible (navigation clavier, lecteur d'ecran)
- [ ] Tu sais mettre en place une authentification securisee avec Next.js
- [ ] Tu sais deployer avec une CI/CD complete

> **Test** : Un composant re-render 50 fois par seconde. Que fais-tu ?
> Si tu ouvres le React Profiler AVANT d'ajouter `memo` partout, c'est bon.

---

### Phase 5 -- Capacitor (module 13) ~10-15h

> **Objectif** : Transformer une app React/Next.js en application mobile
> avec Capacitor. Le pont entre web et natif.
>
> **Analogie** : Tu joues sur une nouvelle scene -- meme morceau, nouveau public.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 13 | Capacitor | 4h | Build mobile, APIs natives, plugins |

**Checkpoint Phase 5** :
- [ ] Tu sais packager une app React pour iOS et Android avec Capacitor
- [ ] Tu sais utiliser les plugins Capacitor (camera, geolocation, notifications)
- [ ] Tu sais adapter l'UI pour le mobile (safe areas, navigation, gestures)
- [ ] Tu comprends les differences entre Capacitor, React Native, et une PWA

> **Test** : Un client veut une app mobile a partir de son site React.
> Si tu sais evaluer Capacitor vs React Native selon ses besoins, c'est bon.

---

## Quand tu bloques

React a ses propres pieges. Voici comment debloquer :

### "Mon composant re-render en boucle infinie"
1. Verifie ton `useEffect` : une dependance est probablement recreee a chaque render
2. Les objets et tableaux sont recrees a chaque render (`{} !== {}`)
3. Utilise `useMemo` pour stabiliser la reference, ou deplace l'objet hors du composant
4. Jamais de `setState` sans condition dans un `useEffect` -> boucle garantie

### "Mon state ne se met pas a jour"
1. `setState` est asynchrone. Tu ne verras pas la nouvelle valeur immediatement
2. Si tu depends de l'ancienne valeur, utilise la forme fonctionnelle : `setState(prev => prev + 1)`
3. Les closures capturent la valeur du state au moment du render, pas la valeur "actuelle"
4. C'est le piege numero 1 de React -- relis le module 02 sur les closures dans les hooks

### "Je ne sais pas ou mettre le state"
1. Le state doit etre le plus bas possible dans l'arbre de composants
2. Si deux composants freres ont besoin du meme state -> lifter au parent
3. Si beaucoup de composants distants partagent le state -> Context ou store externe
4. Regle : 80% du state est local, 15% est leve au parent, 5% est global

### "Les Server Components de Next.js me perdent"
1. Par defaut, tout est Server Component (pas besoin de `'use server'`)
2. Ajoute `'use client'` seulement quand tu as besoin de hooks ou d'interactivite
3. Un Client Component peut wrapper des Server Components (pas l'inverse)
4. Pense "server first" -- le client est l'exception, pas la regle

### "Mon formulaire est un cauchemar"
1. Utilise React Hook Form ou une lib similaire pour les formulaires complexes
2. Pour les formulaires simples, le controlled component suffit
3. Ne valide pas tout en temps reel -- valide au blur ou au submit
4. Separe la logique de validation de l'affichage des erreurs

### "Je n'arrive pas a faire l'exercice"
1. Decompose en composants plus petits -- le probleme est souvent trop gros
2. Fais marcher le cas simple d'abord (sans edge cases)
3. Utilise les React DevTools pour inspecter le state et les props

---

## Auto-evaluation par phase

Apres chaque phase, pose-toi ces questions. Si tu ne sais pas repondre,
reviens en arriere -- c'est un signe, pas un echec.

**Apres Phase 1** : "Pourquoi React re-render un composant ?"
-> Si tu reponds "quand son state change, quand ses props changent, ou quand son parent re-render", c'est bon.

**Apres Phase 2** : "Quand utiliser Context vs Zustand ?"
-> Si tu reponds "Context pour le state qui change rarement (theme, auth), Zustand pour le state qui change souvent", c'est bon.

**Apres Phase 3** : "Quelle est la difference entre un Server Component et un Client Component ?"
-> Si tu expliques le rendu serveur, l'absence de JavaScript envoye au client, et les limites (pas de hooks), c'est bon.

**Apres Phase 4** : "Un PM te demande de rendre l'app plus rapide. Par ou commences-tu ?"
-> Si tu ouvres le Profiler, mesures, identifies le bottleneck, et optimises chirurgicalement, c'est bon.

---

## Rythme recommande

| Rythme | Par semaine | Duree totale |
|---|---|---|
| **Decouverte** (a cote du boulot) | 4-6h | 5-6 mois |
| **Regulier** (motivation) | 8-10h | 3-5 mois |
| **Intensif** (objectif pro) | 12-15h | 2-3 mois |

### Conseils concrets

- **1 module = 1 a 2 sessions.** Les modules 02 (hooks) et 03 (state) meritent 2-3 sessions chacun.
- **Code en meme temps que tu lis.** React s'apprend en codant, pas en lisant.
- **Les hooks (02) meritent une semaine.** C'est le coeur de React moderne.
- **Next.js (06) merite une semaine.** Le changement de modele mental prend du temps.
- **Installe les React DevTools.** C'est ton outil numero 1 pour debugger.

### Quand faire une pause

- Si tu te bats contre les re-renders depuis 2h -> prends du recul, dessine le flux de donnees
- Si les Server Components te frustrent -> c'est normal, le modele mental est nouveau
- Si tu mets `memo` partout "au cas ou" -> arrete, relis le module 08

---

## Ressources complementaires

### Quand tu veux approfondir
- [React Docs (nouveau)](https://react.dev/) -- la nouvelle documentation officielle, excellente
- [Next.js Docs](https://nextjs.org/docs) -- reference pour Next.js
- [React DevTools](https://react.dev/learn/react-developer-tools) -- extension navigateur indispensable
- *Fluent React* (Tejas Kumar) -- patterns avances pour React

### Quand tu cherches une reponse rapide
- React DevTools > Components tab -- inspecter le state et les props
- React DevTools > Profiler tab -- identifier les re-renders
- `console.log` dans le corps du composant -- voir quand il re-render

---

## Et apres ?

Tu as fini les 14 modules ? Tu es un dev React solide et polyvalent.

Voici les prochaines etapes :
1. **Construis un projet complet** -- un vrai SaaS avec Next.js, auth, BDD
2. **Explore React Native (cours 13)** -- ton savoir React s'applique directement
3. **Approfondis le testing (cours 04)** -- teste tes composants React comme un pro
4. **Contribue a l'open source** -- React est un ecosysteme immense a explorer
