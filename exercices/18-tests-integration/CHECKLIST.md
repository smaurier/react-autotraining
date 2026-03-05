# Checklist — Exercice 18 : Tests integration MSW

## Validation

- [ ] MSW est installe (`msw`) et configure pour les tests Node.js (`setupServer`)
- [ ] Les handlers par defaut sont definis dans `src/test/mocks/handlers.ts`
- [ ] Le serveur MSW demarre dans `beforeAll`, reset dans `afterEach`, ferme dans `afterAll`
- [ ] `onUnhandledRequest: "error"` est configure pour detecter les requetes non interceptees
- [ ] Le composant `TaskFetcher` gere 3 etats : loading, error, success
- [ ] Test chargement : "Chargement..." est visible au rendu initial
- [ ] Test succes : les taches s'affichent apres la resolution du fetch
- [ ] Test erreur : un message d'erreur et un bouton "Reessayer" apparaissent sur un 500
- [ ] Test retry : cliquer "Reessayer" relance le fetch et affiche les donnees
- [ ] Test vide : "Aucune tache" s'affiche si le serveur retourne `[]`
- [ ] `server.use()` est utilise pour surcharger les handlers dans les tests specifiques
- [ ] `waitFor` est utilise pour les assertions sur les donnees asynchrones
- [ ] Les handlers utilisent MSW v2 (`http.get`, `HttpResponse.json`)
- [ ] Aucun `any` dans le code — types stricts partout
