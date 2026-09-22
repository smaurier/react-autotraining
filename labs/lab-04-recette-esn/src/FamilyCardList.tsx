// FamilyCardList.tsx — PAGE BLANCHE. Jour 1 sur une codebase inconnue : une mission ESN,
// c'est d'abord LIRE les conventions déjà en place, PUIS livrer une feature qui s'y range —
// pas réécrire à sa façon. Lis `ExampleWidget.tsx` (référence, ne le modifie pas) avant de
// commencer : il te montre EXACTEMENT le pattern attendu.
//
// export function FamilyCardList({ familyId }: { familyId: string })
//
//   - Charge les membres via `useApiResource<Member[]>(`/api/families/${familyId}/members`)`
//     (./useApiResource — DONNÉ, ne pas réimplémenter un fetch à la main).
//   - États EXACTEMENT comme dans ExampleWidget.tsx : "Chargement…" pendant le chargement,
//     "Erreur." en cas d'échec (mêmes textes, à la lettre — c'est la convention d'équipe).
//   - Au succès, enveloppe la liste dans `<Card title="Membres">` (./Card — DONNÉ, ne pas
//     réinventer un <div> à la place) contenant un <ul> avec un <li> par membre (email).
//   - EXPORT NOMMÉ uniquement (`export function FamilyCardList`) — jamais `export default`,
//     ce n'est pas la convention de cette codebase (vérifié par l'oracle, à la lettre).
export interface Member {
  id: string;
  email: string;
}

export function FamilyCardList(_props: { familyId: string }) {
  throw new Error("FamilyCardList n'est pas encore implémenté");
}
