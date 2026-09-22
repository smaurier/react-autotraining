// page.tsx — PAGE BLANCHE. La page App Router /families/[id] : un SERVER COMPONENT qui lit
// les données DIRECTEMENT depuis l'API NestJS — aucun useEffect, aucun état de chargement
// côté client, le HTML arrive déjà rempli au navigateur.
//
// export default async function FamillePage({ params }: { params: Promise<{ id: string }> })
//
//   - Next 15 : `params` est une Promise, à `await`er avant d'accéder à `id`.
//   - Appelle `fetch(`${process.env.NESTJS_API_URL ?? "http://localhost:4000"}/families/${id}`)`.
//   - Si la réponse est 404 : affiche "Famille introuvable." — c'est un cas normal (famille
//     supprimée entre deux clics), pas une exception à laisser remonter.
//   - Si la réponse est ok : affiche le nom de la famille dans un <h1>, le nombre de membres
//     (texte contenant "membres"), et rend `<MarquerLuButton familyId={id} />` (composant
//     CLIENT donné dans ../MarquerLuButton — importe-le tel quel, ne le modifie pas).
//   - Ne mets PAS de try/catch qui avale une erreur réseau générique (5xx, timeout) : laisse-
//     la remonter (c'est le rôle d'un `error.tsx` dans une vraie app Next, hors scope ici).
export default async function FamillePage(_props: { params: Promise<{ id: string }> }) {
  throw new Error("FamillePage n'est pas encore implémenté");
}
