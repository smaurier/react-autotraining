# Checklist — Exercice 05 : Chronometre

Coche chaque élément une fois valide :

- [ ] Le fichier `Stopwatch.tsx` existe dans `src/exercises/ex05/`
- [ ] `useState<number>` géré le temps ecoule en millisecondes
- [ ] `useState<boolean>` géré l'état en cours / arrete
- [ ] `useRef` est utilise pour stocker l'id de l'intervalle (pas `useState`)
- [ ] Le bouton "Démarrer" lance un `setInterval` toutes les 10ms
- [ ] Le bouton "Arreter" stoppe l'intervalle avec `clearInterval`
- [ ] Le bouton "Reset" stoppe l'intervalle et remet le temps a zero
- [ ] Un `useEffect` avec cleanup nettoie l'intervalle au demontage
- [ ] Le temps est affiche au format `MM:SS.ms` (ex : `01:23.45`)
- [ ] La fonction `formatTime` est extraite et typee
- [ ] Il est impossible de lancer plusieurs intervalles simultanement
- [ ] Aucun `any` n'est present dans le code
- [ ] Le code compile sans erreur TypeScript en mode strict
