// PostsFeed.tsx — PAGE BLANCHE. Le fil des posts d'une famille TribuZen : un onglet
// "Tous"/"Épinglés" (état 100% CLIENT, Zustand) au-dessus d'une liste de posts (état
// SERVEUR, TanStack Query — cache, mutation, invalidation), sur une vraie app React 19.
//
// Exports attendus :
//
//   useFilterStore — un store Zustand `create<{ filter: "all" | "pinned"; setFilter: (f) =>
//     void }>` exporté tel quel (les tests le resettent entre deux cas via
//     `useFilterStore.setState({ filter: "all" })`).
//
//   PostsFeed({ familyId }: { familyId: string })
//     - Charge les posts via `fetchPosts` (./api) avec `useQuery` — queryKey `["posts",
//       familyId]`. Affiche un état de chargement, puis la liste.
//     - Deux boutons/onglets "Tous" et "Épinglés" pilotés par `useFilterStore` : cliquer
//       "Épinglés" filtre la liste affichée aux posts dont `pinned === true`. CE FILTRE EST
//       CLIENT — il ne doit JAMAIS déclencher un nouvel appel réseau (les données sont déjà
//       en cache, on filtre juste ce qu'on affiche).
//     - Chaque post a un bouton "Épingler" (ou "Désépingler" s'il est déjà épinglé) qui
//       appelle `togglePin` (./api) via `useMutation`. Au succès, la query `["posts",
//       familyId]` doit être invalidée (`queryClient.invalidateQueries`) pour que la liste
//       reflète le nouvel état — y compris si on est sur l'onglet "Épinglés".
//
// Le composant doit être rendu SOUS un `QueryClientProvider` fourni par l'appelant (les
// tests en fournissent un) — ne crée pas ton propre QueryClient à l'intérieur du composant.
export function useFilterStore(): never {
  throw new Error("useFilterStore n'est pas encore implémenté");
}

export function PostsFeed(_props: { familyId: string }) {
  throw new Error("PostsFeed n'est pas encore implémenté");
}
