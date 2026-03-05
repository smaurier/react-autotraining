# Checklist — Exercice 25 : Entretien React

## Validation

### QCM
- [ ] Les 20 questions ont ete traitees sans consulter la documentation
- [ ] Au moins 16/20 reponses correctes apres verification
- [ ] Les lacunes identifiees sont notees pour revision

### LC1 — Counter
- [ ] Le composant affiche un compteur a 0 au demarrage
- [ ] Les boutons "+" et "-" fonctionnent correctement
- [ ] Le compteur ne descend pas en dessous de 0
- [ ] L'affichage pair/impair est correct
- [ ] Complete en moins de 5 minutes

### LC2 — useDebounce
- [ ] Le hook est generique (`<T>`)
- [ ] La valeur se met a jour apres le delai specifie
- [ ] Le `clearTimeout` est dans la fonction de cleanup de `useEffect`
- [ ] Le hook fonctionne dans un composant de recherche
- [ ] Complete en moins de 10 minutes

### LC3 — Data fetching
- [ ] `useFetch<T>` est un hook generique avec les 3 etats : loading, error, data
- [ ] L'`AbortController` annule le fetch au demontage
- [ ] Le composant `UserList` affiche les 3 etats correctement
- [ ] L'interface `User` est definie explicitement
- [ ] Complete en moins de 10 minutes

### General
- [ ] Aucun `any` dans l'ensemble du code
- [ ] Tous les exercices compilent sans erreur TypeScript strict
